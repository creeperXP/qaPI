import React from 'react'
import { motion } from 'framer-motion'

const EndpointMap = ({ results }) => {
  const getStatusColor = (result) => {
    if (!result.is_regression) return 'text-neon-green'
    if (result.regression_severity === 'critical') return 'text-red-400'
    if (result.regression_severity === 'high') return 'text-orange-400'
    return 'text-yellow-400'
  }

  const getStatusGlow = (result) => {
    if (!result.is_regression) return 'shadow-neon-cyan'
    if (result.regression_severity === 'critical') return 'shadow-neon-pink'
    return ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-xl p-6 mb-8"
    >
      <h3 className="text-xl font-bold mb-6 text-neon-cyan">
        🗺️ Real-Time Endpoint Map
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((result, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-4 rounded-lg border-2 bg-dark-bg ${getStatusGlow(result)} ${
              result.is_regression ? 'border-red-500' : 'border-neon-green'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${getStatusColor(result)} ${getStatusGlow(result)}`} />
                <div>
                  <div className="font-mono font-semibold text-white">
                    {result.method} {result.endpoint}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className={`text-2xl font-bold ${getStatusColor(result)}`}>
                {result.is_regression ? '⚠️' : '✓'}
              </div>
            </div>
            {/* Request Times */}
            {(result.v1_request_time_ms !== undefined || result.v2_request_time_ms !== undefined) && (
              <div className="mt-2 text-xs text-gray-400 mb-2">
                ⏱️ v1: {result.v1_request_time_ms || 0}ms / v2: {result.v2_request_time_ms || 0}ms
              </div>
            )}
            {/* Risk Counts */}
            {result.risk_counts && (
              <div className="flex items-center space-x-2 mb-2">
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
            {result.is_regression && (
              <div className="mt-2 text-sm text-gray-300">
                <div className="text-red-400 font-semibold mb-1">
                  {result.differences?.length || 0} issue(s) detected
                </div>
                <div className="text-xs text-gray-500">
                  Severity: {result.regression_severity}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default EndpointMap



