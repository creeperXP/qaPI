import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth0 } from '@auth0/auth0-react'

// Check if Auth0 is configured
const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const isAuth0Configured = auth0Domain && auth0Domain !== "Change" && auth0ClientId && auth0ClientId !== "Change"

const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Conditionally use Auth0 hook
  let isAuthenticated = false
  let user = null
  let loginWithRedirect = () => navigate('/dashboard')
  let logout = () => navigate('/')
  
  if (isAuth0Configured) {
    try {
      const auth0 = useAuth0()
      isAuthenticated = !!auth0?.isAuthenticated
      user = auth0?.user || null
      loginWithRedirect = auth0?.loginWithRedirect || loginWithRedirect
      logout = auth0?.logout
        ? (opts) => auth0.logout(opts)
        : logout
    } catch (e) {
      // Not in Auth0Provider context, use defaults
      isAuthenticated = false
    }
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/compare', label: 'Compare', icon: '🔍' },
    { path: '/history', label: 'History', icon: '📜' },
    { path: '/analysis', label: 'Analysis', icon: '🔬' },
  ]

  return (
    <nav className="border-b border-dark-border dark:border-dark-border border-light-border bg-dark-card/50 dark:bg-dark-card/50 bg-light-card/80 backdrop-blur-lg sticky top-0 z-50 transition-colors">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            {/* Logo on the left - put your image in "public/images/logo.svg" */}
            <img src="/images/logo.png" alt="qaPI logo" className="w-10 h-10 rounded opacity-50" />
            <div className="text-2xl font-bold gradient-text neon-glow">
              qaPI
            </div>
          </Link>

          <div className="flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-cyber text-white shadow-neon-cyan'
                      : 'text-gray-400 dark:text-gray-400 text-slate-600 hover:text-white dark:hover:text-white hover:text-slate-900 hover:bg-dark-card dark:hover:bg-dark-card hover:bg-light-card'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-4 py-2 bg-dark-card dark:bg-dark-card bg-light-card rounded-lg border border-dark-border dark:border-dark-border border-light-border">
                  {user?.picture && (
                    <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                  )}
                  <span className="text-sm text-gray-300 dark:text-gray-300 text-slate-700">{user?.name || user?.email || 'User'}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (isAuth0Configured && typeof logout === 'function') {
                      logout({ 
                        returnTo: window.location.origin,
                        federated: false 
                      })
                    } else {
                      navigate('/')
                    }
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-all"
                >
                  Logout
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (isAuth0Configured && typeof loginWithRedirect === 'function') {
                    loginWithRedirect({ 
                      appState: { returnTo: '/dashboard' },
                      authorizationParams: {
                        screen_hint: 'login'
                      }
                    })
                  } else {
                    navigate('/dashboard')
                  }
                }}
                className="px-4 py-2 bg-gradient-cyber rounded-lg text-white font-medium hover:shadow-neon-pink transition-all"
              >
                Login
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
