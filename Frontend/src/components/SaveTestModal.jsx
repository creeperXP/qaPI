import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { comparisonAPI } from '../services/api'

const SaveTestModal = ({ 
  onClose, 
  onSave, 
  onDelete, // optional delete handler when editing
  testData, 
  isAllTests = false,
  initialTitle = '',
  initialNotes = '',
  initialFolderId = null
}) => {
  const [title, setTitle] = useState(initialTitle)
  const [notes, setNotes] = useState(initialNotes)
  const [reportStyle, setReportStyle] = useState('detailed') // detailed, summary, minimal
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(initialFolderId || '')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderDesc, setNewFolderDesc] = useState('')

  useEffect(() => {
    loadFolders()
  }, [])

  const loadFolders = async () => {
    try {
      const response = await comparisonAPI.getFolders()
      setFolders(response.folders || [])
    } catch (error) {
      console.error('Failed to load folders:', error)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name')
      return
    }

    try {
      const response = await comparisonAPI.createFolder({
        name: newFolderName.trim(),
        description: newFolderDesc.trim()
      })
      if (response.success) {
        await loadFolders()
        setSelectedFolder(response.id)
        setShowNewFolder(false)
        setNewFolderName('')
        setNewFolderDesc('')
      } else {
        alert('Failed to create folder: ' + (response.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Create folder failed:', error)
      alert('Failed to create folder: ' + error.message)
    }
  }

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    onSave({
      title: title.trim(),
      notes: notes.trim(),
      report_style: reportStyle,
      folder_id: selectedFolder || null,
      test_data: testData,
      saved_at: new Date().toISOString()
    })
  }

  const getPreviewData = () => {
    if (!testData) return null
    try {
      // If testData itself is a stringified JSON blob, attempt to parse/unpack it first
      let td = typeof testData === 'string' ? parseMaybeJson(testData) : testData

      // Helper to normalize a single automated_tests entry
      const normalizeAutomatedEntry = (entry) => {
        if (!entry) return entry
        // entry may be stringified
        const e = typeof entry === 'string' ? parseMaybeJson(entry) : entry

        // Extract test_case from either top-level or inside result
        let tc = e.test_case !== undefined ? parseMaybeJson(e.test_case) : null
        const res = e.result !== undefined ? parseMaybeJson(e.result) : null

        if (res && res.test_case !== undefined) {
          // prefer the test_case embedded in result if present
          tc = parseMaybeJson(res.test_case)
        }

        // If still no tc, maybe the entry itself is the test case
        const base = tc || e

        // Normalize payload field if it's a stringified JSON
        if (base && typeof base === 'object' && base.payload && typeof base.payload === 'string') {
          base.payload = parseMaybeJson(base.payload)
        }

        // Attach result metadata (status, failure_reason, any top-level result keys)
        if (res && typeof res === 'object') {
          base._result = { ...res }
          // Remove duplicated test_case in result to avoid recursion
          if (base._result.test_case) delete base._result.test_case
        }

        return base
      }

      if (isAllTests) {
        // For all-tests, prefer combined_json if present, else show full test_data
        if (td && td.combined_json && Array.isArray(td.combined_json)) {
          const parsed = td.combined_json.map((e) => normalizeAutomatedEntry(e))
          return { combined_json: parsed }
        }
        // If td looks like a wrapper { test_case: ... } then unwrap
        if (td && typeof td === 'object' && td.test_case) {
          const inner = parseMaybeJson(td.test_case)
          return inner && inner.json_content !== undefined ? inner.json_content : inner
        }
        // If td contains automated_tests array, normalize each entry
        if (td && Array.isArray(td.automated_tests)) {
          return { automated_tests: td.automated_tests.map((e) => normalizeAutomatedEntry(e)) }
        }
        return td
      }

      // Single test: unwrap stringified wrappers and prefer json_content
      if (td && td.test_case) {
        let tc = parseMaybeJson(td.test_case)
        if (tc && typeof tc === 'object' && tc.test_case) {
          tc = parseMaybeJson(tc.test_case)
        }
        // Normalize payload in the test case
        if (tc && typeof tc === 'object' && tc.payload && typeof tc.payload === 'string') {
          tc.payload = parseMaybeJson(tc.payload)
        }
        // If the td contains an automated_tests array instead, prefer first normalized
        if (tc && tc.automated_tests && Array.isArray(tc.automated_tests) && tc.automated_tests.length > 0) {
          return normalizeAutomatedEntry(tc.automated_tests[0])
        }
        return tc && tc.json_content !== undefined ? tc.json_content : tc
      }

      // If td is an object that looks like a test_case already
      if (td && typeof td === 'object' && (td.name || td.endpoint || td.payload !== undefined)) {
        return td
      }

      return td
    } catch (e) {
      return testData
    }
  }

  // Helper: try to parse strings as JSON, otherwise return original value
  const parseMaybeJson = (val) => {
    if (typeof val !== 'string') return val
    const trimmed = val.trim()
    if (!trimmed) return val
    // quick check: starts with { or [ or a quoted object
    if (!(trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"{') || trimmed.startsWith('\"{')) ) {
      return val
    }
    try {
      return JSON.parse(val)
    } catch (e) {
      // sometimes strings are double-encoded: try to unquote then parse
      try {
        const unq = trimmed.replace(/^"|"$/g, '').replace(/\\"/g, '"')
        return JSON.parse(unq)
      } catch (e2) {
        // As a last resort, try to unescape common escapes and parse
        try {
          const unescaped = trimmed.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
          const unq2 = unescaped.replace(/^"|"$/g, '').replace(/\\"/g, '"')
          return JSON.parse(unq2)
        } catch (e3) {
          return val
        }
      }
    }
  }

  const previewData = getPreviewData()
  let previewJson = ''
  try {
    previewJson = previewData ? JSON.stringify(previewData, null, 2) : ''
  } catch (e) {
    previewJson = 'Unable to render JSON preview'
  }

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewJson)
      // small, non-intrusive feedback: change button text briefly
      // (we won't add extra state to keep simple)
    } catch (e) {
      console.error('Copy failed', e)
      alert('Copy failed: ' + e.message)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-dark-card border border-dark-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-neon-cyan">
              💾 Save {isAllTests ? 'All Tests' : 'Test Case'}
            </h2>
            <div className="flex items-center space-x-2">
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm('Delete this report? This action cannot be undone.')) {
                      onDelete()
                    }
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title..."
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-neon-cyan"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or observations about this test..."
              rows="4"
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-neon-cyan resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Report Style
            </label>
            <select
              value={reportStyle}
              onChange={(e) => setReportStyle(e.target.value)}
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-neon-cyan"
            >
              <option value="detailed">Detailed - Full comparison with all differences</option>
              <option value="summary">Summary - Key findings and regressions only</option>
              <option value="minimal">Minimal - Just pass/fail status</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-white">
                Folder (Optional)
              </label>
              <button
                onClick={() => setShowNewFolder(!showNewFolder)}
                className="text-xs text-neon-purple hover:text-neon-cyan transition-colors"
              >
                {showNewFolder ? 'Cancel' : '+ New Folder'}
              </button>
            </div>
            
            {showNewFolder ? (
              <div className="space-y-2 p-3 bg-dark-bg rounded-lg border border-dark-border">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded text-white text-sm focus:outline-none focus:border-neon-purple"
                />
                <input
                  type="text"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="Description (optional)..."
                  className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded text-white text-sm focus:outline-none focus:border-neon-purple"
                />
                <button
                  onClick={handleCreateFolder}
                  className="w-full px-3 py-2 bg-neon-purple rounded text-white text-sm font-semibold hover:shadow-neon-purple transition-all"
                >
                  Create Folder
                </button>
              </div>
            ) : (
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-neon-cyan"
              >
                <option value="">No Folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Preview</label>
            {isAllTests ? (
              // For all-tests show a friendly list of JSON entries if available
              (testData && Array.isArray(testData.combined_json) && testData.combined_json.length > 0) ? (
                <div className="space-y-2">
                  {testData.combined_json.map((entry, i) => (
                    <div key={i} className="bg-dark-bg rounded-lg p-3 border border-dark-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-white">Test Payload #{i + 1}</div>
                        <div className="text-xs text-gray-400">{entry && entry.id ? `id: ${entry.id}` : ''}</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                        {entry && typeof entry === 'object' ? (
                          Object.entries(entry).map(([k, v]) => (
                            <div key={k} className="flex">
                              <div className="w-28 text-gray-400">{k}:</div>
                              <div className="break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 text-sm text-gray-300">{String(entry)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <button onClick={handleCopyPreview} className="px-3 py-1 bg-dark-bg border border-dark-border rounded text-sm text-white">Copy JSON</button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">No JSON content to preview.</div>
              )
            ) : (
              // Single test: show a cute key/value layout
              previewData && typeof previewData === 'object' ? (
                <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-lg font-semibold text-white">{previewData.name || previewData.title || 'Test'}</div>
                      <div className="text-sm text-gray-400">{previewData.description || ''}</div>
                    </div>
                    <div className="text-sm">
                      <span className="px-2 py-1 bg-dark-card rounded text-gray-300 mr-2">{previewData.method || ''}</span>
                      <span className="px-2 py-1 bg-dark-card rounded text-gray-300">{previewData.endpoint || ''}</span>
                    </div>
                  </div>
                  {previewData.payload !== undefined && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">Payload</div>
                      <pre className="max-h-40 overflow-auto bg-black/40 p-2 rounded text-xs text-gray-100 whitespace-pre-wrap">{previewData.payload ? (typeof previewData.payload === 'object' ? JSON.stringify(previewData.payload, null, 2) : String(previewData.payload)) : 'null'}</pre>
                    </div>
                  )}
                  {previewData.expected_fields && (
                    <div className="text-xs text-gray-400">Expected: <span className="text-gray-200">{(previewData.expected_fields || []).join(', ')}</span></div>
                  )}
                  <div className="flex justify-end mt-3">
                    <button onClick={handleCopyPreview} className="px-3 py-1 bg-dark-bg border border-dark-border rounded text-sm text-white">Copy JSON</button>
                  </div>
                </div>
              ) : (
                // fallback raw
                previewJson ? (
                  <div className="relative">
                    <pre className="max-h-60 overflow-auto bg-black/40 p-3 rounded text-xs text-gray-100 whitespace-pre-wrap">{previewJson}</pre>
                    <button
                      onClick={handleCopyPreview}
                      className="absolute right-2 top-2 px-2 py-1 bg-dark-bg border border-dark-border rounded text-xs text-white hover:bg-dark-card"
                    >
                      Copy
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">No JSON content to preview.</div>
                )
              )
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-gradient-cyber rounded-lg text-white font-semibold hover:shadow-neon-cyan transition-all"
            >
              💾 Save
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-dark-bg border border-dark-border rounded-lg text-white hover:border-neon-pink transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default SaveTestModal
