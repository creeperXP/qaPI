import React from 'react'
import { motion } from 'framer-motion'
import JsonDiff from './JsonDiff'
import AIExplanation from './AIExplanation'

const ComparisonResults = ({
  result,
  explanation,
  chatQuestion,
  setChatQuestion,
  chatResponse,
  chatLoading,
  askQuestion,
  v1Version,
  v2Version
}) => {
  // Calculate risk counts from differences
  const calculateRiskCounts = (differences) => {
    if (!differences || differences.length === 0) {
      return { low: 0, medium: 0, high: 0 }
    }
    
    const riskCounts = { low: 0, medium: 0, high: 0 }
    differences.forEach(diff => {
      if (diff.is_expected) {
        return // Skip expected differences
      }
      const severity = diff.severity || 'low'
      if (severity === 'high' || severity === 'critical') {
        riskCounts.high++
      } else if (severity === 'medium') {
        riskCounts.medium++
      } else {
        riskCounts.low++
      }
    })
    return riskCounts
  }

  const riskCounts = result ? calculateRiskCounts(result.differences) : { low: 0, medium: 0, high: 0 }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-dark-card border border-dark-border rounded-xl overflow-hidden mt-6"
    >
      <div className="p-4 border-b border-dark-border bg-dark-bg">
        <h3 className="text-lg font-bold text-neon-cyan">
          📊 Comparison Results
        </h3>
      </div>
      <div className="p-6 space-y-6">
        {/* Regression Alert */}
        {result && result.is_regression ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/20 border border-red-500 rounded-xl p-6"
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-xl font-bold text-red-400">
                Regression Detected
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                result.regression_severity === 'critical' ? 'bg-red-500' :
                result.regression_severity === 'high' ? 'bg-orange-500' :
                'bg-yellow-500'
              }`}>
                {result.regression_severity?.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-300">
              {result.differences.length} difference(s) found between {v1Version} and {v2Version}
            </p>
            {/* Risk Counts */}
            {(riskCounts.high > 0 || riskCounts.medium > 0 || riskCounts.low > 0) && (
              <div className="mt-4 pt-4 border-t border-red-500/30">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Risk Breakdown:</span>
                  <div className="flex space-x-3">
                    {riskCounts.high > 0 && (
                      <span className="px-3 py-1 bg-red-500/20 border border-red-500 rounded text-xs font-semibold text-red-400">
                        🔴 High: {riskCounts.high}
                      </span>
                    )}
                    {riskCounts.medium > 0 && (
                      <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500 rounded text-xs font-semibold text-yellow-400">
                        🟡 Medium: {riskCounts.medium}
                      </span>
                    )}
                    {riskCounts.low > 0 && (
                      <span className="px-3 py-1 bg-green-500/20 border border-green-500 rounded text-xs font-semibold text-green-400">
                        🟢 Low: {riskCounts.low}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Request Times */}
            {(result.v1_request_time_ms !== undefined || result.v2_request_time_ms !== undefined) && (
              <div className="mt-4 pt-4 border-t border-red-500/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Request Times:</span>
                  <div className="flex space-x-4">
                    {result.v1_request_time_ms !== undefined && (
                      <span className="text-neon-cyan">
                        {v1Version}: <strong>{result.v1_request_time_ms}ms</strong>
                      </span>
                    )}
                    {result.v2_request_time_ms !== undefined && (
                      <span className="text-neon-pink">
                        {v2Version}: <strong>{result.v2_request_time_ms}ms</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : result ? (
          <div className="bg-green-500/20 border border-green-500 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✓</span>
              <h3 className="text-xl font-bold text-green-400">
                No Regressions Detected
              </h3>
            </div>
            <p className="text-gray-300 mt-2">
              APIs match perfectly between {v1Version} and {v2Version}
            </p>
            {/* Risk Counts (even if no regressions, show if there are any differences) */}
            {(riskCounts.high > 0 || riskCounts.medium > 0 || riskCounts.low > 0) && (
              <div className="mt-4 pt-4 border-t border-green-500/30">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Risk Breakdown:</span>
                  <div className="flex space-x-3">
                    {riskCounts.high > 0 && (
                      <span className="px-3 py-1 bg-red-500/20 border border-red-500 rounded text-xs font-semibold text-red-400">
                        🔴 High: {riskCounts.high}
                      </span>
                    )}
                    {riskCounts.medium > 0 && (
                      <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500 rounded text-xs font-semibold text-yellow-400">
                        🟡 Medium: {riskCounts.medium}
                      </span>
                    )}
                    {riskCounts.low > 0 && (
                      <span className="px-3 py-1 bg-green-500/20 border border-green-500 rounded text-xs font-semibold text-green-400">
                        🟢 Low: {riskCounts.low}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Request Times */}
            {(result.v1_request_time_ms !== undefined || result.v2_request_time_ms !== undefined) && (
              <div className="mt-4 pt-4 border-t border-green-500/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Request Times:</span>
                  <div className="flex space-x-4">
                    {result.v1_request_time_ms !== undefined && (
                      <span className="text-neon-cyan">
                        {v1Version}: <strong>{result.v1_request_time_ms}ms</strong>
                      </span>
                    )}
                    {result.v2_request_time_ms !== undefined && (
                      <span className="text-neon-pink">
                        {v2Version}: <strong>{result.v2_request_time_ms}ms</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            <p>Run a comparison to see results here</p>
          </div>
        )}

        {/* AI Explanation */}
        {explanation && (
          <AIExplanation explanation={explanation} />
        )}

        {/* JSON Diff */}
        {result && <JsonDiff result={result} />}

        {/* Chat with Gemini */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-bg border border-dark-border rounded-xl p-6"
          >
            <h3 className="text-xl font-bold mb-4 text-neon-pink">
              🔮 Ask Gemini About This Comparison
            </h3>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !chatLoading && askQuestion()}
                placeholder={result.is_regression ? "Why does this regression matter?" : "Ask about this comparison..."}
                disabled={chatLoading}
                className="flex-1 bg-dark-card border border-dark-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-pink disabled:opacity-50"
              />
              <button
                onClick={askQuestion}
                disabled={chatLoading || !chatQuestion}
                className="px-6 py-2 bg-gradient-cyber rounded-lg text-white font-semibold hover:shadow-neon-pink transition-all disabled:opacity-50"
              >
                {chatLoading ? '⏳' : 'Ask'}
              </button>
            </div>
            {chatLoading && (
              <div className="bg-dark-card rounded-lg p-4 text-gray-400 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-pink mx-auto mb-2"></div>
                Asking Gemini...
              </div>
            )}
            {chatResponse && !chatLoading && (
              <div className="bg-dark-card rounded-lg p-4 text-gray-300 whitespace-pre-wrap">
                {chatResponse}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default ComparisonResults


