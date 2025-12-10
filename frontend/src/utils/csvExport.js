export function downloadCSV(data) {
  // Define all fields in order
  const scoreKeys = [
    'projectMotivationScore',
    'constraintsScore',
    'evaluationMetricsScore',
    'stateOfTheArtScore',
    'designConceptsScore',
    'conceptSelectionScore',
    'budgetScore',
    'scheduleScore',
    'citationsScore',
    'questionsScore',
    'presentationScore',
  ]

  const fields = [
    { key: 'rubricNumber', label: 'Rubric #' },
    { key: 'startPage', label: 'Start Page' },
    { key: 'endPage', label: 'End Page' },
    { key: 'capstoneGroup', label: 'Capstone Group Name' },
    { key: 'advisorName', label: 'Advisor Name' },
    { key: 'projectMotivationScore', label: 'Project Motivation Score' },
    { key: 'constraintsScore', label: 'Constraints Score' },
    { key: 'evaluationMetricsScore', label: 'Evaluation Metrics Score' },
    { key: 'stateOfTheArtScore', label: 'State of the Art Score' },
    { key: 'designConceptsScore', label: 'Design Concepts Score' },
    { key: 'conceptSelectionScore', label: 'Concept Selection Score' },
    { key: 'budgetScore', label: 'Budget Score' },
    { key: 'scheduleScore', label: 'Schedule Score' },
    { key: 'citationsScore', label: 'Citations Score' },
    { key: 'questionsScore', label: 'Questions Score' },
    { key: 'presentationScore', label: 'Presentation Score' },
    { key: 'totalScore', label: 'Total Score' },
    { key: 'comments', label: 'Comments' },
    { key: 'evaluatorName', label: 'Printed Name of Evaluator' },
  ]

  // Create CSV header
  const headers = fields.map(f => f.label).join(',')

  // Handle multiple rubrics or single rubric
  const rubricsToExport = (data.rubrics || [data]).map((rubric) => {
    // Compute total score as the sum of the 11 section scores.
    // Empty or non-numeric values are treated as 0.
    const totalScore = scoreKeys.reduce((sum, key) => {
      const numeric = Number(rubric[key])
      return sum + (Number.isNaN(numeric) ? 0 : numeric)
    }, 0)

    return {
      ...rubric,
      totalScore,
    }
  })
  
  // Create CSV rows - one per rubric
  const rows = rubricsToExport.map(rubric => {
    return fields.map(field => {
      const value = rubric[field.key] || ''
      // Escape commas, quotes, and newlines in CSV
      if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
        return `"${value.toString().replace(/"/g, '""')}"`
      }
      return value.toString()
    }).join(',')
  })

  const csvContent = `${headers}\n${rows.join('\n')}`

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `pdf_extraction_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

