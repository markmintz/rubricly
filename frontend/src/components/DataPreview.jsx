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
    <div className="bg-white rounded-lg shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Parsed Data Preview</h2>
          {rubrics.length > 1 && (
            <p className="text-sm text-gray-600 mt-1">
              Found {rubrics.length} rubric{rubrics.length !== 1 ? 's' : ''} in PDF
            </p>
          )}
        </div>
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
        >
          Download CSV ({rubrics.length} rubric{rubrics.length !== 1 ? 's' : ''})
        </button>
      </div>

      {/* Rubric selector for multiple rubrics */}
      {rubrics.length > 1 && (
        <div className="mb-6 pb-4 border-b">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Select Rubric:
          </label>
          <div className="flex gap-2 flex-wrap">
            {editableRubrics.map((rubric, index) => (
              <button
                key={index}
                onClick={() => setSelectedRubricIndex(index)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedRubricIndex === index
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Rubric {index + 1}
                {rubric.startPage && rubric.endPage && (
                  <span className="ml-2 text-xs opacity-75">
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
          <h3 className="text-xl font-semibold text-gray-700 mb-4 pb-2 border-b">
            Section Scores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scoreFields.map((field) => {
              const value = currentRubric[field.key] ?? ''
              const invalid = isScoreInvalid(value)

              return (
                <div key={field.key} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-600 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className={`px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      invalid
                        ? 'border-red-500 bg-red-50 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-orange-500'
                    }`}
                    placeholder="Not found"
                  />
                  {invalid && (
                    <span className="mt-1 text-xs text-red-600">
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
          <h3 className="text-xl font-semibold text-gray-700 mb-4 pb-2 border-b">
            Metadata
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metadataFields.map((field) => (
              <div key={field.key} className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={currentRubric[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Not found"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-4 pb-2 border-b">
            Comments
          </h3>
          <textarea
            value={currentRubric.comments || ''}
            onChange={(e) => handleFieldChange('comments', e.target.value)}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
            placeholder="No comments found"
          />
        </div>
      </div>
    </div>
  )
}

export default DataPreview

