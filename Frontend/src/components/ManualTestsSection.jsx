import React from 'react'
import { motion } from 'framer-motion'

const ManualTestsSection = ({
  manualAPI,
  setManualAPI,
  manualRole,
  setManualRole,
  manualTestCases,
  setManualTestCases,
  manualTestResults,
  runningTests,
  runManualTests,
  handleManualTestCaseClick,
  handleSaveAllTests,
  updateManualTestCase,
  removeManualTestCase,
  addManualTestCase
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-dark-card border border-dark-border rounded-xl overflow-hidden"
      style={{ height: '350px', display: 'flex', flexDirection: 'column' }}
    >
      <div className="p-4 border-b border-dark-border bg-dark-bg flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neon-pink">
            ✍️ Manual Tests
          </h3>
          <div className="flex items-center space-x-2">
            <select
              value={manualAPI}
              onChange={(e) => setManualAPI(e.target.value)}
              className="px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-xs focus:outline-none focus:border-neon-pink"
              title="Select API version"
            >
              <option value="v1">API v1</option>
              <option value="v2">API v2</option>
            </select>
            <select
              value={manualRole}
              onChange={(e) => setManualRole(e.target.value)}
              className="px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-xs focus:outline-none focus:border-neon-pink"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="guest">Guest</option>
            </select>
            <button
              onClick={addManualTestCase}
              className="px-3 py-1 bg-neon-pink rounded text-white text-xs font-semibold hover:shadow-neon-pink transition-all"
            >
              + Add
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {manualTestCases.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="text-sm">Click "+ Add" to create manual test cases</p>
          </div>
        ) : (
          <div className="space-y-2">
            {manualTestCases.map((testCase, index) => {
              const result = manualTestResults.find(r => r.name === testCase.name)
              const regressionCount = result?.result?.differences?.length || 0
              return (
                <div
                  key={index}
                  onClick={() => handleManualTestCaseClick(testCase)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-neon-pink ${
                    result
                      ? result.status === 'passed'
                        ? 'border-green-500 bg-green-500/10'
                        : result.status === 'failed'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-yellow-500 bg-yellow-500/10'
                      : 'border-dark-border bg-dark-bg'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={testCase.name}
                      onChange={(e) => updateManualTestCase(index, 'name', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm focus:outline-none focus:border-neon-pink"
                      placeholder="Test name"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeManualTestCase(index)
                      }}
                      className="ml-2 px-2 py-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <select
                      value={testCase.method}
                      onChange={(e) => updateManualTestCase(index, 'method', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-xs focus:outline-none focus:border-neon-pink"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <input
                      type="text"
                      value={testCase.endpoint}
                      onChange={(e) => updateManualTestCase(index, 'endpoint', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-xs font-mono focus:outline-none focus:border-neon-pink"
                      placeholder="/api/v1/endpoint"
                    />
                  </div>
                  <textarea
                    value={testCase.payload || ''}
                    onChange={(e) => updateManualTestCase(index, 'payload', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-xs font-mono focus:outline-none focus:border-neon-pink mb-2"
                    placeholder="Payload (JSON)"
                    rows="2"
                  />
                  {result && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                        <div className={`px-2 py-1 rounded text-xs font-semibold ${
                          result.status === 'passed'
                            ? 'bg-green-500 text-white'
                            : result.status === 'failed'
                            ? 'bg-red-500 text-white'
                            : 'bg-yellow-500 text-black'
                        }`}>
                          {result.status === 'passed' ? '✓ Passed' : result.status === 'failed' ? '✗ Failed' : '⚠ Error'}
                        </div>
                        {regressionCount > 0 && (
                          <div className="text-xs text-red-400 font-semibold">
                            {regressionCount} regression{regressionCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      {/* Request Times */}
                      {result.result && (result.result.v1_request_time_ms !== undefined || result.result.v2_request_time_ms !== undefined) && (
                        <div className="text-xs text-gray-400 mt-1">
                          ⏱️ {result.result.v1_request_time_ms || 0}ms / {result.result.v2_request_time_ms || 0}ms
                        </div>
                      )}
                      {/* Risk Counts */}
                      {result.risk_counts && (
                        <div className="flex items-center space-x-1 mt-1">
                          {result.risk_counts.high > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-500/20 border border-red-500 rounded text-xs text-red-400">
                              🔴 {result.risk_counts.high}
                            </span>
                          )}
                          {result.risk_counts.medium > 0 && (
                            <span className="px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500 rounded text-xs text-yellow-400">
                              🟡 {result.risk_counts.medium}
                            </span>
                          )}
                          {result.risk_counts.low > 0 && (
                            <span className="px-1.5 py-0.5 bg-green-500/20 border border-green-500 rounded text-xs text-green-400">
                              🟢 {result.risk_counts.low}
                            </span>
                          )}
                        </div>
                      )}
                      {result.failure_reason && (
                        <div className="text-xs text-red-400 mt-1">
                          {result.failure_reason}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Click for details
                      </div>
                    </div>
                  )}
                  {!result && (
                    <div className="text-xs text-gray-500 mt-1">
                      Click to run and view details
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {manualTestCases.length > 0 && (
        <div className="p-4 border-t border-dark-border bg-dark-bg flex-shrink-0 space-y-2">
          <button
            onClick={runManualTests}
            disabled={runningTests}
            className="w-full px-4 py-2 bg-gradient-cyber rounded-lg text-white text-sm font-semibold hover:shadow-neon-pink transition-all disabled:opacity-50"
          >
            {runningTests ? '⏳ Running...' : '▶️ Run Manual Tests'}
          </button>
          {(manualTestResults.length > 0 || manualTestCases.length > 0) && (
            <button
              onClick={handleSaveAllTests}
              className="w-full px-4 py-2 bg-neon-pink rounded-lg text-white text-sm font-semibold hover:shadow-neon-pink transition-all"
            >
              💾 Save All Tests
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default ManualTestsSection


