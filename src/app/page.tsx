'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { 
  Search, 
  Link as LinkIcon, 
  Clipboard, 
  X, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Bot,
  User,
  FileText,
  Brain,
  Activity,
  Zap,
  Award,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

interface AnalysisResult {
  analysisMetadata: {
    wordCount: number | string
    sentenceCount?: number
    perplexityLevel: string
    burstinessScore: string
  }
  humanScore: number
  verdict: string
  confidence?: string
  summary: string
  aiIndicators: { pattern: string; penalty?: number; description: string }[]
  humanIndicators: { pattern: string; bonus?: number; description: string }[]
  forensicDetails: {
    syntaxAnalysis: string
    lexicalRichness: string
    predictability: string
  }
}

const loadingMessages = [
  "Initializing forensic scanner...",
  "Analyzing syntax patterns...",
  "Checking burstiness levels...",
  "Detecting AI fingerprints...",
  "Measuring perplexity...",
  "Compiling report..."
]

export default function HomePage() {
  const { t, language, isRTL } = useLanguage()
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [certificateLoading, setCertificateLoading] = useState(false)
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const supabase = createClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (loading) {
      let index = 0
      const interval = setInterval(() => {
        setLoadingMessage(loadingMessages[index % loadingMessages.length])
        index++
      }, 1200)
      return () => clearInterval(interval)
    }
  }, [loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (inputMode === 'text' && (!text.trim() || text.length < 20)) {
      setError(language === 'ar' ? 'أدخل 20 حرفاً على الأقل' : 'Please enter at least 20 characters')
      return
    }
    
    if (inputMode === 'url' && !url.trim()) {
      setError(language === 'ar' ? 'أدخل رابطاً صالحاً' : 'Please enter a valid URL')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setVerificationId(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputMode === 'text' ? text : undefined, 
          url: inputMode === 'url' ? url : undefined,
          language 
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data)

      if (user) {
        try {
          const { data: insertData } = await supabase.from('verifications').insert({
            user_id: user.id,
            content: (inputMode === 'text' ? text : url).substring(0, 500),
            result_score: data.humanScore,
            analysis: data.summary,
          }).select().single()
          
          if (insertData) {
            setVerificationId(insertData.id)
          }
        } catch (e) {
          // Ignore save errors
        }
      }
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    } finally {
      setLoading(false)
    }
  }

  const generateCertificate = async () => {
    if (!result || result.humanScore < 90) return
    
    setCertificateLoading(true)
    
    try {
      const jsPDF = (await import('jspdf')).default
      const QRCode = await import('qrcode')
      
      const certResponse = await fetch('/api/certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId,
          humanScore: result.humanScore,
          content: text.substring(0, 200),
          userId: user?.id
        })
      })
      
      const certData = await certResponse.json()
      
      if (!certData.certificateId) {
        throw new Error('Failed to generate certificate')
      }

      const verifyUrl = `${window.location.origin}/verify/${certData.certificateId}`
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 100, margin: 1 })
      
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      
      pdf.setFillColor(0, 0, 0)
      pdf.rect(0, 0, 297, 210, 'F')
      
      pdf.setDrawColor(147, 51, 234)
      pdf.setLineWidth(3)
      pdf.rect(10, 10, 277, 190)
      pdf.setLineWidth(1)
      pdf.rect(15, 15, 267, 180)
      
      pdf.setTextColor(168, 85, 247)
      pdf.setFontSize(28)
      pdf.setFont('helvetica', 'bold')
      pdf.text('CERTIFICATE OF AUTHENTICITY', 148.5, 40, { align: 'center' })
      
      pdf.setTextColor(148, 163, 184)
      pdf.setFontSize(12)
      pdf.text('Human-Verified Content Authentication', 148.5, 52, { align: 'center' })
      
      pdf.setFillColor(34, 197, 94)
      pdf.circle(148.5, 90, 25, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(24)
      pdf.text(`${result.humanScore}%`, 148.5, 95, { align: 'center' })
      pdf.setFontSize(8)
      pdf.text('HUMAN SCORE', 148.5, 103, { align: 'center' })
      
      pdf.setTextColor(226, 232, 240)
      pdf.setFontSize(11)
      pdf.text(`Certificate ID: ${certData.certificateId}`, 148.5, 130, { align: 'center' })
      pdf.text(`Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 148.5, 140, { align: 'center' })
      
      pdf.addImage(qrDataUrl, 'PNG', 230, 140, 35, 35)
      pdf.setFontSize(7)
      pdf.setTextColor(148, 163, 184)
      pdf.text('Scan to verify', 247.5, 180, { align: 'center' })
      
      pdf.save(`Certificate-${certData.certificateId}.pdf`)
      
    } catch (err: any) {
      console.error('Certificate error:', err)
      setError(language === 'ar' ? 'فشل إنشاء الشهادة' : 'Failed to generate certificate')
    } finally {
      setCertificateLoading(false)
    }
  }

  const clearInput = () => {
    setText('')
    setUrl('')
    textareaRef.current?.focus()
  }

  const pasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText()
      if (inputMode === 'text') setText(clipText)
      else setUrl(clipText)
    } catch {}
  }

  const getScoreColor = (score: number) => {
    if (score >= 61) return 'text-green-400'
    if (score >= 31) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 61) return 'from-green-500 to-emerald-500'
    if (score >= 31) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-rose-500'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 61) return <User className="w-5 h-5" />
    if (score >= 31) return <Minus className="w-5 h-5" />
    return <Bot className="w-5 h-5" />
  }

  const resetAnalysis = () => {
    setText('')
    setUrl('')
    setResult(null)
    setError(null)
    setVerificationId(null)
  }

  return (
    <div className="min-h-screen bg-black cyber-grid" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Main content with top padding for fixed navbar */}
      <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/20 border border-purple-500/30 mb-4"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
            </span>
            <span className="text-xs text-gray-300">{t.analyzer.badge}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl md:text-4xl font-bold text-white mb-3"
          >
            {t.analyzer.title}{' '}
            <span className="text-gradient neon-text-glow">
              {t.analyzer.titleHighlight}
            </span>
          </motion.h1>

          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            {t.analyzer.description}
          </p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Input Mode Toggle */}
              <div className="flex justify-center gap-2 p-1 bg-black/50 rounded-xl w-fit mx-auto border border-purple-900/30">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    inputMode === 'text' 
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {language === 'ar' ? 'نص' : 'Text'}
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    inputMode === 'url' 
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  {language === 'ar' ? 'رابط' : 'URL'}
                </button>
              </div>

              {/* Input Area */}
              <AnimatePresence mode="wait">
                {inputMode === 'text' ? (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-300">{t.analyzer.inputLabel}</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={pasteFromClipboard} 
                          className="text-xs text-gray-400 hover:text-purple-400 px-2 py-1 rounded hover:bg-purple-900/20 flex items-center gap-1 transition-colors"
                        >
                          <Clipboard className="w-3 h-3" />
                          {language === 'ar' ? 'لصق' : 'Paste'}
                        </button>
                        {text && (
                          <button 
                            type="button" 
                            onClick={clearInput} 
                            className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded hover:bg-red-900/20 flex items-center gap-1 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            {language === 'ar' ? 'مسح' : 'Clear'}
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-black/50 border border-purple-900/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 resize-none transition-all"
                      placeholder={t.analyzer.inputPlaceholder}
                      dir="auto"
                    />
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>{t.analyzer.minChars}</span>
                      <span className={text.length >= 20 ? 'text-green-400' : ''}>{text.length} {t.analyzer.characters}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="url"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'رابط المقال' : 'Article URL'}
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black/50 border border-purple-900/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                        placeholder="https://example.com/article"
                        dir="ltr"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (inputMode === 'text' ? text.length < 20 : !url.trim())}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 spinner" />
                    {loadingMessage}
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    {t.analyzer.analyzeButton}
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Results Section */
            <div className="space-y-6">
              {/* Score Header */}
              <div className="text-center py-6 bg-black/30 rounded-2xl border border-purple-900/30">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className={`text-6xl font-bold ${getScoreColor(result.humanScore)} flex items-center justify-center gap-3`}
                >
                  {getScoreIcon(result.humanScore)}
                  {result.humanScore}%
                </motion.div>
                <div className={`text-xl font-semibold mt-2 ${getScoreColor(result.humanScore)}`}>
                  {result.verdict}
                </div>
                {result.confidence && (
                  <div className="text-xs text-gray-500 mt-1">
                    {language === 'ar' ? 'الثقة:' : 'Confidence:'} {result.confidence}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div>
                <div className="relative h-3 bg-black/50 rounded-full overflow-hidden border border-purple-900/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.humanScore}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full bg-gradient-to-r ${getScoreBg(result.humanScore)} rounded-full`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> AI (0%)</span>
                  <span>{language === 'ar' ? 'هجين' : 'Hybrid'} (50%)</span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {language === 'ar' ? 'بشري' : 'Human'} (100%)</span>
                </div>
              </div>

              {/* Certificate Button */}
              {result.humanScore >= 90 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-green-900/20 border border-green-500/30"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-green-400" />
                      <div>
                        <h4 className="text-green-400 font-bold">{language === 'ar' ? 'شهادة متاحة!' : 'Certificate Available!'}</h4>
                        <p className="text-gray-400 text-sm">{language === 'ar' ? 'محتواك مؤهل للحصول على شهادة' : 'Your content qualifies for a certificate'}</p>
                      </div>
                    </div>
                    <button
                      onClick={generateCertificate}
                      disabled={certificateLoading}
                      className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      {certificateLoading ? <Loader2 className="w-4 h-4 spinner" /> : <Download className="w-4 h-4" />}
                      {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-black/30 rounded-xl text-center border border-purple-900/20">
                  <div className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
                    <FileText className="w-3 h-3" />
                    {t.results.wordCount}
                  </div>
                  <div className="text-white font-semibold">{result.analysisMetadata?.wordCount || '-'}</div>
                </div>
                <div className="p-3 bg-black/30 rounded-xl text-center border border-purple-900/20">
                  <div className="text-gray-400 text-xs mb-1">{language === 'ar' ? 'الجمل' : 'Sentences'}</div>
                  <div className="text-white font-semibold">{result.analysisMetadata?.sentenceCount || '-'}</div>
                </div>
                <div className="p-3 bg-black/30 rounded-xl text-center border border-purple-900/20">
                  <div className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
                    <Brain className="w-3 h-3" />
                    {t.results.perplexityLevel}
                  </div>
                  <div className="text-purple-400 font-semibold capitalize">{result.analysisMetadata?.perplexityLevel || '-'}</div>
                </div>
                <div className="p-3 bg-black/30 rounded-xl text-center border border-purple-900/20">
                  <div className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
                    <Activity className="w-3 h-3" />
                    {t.results.burstinessScore}
                  </div>
                  <div className="text-cyan-400 font-semibold capitalize">{result.analysisMetadata?.burstinessScore || '-'}</div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-black/30 rounded-xl border border-purple-900/20">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  {t.results.summary}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
              </div>

              {/* Forensic Details */}
              {result.forensicDetails && (
                <div className="p-4 bg-black/30 rounded-xl border border-purple-500/20">
                  <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    {t.results.forensicDetails}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs block mb-1">{t.results.syntaxAnalysis}</span>
                      <span className="text-gray-200">{result.forensicDetails.syntaxAnalysis}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block mb-1">{t.results.lexicalRichness}</span>
                      <span className="text-gray-200">{result.forensicDetails.lexicalRichness}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block mb-1">{t.results.predictability}</span>
                      <span className="text-gray-200">{result.forensicDetails.predictability}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicators */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* AI Indicators */}
                {result.aiIndicators && result.aiIndicators.length > 0 && (
                  <div className="p-4 bg-black/30 rounded-xl border border-red-500/20">
                    <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      {t.results.aiIndicators} ({result.aiIndicators.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.aiIndicators.map((item, i) => (
                        <div key={i} className="p-2 rounded-lg bg-red-900/10 border border-red-500/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-red-300 font-medium text-sm">{item.pattern}</span>
                            {item.penalty && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/30 text-red-300">-{item.penalty}</span>
                            )}
                          </div>
                          <p className="text-gray-400 text-xs">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Human Indicators */}
                {result.humanIndicators && result.humanIndicators.length > 0 && (
                  <div className="p-4 bg-black/30 rounded-xl border border-green-500/20">
                    <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      {t.results.humanIndicators} ({result.humanIndicators.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.humanIndicators.map((item, i) => (
                        <div key={i} className="p-2 rounded-lg bg-green-900/10 border border-green-500/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-green-300 font-medium text-sm">{item.pattern}</span>
                            {item.bonus && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-500/30 text-green-300">+{item.bonus}</span>
                            )}
                          </div>
                          <p className="text-gray-400 text-xs">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset Button */}
              <button
                onClick={resetAnalysis}
                className="w-full py-3 px-4 rounded-xl border border-purple-500/30 text-gray-300 hover:text-white hover:border-purple-500/50 hover:bg-purple-900/10 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t.analyzer.newAnalysis}
              </button>
            </div>
          )}
        </motion.div>

        {/* Guide */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 glass-card"
        >
          <h3 className="text-sm font-semibold text-white mb-3 text-center flex items-center justify-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            {t.guide.title}
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 bg-red-900/10 rounded-xl border border-red-500/20">
              <div className="text-red-400 font-bold flex items-center justify-center gap-1">
                <Bot className="w-3 h-3" /> 0-30%
              </div>
              <div className="text-gray-400">{t.guide.aiRange}</div>
            </div>
            <div className="p-3 bg-yellow-900/10 rounded-xl border border-yellow-500/20">
              <div className="text-yellow-400 font-bold">31-60%</div>
              <div className="text-gray-400">{t.guide.hybridRange}</div>
            </div>
            <div className="p-3 bg-green-900/10 rounded-xl border border-green-500/20">
              <div className="text-green-400 font-bold flex items-center justify-center gap-1">
                <User className="w-3 h-3" /> 61-100%
              </div>
              <div className="text-gray-400">{t.guide.humanRange}</div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-900/30 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-500 text-xs">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  )
}
