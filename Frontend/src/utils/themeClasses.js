/**
 * Utility functions for theme-aware class names
 * Usage: className={themeClass('bg-dark-card', 'bg-light-card')}
 */
export const themeClass = (darkClass, lightClass) => {
  return `${darkClass} dark:${darkClass} ${lightClass}`
}

/**
 * Get theme-aware background classes
 */
export const bgClass = {
  main: 'bg-dark-bg dark:bg-dark-bg bg-light-bg',
  card: 'bg-dark-card dark:bg-dark-card bg-light-card',
  hover: 'hover:bg-dark-card dark:hover:bg-dark-card hover:bg-light-card',
}

/**
 * Get theme-aware border classes
 */
export const borderClass = {
  default: 'border-dark-border dark:border-dark-border border-light-border',
  hover: 'hover:border-neon-cyan dark:hover:border-neon-cyan',
}

/**
 * Get theme-aware text classes
 */
export const textClass = {
  primary: 'text-white dark:text-white text-slate-900',
  secondary: 'text-gray-300 dark:text-gray-300 text-slate-600',
  muted: 'text-gray-400 dark:text-gray-400 text-slate-500',
}

