/**
 * Mock Azure Document Intelligence response for testing
 * This simulates the structure of a real Azure DI response
 */
export const mockAzureResponse = {
  status: 'succeeded',
  analyzeResult: {
    apiVersion: '2024-07-31',
    modelId: 'custom-model',
    contentFormat: 'text',
    pages: [
      {
        pageNumber: 1,
        lines: [
          { content: 'Capstone Group: Team Alpha', boundingRegions: [] },
          { content: 'Advisor: Dr. Smith', boundingRegions: [] },
          { content: 'Project Review Rubric', boundingRegions: [] },
          { content: 'Project Motivation Score: 8.5', boundingRegions: [] },
          { content: 'Constraints Score: 7.0', boundingRegions: [] },
          { content: 'Evaluation Metrics Score: 9.0', boundingRegions: [] },
          { content: 'State of the Art Score: 8.0', boundingRegions: [] },
          { content: 'Design Concepts Score: 7.5', boundingRegions: [] },
          { content: 'Concept Selection Score: 8.5', boundingRegions: [] },
          { content: 'Budget Score: 9.0', boundingRegions: [] },
          { content: 'Schedule Score: 7.5', boundingRegions: [] },
          { content: 'Citations Score: 8.0', boundingRegions: [] },
          { content: 'Questions Score: 9.0', boundingRegions: [] },
          { content: 'Presentation Score: 8.5', boundingRegions: [] },
          { content: 'Comments: Excellent work overall. Strong technical implementation.', boundingRegions: [] },
          { content: 'Printed name of evaluator: John Doe', boundingRegions: [] },
        ],
      },
    ],
    documents: [
      {
        docType: 'custom:rubric',
        fields: {
          'Project Motivation Score': { content: '8.5', valueNumber: 8.5 },
          'Constraints Score': { content: '7.0', valueNumber: 7.0 },
          'Evaluation Metrics Score': { content: '9.0', valueNumber: 9.0 },
          'State of the Art Score': { content: '8.0', valueNumber: 8.0 },
          'Design Concepts Score': { content: '7.5', valueNumber: 7.5 },
          'Concept Selection Score': { content: '8.5', valueNumber: 8.5 },
          'Budget Score': { content: '9.0', valueNumber: 9.0 },
          'Schedule Score': { content: '7.5', valueNumber: 7.5 },
          'Citations Score': { content: '8.0', valueNumber: 8.0 },
          'Questions Score': { content: '9.0', valueNumber: 9.0 },
          'Presentation Score': { content: '8.5', valueNumber: 8.5 },
          'Comments': { content: 'Excellent work overall. Strong technical implementation.', valueString: 'Excellent work overall. Strong technical implementation.' },
          'Printed name of evaluator': { content: 'John Doe', valueString: 'John Doe' },
        },
      },
    ],
    tables: [],
  },
}

