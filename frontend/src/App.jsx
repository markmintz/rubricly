// App.jsx
import { useState } from 'react'
import Header from './components/Header'
import MainContent from './components/middleContent'
import Footer from './components/footer'

function App() {
  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile)
    setParsedData(null)
    setError(null)
  }

  const handleProcess = async () => {
    if (!file) {
      setError('Please select a PDF file first')
      return
    }

    setLoading(true)
    setError(null)
    setProgress(null)

    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const startResponse = await fetch('/api/upload-with-progress', {
        method: 'POST',
        body: formData,
      })

      if (!startResponse.ok) {
        const errorData = await startResponse.json()
        throw new Error(errorData.error || 'Failed to start PDF processing')
      }

      const { jobId } = await startResponse.json()

      let done = false
      while (!done) {
        const statusResponse = await fetch(`/api/upload-status/${jobId}`)
        if (!statusResponse.ok) {
          const errorData = await statusResponse.json()
          throw new Error(errorData.error || 'Failed to get processing status')
        }

        const statusData = await statusResponse.json()

        if (statusData.status === 'processing') {
          if (statusData.totalRubrics > 0) {
            setProgress({
              current: statusData.currentRubric,
              total: statusData.totalRubrics,
            })
          }
        } else if (statusData.status === 'done') {
          setProgress(null)
          setParsedData(statusData.result)
          done = true
        } else if (statusData.status === 'error') {
          throw new Error(statusData.error || 'Failed to process PDF')
        }

        if (!done) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred while processing the PDF')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setParsedData(null)
    setError(null)
    setProgress(null)
  }

  const handleDataUpdate = (updatedData) => {
    setParsedData(updatedData)
  }

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Header with ShapeShifter Background */}
      <Header />

      {/* Main Content Section */}
      <main className="flex-grow flex items-center justify-center w-full">
        <MainContent
          file={file}
          onFileSelect={handleFileSelect}
          onProcess={handleProcess}
          onClear={handleClear}
          loading={loading}
          error={error}
          progress={progress}
          parsedData={parsedData}
          onDataUpdate={handleDataUpdate}
        />
      </main>

      {/* Footer Section */}
      <Footer />
    </div>
  )
}

export default App