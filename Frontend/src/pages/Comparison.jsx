import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { comparisonAPI, aiAPI } from '../services/api'
import RequestBuilder from '../components/RequestBuilder'
import SaveTestModal from '../components/SaveTestModal'
import VersionSelector from '../components/VersionSelector'
import ComparisonResults from '../components/ComparisonResults'
import AutomatedTestsSection from '../components/AutomatedTestsSection'
import ManualTestsSection from '../components/ManualTestsSection'
import WorkflowPlan from '../components/WorkflowPlan'

const Comparison = () => {
  const [baseUrl, setBaseUrl] = useState('http://localhost:8000')
  const [endpoint, setEndpoint] = useState('/create')
  const [method, setMethod] = useState('POST')
  const [headers, setHeaders] = useState([{ key: 'Content-Type', value: 'application/json' }])
  const [body, setBody] = useState('{\n  "name": "Test Item",\n  "value": 100\n}')
  const [result, setResult] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [chatQuestion, setChatQuestion] = useState('')
  const [chatResponse, setChatResponse] = useState(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [testCases, setTestCases] = useState([])
  const [manualTestCases, setManualTestCases] = useState([])
  const [runningTests, setRunningTests] = useState(false)
  const [testResults, setTestResults] = useState([])
  const [manualTestResults, setManualTestResults] = useState([])
  const [v1Version, setV1Version] = useState('v1')
  const [v2Version, setV2Version] = useState('v2')
  const [autoRole, setAutoRole] = useState('user')
  const [manualRole, setManualRole] = useState('user')
  const [manualAPI, setManualAPI] = useState('v1')
  const [autoRunning, setAutoRunning] = useState(false)
  const [selectedTestCase, setSelectedTestCase] = useState(null)
  const [selectedTestResult, setSelectedTestResult] = useState(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveModalData, setSaveModalData] = useState(null)
  const [isSavingAll, setIsSavingAll] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const jsonContent = JSON.parse(event.target.result)
          setBody(JSON.stringify(jsonContent, null, 2))
        } catch (error) {
          alert('Invalid JSON file')
        }
      }
      reader.readAsText(file)
    }
  }

  const runComparison = async () => {
    setLoading(true)
    setResult(null)
    setExplanation(null)
    setChatResponse(null)
    try {
      let payloadObj = null
      if (method === 'POST' || method === 'PUT') {
        try {
          payloadObj = JSON.parse(body)
        } catch (e) {
          alert('Invalid JSON body')
          setLoading(false)
          return
        }
      }

      // Extract endpoint path (remove base URL and version prefix if present)
      let endpointPath = endpoint
        .replace(/^https?:\/\/[^\/]+/, '') // Remove full URL
        .replace(/^\/api\/v[12]/, '') // Remove /api/v1 or /api/v2
        .replace(/^\/api/, '') // Remove /api if still present
      
      // Ensure it starts with /
      if (!endpointPath.startsWith('/')) {
        endpointPath = '/' + endpointPath
      }
      
      const comparisonResult = await comparisonAPI.compareEndpoint(
        endpointPath,
        method,
        payloadObj,
        null,
        v1Version,
        v2Version
      )
      setResult(comparisonResult)

      // Get AI explanation
      if (comparisonResult.is_regression) {
        const aiExp = await aiAPI.explainRegression(comparisonResult)
        setExplanation(aiExp)
      } else {
        setExplanation(null)
      }
    } catch (error) {
      console.error('Comparison failed:', error)
      alert('Comparison failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const askQuestion = async () => {
    if (!chatQuestion || !result) {
      alert('Please enter a question and run a comparison first')
      return
    }

    setChatResponse(null)
    setChatLoading(true)
    try {
      const response = await aiAPI.chat(chatQuestion, result)
      setChatResponse(response.response || 'No response from Gemini')
    } catch (error) {
      console.error('Chat failed:', error)
      setChatResponse(`Error: ${error.response?.data?.detail || error.message || 'Failed to get response from Gemini'}`)
    } finally {
      setChatLoading(false)
    }
  }

  // Auto-run test cases in background when they're generated
  useEffect(() => {
    if (testCases.length > 0 && !autoRunning && testResults.length === 0) {
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        runAutoTests()
      }, 500)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testCases.length])

  const runAutoTests = async () => {
    if (testCases.length === 0) return

    setAutoRunning(true)
    setTestResults([])
    
    const results = []
    for (const testCase of testCases) {
      try {
        let endpointPath = testCase.endpoint
          .replace(/^https?:\/\/[^\/]+/, '')
          .replace(/^\/api\/v[12]/, '')
          .replace(/^\/api/, '')
        
        if (!endpointPath.startsWith('/')) {
          endpointPath = '/' + endpointPath
        }
        
        endpointPath = endpointPath.replace('{id}', 'test-id-123')
        
        const testResult = await comparisonAPI.runTest(
          { ...testCase, endpoint: endpointPath },
          autoRole,
          v1Version,
          v2Version
        )
        results.push({ ...testCase, ...testResult })
      } catch (error) {
        results.push({ 
          ...testCase, 
          status: 'error', 
          failure_reason: `Error: ${error.message}` 
        })
      }
    }
    
    setTestResults(results)
    setAutoRunning(false)
  }

  const runManualTests = async () => {
    if (manualTestCases.length === 0) {
      alert('No manual test cases to run. Add test cases first.')
      return
    }

    setRunningTests(true)
    setManualTestResults([])
    
    const results = []
    for (const testCase of manualTestCases) {
      try {
        let endpointPath = testCase.endpoint
          .replace(/^https?:\/\/[^\/]+/, '')
          .replace(/^\/api\/v[12]/, '')
          .replace(/^\/api/, '')
        
        if (!endpointPath.startsWith('/')) {
          endpointPath = '/' + endpointPath
        }
        
        endpointPath = endpointPath.replace('{id}', 'test-id-123')
        
        // Use manualAPI to determine which version to compare against
        const testV1Version = manualAPI === 'v1' ? 'v1' : 'v2'
        const testV2Version = manualAPI === 'v1' ? 'v2' : 'v1'
        
        const testResult = await comparisonAPI.runTest(
          { ...testCase, endpoint: endpointPath },
          manualRole,
          testV1Version,
          testV2Version
        )
        results.push({ ...testCase, ...testResult })
      } catch (error) {
        results.push({ 
          ...testCase, 
          status: 'error', 
          failure_reason: `Error: ${error.message}` 
        })
      }
    }
    
    setManualTestResults(results)
    setRunningTests(false)
  }

  const exportTestCases = () => {
    const dataStr = JSON.stringify([...testCases, ...manualTestCases], null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'test-cases.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const addManualTestCase = () => {
    setManualTestCases([...manualTestCases, {
      name: `Manual Test ${manualTestCases.length + 1}`,
      method: 'GET',
      endpoint: `/api/${manualAPI}/endpoint`,
      payload: null,
      expected_fields: [],
      description: '',
      role: manualRole
    }])
  }

  const updateManualTestCase = (index, field, value) => {
    const updated = [...manualTestCases]
    updated[index][field] = value
    setManualTestCases(updated)
  }

  const removeManualTestCase = (index) => {
    setManualTestCases(manualTestCases.filter((_, i) => i !== index))
  }

  const handleTestCaseClick = (testCase) => {
    const result = testResults.find(r => r.name === testCase.name)
    // Toggle selection: deselect if clicking the currently selected test
    setSelectedTestCase(prev => (prev && prev.name === testCase.name) ? null : testCase)
    setSelectedTestResult(result)
  }

  const handleManualTestCaseClick = (testCase) => {
    const result = manualTestResults.find(r => r.name === testCase.name)
    // Toggle selection for manual tests as well
    setSelectedTestCase(prev => (prev && prev.name === testCase.name) ? null : testCase)
    setSelectedTestResult(result)
  }

  const handleSaveAllTests = () => {
    // Build per-test json_content and combined JSON array
    const automated = testCases.map((tc, idx) => {
      let parsed = null
      try {
        if (tc.payload && typeof tc.payload === 'string') parsed = JSON.parse(tc.payload)
        else if (tc.payload && typeof tc.payload === 'object') parsed = tc.payload
      } catch (e) {
        parsed = tc.payload
      }
      return {
        test_case: { ...tc, json_content: parsed },
        result: testResults[idx] || null
      }
    })

    const manual = manualTestCases.map((tc, idx) => {
      let parsed = null
      try {
        if (tc.payload && typeof tc.payload === 'string') parsed = JSON.parse(tc.payload)
        else if (tc.payload && typeof tc.payload === 'object') parsed = tc.payload
      } catch (e) {
        parsed = tc.payload
      }
      return {
        test_case: { ...tc, json_content: parsed },
        result: manualTestResults[idx] || null
      }
    })

    const combined_json = []
    automated.forEach(a => { if (a.test_case.json_content != null) combined_json.push(a.test_case.json_content) })
    manual.forEach(m => { if (m.test_case.json_content != null) combined_json.push(m.test_case.json_content) })

    const allTestData = {
      automated_tests: automated,
      manual_tests: manual,
      combined_json,
      v1_version: v1Version,
      v2_version: v2Version,
      auto_role: autoRole,
      manual_role: manualRole
    }
    setSaveModalData(allTestData)
    setIsSavingAll(true)
    setShowSaveModal(true)
  }

  const handleSaveSingleTest = (testCase, testResult) => {
    // Parse payload into json_content when possible
    let parsed = null
    try {
      if (testCase.payload && typeof testCase.payload === 'string') parsed = JSON.parse(testCase.payload)
      else if (testCase.payload && typeof testCase.payload === 'object') parsed = testCase.payload
    } catch (e) {
      parsed = testCase.payload
    }
    setSaveModalData({
      test_case: { ...testCase, json_content: parsed },
      result: testResult,
      v1_version: v1Version,
      v2_version: v2Version
    })
    setIsSavingAll(false)
    setShowSaveModal(true)
  }

  const handleSave = async (saveData) => {
    try {
      // Get AI explanation if there are regressions
      let aiNotes = ''
      
      if (isSavingAll) {
        // For all tests, check if any test has a regression
        const allTests = [
          ...(saveModalData.automated_tests || []),
          ...(saveModalData.manual_tests || [])
        ]
        const regressions = allTests.filter(t => t.result?.result?.is_regression)
        
        if (regressions.length > 0) {
          // Get AI explanation for the first regression
          try {
            const explanation = await aiAPI.explainRegression(regressions[0].result.result)
            aiNotes = `${explanation.explanation}\n\nSuggested Fix: ${explanation.suggested_fix || 'N/A'}\nImpact: ${explanation.impact_assessment || 'N/A'}`
          } catch (error) {
            console.error('Failed to get AI explanation:', error)
          }
        }
      } else {
        // For single test, check if there's a regression
        if (saveModalData.result?.result?.is_regression) {
          try {
            const explanation = await aiAPI.explainRegression(saveModalData.result.result)
            aiNotes = `${explanation.explanation}\n\nSuggested Fix: ${explanation.suggested_fix || 'N/A'}\nImpact: ${explanation.impact_assessment || 'N/A'}`
          } catch (error) {
            console.error('Failed to get AI explanation:', error)
          }
        }
      }
      
      const reportData = {
        ...saveData,
        test_data: saveModalData,
        test_type: isSavingAll ? 'all_tests' : 'single',
        ainotes: aiNotes
      }
      const response = await comparisonAPI.saveTest(reportData)
      if (response.success) {
        alert('Test report saved successfully!')
        setShowSaveModal(false)
        setSaveModalData(null)
      } else {
        alert('Failed to save test report: ' + (response.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Save failed:', error)
      alert('Failed to save test report: ' + error.message)
    }
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-5xl font-bold gradient-text mb-4">
          API Comparison Tool
        </h1>
        <p className="text-gray-400 text-lg">
          Interface for comparing service versions
        </p>
      </motion.div>

      {/* Version Selection */}
      <VersionSelector
        v1Version={v1Version}
        v2Version={v2Version}
        onV1Change={setV1Version}
        onV2Change={setV2Version}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Request Builder and Workflow Plan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Builder */}
          <RequestBuilder
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            endpoint={endpoint}
            setEndpoint={setEndpoint}
            method={method}
            setMethod={setMethod}
            headers={headers}
            setHeaders={setHeaders}
            body={body}
            setBody={setBody}
            onFileUpload={handleFileUpload}
            fileInputRef={fileInputRef}
            onSend={runComparison}
            loading={loading}
          />

          {/* Workflow Plan */}
        </div>

        {/* Right Panel - Automated and Manual Tests */}
        <div className="space-y-6">
          {/* Automated Test Cases */}
          <AutomatedTestsSection
            autoRole={autoRole}
            setAutoRole={setAutoRole}
            testCases={testCases}
            setTestCases={setTestCases}
            testResults={testResults}
            autoRunning={autoRunning}
            runAutoTests={runAutoTests}
            exportTestCases={exportTestCases}
            handleTestCaseClick={handleTestCaseClick}
            v1Version={v1Version}
            v2Version={v2Version}
            handleSaveSingleTest={handleSaveSingleTest}
            handleSaveAllTests={handleSaveAllTests}
          />

          {/* Manual Test Cases */}
          <ManualTestsSection
            manualAPI={manualAPI}
            setManualAPI={setManualAPI}
            manualRole={manualRole}
            setManualRole={setManualRole}
            manualTestCases={manualTestCases}
            setManualTestCases={setManualTestCases}
            manualTestResults={manualTestResults}
            runningTests={runningTests}
            runManualTests={runManualTests}
            handleManualTestCaseClick={handleManualTestCaseClick}
            handleSaveAllTests={handleSaveAllTests}
            updateManualTestCase={updateManualTestCase}
            removeManualTestCase={removeManualTestCase}
            addManualTestCase={addManualTestCase}
          />
        </div>
      </div>

      {/* Full-width Comparison Results */}
      <ComparisonResults
        result={result}
        explanation={explanation}
        chatQuestion={chatQuestion}
        setChatQuestion={setChatQuestion}
        chatResponse={chatResponse}
        chatLoading={chatLoading}
        askQuestion={askQuestion}
        v1Version={v1Version}
        v2Version={v2Version}
      />

      {/* Test Case Detail Modal - Simple replacement */}
      {selectedTestCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          setSelectedTestCase(null)
          setSelectedTestResult(null)
        }}>
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-neon-cyan">{selectedTestCase.name}</h3>
              <button
                onClick={() => {
                  setSelectedTestCase(null)
                  setSelectedTestResult(null)
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Test Case Details</h4>
                <div className="bg-dark-bg rounded-lg p-4 space-y-2">
                  <div><span className="text-gray-400">Method:</span> <span className="text-white">{selectedTestCase.method}</span></div>
                  <div><span className="text-gray-400">Endpoint:</span> <span className="text-white font-mono">{selectedTestCase.endpoint}</span></div>
                  {selectedTestCase.payload && (
                    <div>
                      <span className="text-gray-400">Payload:</span>
                      <pre className="text-xs text-gray-300 mt-1 bg-dark-card p-2 rounded overflow-x-auto">
                        {typeof selectedTestCase.payload === 'string' ? selectedTestCase.payload : JSON.stringify(selectedTestCase.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {selectedTestResult && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Test Result</h4>
                  <div className="bg-dark-bg rounded-lg p-4 space-y-2">
                    <div className={`px-3 py-1 rounded text-sm font-semibold inline-block ${
                      selectedTestResult.status === 'passed' ? 'bg-green-500 text-white' :
                      selectedTestResult.status === 'failed' ? 'bg-red-500 text-white' :
                      'bg-yellow-500 text-black'
                    }`}>
                      Status: {selectedTestResult.status?.toUpperCase()}
                    </div>
                    {selectedTestResult.result && (
                      <>
                        <div className="text-sm text-gray-300">
                          <span className="text-gray-400">Regression:</span> {selectedTestResult.result.is_regression ? 'Yes' : 'No'}
                        </div>
                        {selectedTestResult.result.differences && selectedTestResult.result.differences.length > 0 && (
                          <div className="text-sm text-gray-300">
                            <span className="text-gray-400">Differences:</span> {selectedTestResult.result.differences.length}
                          </div>
                        )}
                        {(selectedTestResult.result.v1_request_time_ms !== undefined || selectedTestResult.result.v2_request_time_ms !== undefined) && (
                          <div className="text-sm text-gray-300">
                            <span className="text-gray-400">Request Times:</span> {selectedTestResult.result.v1_request_time_ms || 0}ms / {selectedTestResult.result.v2_request_time_ms || 0}ms
                          </div>
                        )}
                        {selectedTestResult.risk_counts && (
                          <div className="text-sm text-gray-300 flex items-center space-x-2">
                            <span className="text-gray-400">Risks:</span>
                            {selectedTestResult.risk_counts.high > 0 && <span className="text-red-400">🔴 {selectedTestResult.risk_counts.high}</span>}
                            {selectedTestResult.risk_counts.medium > 0 && <span className="text-yellow-400">🟡 {selectedTestResult.risk_counts.medium}</span>}
                            {selectedTestResult.risk_counts.low > 0 && <span className="text-green-400">🟢 {selectedTestResult.risk_counts.low}</span>}
                          </div>
                        )}
                      </>
                    )}
                    {selectedTestResult.failure_reason && (
                      <div className="text-sm text-red-400 mt-2">
                        {selectedTestResult.failure_reason}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setSelectedTestCase(null)
                    setSelectedTestResult(null)
                  }}
                  className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white hover:border-neon-cyan transition-all"
                >
                  Close
                </button>
                {selectedTestResult && (
                  <button
                    onClick={() => {
                      handleSaveSingleTest(selectedTestCase, selectedTestResult)
                      setSelectedTestCase(null)
                      setSelectedTestResult(null)
                    }}
                    className="px-4 py-2 bg-neon-purple rounded-lg text-white font-semibold hover:shadow-neon-purple transition-all"
                  >
                    💾 Save Test
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Test Modal */}
      {showSaveModal && (
        <SaveTestModal
          onClose={() => {
            setShowSaveModal(false)
            setSaveModalData(null)
          }}
          onSave={handleSave}
          testData={saveModalData}
          isAllTests={isSavingAll}
        />
      )}
    </div>
  )
}

export default Comparison
