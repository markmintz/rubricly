# Testing Guide

## Testing Without Azure Document Intelligence

If you want to test the application without setting up Azure Document Intelligence, you can temporarily modify the backend to use mock data.

### Option 1: Use Mock Data (Quick Testing)

1. Open `backend/controllers/pdfController.js`
2. At the top of the `processPDF` function, add:

```javascript
// TEMPORARY: Uncomment for testing without Azure
// import { mockAzureResponse } from '../utils/mockData.js'
// return parseResults(mockAzureResponse.analyzeResult)
```

3. Uncomment those lines to use mock data
4. The application will return sample extracted data

### Option 2: Mock API Response Structure

The expected Azure Document Intelligence response structure is shown in `backend/utils/mockData.js`. This can help you understand what format your custom model should return.

## Example Azure Response Structure

```json
{
  "status": "succeeded",
  "analyzeResult": {
    "apiVersion": "2024-07-31",
    "modelId": "custom-model",
    "pages": [
      {
        "pageNumber": 1,
        "lines": [
          { "content": "Project Motivation Score: 8.5" },
          { "content": "Comments: Excellent work..." }
        ]
      }
    ],
    "documents": [
      {
        "docType": "custom:rubric",
        "fields": {
          "Project Motivation Score": {
            "content": "8.5",
            "valueNumber": 8.5
          },
          "Comments": {
            "content": "Excellent work...",
            "valueString": "Excellent work..."
          }
        }
      }
    ]
  }
}
```

## Testing the Full Flow

1. **Start Backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Test Upload:**
   - Navigate to http://localhost:3000
   - Upload a sample PDF
   - Click "Process PDF"
   - Verify data appears in preview
   - Edit a field
   - Click "Download CSV"
   - Verify CSV file downloads correctly

## Expected CSV Output

The CSV file should contain:

```csv
Capstone Group Name,Advisor Name,Project Motivation Score,Constraints Score,Evaluation Metrics Score,State of the Art Score,Design Concepts Score,Concept Selection Score,Budget Score,Schedule Score,Citations Score,Questions Score,Presentation Score,Comments,Printed Name of Evaluator
Team Alpha,Dr. Smith,8.5,7.0,9.0,8.0,7.5,8.5,9.0,7.5,8.0,9.0,8.5,"Excellent work overall. Strong technical implementation.",John Doe
```

## Troubleshooting Tests

- **CORS Errors**: Ensure backend is running on port 3001
- **File Upload Fails**: Check file size (max 10MB) and format (PDF only)
- **No Data Extracted**: Verify Azure credentials and model ID are correct
- **CSV Download Issues**: Check browser console for errors

