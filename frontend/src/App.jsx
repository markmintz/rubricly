import { useState } from 'react';
import JSZip from 'jszip';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [zipBlob, setZipBlob] = useState(null);

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
    setError(null); // Clear previous errors on new file selection
    setPreviewData(null);
    setPreviewError(null);
    setZipBlob(null);
  };

  const handleProcessRubrics = async () => {
    if (!files.length) {
      setError('Please select at least one PDF file.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPreviewError(null);
    setPreviewData(null);
    setZipBlob(null);

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

      // Store the zip blob for preview & later download
      const blob = await response.blob();
      setZipBlob(blob);

      try {
        const zip = await JSZip.loadAsync(blob);
        // Backend always writes this CSV file name
        const csvFile = zip.file('master_rubric_data.csv');
        if (!csvFile) {
          throw new Error('master_rubric_data.csv not found in results.');
        }

        const csvText = await csvFile.async('string');
        const lines = csvText.trim().split('\n').filter(line => line.length > 0);
        if (lines.length === 0) {
          throw new Error('No data rows found in extracted CSV.');
        }

        const headers = lines[0].split(',');
        const rowLines = lines.slice(1);
        // Limit preview to first 10 rows for readability
        const previewRows = rowLines.slice(0, 10).map(line => line.split(','));

        setPreviewData({
          headers,
          rows: previewRows,
          totalRows: rowLines.length,
        });
      } catch (parseErr) {
        console.error('Failed to build preview:', parseErr);
        setPreviewError('Preview unavailable, but your ZIP is ready to download.');
      }

    } catch (err) {
      console.error('Processing failed:', err);
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadZip = () => {
    if (!zipBlob) return;

    const url = window.URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    // The filename is set by the Content-Disposition header from the backend
    a.download = 'rubric_results.zip';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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

          <div className="space-y-3">
            <button
              onClick={handleProcessRubrics}
              disabled={isProcessing || !files.length}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 transition-colors duration-300"
            >
              {isProcessing ? 'Processing...' : (zipBlob ? 'Re-process Rubrics' : 'Process Rubrics')}
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={!zipBlob}
              className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 transition-colors duration-300"
            >
              Download Results ZIP
            </button>
          </div>

          {(error || previewError) && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded-lg space-y-1">
              {error && (
                <div>
                  <strong>Error:</strong> {error}
                </div>
              )}
              {previewError && (
                <div>
                  <strong>Preview notice:</strong> {previewError}
                </div>
              )}
            </div>
          )}

          {previewData && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Preview of Extracted Data</h2>
              <p className="text-sm text-gray-500 mb-3">
                Showing first {previewData.rows.length} of {previewData.totalRows} row(s) from <code>master_rubric_data.csv</code>.
              </p>
              <div className="overflow-auto border border-gray-200 rounded-lg max-h-80">
                <table className="min-w-full text-xs text-left text-gray-700">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      {previewData.headers.map((header, idx) => (
                        <th key={idx} className="px-3 py-2 font-semibold border-b border-gray-200">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {previewData.headers.map((_, colIdx) => (
                          <td key={colIdx} className="px-3 py-1 border-b border-gray-100">
                            {row[colIdx] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
