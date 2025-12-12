import axios from 'axios'
import dotenv from 'dotenv'
import { PDFDocument } from 'pdf-lib'

dotenv.config()

const AZURE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
const AZURE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
const MODEL_ID = process.env.MODEL_ID
// For Content Understanding projects, PROJECT_NAME might be different from analyzerId
const PROJECT_NAME = process.env.PROJECT_NAME || MODEL_ID

if (!AZURE_KEY || !AZURE_ENDPOINT || !MODEL_ID) {
  console.error('Missing required Azure Document Intelligence environment variables')
}


/**
 * Process PDF using Azure Document Intelligence
 * Splits PDF into 3-page chunks and processes each separately
 * Optionally accepts an onProgress callback for reporting progress.
 */
export async function processPDF(pdfBuffer, onProgress) {
  if (!AZURE_KEY || !AZURE_ENDPOINT || !MODEL_ID) {
    throw new Error('Azure Document Intelligence credentials not configured')
  }

  try {
    // Step 1: Split PDF into 3-page chunks
    const chunks = await splitPDFIntoChunks(pdfBuffer)
    
    if (chunks.length === 0) {
      throw new Error('No pages found in PDF')
    }
    
    const totalChunks = chunks.length
    console.log(`Processing ${totalChunks} chunk(s)...`)

    // Initial progress update
    if (typeof onProgress === 'function') {
      onProgress({
        status: 'processing',
        currentRubric: 0,
        totalRubrics: totalChunks,
      })
    }
    
    // Step 2: Process each chunk separately
    const allResults = []
    let processedChunks = 0
    
    for (const chunk of chunks) {
      try {
        const result = await processSingleChunk(chunk.buffer, chunk)
        allResults.push({
          result,
          chunkInfo: chunk
        })
        console.log(`✓ Chunk ${chunk.chunkNumber} processed successfully`)
        processedChunks++
      } catch (error) {
        console.error(`✗ Error processing chunk ${chunk.chunkNumber}:`, error.message)
        // Continue with other chunks even if one fails
        allResults.push({
          error: error.message,
          chunkInfo: chunk
        })
      }

      // Update progress after each chunk (rubric)
      if (typeof onProgress === 'function') {
        onProgress({
          status: 'processing',
          currentRubric: processedChunks,
          totalRubrics: totalChunks,
        })
      }
    }
    
    // Step 3: Parse and combine all results
    const allRubrics = []
    
    allResults.forEach(({ result, chunkInfo, error }) => {
      if (error) {
        // Skip chunks that failed
        console.warn(`Skipping chunk ${chunkInfo.chunkNumber} due to error`)
        return
      }
      
      // Parse the result for this chunk
      const parsed = parseSingleResult(result)
      
      // Add chunk/page information
      parsed.startPage = chunkInfo.startPage
      parsed.endPage = chunkInfo.endPage
      parsed.rubricNumber = chunkInfo.chunkNumber
      parsed.chunkNumber = chunkInfo.chunkNumber
      
      allRubrics.push(parsed)
    })
    
    console.log(`Successfully processed ${allRubrics.length} out of ${chunks.length} chunk(s)`)
    
    const result = {
      rubrics: allRubrics,
      totalRubrics: allRubrics.length,
      totalChunks: chunks.length,
      ...allRubrics[0] // For backward compatibility
    }

    // Final progress update
    if (typeof onProgress === 'function') {
      onProgress({
        status: 'done',
        currentRubric: result.totalRubrics,
        totalRubrics: result.totalRubrics,
      })
    }

    // Return combined results
    return result
  } catch (error) {
    if (error.response) {
      console.error('Azure API Error:', error.response.status, error.response.data)
      console.error('Attempted URL:', analyzeUrl.replace(AZURE_KEY, '***'))
      
      // Provide helpful error messages
      if (error.response.status === 404) {
        throw new Error(
          `Resource not found (404). Please verify:\n` +
          `1. Your PROJECT_NAME/MODEL_ID is correct\n` +
          `2. For Content Understanding projects, find your project name in Document Intelligence Studio\n` +
          `3. The endpoint URL format: ${AZURE_ENDPOINT}documentintelligence/projects/{projectName}/analyze\n` +
          `Current project identifier: ${PROJECT_NAME}\n` +
          `Error details: ${JSON.stringify(error.response.data)}`
        )
      }
      
      throw new Error(`Azure API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`)
    }
    throw error
  }
}

/**
 * Split PDF into chunks of 3 pages each
 * Returns array of PDF buffers with chunk info
 */
async function splitPDFIntoChunks(pdfBuffer) {
  const sourcePdf = await PDFDocument.load(pdfBuffer)
  const pageCount = sourcePdf.getPageCount()
  const chunks = []
  
  console.log(`Splitting PDF: ${pageCount} total pages into chunks of 3 pages each`)
  
  // Process in 3-page chunks
  for (let startPage = 0; startPage < pageCount; startPage += 3) {
    const endPage = Math.min(startPage + 3, pageCount)
    const chunkPdf = await PDFDocument.create()
    
    // Copy pages from source PDF
    const pages = await chunkPdf.copyPages(sourcePdf, Array.from({ length: endPage - startPage }, (_, i) => startPage + i))
    pages.forEach(page => chunkPdf.addPage(page))
    
    const chunkBytes = await chunkPdf.save()
    chunks.push({
      buffer: Buffer.from(chunkBytes),
      startPage: startPage + 1, // 1-indexed
      endPage: endPage,
      chunkNumber: Math.floor(startPage / 3) + 1
    })
    
    console.log(`Created chunk ${chunks.length}: pages ${startPage + 1}-${endPage}`)
  }
  
  return chunks
}

/**
 * Process a single PDF chunk using Azure Document Intelligence
 */
async function processSingleChunk(pdfBuffer, chunkInfo) {
  const analyzeUrl = `${AZURE_ENDPOINT}contentunderstanding/analyzers/${MODEL_ID}:analyze?api-version=2025-11-01`
  
  console.log(`Processing chunk ${chunkInfo.chunkNumber} (pages ${chunkInfo.startPage}-${chunkInfo.endPage})...`)
  
  // Content Understanding API requires either 'url' or 'data' property
  const base64Pdf = pdfBuffer.toString('base64')
  
  const payload = {
    inputs: [
      {
        data: base64Pdf
      }
    ]
  }
  
  const analyzeResponse = await axios.post(
    analyzeUrl,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  )

  // Get operation location from response headers
  // Content Understanding uses 'Operation-Location' header (capital O)
  // Expect 202 Accepted status for async operations
  if (analyzeResponse.status !== 202 && analyzeResponse.status !== 200) {
    throw new Error(`Unexpected status code: ${analyzeResponse.status}. Response: ${JSON.stringify(analyzeResponse.data)}`)
  }
  
  const operationLocation = analyzeResponse.headers['operation-location'] || 
                            analyzeResponse.headers['Operation-Location'] ||
                            analyzeResponse.headers['operation-Location']
  
  if (!operationLocation) {
    // If operation-location is not in headers, check if result is immediate
    if (analyzeResponse.data) {
      if (analyzeResponse.data.result) {
        return analyzeResponse.data.result
      } else if (analyzeResponse.data.analyzeResult) {
        return analyzeResponse.data.analyzeResult
      }
    }
    throw new Error(`No operation location returned from Azure. Status code: ${analyzeResponse.status}`)
  }

  // Extract request ID from operation location
  // Format: /contentunderstanding/analyzerResults/{request_id}?api-version=...
  const requestId = operationLocation.split('/').pop().split('?')[0]
  
  // Step 2: Poll for results
  // Content Understanding uses: /contentunderstanding/analyzerResults/{request_id}
  const resultUrl = `${AZURE_ENDPOINT}contentunderstanding/analyzerResults/${requestId}?api-version=2025-11-01`
  
  let result = null
  let attempts = 0
  const maxAttempts = 60 // 60 seconds max wait (Content Understanding can take longer)

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

    const statusResponse = await axios.get(resultUrl, {
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
      },
    })

    const status = statusResponse.data.status

    if (status === 'succeeded' || status === 'Succeeded') {
      // Content Understanding projects return result in data.result
      result = statusResponse.data.result || statusResponse.data
      break
    } else if (status === 'failed' || status === 'Failed') {
      throw new Error(`Chunk ${chunkInfo.chunkNumber} analysis failed: ` + JSON.stringify(statusResponse.data))
    }

    attempts++
  }

  if (!result) {
    throw new Error(`Timeout waiting for chunk ${chunkInfo.chunkNumber} analysis results`)
  }

  return result
}

/**
 * Parse a single content entry into structured data
 */
function parseSingleContent(content) {
  const extracted = {
    // Initialize all fields
    projectMotivationScore: '',
    constraintsScore: '',
    evaluationMetricsScore: '',
    stateOfTheArtScore: '',
    designConceptsScore: '',
    conceptSelectionScore: '',
    budgetScore: '',
    scheduleScore: '',
    citationsScore: '',
    questionsScore: '',
    presentationScore: '',
    comments: '',
    evaluatorName: '',
    capstoneGroup: '',
    advisorName: '',
    // Add page range info
    startPage: content.startPageNumber || '',
    endPage: content.endPageNumber || '',
  }

  if (content.fields) {
    const fields = content.fields
    
    // Map Content Understanding field names to our internal field names
    const fieldMapping = {
      'ProjectMotivationScore': 'projectMotivationScore',
      'ConstraintsScore': 'constraintsScore',
      'EvaluationMetricsScore': 'evaluationMetricsScore',
      'StateOfTheArtScore': 'stateOfTheArtScore',
      'DesignConceptsScore': 'designConceptsScore',
      'ConceptSelectionScore': 'conceptSelectionScore',
      'BudgetScore': 'budgetScore',
      'ScheduleScore': 'scheduleScore',
      'CitationsScore': 'citationsScore',
      'QuestionsScore': 'questionsScore',
      'PresentationEffectivenessScore': 'presentationScore', // Note: different field name
      'Comments': 'comments',
      'EvaluatorPrintedName': 'evaluatorName',
      'CapstoneGroup': 'capstoneGroup',
      'Advisor': 'advisorName',
    }
    
    // Extract values from fields, supporting both integer and decimal numbers
    Object.keys(fieldMapping).forEach(azureFieldName => {
      const ourFieldName = fieldMapping[azureFieldName]
      const field = fields[azureFieldName]
      
      if (field) {
        const value = extractFieldValue(field)
        if (value !== '') {
          extracted[ourFieldName] = value
        }
      }
    })
  }

  return extracted
}

/**
 * Parse a single Azure Document Intelligence result
 * Returns a single extracted rubric object
 * Note: Each chunk should contain exactly one rubric (3 pages)
 */
function parseSingleResult(result) {
  // PRIORITY 1: Content Understanding projects use result.contents[] array
  // Since we split into 3-page chunks, each chunk should have one content entry
  if (result.contents && result.contents.length > 0) {
    // Use the first (and typically only) content entry for this chunk
    const content = result.contents[0]
    return parseSingleContent(content)
  }

  // PRIORITY 2: Fallback to custom document model structure (analyzeResult)
  const analyzeResult = result.analyzeResult || result
  const extracted = {
    projectMotivationScore: '',
    constraintsScore: '',
    evaluationMetricsScore: '',
    stateOfTheArtScore: '',
    designConceptsScore: '',
    conceptSelectionScore: '',
    budgetScore: '',
    scheduleScore: '',
    citationsScore: '',
    questionsScore: '',
    presentationScore: '',
    comments: '',
    evaluatorName: '',
    capstoneGroup: '',
    advisorName: '',
  }
  
  // Extract from key-value pairs if available
  if (analyzeResult.documents && analyzeResult.documents.length > 0) {
    const document = analyzeResult.documents[0]
    if (document.fields) {
      Object.keys(document.fields).forEach(key => {
        const field = document.fields[key]
        const normalizedKey = normalizeKey(key)
        if (extracted.hasOwnProperty(normalizedKey) && !extracted[normalizedKey]) {
          extracted[normalizedKey] = extractFieldValue(field)
        }
      })
    }
  }

  // PRIORITY 3: Extract from pages (text content) as fallback
  if (analyzeResult.pages && analyzeResult.pages.length > 0) {
    const allText = analyzeResult.pages
      .map(page => page.lines?.map(line => line.content).join(' ') || '')
      .join(' ')

    // Only use text extraction if fields weren't found
    if (!extracted.projectMotivationScore) {
      extractScoresFromText(allText, extracted)
      extractMetadataFromText(allText, extracted)
    }
  }

  // Extract from tables if available
  if (analyzeResult.tables && analyzeResult.tables.length > 0) {
    analyzeResult.tables.forEach(table => {
      extractFromTable(table, extracted)
    })
  }

  return extracted
}

/**
 * Normalize field key names
 */
function normalizeKey(key) {
  const keyMap = {
    'project motivation': 'projectMotivationScore',
    'project motivation score': 'projectMotivationScore',
    'constraints': 'constraintsScore',
    'constraints score': 'constraintsScore',
    'evaluation metrics': 'evaluationMetricsScore',
    'evaluation metrics score': 'evaluationMetricsScore',
    'state of the art': 'stateOfTheArtScore',
    'state of the art score': 'stateOfTheArtScore',
    'design concepts': 'designConceptsScore',
    'design concepts score': 'designConceptsScore',
    'concept selection': 'conceptSelectionScore',
    'concept selection score': 'conceptSelectionScore',
    'budget': 'budgetScore',
    'budget score': 'budgetScore',
    'schedule': 'scheduleScore',
    'schedule score': 'scheduleScore',
    'citations': 'citationsScore',
    'citations score': 'citationsScore',
    'questions': 'questionsScore',
    'questions score': 'questionsScore',
    'presentation': 'presentationScore',
    'presentation score': 'presentationScore',
    'comments': 'comments',
    'comment': 'comments',
    'evaluator': 'evaluatorName',
    'evaluator name': 'evaluatorName',
    'printed name of evaluator': 'evaluatorName',
    'capstone group': 'capstoneGroup',
    'group name': 'capstoneGroup',
    'advisor': 'advisorName',
    'advisor name': 'advisorName',
  }

  const lowerKey = key.toLowerCase().trim()
  return keyMap[lowerKey] || key
}

/**
 * Extract value from Azure field object
 * Handles both Content Understanding and custom model field formats
 */
function extractFieldValue(field) {
  if (!field) return ''
  
  // Prefer numeric values with full precision (including decimals) when available
  if (field.valueNumber !== undefined) return String(field.valueNumber)
  if (field.valueInteger !== undefined) return String(field.valueInteger)
  
  // Content / string representations
  if (field.valueString) return field.valueString
  if (field.content) return field.content
  
  // Other possible value types
  if (field.valueDate) return field.valueDate
  if (field.valueTime) return field.valueTime
  
  return ''
}

/**
 * Extract scores from text using pattern matching
 */
function extractScoresFromText(text, extracted) {
  const scorePatterns = [
    { pattern: /project\s+motivation[:\s]+(\d+(?:\.\d+)?)/i, key: 'projectMotivationScore' },
    { pattern: /constraints[:\s]+(\d+(?:\.\d+)?)/i, key: 'constraintsScore' },
    { pattern: /evaluation\s+metrics[:\s]+(\d+(?:\.\d+)?)/i, key: 'evaluationMetricsScore' },
    { pattern: /state\s+of\s+the\s+art[:\s]+(\d+(?:\.\d+)?)/i, key: 'stateOfTheArtScore' },
    { pattern: /design\s+concepts[:\s]+(\d+(?:\.\d+)?)/i, key: 'designConceptsScore' },
    { pattern: /concept\s+selection[:\s]+(\d+(?:\.\d+)?)/i, key: 'conceptSelectionScore' },
    { pattern: /budget[:\s]+(\d+(?:\.\d+)?)/i, key: 'budgetScore' },
    { pattern: /schedule[:\s]+(\d+(?:\.\d+)?)/i, key: 'scheduleScore' },
    { pattern: /citations[:\s]+(\d+(?:\.\d+)?)/i, key: 'citationsScore' },
    { pattern: /questions[:\s]+(\d+(?:\.\d+)?)/i, key: 'questionsScore' },
    { pattern: /presentation[:\s]+(\d+(?:\.\d+)?)/i, key: 'presentationScore' },
  ]

  scorePatterns.forEach(({ pattern, key }) => {
    const match = text.match(pattern)
    if (match && !extracted[key]) {
      extracted[key] = match[1]
    }
  })
}

/**
 * Extract metadata from text
 */
function extractMetadataFromText(text, extracted) {
  // Extract evaluator name
  const evaluatorMatch = text.match(/printed\s+name\s+of\s+evaluator[:\s]+([^\n]+)/i)
  if (evaluatorMatch && !extracted.evaluatorName) {
    extracted.evaluatorName = evaluatorMatch[1].trim()
  }

  // Extract capstone group (usually at top left)
  const groupMatch = text.match(/capstone\s+group[:\s]+([^\n]+)/i)
  if (groupMatch && !extracted.capstoneGroup) {
    extracted.capstoneGroup = groupMatch[1].trim()
  }

  // Extract advisor name (usually at top right)
  const advisorMatch = text.match(/advisor[:\s]+([^\n]+)/i)
  if (advisorMatch && !extracted.advisorName) {
    extracted.advisorName = advisorMatch[1].trim()
  }
}

/**
 * Extract data from tables
 */
function extractFromTable(table, extracted) {
  if (!table.cells) return

  // Look for score patterns in table cells
  table.cells.forEach(cell => {
    if (cell.content) {
      const content = cell.content.toLowerCase()
      const normalizedKey = normalizeKey(content)
      
      // If this cell contains a field name, check adjacent cells for values
      if (extracted.hasOwnProperty(normalizedKey)) {
        // Try to find value in nearby cells (simplified approach)
        // In a real implementation, you'd analyze table structure more carefully
      }
    }
  })
}