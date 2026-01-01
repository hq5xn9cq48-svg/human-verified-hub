'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ScoreGaugeProps {
  score: number
}

export default function ScoreGauge({ score }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const duration = 1500
    const steps = 60
    const increment = score / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= score) {
        setAnimatedScore(score)
        clearInterval(timer)
      } else {
        setAnimatedScore(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [score])

  const getColor = (s: number) => {
    if (s >= 81) return { stroke: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)' }
    if (s >= 61) return { stroke: '#4ade80', glow: 'rgba(74, 222, 128, 0.5)' }
    if (s >= 41) return { stroke: '#eab308', glow: 'rgba(234, 179, 8, 0.5)' }
    if (s >= 21) return { stroke: '#f97316', glow: 'rgba(249, 115, 22, 0.5)' }
    return { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' }
  }

  const color = getColor(score)
  const circumference = 2 * Math.PI * 80
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="relative">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.stroke} />
            <stop offset="100%" stopColor={color.stroke} stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="rgba(147, 51, 234, 0.1)"
          strokeWidth="12"
        />

        {/* Track marks */}
        {[0, 20, 40, 60, 80, 100].map((mark) => {
          const angle = ((mark / 100) * 270 - 135) * (Math.PI / 180)
          const x1 = 100 + 70 * Math.cos(angle)
          const y1 = 100 + 70 * Math.sin(angle)
          const x2 = 100 + 80 * Math.cos(angle)
          const y2 = 100 + 80 * Math.sin(angle)
          return (
            <line
              key={mark}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(147, 51, 234, 0.3)"
              strokeWidth="2"
            />
          )
        })}

        {/* Progress arc */}
        <motion.circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 100 100)"
          filter="url(#glow)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />

        {/* Inner circle */}
        <circle
          cx="100"
          cy="100"
          r="60"
          fill="rgba(0, 0, 0, 0.8)"
        />
      </svg>

      {/* Score display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className="text-5xl font-bold"
          style={{ color: color.stroke, textShadow: `0 0 20px ${color.glow}` }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {animatedScore}%
        </motion.div>
        <motion.div
          className="text-gray-400 text-sm mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Human Score
        </motion.div>
      </div>

      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{ 
          boxShadow: `0 0 40px ${color.glow}`,
          opacity: 0.3 
        }}
      />
    </div>
  )
}
