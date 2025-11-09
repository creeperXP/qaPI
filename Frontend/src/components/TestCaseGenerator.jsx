import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { aiAPI } from '../services/api'

const TestCaseGenerator = ({
  onGenerate,
  testCases,
  onRunAll,
  onExport,
  runningTests,
  testResults,
  showControls = true,
  onTestCaseClick,
  v1Version = 'v1',
  v2Version = 'v2',
  onSaveTest
}) => {
  const [generating, setGenerating] = useState(false)
  const [serviceDescription, setServiceDescription] = useState('')
  const [numTestCases, setNumTestCases] = useState(5)

  const generateTestCases = async () => {
    setGenerating(true)
    try {
      console.log('🔄 Generating test cases with description:', serviceDescription || 'CRUD operations for a service')
      // Call Gemini/Nemotron to generate test cases with specified number
      const response = await aiAPI.generateTestCases(
        serviceDescription || 'CRUD operations for a service',
        numTestCases || 5
      )
      console.log('✅ Received response:', response)
      if (response && response.test_cases && response.test_cases.length > 0) {
        console.log(`✅ Generated ${response.test_cases.length} test cases`)
        onGenerate(response.test_cases)
      } else {
        console.warn('⚠️  No test cases in response, using fallback')
        throw new Error('No test cases generated')
      }
    } catch (error) {
      console.error('❌ Failed to generate test cases:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error'
      console.error('Error details:', errorMsg)
      alert(`Failed to generate test cases: ${errorMsg}\n\nUsing default test cases instead.`)
      // Fallback to default test cases
      const defaultCases = [
        {
          name: 'Create Item',
          method: 'POST',
          endpoint: '/api/v1/create',
          payload: JSON.stringify({ name: 'Test Item', value: 100 }, null, 2),
          expected_fields: ['id', 'name', 'value', 'createdAt'],
          description: 'Test creating a new item'
        },
        {
          name: 'Get All Items',
          method: 'GET',
          endpoint: '/api/v1/get',
          payload: null,
          expected_fields: ['items', 'count'],
          description: 'Test retrieving all items'
        },
        {
          name: 'Update Item',
          method: 'PUT',
          endpoint: '/api/v1/update/{id}',
          payload: JSON.stringify({ name: 'Updated Item', value: 200 }, null, 2),
          expected_fields: ['id', 'name', 'value', 'updatedAt'],
          description: 'Test updating an existing item'
        },
        {
          name: 'Delete Item',
          method: 'DELETE',
          endpoint: '/api/v1/delete/{id}',
          payload: null,
          expected_fields: ['message'],
          description: 'Test deleting an item'
        }
      ]
      onGenerate(defaultCases)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-2">
      {showControls && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Describe your service (optional)"
              className="flex-1 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white text-xs focus:outline-none focus:border-neon-cyan"
            />
            <input
              type="number"
              min="1"
              max="50"
              value={numTestCases}
              onChange={(e) => setNumTestCases(parseInt(e.target.value) || 5)}
              className="w-20 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white text-xs focus:outline-none focus:border-neon-cyan"
              placeholder="Count"
            />
            <button
              onClick={generateTestCases}
              disabled={generating}
              className="px-3 py-2 bg-neon-purple rounded-lg text-white text-xs font-semibold hover:shadow-neon-purple transition-all disabled:opacity-50"
            >
              {generating ? '🔄' : '✨ Generate'}
            </button>
          </div>
          {testCases.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={onRunAll}
                disabled={runningTests}
                className="px-3 py-1 bg-gradient-cyber rounded-lg text-white text-xs font-semibold hover:shadow-neon-cyan transition-all disabled:opacity-50"
              >
                {runningTests ? '⏳ Running...' : '▶️ Run All'}
              </button>
              <button
                onClick={onExport}
                className="px-3 py-1 bg-dark-bg border border-dark-border rounded-lg text-white text-xs hover:border-neon-cyan transition-colors"
              >
                💾 Export
              </button>
            </div>
          )}
        </div>
      )}

      {testCases.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-400 mb-2 px-2">
            {testCases.length} test case(s) {runningTests && '(running...)'}
          </div>
          {testCases.map((testCase, index) => {
            const result = testResults.find(r => r.name === testCase.name)
            return (
              <div
                key={index}
                className={`p-3 rounded-lg border transition-all ${
                  result
                    ? result.status === 'passed'
                      ? 'border-green-500 bg-green-500/10'
                      : result.status === 'failed'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-yellow-500 bg-yellow-500/10'
                    : 'border-dark-border bg-dark-bg'
                }`}
              >
                <div 
                  onClick={() => onTestCaseClick && onTestCaseClick(testCase)}
                  className="cursor-pointer"
                >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{testCase.name}</span>
                    <span className="px-2 py-1 bg-dark-card rounded text-xs text-gray-400">
                      {testCase.method}
                    </span>
                    {result && result.result && (
                      <>
                        {result.result.is_regression && (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            result.result.regression_severity === 'critical' ? 'bg-red-600 text-white' :
                            result.result.regression_severity === 'high' ? 'bg-orange-500 text-white' :
                            result.result.regression_severity === 'medium' ? 'bg-yellow-500 text-black' :
                            'bg-yellow-400 text-black'
                          }`}>
                            {result.result.regression_severity?.toUpperCase() || 'MEDIUM'}
                          </span>
                        )}
                        {result.result.is_regression && (
                          <span className="px-2 py-1 bg-red-500/20 border border-red-500 rounded text-xs font-semibold text-red-400">
                            {result.result.differences?.length || 0} regression{result.result.differences?.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {/* Request Times */}
                        {(result.result.v1_request_time_ms !== undefined || result.result.v2_request_time_ms !== undefined) && (
                          <span className="px-2 py-1 bg-dark-card border border-dark-border rounded text-xs text-gray-300">
                            ⏱️ {result.result.v1_request_time_ms || 0}ms / {result.result.v2_request_time_ms || 0}ms
                          </span>
                        )}
                        {/* Risk Counts */}
                        {result.risk_counts && (
                          <div className="flex items-center space-x-1">
                            {result.risk_counts.high > 0 && (
                              <span className="px-2 py-1 bg-red-500/20 border border-red-500 rounded text-xs text-red-400">
                                🔴 {result.risk_counts.high}
                              </span>
                            )}
                            {result.risk_counts.medium > 0 && (
                              <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500 rounded text-xs text-yellow-400">
                                🟡 {result.risk_counts.medium}
                              </span>
                            )}
                            {result.risk_counts.low > 0 && (
                              <span className="px-2 py-1 bg-green-500/20 border border-green-500 rounded text-xs text-green-400">
                                🟢 {result.risk_counts.low}
                              </span>
                            )}
                          </div>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          result.status === 'passed'
                            ? 'bg-green-500 text-white'
                            : result.status === 'failed'
                            ? 'bg-red-500 text-white'
                            : 'bg-yellow-500 text-black'
                        }`}>
                          {result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '⚠'}
                        </span>
                      </>
                    )}
                    {result && !result.result && (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        result.status === 'passed'
                          ? 'bg-green-500 text-white'
                          : result.status === 'failed'
                          ? 'bg-red-500 text-white'
                          : 'bg-yellow-500 text-black'
                      }`}>
                        {result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '⚠'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 font-mono mb-1">
                  {testCase.endpoint}
                </div>
                {testCase.payload && (
                  <div className="text-xs text-gray-500 mt-2 font-mono bg-dark-card p-2 rounded overflow-x-auto">
                    {testCase.payload.substring(0, 80)}
                    {testCase.payload.length > 80 && '...'}
                  </div>
                )}
                {result && result.result && (
                  <div className="mt-2 space-y-2">
                    {/* Comparison Summary */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-gray-400">
                        Comparing: <span className="text-neon-cyan font-semibold">{v1Version || 'v1'}</span> vs <span className="text-neon-pink font-semibold">{v2Version || 'v2'}</span>
                      </div>
                    </div>
                    
                    {/* Differences Summary - Always show if differences exist */}
                    {result.result.differences && result.result.differences.length > 0 && (
                      <div className="text-xs bg-red-500/10 border border-red-500/30 rounded p-2">
                        <div className="font-semibold text-red-400 mb-2">
                          Differences Found ({result.result.differences.length}):
                        </div>
                        <div className="space-y-1.5 text-gray-300">
                          {result.result.differences.slice(0, 5).map((diff, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-red-400">•</span>
                              <div className="flex-1">
                                <span className="font-mono text-neon-cyan">{diff.path || 'unknown'}</span>
                                <span className="text-gray-500 mx-1">:</span>
                                <span className="text-yellow-400">{diff.type || 'unknown'}</span>
                                {diff.v1_value !== undefined && (
                                  <div className="text-gray-500 text-xs mt-0.5 ml-4">
                                    v1: <span className="font-mono">{String(diff.v1_value).substring(0, 30)}{String(diff.v1_value).length > 30 ? '...' : ''}</span>
                                  </div>
                                )}
                                {diff.v2_value !== undefined && (
                                  <div className="text-gray-500 text-xs mt-0.5 ml-4">
                                    v2: <span className="font-mono">{String(diff.v2_value).substring(0, 30)}{String(diff.v2_value).length > 30 ? '...' : ''}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {result.result.differences.length > 5 && (
                            <div className="text-gray-500 italic mt-2 pt-1 border-t border-gray-700">
                              + {result.result.differences.length - 5} more difference{result.result.differences.length - 5 !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Permission Warning */}
                    {result.permission_denied && (
                      <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/30 p-2 rounded">
                        <div className="font-semibold mb-1">⚠️ Permission Issue:</div>
                        <div>Test requires admin role but was run with current role. Comparison still performed below.</div>
                      </div>
                    )}
                    
                    {/* Success Message */}
                    {!result.result.is_regression && result.status === 'passed' && (
                      <div className="text-xs text-green-400 bg-green-500/10 p-2 rounded">
                        ✓ No regressions detected - APIs match perfectly
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 pt-1">
                      Click for detailed Gemini analysis
                    </div>
                  </div>
                )}
                
                {/* Show result even if no comparison result but has failure */}
                {result && !result.result && (
                  <div className="mt-2 space-y-2">
                    {result.failure_reason && (
                      <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                        <div className="font-semibold mb-1">Error:</div>
                        <div>{result.failure_reason}</div>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Click to view details
                    </div>
                  </div>
                )}
                {!result && (
                  <div className="mt-2 text-xs text-gray-500">
                    Click to view details
                  </div>
                )}
                </div>
                {onSaveTest && result && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSaveTest(testCase, result)
                    }}
                    className="mt-2 w-full px-3 py-1 bg-neon-purple/20 border border-neon-purple rounded text-xs text-neon-purple hover:bg-neon-purple hover:text-white transition-all"
                  >
                    💾 Save This Test
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">🤖</div>
          <p className="text-xs">Click "Generate" to create test cases</p>
        </div>
      )}
    </div>
  )
}

export default TestCaseGenerator
