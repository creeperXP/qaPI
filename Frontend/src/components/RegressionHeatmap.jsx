import React from 'react'
import { motion } from 'framer-motion'

const RegressionHeatmap = ({ results }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getSeverityGlow = (severity) => {
    switch (severity) {
      case 'critical':
        return 'shadow-neon-pink'
      case 'high':
        return 'shadow-orange-500/50'
      case 'medium':
        return 'shadow-yellow-500/50'
      default:
        return ''
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-xl p-6 mb-8"
    >
      <h3 className="text-xl font-bold mb-6 text-neon-cyan">
        🔥 Regression Heatmap
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {results.map((result, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-4 rounded-lg border ${
              result.is_regression
                ? `border-red-500 ${getSeverityGlow(result.regression_severity)}`
                : 'border-green-500'
            } bg-dark-bg`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-sm text-gray-300">
                {result.method} {result.endpoint}
              </div>
              {result.is_regression && (
                <div className={`w-3 h-3 rounded-full ${getSeverityColor(result.regression_severity)} ${getSeverityGlow(result.regression_severity)}`} />
              )}
            </div>
            <div className="text-xs text-gray-400">
              {result.is_regression ? (
                <span className="text-red-400">
                  {result.differences.length} regression(s)
                </span>
              ) : (
                <span className="text-green-400">✓ No regressions</span>
              )}
            </div>
            {result.regression_severity && (
              <div className="mt-2 text-xs font-semibold text-gray-500 uppercase">
                {result.regression_severity}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default RegressionHeatmap



