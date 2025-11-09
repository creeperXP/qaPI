import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then default to 'dark'
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme
      }
    }
    return 'dark'
  })

  // Apply theme on mount and when it changes
  useEffect(() => {
    // Apply theme to document root immediately
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      // Remove any existing theme classes then add the active one on <html>
      root.classList.remove('light', 'dark')
      root.classList.add(theme)
      root.setAttribute('data-theme', theme)

      // Also mirror on <body> to support selectors that target body
      const body = document.body
      body.classList.remove('light', 'dark')
      body.classList.add(theme)
      body.setAttribute('data-theme', theme)

      // Also set it in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', theme)
      }

      // Debug logging to help diagnose client-side toggle issues
      console.log('✅ Theme applied:', theme)
      console.log('   html.classList:', root.classList.toString())
      console.log('   html[data-theme]:', root.getAttribute('data-theme'))
      console.log('   body.classList:', body.classList.toString())
      console.log('   body[data-theme]:', body.getAttribute('data-theme'))
    }
  }, [theme])

  const toggleTheme = () => {
    console.log('Toggling theme from:', theme) // Debug log
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark'
      console.log('New theme:', newTheme) // Debug log
      return newTheme
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

