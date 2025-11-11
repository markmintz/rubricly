import { useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function App() {
  const [files, setFiles] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [highlight, setHighlight] = useState(true)

  const handleFileChange = (e) => {
    const list = Array.from(e.target.files || [])
    setFiles(list)
    setResults([])
    setError('')
  }

  const handleClear = () => {
    setFiles([])
    setResults([])
    setError('')
  }

  const handleExtract = async () => {
    if (!files.length) return
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      for (const f of files) form.append('files', f)

      const res = await fetch(`${API_BASE}/extract`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch (err) {
      setError(err.message || 'Failed to extract text')
    } finally {
      setLoading(false)
    }
  }

  const allText = useMemo(() => results.map(r => `# ${r.filename}\n\n${r.text}`).join('\n\n\n'), [results])

  const handleDownloadTxt = () => {
    const blob = new Blob([allText || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rubric-extracted.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderTextWithHighlights = (text) => {
    if (!highlight) return <pre className="whitespace-pre-wrap text-sm">{text}</pre>
    const re = /(score|scores|comment|comments)/gi
    const parts = text.split(re)
    return (
      <pre className="whitespace-pre-wrap text-sm">
        {parts.map((p, i) =>
          re.test(p) ? (
            <mark key={i} className="bg-yellow-200 text-black px-1 rounded">{p}</mark>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </pre>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-semibold">Rubricly OCR</h1>
          <p className="text-sm text-gray-600">Upload rubric PDF(s) → Extract text via OCR</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white shadow-sm rounded-lg p-4 border">
          <div className="flex flex-col gap-3">
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {files.length > 0 && (
              <ul className="text-sm text-gray-700 list-disc pl-5">
                {files.map((f) => (
                  <li key={f.name}>{f.name}</li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleExtract}
                disabled={!files.length || loading}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-pulse">Processing…</span>
                ) : (
                  <span>Extract Text</span>
                )}
              </button>
              <button
                onClick={handleClear}
                className="rounded-md border px-3 py-2 text-sm bg-white hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleDownloadTxt}
                disabled={!results.length}
                className="rounded-md border px-3 py-2 text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Download .txt
              </button>
              <label className="ml-auto flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
                Highlight terms
              </label>
            </div>

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
          </div>
        </section>

        {!!results.length && (
          <section className="bg-white shadow-sm rounded-lg p-4 border">
            <h2 className="text-lg font-medium mb-3">Extracted Text</h2>
            <div className="space-y-6 max-h-[60vh] overflow-auto">
              {results.map((r) => (
                <div key={r.filename} className="border rounded-md p-3">
                  <div className="font-semibold mb-2">{r.filename}</div>
                  {renderTextWithHighlights(r.text || '')}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
