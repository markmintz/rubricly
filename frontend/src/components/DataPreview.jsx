// DataPreview.jsx
import { useState } from 'react'
import { downloadCSV } from '../utils/csvExport'

function DataPreview({ data, onDataUpdate }) {
  // Handle both single rubric and multiple rubrics
  const rubrics = data.rubrics || [data]
  const [selectedRubricIndex, setSelectedRubricIndex] = useState(0)
  const [editableRubrics, setEditableRubrics] = useState(rubrics)

  // Helper: validate that a score (string/number) is between 0 and 5 (inclusive).
  // Empty values are treated as "not found" and are not considered invalid.
  const isScoreInvalid = (value) => {
    if (value === null || value === undefined || value === '') return false

    const numeric = Number(value)
    if (Number.isNaN(numeric)) return true

    return numeric < 0 || numeric > 5
  }

  const currentRubric = editableRubrics[selectedRubricIndex] || editableRubrics[0]

  const handleFieldChange = (field, value) => {
    const updated = [...editableRubrics]
    updated[selectedRubricIndex] = {
      ...updated[selectedRubricIndex],
      [field]: value
    }
    setEditableRubrics(updated)
    
    // Update parent with all rubrics
    onDataUpdate({
      rubrics: updated,
      totalRubrics: updated.length,
      ...updated[0] // For backward compatibility
    })
  }

  const handleDownload = () => {
    downloadCSV({ rubrics: editableRubrics })
  }

  // Define all fields to display
  const scoreFields = [
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
  ]

  const metadataFields = [
    { key: 'capstoneGroup', label: 'Capstone Group Name' },
    { key: 'advisorName', label: 'Advisor Name' },
    { key: 'evaluatorName', label: 'Printed Name of Evaluator' },
  ]

  return (
    <div className="bg-card rounded-xl w-full shadow-2xl p-8 border border-gray-100">
      <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-card-text">Parsed Data Preview</h2> {/* Explicitly dark text */}
          {rubrics.length > 1 && (
            <p className="text-sm text-secondary mt-1">
              Found {rubrics.length} rubric{rubrics.length !== 1 ? 's' : ''} in PDF
            </p>
          )}
        </div>
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
        >
          Download CSV ({rubrics.length} rubric{rubrics.length !== 1 ? 's' : ''})
        </button>
      </div>

      {/* Rubric selector for multiple rubrics (Active Tab Underline) */}
      {rubrics.length > 1 && (
        <div className="mb-6 pb-4 border-b border-gray-200">
          <label className="text-sm font-medium text-card-text mb-2 block"> {/* Explicitly dark text */}
            Select Rubric:
          </label>
          <div className="flex gap-2 flex-wrap">
            {editableRubrics.map((rubric, index) => (
              <button
                key={index}
                onClick={() => setSelectedRubricIndex(index)}
                className={`px-4 py-2 rounded-lg font-medium transition-all relative ${
                  selectedRubricIndex === index
                    ? 'bg-white text-primary border-b-4 border-primary font-bold shadow-md' 
                    : 'bg-gray-100 text-card-text hover:bg-gray-200' // Explicitly dark text
                }`}
              >
                Rubric {index + 1}
                {rubric.startPage && rubric.endPage && (
                  <span className="ml-2 text-xs opacity-75 text-secondary">
                    (Pages {rubric.startPage}-{rubric.endPage})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Scores Section */}
        <div>
          <h3 className="text-xl font-semibold text-primary mb-4 pb-2 border-b border-gray-200">
            Section Scores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scoreFields.map((field) => {
              const value = currentRubric[field.key] ?? ''
              const invalid = isScoreInvalid(value)

              return (
                <div key={field.key} className="flex flex-col">
                  <label className="text-sm font-medium text-card-text mb-1"> {/* Explicitly dark text */}
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className={`animated-line-border px-4 py-2 rounded-lg focus:outline-none placeholder-secondary transition-all !border-none ${ 
                      invalid
                        ? 'bg-red-50 text-card-text' // Explicitly dark text
                        : 'bg-gray-50 text-card-text' // Explicitly dark text
                    }`}
                    placeholder="Not found"
                  />
                  {invalid && (
                    <span className="mt-1 text-xs text-red-500">
                      Score must be a number between 0 and 5.
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Metadata Section */}
        <div>
          <h3 className="text-xl font-semibold text-primary mb-4 pb-2 border-b border-gray-200">
            Metadata
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metadataFields.map((field) => (
              <div key={field.key} className="flex flex-col">
                <label className="text-sm font-medium text-card-text mb-1"> {/* Explicitly dark text */}
                  {field.label}
                </label>
                <input
                  type="text"
                  value={currentRubric[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="animated-line-border px-4 py-2 rounded-lg focus:outline-none transition-all bg-gray-50 placeholder-secondary !border-none text-card-text" // Explicitly dark text
                  placeholder="Not found"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div>
          <h3 className="text-xl font-semibold text-primary mb-4 pb-2 border-b border-gray-200">
            Comments
          </h3>
          <textarea
            value={currentRubric.comments || ''}
            onChange={(e) => handleFieldChange('comments', e.target.value)}
            rows={6}
            className="animated-line-border w-full px-4 py-2 rounded-lg focus:outline-none transition-all resize-y bg-gray-50 placeholder-secondary !border-none text-card-text" // Explicitly dark text
            placeholder="No comments found"
          />
        </div>
      </div>
    </div>
  )
}

export default DataPreview