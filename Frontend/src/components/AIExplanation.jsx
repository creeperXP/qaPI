import React from 'react'
import { motion } from 'framer-motion'

const AIExplanation = ({ explanation }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-neon-pink/50 rounded-xl p-6 shadow-neon-pink"
    >
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-3xl">🔮</span>
        <h3 className="text-xl font-bold text-neon-pink">
          Gemini AI Explanation
        </h3>
      </div>

      <div className="bg-dark-bg rounded-lg p-4 mb-4">
        <p className="text-gray-300 leading-relaxed">
          {explanation.explanation}
        </p>
      </div>

      {explanation.suggested_fix && (
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-4">
          <div className="text-sm font-semibold text-blue-400 mb-2">
            💡 Suggested Fix
          </div>
          <p className="text-gray-300 text-sm">
            {explanation.suggested_fix}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dark-bg rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Confidence Score</div>
          <div className="text-lg font-bold text-neon-cyan">
            {(explanation.confidence_score * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-dark-bg rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Impact Assessment</div>
          <div className="text-sm font-semibold text-yellow-400">
            {explanation.impact_assessment}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default AIExplanation



