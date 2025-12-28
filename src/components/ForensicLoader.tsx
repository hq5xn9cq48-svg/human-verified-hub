'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const loadingSteps = [
  { text: 'Initializing forensic engine...', icon: '🔬' },
  { text: 'Analyzing syntax patterns...', icon: '📊' },
  { text: 'Measuring perplexity levels...', icon: '🧠' },
  { text: 'Checking burstiness scores...', icon: '📈' },
  { text: 'Detecting AI signatures...', icon: '🤖' },
  { text: 'Scanning for human markers...', icon: '👤' },
  { text: 'Evaluating lexical richness...', icon: '📚' },
  { text: 'Computing final score...', icon: '⚡' },
]

export default function ForensicLoader() {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % loadingSteps.length)
    }, 2000)

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0
        return prev + 1
      })
    }, 150)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
    }
  }, [])

  return (
    <div className="py-12 flex flex-col items-center">
      {/* Animated Logo */}
      <div className="relative w-32 h-32 mb-8">
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-violet-500/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Middle ring */}
        <motion.div
          className="absolute inset-2 rounded-full border-4 border-emerald-500/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Inner circle with scan effect */}
        <motion.div
          className="absolute inset-4 rounded-full bg-gradient-to-br from-violet-500/20 to-emerald-500/20 backdrop-blur-sm"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span 
            className="text-4xl"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            🔬
          </motion.span>
        </div>

        {/* Scanning line */}
        <motion.div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
          initial={{ top: '0%' }}
          animate={{ top: '100%' }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Loading Text */}
      <div className="h-8 mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <span className="text-2xl">{loadingSteps[currentStep].icon}</span>
            <span className="text-slate-300 font-medium">{loadingSteps[currentStep].text}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-emerald-500"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>Processing...</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Status Dots */}
      <div className="flex gap-2 mt-6">
        {loadingSteps.slice(0, 4).map((_, i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i <= currentStep % 4 ? 'bg-violet-400' : 'bg-slate-700'
            }`}
            animate={i === currentStep % 4 ? { scale: [1, 1.5, 1] } : {}}
            transition={{ duration: 0.5 }}
          />
        ))}
      </div>
    </div>
  )
}
