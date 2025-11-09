import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Comparison from './pages/Comparison'
import History from './pages/History'
import Analysis from './pages/Analysis'
import LandingPage from './components/LandingPage'
import './App.css'

// Check if Auth0 is configured
const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const isAuth0Configured = auth0Domain && auth0Domain !== "Change" && auth0ClientId && auth0ClientId !== "Change"

// Get the exact callback URL (for debugging)
const callbackUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
console.log('🔍 Auth0 Callback URL:', callbackUrl)
console.log('🔍 Make sure this EXACT URL is in your Auth0 dashboard:', callbackUrl)

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  if (!isAuth0Configured) {
    return children
  }

  const { isAuthenticated, isLoading } = useAuth0()
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-neon dark:bg-gradient-neon bg-gradient-light text-white dark:text-white text-slate-900 transition-colors">Loading...</div>
  }
  
  return isAuthenticated ? children : <Navigate to="/" />
}

// Wrapper component to handle Auth0 redirect callback
const Auth0App = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoading, isAuthenticated, user, error } = useAuth0()
  const [redirected, setRedirected] = useState(false)

  // Handle redirect after Auth0 callback
  useEffect(() => {
    // Check URL for Auth0 callback parameters
    const hash = window.location.hash
    const search = window.location.search
    const hasAuthParams = hash.includes('code=') || hash.includes('access_token=') || search.includes('code=')
    
    console.log('🔍 Auth0App - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'hasAuthParams:', hasAuthParams, 'pathname:', location.pathname)
    
    if (!isLoading) {
      if (hasAuthParams && isAuthenticated && !redirected) {
        // Coming back from Auth0 - redirect to dashboard
        console.log('✅ Redirecting to dashboard after Auth0 callback')
        setRedirected(true)
        // Clean URL
        window.history.replaceState({}, document.title, '/dashboard')
        navigate('/dashboard', { replace: true })
      } else if (isAuthenticated && location.pathname === '/' && !redirected) {
        // Already authenticated and on landing page
        console.log('✅ Already authenticated, redirecting to dashboard')
        setRedirected(true)
        navigate('/dashboard', { replace: true })
      }
    }
    
    if (error) {
      console.error('❌ Auth0 error:', error)
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate, redirected, error])

  // Debug logging
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('✅ User authenticated:', user.name, user.email)
    }
  }, [isAuthenticated, user])

  return (
    <div className="min-h-screen bg-gradient-neon dark:bg-gradient-neon bg-gradient-light transition-colors">
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/compare" element={
            <ProtectedRoute>
              <Comparison />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } />
          <Route path="/analysis/:reportId?" element={
            <ProtectedRoute>
              <Analysis />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </div>
  )
}

function App() {
  // If Auth0 is configured, wrap with Auth0Provider
  if (isAuth0Configured) {
    // Build authorizationParams dynamically and only include audience
    // if a valid custom API identifier is provided. Do NOT use the
    // Auth0 Management API (https://<domain>/api/v2/) as the audience
    // for browser-based SPAs — that causes the "Authorize App" consent.
    const authParams = { 
      redirect_uri: callbackUrl,
      // Customize the login screen message by setting screen_hint
      screen_hint: 'signup' // This can help customize the flow
    }
    const configuredAudience = import.meta.env.VITE_AUTH0_AUDIENCE
    if (configuredAudience && configuredAudience !== '') {
      authParams.audience = configuredAudience
    }

    // Allow toggling session persistence via Vite env. By default we do NOT
    // persist tokens across reloads to avoid automatic re-login behavior.
    const persistSession = import.meta.env.VITE_AUTH0_PERSIST === 'true'

    return (
      <Auth0Provider
        domain={auth0Domain}
        clientId={auth0ClientId}
        authorizationParams={authParams}
        // Only enable refresh tokens + localstorage if explicitly opted-in
        {...(persistSession ? { useRefreshTokens: true, cacheLocation: 'localstorage' } : {})}
      >
        <Router>
          <Auth0App />
        </Router>
      </Auth0Provider>
    )
  }

  // If Auth0 is not configured, run without authentication (development mode)
  return (
    <Router>
      <div className="min-h-screen bg-gradient-neon dark:bg-gradient-neon bg-gradient-light transition-colors">
        {/* Layout component controls Navbar visibility based on route */}
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/compare" element={<Comparison />} />
            <Route path="/history" element={<History />} />
            <Route path="/analysis/:reportId?" element={<Analysis />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  )
}

// Layout helper component: shows Navbar except on landing page
function Layout({ children }) {
  const location = useLocation()
  return (
    <>
      {location.pathname !== '/' && <Navbar />}
      {children}
    </>
  )
}

export default App
