import React, { useState } from 'react'
import { motion } from 'framer-motion'

const JsonDiff = ({ result }) => {
  const [expanded, setExpanded] = useState(false)

  const renderJson = (obj, indent = 0) => {
    if (obj === null) return <span className="text-gray-500">null</span>
    if (typeof obj !== 'object') {
      return <span className="text-neon-cyan">{JSON.stringify(obj)}</span>
    }

    return (
      <div className="ml-4">
        {Object.entries(obj).map(([key, value]) => {
          const diff = result.differences.find(d => d.path === key || d.path.startsWith(key + '.'))
          const isDifferent = !!diff
          
          return (
            <div key={key} className={`my-1 ${isDifferent ? 'bg-red-500/20 border-l-2 border-red-500 pl-2' : ''}`}>
              <span className="text-purple-400">"{key}"</span>
              <span className="text-gray-500">: </span>
              {typeof value === 'object' ? (
                <div className="ml-4">{renderJson(value, indent + 1)}</div>
              ) : (
                <span className={isDifferent ? 'text-red-400 font-semibold' : 'text-neon-cyan'}>
                  {JSON.stringify(value)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-neon-cyan">
          📊 Side-by-Side Comparison
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-gray-400 hover:text-white"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* V1 Response */}
        <div className="bg-dark-bg rounded-lg p-4 border border-neon-cyan/30">
          <div className="text-sm font-semibold text-neon-cyan mb-2">API v1 Response</div>
          <div className="font-mono text-xs overflow-x-auto">
            {expanded ? (
              <pre className="text-gray-300">{JSON.stringify(result.v1_response, null, 2)}</pre>
            ) : (
              renderJson(result.v1_response)
            )}
          </div>
        </div>

        {/* V2 Response */}
        <div className="bg-dark-bg rounded-lg p-4 border border-neon-pink/30">
          <div className="text-sm font-semibold text-neon-pink mb-2">API v2 Response</div>
          <div className="font-mono text-xs overflow-x-auto">
            {expanded ? (
              <pre className="text-gray-300">{JSON.stringify(result.v2_response, null, 2)}</pre>
            ) : (
              renderJson(result.v2_response)
            )}
          </div>
        </div>
      </div>

      {/* Differences List */}
      {result.differences.length > 0 && (
        <div className="mt-6 bg-dark-bg rounded-lg p-4 border border-yellow-500/30">
          <div className="text-sm font-semibold text-yellow-400 mb-3">
            🔍 Detected Differences ({result.differences.length})
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {result.differences.map((diff, idx) => (
              <div
                key={idx}
                className="text-xs bg-red-500/10 border-l-2 border-red-500 pl-3 py-2 rounded"
              >
                <div className="font-semibold text-red-400 mb-1">
                  Path: {diff.path}
                </div>
                <div className="text-gray-300">
                  <div>Type: {diff.type}</div>
                  <div>V1: <span className="text-neon-cyan">{JSON.stringify(diff.v1_value)}</span></div>
                  <div>V2: <span className="text-neon-pink">{JSON.stringify(diff.v2_value)}</span></div>
                  <div className="mt-1">
                    Severity: <span className={`font-semibold ${
                      diff.severity === 'high' ? 'text-red-400' :
                      diff.severity === 'medium' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>{diff.severity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default JsonDiff



