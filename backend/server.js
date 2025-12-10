import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import crypto from 'crypto'
import { processPDF } from './controllers/pdfController.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// In-memory job store for tracking PDF processing progress
const jobs = new Map()

// Middleware
app.use(cors())
app.use(express.json())

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit (for multiple rubrics, ~50 rubrics @ 3 pages each)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'), false)
    }
  },
})

// Routes
// Original upload endpoint (no progress reporting) - kept for compatibility
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' })
    }

    const result = await processPDF(req.file.buffer)
    res.json(result)
  } catch (error) {
    console.error('Error processing PDF:', error)
    
    // Handle multer file size errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large. Maximum file size is 200MB. Please use a smaller PDF file.'
      })
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to process PDF',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// New upload endpoint with progress reporting
app.post('/api/upload-with-progress', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' })
    }

    const jobId = crypto.randomUUID()

    // Initialize job
    jobs.set(jobId, {
      status: 'processing',
      currentRubric: 0,
      totalRubrics: 0,
      error: null,
      result: null,
    })

    // Kick off async processing without blocking the response
    processPDF(req.file.buffer, (update) => {
      const existing = jobs.get(jobId)
      if (!existing) return

      jobs.set(jobId, {
        ...existing,
        ...update,
      })
    })
      .then((result) => {
        const existing = jobs.get(jobId) || {}
        jobs.set(jobId, {
          ...existing,
          status: 'done',
          result,
          currentRubric: result.totalRubrics || existing.currentRubric || 0,
          totalRubrics: result.totalRubrics || existing.totalRubrics || 0,
        })
      })
      .catch((error) => {
        console.error('Error processing PDF (job):', error)
        const existing = jobs.get(jobId) || {}
        jobs.set(jobId, {
          ...existing,
          status: 'error',
          error: error.message || 'Failed to process PDF',
        })
      })

    // Immediately return job id so frontend can poll for progress
    res.json({ jobId })
  } catch (error) {
    console.error('Error starting PDF job:', error)
    res.status(500).json({
      error: error.message || 'Failed to start PDF processing job',
    })
  }
})

// Polling endpoint for job status and results
app.get('/api/upload-status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId)

  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  if (job.status === 'done') {
    return res.json({
      status: 'done',
      currentRubric: job.currentRubric,
      totalRubrics: job.totalRubrics,
      result: job.result,
    })
  }

  if (job.status === 'error') {
    return res.json({
      status: 'error',
      error: job.error || 'Failed to process PDF',
      currentRubric: job.currentRubric || 0,
      totalRubrics: job.totalRubrics || 0,
    })
  }

  // processing
  return res.json({
    status: 'processing',
    currentRubric: job.currentRubric || 0,
    totalRubrics: job.totalRubrics || 0,
  })
})

// Error handler for multer errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large. Maximum file size is 200MB. Please use a smaller PDF file.'
      })
    }
    return res.status(400).json({ error: `Upload error: ${error.message}` })
  }
  next(error)
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

