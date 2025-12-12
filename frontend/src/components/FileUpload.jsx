// FileUpload.jsx
import { useRef, useState } from 'react'

function FileUpload({ file, onFileSelect, onProcess, onClear, loading, error, progress }) {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'application/pdf') {
      onFileSelect(droppedFile)
    } else {
      alert('Please upload a PDF file')
    }
  }

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      onFileSelect(selectedFile)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="bg-card rounded-xl w-full shadow-2xl p-8 border border-gray-100"> 
      <div
        // Applying the animated line border class
        className={`rounded-xl p-12 text-center transition-all animated-line-border border-dashed ${
          isDragging
            ? 'is-dragging' // Custom class to enhance styling during drag
            : 'hover:shadow-md'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        {!file ? (
          <>
            <svg
              className="mx-auto h-16 w-auto text-primary mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-lg text-card-text mb-2"> {/* Explicitly dark text */}
              Drag and drop your PDF here, or
            </p>
            <button
              onClick={handleClick}
              className="text-primary hover:text-secondary font-semibold underline"
            >
              browse to upload
            </button>
            <p className="text-sm text-secondary mt-2">Only PDF files are accepted</p>
          </>
        ) : (
          <div className="space-y-4">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-semibold text-card-text"> {/* Explicitly dark text */}
              {file.name}
            </p>
            <p className="text-sm text-secondary">
              {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-500 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-6 flex gap-4 justify-center">
        <button
          onClick={onProcess}
          disabled={!file || loading}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${ 
            !file || loading
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-dark hover:shadow-lg transform hover:-translate-y-0.5'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              {/* Polar Bear Loader - Simple and clean */}
              <div className="polar-loader">🐻‍❄️</div> 
              <span className="text-white">Processing...</span>
            </span>
          ) : (
            'Process PDF'
          )}
        </button>

         <button
            onClick={onClear}
            disabled={loading}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            Clear
          </button>
        </div>

        {loading && progress && progress.total > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-orange-700">
              Rubric's processed: {progress.current}/{progress.total}...
            </p>
          </div>
      )}
    </div>
  )
}

export default FileUpload