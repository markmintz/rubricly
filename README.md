# Rubricly

A modern web application for extracting structured data from PDF evaluation forms using Azure Document Intelligence. Upload a project review rubric, extract scores and comments, preview the results, and download as CSV.

## Features

- 📄 **PDF Upload**: Drag-and-drop or browse to upload PDF files
- 🤖 **Azure Document Intelligence**: Automated parsing using custom models
- ✏️ **Editable Preview**: Review and edit extracted data before export
- 📊 **CSV Export**: Download parsed results as a CSV file
- 🎨 **Modern UI**: Clean, responsive design with smooth animations

## Project Structure

```
rubricly_updated/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Header.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   └── DataPreview.jsx
│   │   ├── utils/
│   │   │   └── csvExport.js  # CSV generation utility
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── backend/                  # Express server
│   ├── controllers/
│   │   └── pdfController.js  # Azure DI integration
│   ├── utils/
│   │   └── mockData.js       # Mock data for testing
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Azure Document Intelligence resource with:
  - API key
  - Endpoint URL
  - Custom model ID (trained on your rubric format)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd rubrickly_updated
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Configure Environment Variables

Copy the example environment file and fill in your Azure credentials:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your Azure Document Intelligence credentials:

```env
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_azure_key_here
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
MODEL_ID=your_custom_model_id
PORT=3001
```

**Where to find these values:**

- **AZURE_DOCUMENT_INTELLIGENCE_KEY**: Found in your Azure portal under "Keys and Endpoint"
- **AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT**: Your resource endpoint URL (e.g., `https://your-resource.cognitiveservices.azure.com/`)
- **MODEL_ID**: The ID of your custom trained model in Azure Document Intelligence

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# or for auto-reload: npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Production Build

**Build Frontend:**
```bash
cd frontend
npm run build
```

**Start Backend:**
```bash
cd backend
npm start
```

## Usage

1. **Upload PDF**: Drag and drop a PDF file or click to browse
2. **Process**: Click "Process PDF" to send the file to Azure Document Intelligence
3. **Review**: Check the extracted data in the preview table
4. **Edit**: Make any necessary corrections directly in the preview fields
5. **Download**: Click "Download CSV" to export the data

## Extracted Fields

The application extracts the following fields from PDF rubrics:

### Scores (11 sections)
- Project Motivation Score
- Constraints Score
- Evaluation Metrics Score
- State of the Art Score
- Design Concepts Score
- Concept Selection Score
- Budget Score
- Schedule Score
- Citations Score
- Questions Score
- Presentation Score

### Metadata
- Capstone Group Name
- Advisor Name
- Printed Name of Evaluator

### Comments
- Full comment section text

## API Endpoints

### POST /api/upload

Upload and process a PDF file.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: PDF file (form field: `pdf`)

**Response:**
```json
{
  "projectMotivationScore": "8.5",
  "constraintsScore": "7.0",
  "evaluationMetricsScore": "9.0",
  "stateOfTheArtScore": "8.0",
  "designConceptsScore": "7.5",
  "conceptSelectionScore": "8.5",
  "budgetScore": "9.0",
  "scheduleScore": "7.5",
  "citationsScore": "8.0",
  "questionsScore": "9.0",
  "presentationScore": "8.5",
  "comments": "Excellent work overall...",
  "evaluatorName": "John Doe",
  "capstoneGroup": "Team Alpha",
  "advisorName": "Dr. Smith"
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Azure Document Intelligence Setup

1. **Create Azure Resource:**
   - Go to Azure Portal
   - Create a "Document Intelligence" resource
   - Note your endpoint and key

2. **Train Custom Model:**
   - Use Azure Document Intelligence Studio
   - Upload sample PDFs with labels
   - Train a custom model for your rubric format
   - Note the model ID

3. **API Version:**
   - The application uses API version `2024-07-31`
   - Ensure your Azure resource supports this version

## Troubleshooting

### "Azure Document Intelligence credentials not configured"
- Check that `.env` file exists in the `backend` directory
- Verify all required environment variables are set

### "Failed to process PDF"
- Verify your Azure credentials are correct
- Check that your model ID is valid
- Ensure the PDF file is not corrupted
- Check Azure service status

### CORS Errors
- Ensure backend is running on port 3001
- Check that frontend proxy is configured correctly in `vite.config.js`

### File Upload Issues
- Maximum file size is 10MB
- Only PDF files are accepted
- Check browser console for detailed errors

## Development Notes

### Field Extraction Logic

The application uses multiple strategies to extract data:

1. **Structured Fields**: If Azure DI returns structured fields from your custom model, these are used directly
2. **Text Pattern Matching**: Regex patterns search for score labels and values
3. **Table Parsing**: If data is in table format, cells are analyzed
4. **Metadata Extraction**: Special patterns for evaluator name, group name, and advisor

### Customization

To customize field extraction:

1. Edit `backend/controllers/pdfController.js`
2. Modify the `normalizeKey()` function to add new field mappings
3. Update `extractScoresFromText()` for new score patterns
4. Adjust the frontend field list in `frontend/src/components/DataPreview.jsx`

## Example Mock Response

For testing without Azure, see `backend/utils/mockData.js` for an example of the expected Azure Document Intelligence response structure.

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
