import React, { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { comparisonAPI, aiAPI } from '../services/api'
import HealthScore from '../components/HealthScore'
import RegressionHeatmap from '../components/RegressionHeatmap'
import EndpointMap from '../components/EndpointMap'
import TrendChart from '../components/TrendChart'
import WorkflowPlan from '../components/WorkflowPlan'
 
const Dashboard = () => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [workflowPlan, setWorkflowPlan] = useState(null)
  const { isAuthenticated, isLoading } = useAuth0()

  useEffect(() => {
    // Only load dashboard data after Auth0 has authenticated the user.
    // If Auth0 is not configured, load data immediately (dev mode).
    const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN
    const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID
    const isAuth0Configured = auth0Domain && auth0Domain !== 'Change' && auth0ClientId && auth0ClientId !== 'Change'

    if (!isAuth0Configured) {
      loadDashboardData()
      return
    }

    // When Auth0 is configured, wait until the SDK finishes loading and
    // the user is authenticated before fetching protected data.
    if (!isLoading && isAuthenticated) {
      loadDashboardData()
    }
  }, [isAuthenticated, isLoading])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const data = await comparisonAPI.compareAll()
      setSummary(data)

      // Plan workflow with Nemotron
      const endpoints = ['/create', '/get', '/update', '/delete']
      const plan = await aiAPI.planWorkflow(endpoints)
      setWorkflowPlan(plan)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const runComparison = async () => {
    setLoading(true)
    try {
      const data = await comparisonAPI.compareAll()
      setSummary(data)
    } catch (error) {
      console.error('Comparison failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-5xl font-bold gradient-text mb-4">
          Service Dashboard
        </h1>
        <p className="text-gray-400 text-lg">
          Real-time monitoring and AI-powered regression detection
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 flex space-x-4"
      >        
        <Link
          to="/compare"
          className="px-8 py-4 bg-gradient-cyber rounded-xl text-white font-semibold text-lg hover:shadow-neon-cyan transition-all disabled:opacity-50"
        >
          📝 New Request
        </Link>
      </motion.div>

      {/* Stats Grid */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-neon-purple"
          >
            <div className="text-gray-400 text-sm mb-2">Endpoints Tested</div>
            <div className="text-3xl font-bold text-neon-cyan">
              {summary.total_endpoints_tested}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-neon-pink"
          >
            <div className="text-gray-400 text-sm mb-2">Regressions Found</div>
            <div className="text-3xl font-bold text-neon-pink">
              {summary.regressions_found}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-neon-purple"
          >
            <div className="text-gray-400 text-sm mb-2">Critical Issues</div>
            <div className="text-3xl font-bold text-red-400">
              {summary.critical_regressions}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-dark-card border border-dark-border rounded-xl p-6"
          >
            <div className="text-gray-400 text-sm mb-2">Warnings</div>
            <div className="text-3xl font-bold text-yellow-400">
              {summary.warnings}
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Health Score */}
        {summary && (
          <HealthScore score={summary.health_score} />
        )}

        {/* Workflow Plan */}
        {summary &&
        <WorkflowPlan />
        }    
      </div>

      {/* Regression Heatmap */}
      {summary && (
        <RegressionHeatmap results={summary.results} />
      )}

      {/* Endpoint Map */}
      {summary && (
        <EndpointMap results={summary.results} />
      )}

      {/* Trend Chart */}
      {summary && (
        <TrendChart results={summary.results} />
      )}
    </div>
  )
}

export default Dashboard

