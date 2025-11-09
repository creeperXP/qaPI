import React from 'react'
import { motion } from 'framer-motion'
import TestCaseGenerator from './TestCaseGenerator'

const AutomatedTestsSection = ({
  autoRole,
  setAutoRole,
  testCases,
  setTestCases,
  testResults,
  autoRunning,
  runAutoTests,
  exportTestCases,
  handleTestCaseClick,
  v1Version,
  v2Version,
  handleSaveSingleTest,
  handleSaveAllTests
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-dark-card border border-dark-border rounded-xl overflow-hidden"
      style={{ height: '350px ', display: 'flex', flexDirection: 'column' }}
    >
      <div className="p-4 border-b border-dark-border bg-dark-bg flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neon-cyan">
            🤖 Automated Tests
          </h3>
          <select
            value={autoRole}
            onChange={(e) => {
              setAutoRole(e.target.value)
              // Re-run tests with new role if tests exist
              if (testCases.length > 0) {
                runAutoTests()
              }
            }}
            className="px-3 py-1 bg-dark-card border border-dark-border rounded text-white text-xs focus:outline-none focus:border-neon-cyan"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="guest">Guest</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <TestCaseGenerator
          onGenerate={(cases) => setTestCases(cases)}
          testCases={testCases}
          onRunAll={runAutoTests}
          onExport={exportTestCases}
          runningTests={autoRunning}
          testResults={testResults}
          showControls={true}
          onTestCaseClick={handleTestCaseClick}
          v1Version={v1Version}
          v2Version={v2Version}
          onSaveTest={handleSaveSingleTest}
        />
      </div>
      {testCases.length > 0 && (
        <div className="p-4 border-t border-dark-border bg-dark-bg flex-shrink-0">
          <button
            onClick={handleSaveAllTests}
            className="w-full px-4 py-2 bg-neon-purple rounded-lg text-white text-sm font-semibold hover:shadow-neon-purple transition-all"
          >
            💾 Save All Tests
          </button>
        </div>
      )}
    </motion.div>
  )
}

export default AutomatedTestsSection


