import { useState } from 'react';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
    setError(null); // Clear previous errors on new file selection
  };

  const handleProcessRubrics = async () => {
    if (!files.length) {
      setError('Please select at least one PDF file.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE}/process-rubrics`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'An unknown error occurred.');
      }

      // Handle the zip file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // The filename is set by the Content-Disposition header from the backend
      a.download = 'rubric_results.zip'; 
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error('Processing failed:', err);
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-md">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Rubricly</h1>
          <p className="text-gray-600 mt-2">
            Automated Rubric Processing with Computer Vision
          </p>
        </header>

        <div className="space-y-6">
          <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {files.length > 0 && (
              <p className="text-sm text-gray-600 mt-4">
                {files.length} file(s) selected: {files.map(f => f.name).join(', ')}
              </p>
            )}
          </div>

          <button
            onClick={handleProcessRubrics}
            disabled={isProcessing || !files.length}
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 transition-colors duration-300"
          >
            {isProcessing ? 'Processing...' : 'Process Rubrics & Download Results'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <footer className="text-center mt-8 text-sm text-gray-500">
          <p>Upload your scanned rubric PDFs. The system will use OCR and OMR to extract the scores and comments, then provide a downloadable zip file containing a master CSV and any relevant comment images.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
