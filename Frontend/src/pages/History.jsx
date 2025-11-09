import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { comparisonAPI } from '../services/api'
import JsonDiff from '../components/JsonDiff'
import SaveTestModal from '../components/SaveTestModal'

const History = () => {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [editingReport, setEditingReport] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createModalData, setCreateModalData] = useState(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderDesc, setNewFolderDesc] = useState('')

  useEffect(() => {
    loadHistory()
    loadFolders()
  }, [])

  const loadHistory = async () => {
    try {
      const data = await comparisonAPI.getHistory()
      setHistory(data.history || [])
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleEditReport = (report) => {
    setEditingReport(report)
    setShowEditModal(true)
  }

  const handleDeleteReport = async (reportId) => {
    if (!reportId) return
    if (!confirm('Are you sure you want to delete this report? This will remove it from the database.')) return
    try {
      const resp = await comparisonAPI.deleteTest(reportId)
      if (resp && resp.success) {
        await loadHistory()
        setSelectedReport(null)
        setShowEditModal(false)
        setEditingReport(null)
      } else {
        alert('Failed to delete report: ' + (resp.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete report: ' + error.message)
    }
  }

  const handleSaveEdit = async (saveData) => {
    if (!editingReport) return

    try {
      const response = await comparisonAPI.updateTest(editingReport.id, {
        notes: saveData.notes,
        title: saveData.title,
        folder_id: saveData.folder_id || null
      })
      if (response.success) {
        await loadHistory()
        setShowEditModal(false)
        setEditingReport(null)
      } else {
        alert('Failed to update report: ' + (response.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Update failed:', error)
      alert('Failed to update report: ' + error.message)
    }
  }

  const filteredHistory = selectedFolder === 'all'
    ? history
    : selectedFolder === 'null'
    ? history.filter(r => !r.folder_id || r.folder_id === null || r.folder_id === '')
    : history.filter(r => String(r.folder_id || '') === String(selectedFolder))

  const getFolderName = (folderId) => {
    if (!folderId) return 'Unorganized'
    const folder = folders.find(f => f.id === folderId)
    return folder ? folder.name : 'Unknown'
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-5xl font-bold gradient-text pb-10">
              Test History
        </h1>
        <p className="text-gray-400 text-lg">
              Saved test reports and comparison history
            </p>
          </div>
          <button
            onClick={() => setShowNewFolder(true)}
            className="px-4 py-2 bg-neon-purple rounded-lg text-white font-semibold hover:shadow-neon-purple transition-all"
          >
            📁 New Folder
          </button>
        </div>

        {/* Folder Filter */}
        <div className="flex items-center space-x-4 mb-6">
          <label className="text-white font-semibold">Filter by Folder:</label>
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-neon-cyan"
          >
            <option value="all">All Reports</option>
            <option value="null">Unorganized</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              if (selectedFolder === 'all' || selectedFolder === 'null' || !selectedFolder) {
                alert('Select a real folder to delete.')
                return
              }
              if (!confirm('Delete selected folder and set folder_id to NULL on associated reports?')) return
              try {
                const resp = await comparisonAPI.deleteFolder(selectedFolder)
                if (resp && resp.success) {
                  await loadFolders()
                  await loadHistory()
                  setSelectedFolder('all')
                } else {
                  alert('Failed to delete folder: ' + (resp.error || 'Unknown error'))
                }
              } catch (e) {
                console.error('Delete folder failed:', e)
                alert('Failed to delete folder: ' + e.message)
              }
            }}
            className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            title="Delete selected folder"
          >
            🗑️ Delete Folder
          </button>
        </div>

        {/* New Folder Modal */}
        {showNewFolder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewFolder(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-neon-purple mb-4">Create New Folder</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Folder Name *</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name..."
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-neon-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Description</label>
                  <textarea
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                    placeholder="Folder description..."
                    rows="3"
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-neon-purple resize-none"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCreateFolder}
                    className="flex-1 px-4 py-2 bg-neon-purple rounded-lg text-white font-semibold hover:shadow-neon-purple transition-all"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFolder(false)
                      setNewFolderName('')
                      setNewFolderDesc('')
                    }}
                    className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white hover:border-neon-pink transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📜</div>
          <p className="text-gray-400">
            No saved test reports yet. Save tests from the Comparison page to see them here.
          </p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📜</div>
          <p className="text-gray-400">
            No reports in this folder.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Report List */}
          <div className="space-y-4 max-h-[800px] overflow-y-auto">
            {filteredHistory.map((report, idx) => {
              const formatted = formatReportData(report)
              const folderName = getFolderName(report.folder_id)
              return (
            <motion.div
                  key={report.id || idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedReport(prev => (prev && prev.id === report.id) ? null : report)}
                  className={`bg-dark-card border rounded-xl p-6 cursor-pointer transition-all hover:border-neon-cyan ${
                    selectedReport?.id === report.id ? 'border-neon-cyan' : 'border-dark-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">
                      {report.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        report.test_type === 'all_tests' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-neon-cyan/20 text-neon-cyan'
                      }`}>
                        {report.test_type === 'all_tests' ? 'All Tests' : 'Single'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditReport(report)
                        }}
                        className="px-2 py-1 text-neon-pink hover:bg-neon-pink/20 rounded text-xs transition-colors"
                        title="Edit report"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-xs text-gray-500">
                      {new Date(report.saved_at).toLocaleString()}
                    </span>
                    {report.folder_id && (
                      <span className="px-2 py-1 bg-neon-purple/20 text-neon-purple rounded text-xs">
                        📁 {folderName}
                      </span>
                    )}
                  </div>

                  {report.notes && (
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                      {report.notes}
                    </p>
                  )}

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="px-2 py-1 bg-dark-bg rounded text-gray-400">
                      {report.report_style || 'detailed'}
                    </span>
                    {report.test_type === 'all_tests' && formatted.total !== undefined && (
                      <>
                        <span className="text-green-400">
                          ✓ {formatted.passed || 0} passed
                        </span>
                        <span className="text-red-400">
                          ✗ {formatted.failed || 0} failed
                        </span>
                      </>
                    )}
                    {report.test_type === 'single' && formatted.status && (
                      <span className={`px-2 py-1 rounded ${
                        formatted.status === 'passed' ? 'bg-green-500/20 text-green-400' :
                        formatted.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {formatted.status}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Right: Report Details */}
          <div className="space-y-6 max-h-[800px] overflow-y-auto">
            {selectedReport ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-neon-cyan">
                      {selectedReport.title}
                    </h2>
                    <button
                      onClick={() => handleEditReport(selectedReport)}
                      className="px-3 py-1 bg-neon-pink/20 border border-neon-pink rounded text-neon-pink text-sm hover:bg-neon-pink hover:text-white transition-all"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    Saved: {new Date(selectedReport.saved_at).toLocaleString()}
                  </p>
                  {selectedReport.folder_id && (
                    <div className="mb-4">
                      <span className="px-3 py-1 bg-neon-purple/20 text-neon-purple rounded text-sm">
                        📁 {getFolderName(selectedReport.folder_id)}
                      </span>
                    </div>
                  )}
                  {selectedReport.notes && (
                    <div className="bg-dark-bg rounded-lg p-4 mb-4">
                      <h3 className="text-sm font-semibold text-neon-pink mb-2">Notes:</h3>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {selectedReport.notes}
                      </p>
                    </div>
                  )}
                  
                  {/* Gemini AI Summary from Database - Above Deep Analyze Button */}
                  {selectedReport.ainotes && (
                    <div className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/50 rounded-lg p-4 mb-4">
                      <h3 className="text-sm font-semibold text-neon-cyan mb-2 flex items-center">
                        <span className="mr-2">🤖</span>
                        Gemini AI Summary:
                      </h3>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap">
                        {selectedReport.ainotes}
                      </p>
                    </div>
                  )}
                  
                  {/* Analyze Button - Always visible */}
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        // Navigate to analysis page with report ID to load or generate
                        navigate(`/analysis/${selectedReport.id}`, { state: { report: selectedReport } })
                      }}
                      className="w-full px-4 py-3 bg-gradient-cyber rounded-lg text-white font-semibold hover:shadow-neon-cyan transition-all flex items-center justify-center space-x-2"
                    >
                      <span>🔬</span>
                      <span>Deep Analyze Report</span>
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {selectedReport.id ? 'Load or generate comprehensive analysis' : 'Generate comprehensive analysis from developer, user, and business perspectives'}
                    </p>
                  </div>
                </div>

                {selectedReport.test_type === 'all_tests' ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">All Test Results</h3>
                    {(selectedReport.test_data?.automated_tests || []).map((test, idx) => (
                      <div key={idx} className="bg-dark-bg rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white">{test.test_case?.name}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            test.result?.status === 'passed' ? 'bg-green-500 text-white' :
                            test.result?.status === 'failed' ? 'bg-red-500 text-white' :
                            'bg-yellow-500 text-black'
                          }`}>
                            {test.result?.status || 'not run'}
                          </span>
                        </div>
                        {test.result?.result?.is_regression && (
                          <div className="text-xs text-red-400 mt-2">
                            {test.result.result.differences.length} regression(s) detected
                          </div>
                        )}
                      </div>
                    ))}
                    {(selectedReport.test_data?.manual_tests || []).map((test, idx) => (
                      <div key={idx} className="bg-dark-bg rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white">{test.test_case?.name}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            test.result?.status === 'passed' ? 'bg-green-500 text-white' :
                            test.result?.status === 'failed' ? 'bg-red-500 text-white' :
                            'bg-yellow-500 text-black'
                          }`}>
                            {test.result?.status || 'not run'}
                  </span>
                        </div>
                        {test.result?.result?.is_regression && (
                          <div className="text-xs text-red-400 mt-2">
                            {test.result.result.differences.length} regression(s) detected
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Combined JSON Section for All Tests */}
                    {selectedReport.json && (
                      <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
                        <h3 className="text-md font-bold text-neon-cyan mb-3">
                          📄 Combined Test JSON
                        </h3>
                        <div className="max-h-[400px] overflow-y-auto bg-dark-card rounded p-3 border border-dark-border">
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                            {JSON.stringify(selectedReport.json, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Fallback: Show JSON from test_data if json column is empty */}
                    {!selectedReport.json && selectedReport.test_data?.combined_json && (
                      <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
                        <h3 className="text-md font-bold text-neon-cyan mb-3">
                          📄 Combined Test JSON
                        </h3>
                        <div className="max-h-[400px] overflow-y-auto bg-dark-card rounded p-3 border border-dark-border">
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                            {JSON.stringify(selectedReport.test_data.combined_json, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedReport.test_data?.result?.result && (
                      <>
                        {selectedReport.test_data.result.result.is_regression && (
                          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
                            <h3 className="text-lg font-bold text-red-400 mb-2">
                              Regression Detected
                            </h3>
                            <p className="text-gray-300">
                              {selectedReport.test_data.result.result.differences.length} difference(s) found
                            </p>
                          </div>
                        )}
                        <JsonDiff result={selectedReport.test_data.result.result} />
                      </>
                    )}
                    
                    {/* JSON Section for Single Test */}
                    {selectedReport.json && (
                      <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
                        <h3 className="text-md font-bold text-neon-cyan mb-3">
                          📄 Test JSON
                        </h3>
                        <div className="max-h-[400px] overflow-y-auto bg-dark-card rounded p-3 border border-dark-border">
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                            {JSON.stringify(selectedReport.json, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Fallback: Show JSON from test_data if json column is empty */}
                    {!selectedReport.json && selectedReport.test_data?.test_case?.json_content && (
                      <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
                        <h3 className="text-md font-bold text-neon-cyan mb-3">
                          📄 Test JSON
                        </h3>
                        <div className="max-h-[400px] overflow-y-auto bg-dark-card rounded p-3 border border-dark-border">
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                            {JSON.stringify(selectedReport.test_data.test_case.json_content, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-dark-card border border-dark-border rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">📋</div>
                    <div className="space-y-4">
                      <p className="text-gray-400">No report selected.</p>
                      <div className="flex space-x-2 justify-center">
                        <button
                          onClick={() => {
                            // Open create modal with empty/default data
                            setCreateModalData({ automated_tests: [], manual_tests: [] })
                            setShowCreateModal(true)
                          }}
                          className="px-4 py-2 bg-neon-purple rounded-lg text-white font-semibold hover:shadow-neon-purple transition-all"
                        >
                          ➕ Add New Report
                        </button>
                      </div>
                    </div>
              </div>
            )}
                </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingReport && (
        <SaveTestModal
          onClose={() => {
            setShowEditModal(false)
            setEditingReport(null)
          }}
          onSave={handleSaveEdit}
          onDelete={() => handleDeleteReport(editingReport.id)}
          testData={editingReport.test_data}
          isAllTests={editingReport.test_type === 'all_tests'}
          initialTitle={editingReport.title}
          initialNotes={editingReport.notes}
          initialFolderId={editingReport.folder_id}
        />
      )}

      {/* Create Modal for new reports */}
      {showCreateModal && (
        <SaveTestModal
          onClose={() => {
            setShowCreateModal(false)
            setCreateModalData(null)
          }}
          onSave={async (reportData) => {
            try {
              const response = await comparisonAPI.saveTest(reportData)
              if (response && response.success) {
                await loadHistory()
                setShowCreateModal(false)
                setCreateModalData(null)
              } else {
                alert('Failed to create report: ' + (response.error || 'Unknown error'))
              }
            } catch (error) {
              console.error('Create report failed:', error)
              alert('Failed to create report: ' + error.message)
            }
          }}
          testData={createModalData}
          isAllTests={false}
          initialTitle={''}
          initialNotes={''}
          initialFolderId={null}
        />
      )}
    </div>
  )

  function formatReportData(report) {
    const testData = report.test_data || {}
    const reportStyle = report.report_style || 'detailed'

    if (report.test_type === 'all_tests') {
      const automated = testData.automated_tests || []
      const manual = testData.manual_tests || []
      const allTests = [...automated, ...manual]
      
      if (reportStyle === 'minimal') {
        return {
          total: allTests.length,
          passed: allTests.filter(t => t.result?.status === 'passed').length,
          failed: allTests.filter(t => t.result?.status === 'failed').length,
          errors: allTests.filter(t => t.result?.status === 'error').length
        }
      } else if (reportStyle === 'summary') {
        const regressions = allTests.filter(t => t.result?.result?.is_regression).length
        return {
          total: allTests.length,
          passed: allTests.filter(t => t.result?.status === 'passed').length,
          failed: allTests.filter(t => t.result?.status === 'failed').length,
          regressions,
          keyFindings: allTests
            .filter(t => t.result?.result?.is_regression)
            .slice(0, 3)
            .map(t => ({
              name: t.test_case?.name,
              differences: t.result?.result?.differences?.length || 0
            }))
        }
      } else {
        return { allTests, automated, manual }
      }
    } else {
      // Single test
      const result = testData.result
      if (reportStyle === 'minimal') {
        return {
          status: result?.status,
          hasRegression: result?.result?.is_regression || false
        }
      } else if (reportStyle === 'summary') {
        return {
          status: result?.status,
          regressionCount: result?.result?.differences?.length || 0,
          severity: result?.result?.regression_severity,
          keyDifferences: result?.result?.differences?.slice(0, 3) || []
        }
      } else {
        return { testCase: testData.test_case, result }
      }
    }
  }
}

export default History
