import React from 'react'
import { motion } from 'framer-motion'

const VersionSelector = ({ v1Version, v2Version, onV1Change, onV2Change }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-dark-card border border-dark-border rounded-xl p-4"
    >
      <div className="flex items-center space-x-4">
        <label className="text-white font-semibold">Compare Versions:</label>
        <div className="flex items-center space-x-2">
          <select
            value={v1Version}
            onChange={(e) => onV1Change(e.target.value)}
            className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-neon-cyan"
          >
            <option value="v1">API v1</option>
            <option value="v2">API v2</option>
          </select>
          <span className="text-gray-400">vs</span>
          <select
            value={v2Version}
            onChange={(e) => onV2Change(e.target.value)}
            className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-neon-cyan"
          >
            <option value="v1">API v1</option>
            <option value="v2">API v2</option>
          </select>
        </div>
      </div>
    </motion.div>
  )
}

export default VersionSelector


