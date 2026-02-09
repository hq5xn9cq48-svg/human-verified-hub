'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzeText, type AnalysisResult } from '@/lib/gemini'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { 
  Loader2, BarChart3, Check, X, AlertCircle, RefreshCw, FileSearch,
  Shield, Brain, Sparkles, Bot, User, TrendingUp, TrendingDown, Minus,
  Activity, FileText, Zap
} from 'lucide-react'
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
  const { refreshUsageStatus, updateUsageFromResponse } = useAuth()
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

      // INSTANT UI UPDATE: Use usage status from API response
      if (analysisResult.usageStatus) {
        updateUsageFromResponse(analysisResult.usageStatus)
      }

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
      // Background refresh for full consistency
      await refreshUsageStatus()
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 61) return 'text-green-400'
    if (score >= 31) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreLabel = (score: number) => {
    if (language === 'ar') {
      if (score >= 61) return 'كتابة بشرية'
      if (score >= 31) return 'إشارات مختلطة'
      return 'مُنشأ بالذكاء الاصطناعي'
    }
    if (score >= 61) return 'Human Written'
    if (score >= 31) return 'Mixed Signals'
    return 'AI Generated'
  }

  const getScoreGradient = (score: number) => {
    if (score >= 61) return 'from-green-500 to-emerald-500'
    if (score >= 31) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-rose-500'
  }

  const getScoreBg = (score: number) => {
    if (score >= 61) return 'from-green-500 to-emerald-600'
    if (score >= 31) return 'from-yellow-500 to-orange-600'
    return 'from-red-500 to-rose-600'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 61) return <User className="w-5 h-5" />
    if (score >= 31) return <Minus className="w-5 h-5" />
    return <Bot className="w-5 h-5" />
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
            className="space-y-5"
          >
            {/* Premium Neon Purple Report Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-black via-purple-950/30 to-black border border-purple-500/40 ${result.humanScore >= 61 ? 'shadow-[0_0_30px_rgba(34,197,94,0.15)]' : result.humanScore >= 31 ? 'shadow-[0_0_30px_rgba(234,179,8,0.15)]' : 'shadow-[0_0_30px_rgba(239,68,68,0.15)]'}`}
            >
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-[0.03]">
                <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(168,85,247,0.8) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
              </div>
              
              {/* Neon Top Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
              
              {/* Header Banner */}
              <div className="relative bg-gradient-to-r from-purple-600/30 via-purple-500/20 to-purple-600/30 px-5 py-3 border-b border-purple-500/30 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                    <Shield className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      {language === 'ar' ? 'تقرير التحليل الجنائي' : 'Forensic Analysis Report'}
                    </h2>
                    <p className="text-xs text-purple-300/60">Human Verified Hub</p>
                  </div>
                </div>
              </div>
              
              {/* Score Section */}
              <div className="relative p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Score Circle with Neon Glow */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className="relative"
                  >
                    <div className={`relative w-32 h-32 rounded-full p-1 bg-gradient-to-br ${getScoreBg(result.humanScore)} ${result.humanScore >= 61 ? 'shadow-[0_0_35px_rgba(34,197,94,0.4)]' : result.humanScore >= 31 ? 'shadow-[0_0_35px_rgba(234,179,8,0.4)]' : 'shadow-[0_0_35px_rgba(239,68,68,0.4)]'}`}>
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                        <div className="text-center">
                          <div className={`text-4xl font-bold ${getScoreColor(result.humanScore)}`} style={{ textShadow: result.humanScore >= 61 ? '0 0 20px rgba(34,197,94,0.5)' : result.humanScore >= 31 ? '0 0 20px rgba(234,179,8,0.5)' : '0 0 20px rgba(239,68,68,0.5)' }}>
                            {result.humanScore}
                          </div>
                          <div className="text-sm text-gray-500">%</div>
                        </div>
                      </div>
                    </div>
                    {/* Badge */}
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getScoreGradient(result.humanScore)} text-white ${result.humanScore >= 61 ? 'shadow-[0_0_20px_rgba(34,197,94,0.5)]' : result.humanScore >= 31 ? 'shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'shadow-[0_0_20px_rgba(239,68,68,0.5)]'}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {getScoreIcon(result.humanScore)}
                        <span className="text-xs font-bold">{getScoreLabel(result.humanScore)}</span>
                      </div>
                    </motion.div>
                  </motion.div>
                  
                  {/* Verdict */}
                  <div className="flex-1 text-center sm:text-start">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h3 className={`text-xl font-bold mb-2 ${getScoreColor(result.humanScore)}`} style={{ textShadow: result.humanScore >= 61 ? '0 0 15px rgba(34,197,94,0.3)' : result.humanScore >= 31 ? '0 0 15px rgba(234,179,8,0.3)' : '0 0 15px rgba(239,68,68,0.3)' }}>
                        {getScoreLabel(result.humanScore)}
                      </h3>
                    </motion.div>
                    
                    {/* Progress Bar with Neon */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4"
                    >
                      <div className="relative h-3 bg-black/60 rounded-full overflow-hidden border border-purple-500/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.humanScore}%` }}
                          transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                          className={`h-full bg-gradient-to-r ${getScoreGradient(result.humanScore)} rounded-full relative`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                        </motion.div>
                      </div>
                      <div className="flex justify-between mt-1.5 text-[10px] text-gray-600">
                        <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> AI (0%)</span>
                        <span>{language === 'ar' ? 'هجين' : 'Mixed'} (50%)</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {language === 'ar' ? 'بشري' : 'Human'} (100%)</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
              
              {/* Neon Bottom Line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            </motion.div>

            {/* Analysis Summary - Neon Glass */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-5 bg-gradient-to-br from-purple-950/40 to-black/80 rounded-xl border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.08)]"
            >
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
                {language === 'ar' ? 'التحليل المفصل' : 'Detailed Analysis'}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{result.analysis}</p>
            </motion.div>

            {/* Indicators - Neon Style */}
            {result.indicators && result.indicators.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="p-5 bg-gradient-to-br from-purple-950/30 to-black/80 rounded-xl border border-purple-500/25 shadow-[0_0_20px_rgba(168,85,247,0.08)]"
              >
                <h3 className="text-sm font-semibold text-purple-300 mb-4 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  {language === 'ar' ? 'المؤشرات الرئيسية' : 'Key Indicators'}
                </h3>
                <div className="space-y-2">
                  {result.indicators.map((indicator, index) => (
                    <motion.div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        indicator.type === 'human'
                          ? 'bg-green-950/30 border-green-500/20 hover:border-green-500/40'
                          : 'bg-red-950/30 border-red-500/20 hover:border-red-500/40'
                      } transition-colors`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                    >
                      {indicator.type === 'human' ? (
                        <div className="p-1 rounded bg-green-500/20 border border-green-500/30 mt-0.5">
                          <TrendingUp className="w-3 h-3 text-green-400" />
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-red-500/20 border border-red-500/30 mt-0.5">
                          <TrendingDown className="w-3 h-3 text-red-400" />
                        </div>
                      )}
                      <span className="text-gray-300 text-sm flex-1">{indicator.description}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* New Analysis Button - Neon Purple */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => {
                setText('')
                setResult(null)
              }}
              className="w-full py-3.5 px-6 rounded-xl border border-purple-500/25 text-gray-300 hover:text-white hover:border-purple-500/60 hover:bg-purple-900/15 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all flex items-center justify-center gap-3 group"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              {language === 'ar' ? 'تحليل نص جديد' : 'Analyze New Text'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
