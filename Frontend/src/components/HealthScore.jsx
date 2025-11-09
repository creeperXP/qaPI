import React from 'react'
import { motion } from 'framer-motion'

const HealthScore = ({ score }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-neon-green'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreGradient = (score) => {
    if (score >= 80) return 'from-neon-green to-neon-cyan'
    if (score >= 60) return 'from-yellow-400 to-orange-400'
    if (score >= 40) return 'from-orange-400 to-red-400'
    return 'from-red-400 to-red-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-dark-card border border-dark-border rounded-xl p-6"
    >
      <h3 className="text-xl font-bold mb-4 text-neon-cyan">
        🧾 Service Health Score
      </h3>
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg className="transform -rotate-90 w-48 h-48">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-dark-border"
            />
            <motion.circle
              cx="96"
              cy="96"
              r="88"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 88}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - score / 100) }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00ffff" />
                <stop offset="100%" stopColor="#ff00ff" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
                {Math.round(score)}
              </div>
              <div className="text-sm text-gray-400 mt-1">/ 100</div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 text-center text-gray-400">
        {score >= 80 && "✅ Service is healthy"}
        {score >= 60 && score < 80 && "⚠️ Service has warnings"}
        {score >= 40 && score < 60 && "🔶 Service has issues"}
        {score < 40 && "🔴 Service has critical problems"}
      </div>
    </motion.div>
  )
}

export default HealthScore



