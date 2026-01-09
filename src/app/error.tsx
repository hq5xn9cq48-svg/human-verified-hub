'use client'

import { useEffect, useState } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [errorMessage, setErrorMessage] = useState<string>('An unexpected error occurred. Please try again.')
  
  useEffect(() => {
    // Log the error for debugging
    console.error('Application error:', error)
    
    // Set user-friendly error message
    if (error.message) {
      // Check for common error patterns and provide better messages
      if (error.message.includes('pattern') || error.message.includes('match')) {
        setErrorMessage('There was an issue processing the image. Please try a different image format (JPG, PNG, or WebP).')
      } else if (error.message.includes('hydration') || error.message.includes('Hydration')) {
        setErrorMessage('Page loading error. Please refresh the page.')
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        setErrorMessage('Network error. Please check your connection and try again.')
      } else if (error.message.includes('timeout')) {
        setErrorMessage('Request timed out. Please try again.')
      } else {
        setErrorMessage(error.message.length < 200 ? error.message : 'An unexpected error occurred. Please try again.')
      }
    }
  }, [error])

  const handleReset = () => {
    // Clear any cached state before resetting
    try {
      reset()
    } catch (e) {
      // If reset fails, reload the page
      window.location.reload()
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Something went wrong!</h2>
        <p className="text-gray-400 mb-6">{errorMessage}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleReload}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors border border-gray-700"
          >
            Reload Page
          </button>
        </div>
        {error.digest && (
          <p className="mt-4 text-gray-600 text-xs">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
