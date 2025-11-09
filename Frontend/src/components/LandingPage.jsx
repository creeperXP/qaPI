import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

// Check if Auth0 is configured
const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const isAuth0Configured = auth0Domain && auth0Domain !== "Change" && auth0ClientId && auth0ClientId !== "Change"

export default function LandingPage() {
  const navigate = useNavigate()

  let loginWithRedirect
  let isAuthenticated = false
  let isLoading = false

  if (isAuth0Configured) {
    const auth0 = useAuth0()
    loginWithRedirect = auth0.loginWithRedirect
    isAuthenticated = auth0.isAuthenticated
    isLoading = auth0.isLoading

    // Auto-redirect to dashboard if already authenticated (handles cached sessions)
    useEffect(() => {
      if (!isLoading && isAuthenticated) {
        navigate('/dashboard', { replace: true })
      }
    }, [isLoading, isAuthenticated, navigate])
  } else {
    // Development fallback
    loginWithRedirect = () => navigate('/dashboard')
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-neon flex items-center justify-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_50%)]"></div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan mx-auto mb-4"></div>
          <p className="text-neon-cyan">Loading...</p>
        </div>
      </div>
    )
  }

  // If authenticated, this shouldn't show (redirect happens in useEffect)
  // But just in case, show a message
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-neon flex items-center justify-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_50%)]"></div>
        <div className="text-center relative z-10">
          <p className="mb-4 text-neon-cyan">Redirecting to dashboard...</p>
          <motion.a
            href="/dashboard"
            whileHover={{ scale: 1.05 }}
            className="inline-block bg-gradient-cyber text-white font-bold py-3 px-8 rounded-lg shadow-neon-cyan transform transition-all duration-300"
          >
            Go to Dashboard
          </motion.a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-neon flex items-center justify-center text-white relative overflow-hidden">
      {/* Animated gradient background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-neon-cyan/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-pink/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center px-4 relative z-10 max-w-4xl mx-auto"
      >
        {/* Main Logo/Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h1 className="text-7xl md:text-8xl font-bold mb-4 gradient-text neon-glow">
            qaPI
          </h1>
          <div className="h-1 w-32 bg-gradient-cyber mx-auto rounded-full shadow-neon-cyan"></div>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-2xl md:text-3xl mb-4 text-gray-300 font-light"
        >
          AI-Powered API Regression Detection
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-lg md:text-xl mb-12 text-gray-400 max-w-2xl mx-auto leading-relaxed"
        >
          Monitor, compare, and analyze API versions with intelligent regression detection. 
        </motion.p>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <div className="bg-dark-card/50 backdrop-blur-sm border border-neon-cyan/30 rounded-xl p-6 hover:border-neon-cyan transition-all">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-xl font-bold text-neon-cyan mb-2">Smart Comparison</h3>
            <p className="text-gray-400 text-sm">Compare API versions side-by-side with intelligent diff detection</p>
          </div>
          <div className="bg-dark-card/50 backdrop-blur-sm border border-neon-pink/30 rounded-xl p-6 hover:border-neon-pink transition-all">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-xl font-bold text-neon-pink mb-2">AI Analysis</h3>
            <p className="text-gray-400 text-sm">Get comprehensive insights from Gemini-powered regression analysis</p>
          </div>
          <div className="bg-dark-card/50 backdrop-blur-sm border border-neon-purple/30 rounded-xl p-6 hover:border-neon-purple transition-all">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-bold text-neon-purple mb-2">Real-time Monitoring</h3>
            <p className="text-gray-400 text-sm">Track API health and performance with live dashboards</p>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0, 255, 255, 0.6)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (isAuth0Configured && typeof loginWithRedirect === 'function') {
              loginWithRedirect({
                appState: {
                  returnTo: '/dashboard'
                },
                authorizationParams: {
                  // This helps customize the login experience
                  screen_hint: 'login'
                }
              })
            } else {
              navigate('/dashboard')
            }
          }}
          className="bg-gradient-cyber text-white font-bold py-4 px-12 rounded-xl shadow-neon-cyan text-lg transform transition-all duration-300 relative overflow-hidden group"
        >
          <span className="relative z-10">Get Started</span>
          <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan via-neon-pink to-neon-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </motion.button>

        {/* Decorative elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-16 flex justify-center space-x-4 text-gray-500 text-sm"
        >
          <span>⚡ Fast</span>
          <span>•</span>
          <span>🔒 Secure</span>
          <span>•</span>
          <span>🤖 AI-Powered</span>
        </motion.div>
      </motion.div>
    </div>
  )
}
