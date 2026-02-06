'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzeText, type AnalysisResult } from '@/lib/gemini'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Loader2, BarChart3, Check, X, AlertCircle, RefreshCw, FileSearch } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

interface VerificationFormProps {
  userId: string
  onNewVerification?: () => void
}

export default function VerificationForm({ userId, onNewVerification }: VerificationFormProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { refreshUsageStatus } = useAuth()
  const { language } = useLanguage()

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
      const analysisResult = await analyzeText(text, language)
      setResult(analysisResult)

      // Save to database if Supabase is configured
      if (isSupabaseConfigured()) {
        const supabase = createClient()
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
      } else {
        onNewVerification?.()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze text. Please try again.')
    } finally {
      setLoading(false)
      // CRITICAL: Refresh usage counter after each analysis attempt
      // This ensures the UI reflects the updated remaining uses
      await refreshUsageStatus()
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

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 border-green-500/30'
    if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-3">
            Enter text to analyze
          </label>
          <div className="relative">
            <textarea
              id="content"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="w-full px-4 py-4 bg-black/80 border border-purple-900/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 resize-none transition-all"
              placeholder="Paste or type the text you want to analyze for AI detection..."
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
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
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={loading || text.length < 50}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <FileSearch className="w-5 h-5" />
              Analyze Text
            </>
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
            <div className="bg-black/50 border border-purple-900/30 rounded-xl p-8">
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
                  className={`text-lg font-medium mt-2 px-4 py-1.5 rounded-full inline-block border ${getScoreBg(result.humanScore)} ${getScoreColor(result.humanScore)}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {getScoreLabel(result.humanScore)}
                </motion.div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${getScoreGradient(result.humanScore)} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${result.humanScore}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>AI Generated</span>
                <span>Human Written</span>
              </div>
            </div>

            {/* Analysis */}
            <div className="bg-black/50 border border-purple-900/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Detailed Analysis
              </h3>
              <p className="text-gray-300 leading-relaxed">{result.analysis}</p>
            </div>

            {/* Indicators */}
            {result.indicators && result.indicators.length > 0 && (
              <div className="bg-black/50 border border-purple-900/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-purple-400" />
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
                      {indicator.type === 'human' ? (
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                      <span className="text-gray-300 text-sm">{indicator.description}</span>
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
              className="w-full py-3 px-4 rounded-xl border border-purple-900/50 text-gray-300 hover:text-white hover:border-purple-500/50 transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className="w-4 h-4" />
              Analyze New Text
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
