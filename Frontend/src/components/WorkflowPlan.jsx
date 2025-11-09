import React from 'react'
import { motion } from 'framer-motion'

const WorkflowPlan = () => {
  // Hardcoded workflow plan output
  const hardcodedPlan = {
    endpoints_to_test: ['/create', '/get', '/update', '/delete'],
    execution_order: [
      '1. Create new item via POST /create endpoint',
      '2. Retrieve created item via GET /get/{id} endpoint',
      '3. Update item via PUT /update/{id} endpoint',
      '4. Verify update via GET /get/{id} endpoint',
      '5. Delete item via DELETE /delete/{id} endpoint',
      '6. Verify deletion via GET /get/{id} (should return 404)'
    ],
    estimated_duration: 30
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-dark-card border border-dark-border rounded-xl p-6"
    >
      <h3 className="text-xl font-bold mb-4 text-neon-cyan">
        🧠 Nemotron Workflow Plan
      </h3>
      <div className="space-y-2">
        <div className="text-sm text-gray-400 mb-2">
          Execution Order:
        </div>
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          {hardcodedPlan.execution_order.map((step, idx) => (
            <li key={idx} className="pl-2">{step}</li>
          ))}
        </ol>
        <div className="mt-4 pt-4 border-t border-dark-border">
          <div className="text-sm text-gray-400">
            Endpoints to Test:
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {hardcodedPlan.endpoints_to_test.map((endpoint, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-dark-bg border border-dark-border rounded text-xs font-mono text-neon-cyan"
              >
                {endpoint}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-400">
          Estimated Duration: <span className="text-neon-purple font-semibold">{hardcodedPlan.estimated_duration}s</span>
        </div>
      </div>
    </motion.div>
  )
}

export default WorkflowPlan


