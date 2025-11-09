import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { motion } from 'framer-motion'

const TrendChart = ({ results }) => {
  // Mock trend data (in real app, this would come from historical data)
  const trendData = results.map((result, idx) => ({
    name: result.endpoint,
    regressions: result.is_regression ? result.differences.length : 0,
    health: result.is_regression ? 50 : 100,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-xl p-6"
    >
      <h3 className="text-xl font-bold mb-6 text-neon-cyan">
        📈 Service Evolution Trends
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis
            dataKey="name"
            stroke="#666"
            tick={{ fill: '#999' }}
          />
          <YAxis
            stroke="#666"
            tick={{ fill: '#999' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#151520',
              border: '1px solid #1a1a2e',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="regressions"
            stroke="#ff00ff"
            strokeWidth={2}
            dot={{ fill: '#ff00ff', r: 4 }}
            name="Regressions"
          />
          <Line
            type="monotone"
            dataKey="health"
            stroke="#00ffff"
            strokeWidth={2}
            dot={{ fill: '#00ffff', r: 4 }}
            name="Health Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

export default TrendChart



