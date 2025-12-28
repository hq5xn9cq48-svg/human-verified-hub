'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzeText, type AnalysisResult } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/client'

interface VerificationFormProps {
  userId: string
  onNewVerification?: () => void
}

export default function VerificationForm({ userId, onNewVerification }: VerificationFormProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || text.length < 50) {
      setError('Please enter at least 50 characters for accurate analysis.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const analysisResult = await analyzeText(text)
      setResult(analysisResult)

      // Save to database
      const { error: dbError } = await supabase.from('verifications').insert({
        user_id: userId,
        content: text,
        result_score: analysisResult.humanScore,
        analysis: analysisResult.analysis,
      })

      if (dbError) {
        console.error('Failed to save verification:', dbError)
      } else {
        onNewVerification?.()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze text. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Likely Human Written'
    if (score >= 50) return 'Mixed Signals'
    return 'Likely AI Generated'
  }

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500'
    if (score >= 50) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-rose-500'
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-dark-300 mb-3">
            Enter text to analyze
          </label>
          <div className="relative glow-border rounded-xl">
            <textarea
              id="content"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="w-full px-4 py-4 bg-dark-900/80 border border-dark-600/50 rounded-xl text-white placeholder-dark-400 focus:outline-none input-glow resize-none"
              placeholder="Paste or type the text you want to analyze for AI detection..."
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-dark-500">
            <span>{text.length} characters</span>
            <span>Minimum 50 characters required</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={loading || text.length < 50}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
              Analyzing with AI...
            </span>
          ) : (
            'Analyze Text'
          )}
        </motion.button>
      </form>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Score Display */}
            <div className="glass-card p-8">
              <div className="text-center mb-6">
                <motion.div
                  className={`text-6xl font-bold ${getScoreColor(result.humanScore)}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  {result.humanScore}%
                </motion.div>
                <motion.div
                  className={`text-lg font-medium mt-2 ${getScoreColor(result.humanScore)}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {getScoreLabel(result.humanScore)}
                </motion.div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-4 bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${getScoreGradient(result.humanScore)} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${result.humanScore}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-dark-500">
                <span>AI Generated</span>
                <span>Human Written</span>
              </div>
            </div>

            {/* Analysis */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-accent-primary">📊</span>
                Detailed Analysis
              </h3>
              <p className="text-dark-300 leading-relaxed">{result.analysis}</p>
            </div>

            {/* Indicators */}
            {result.indicators && result.indicators.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-accent-primary">🔍</span>
                  Key Indicators
                </h3>
                <div className="space-y-3">
                  {result.indicators.map((indicator, index) => (
                    <motion.div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        indicator.type === 'human'
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className={indicator.type === 'human' ? 'text-green-400' : 'text-red-400'}>
                        {indicator.type === 'human' ? '✓' : '✗'}
                      </span>
                      <span className="text-dark-300 text-sm">{indicator.description}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* New Analysis Button */}
            <motion.button
              onClick={() => {
                setText('')
                setResult(null)
              }}
              className="w-full py-3 px-4 rounded-xl border border-dark-600/50 text-dark-300 hover:text-white hover:border-accent-primary/50 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Analyze New Text
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
