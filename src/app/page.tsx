'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

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

      // Save to history if logged in
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
      
      // Background
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, 297, 210, 'F')
      
      // Golden border
      pdf.setDrawColor(212, 175, 55)
      pdf.setLineWidth(3)
      pdf.rect(10, 10, 277, 190)
      pdf.setLineWidth(1)
      pdf.rect(15, 15, 267, 180)
      
      // Title
      pdf.setTextColor(212, 175, 55)
      pdf.setFontSize(28)
      pdf.setFont('helvetica', 'bold')
      pdf.text('CERTIFICATE OF AUTHENTICITY', 148.5, 40, { align: 'center' })
      
      // Subtitle
      pdf.setTextColor(148, 163, 184)
      pdf.setFontSize(12)
      pdf.text('Human-Verified Content Authentication', 148.5, 52, { align: 'center' })
      
      // Score circle
      pdf.setFillColor(34, 197, 94)
      pdf.circle(148.5, 90, 25, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(24)
      pdf.text(`${result.humanScore}%`, 148.5, 95, { align: 'center' })
      pdf.setFontSize(8)
      pdf.text('HUMAN SCORE', 148.5, 103, { align: 'center' })
      
      // Certificate info
      pdf.setTextColor(226, 232, 240)
      pdf.setFontSize(11)
      pdf.text(`Certificate ID: ${certData.certificateId}`, 148.5, 130, { align: 'center' })
      pdf.text(`Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 148.5, 140, { align: 'center' })
      
      // QR Code
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
    if (score >= 61) return 'text-emerald-400'
    if (score >= 31) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 61) return 'from-emerald-500 to-green-500'
    if (score >= 31) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-rose-500'
  }

  const resetAnalysis = () => {
    setText('')
    setUrl('')
    setResult(null)
    setError(null)
    setVerificationId(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 mb-4"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-slate-300">{t.analyzer.badge}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl md:text-4xl font-bold text-white mb-3"
          >
            {t.analyzer.title}{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              {t.analyzer.titleHighlight}
            </span>
          </motion.h1>

          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            {t.analyzer.description}
          </p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl"
        >
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Input Mode Toggle */}
              <div className="flex justify-center gap-2 p-1 bg-slate-800/50 rounded-xl w-fit mx-auto">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    inputMode === 'text' 
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📝 {language === 'ar' ? 'نص' : 'Text'}
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    inputMode === 'url' 
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔗 {language === 'ar' ? 'رابط' : 'URL'}
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
                      <label className="text-sm font-medium text-slate-300">{t.analyzer.inputLabel}</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={pasteFromClipboard} className="text-xs text-slate-400 hover:text-violet-400 px-2 py-1 rounded hover:bg-slate-800">
                          📋 {language === 'ar' ? 'لصق' : 'Paste'}
                        </button>
                        {text && (
                          <button type="button" onClick={clearInput} className="text-xs text-slate-400 hover:text-red-400 px-2 py-1 rounded hover:bg-slate-800">
                            ✕ {language === 'ar' ? 'مسح' : 'Clear'}
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
                      placeholder={t.analyzer.inputPlaceholder}
                      dir="auto"
                    />
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                      <span>{t.analyzer.minChars}</span>
                      <span className={text.length >= 20 ? 'text-emerald-400' : ''}>{text.length} {t.analyzer.characters}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="url"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {language === 'ar' ? 'رابط المقال' : 'Article URL'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔗</span>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
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
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    ⚠️ {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (inputMode === 'text' ? text.length < 20 : !url.trim())}
                className="w-full py-4 px-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {loadingMessage}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🔬 {t.analyzer.analyzeButton}
                  </span>
                )}
              </button>
            </form>
          ) : (
            /* Results Section */
            <div className="space-y-6">
              {/* Score Header */}
              <div className="text-center py-6 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className={`text-6xl font-bold ${getScoreColor(result.humanScore)}`}
                >
                  {result.humanScore}%
                </motion.div>
                <div className={`text-xl font-semibold mt-2 ${getScoreColor(result.humanScore)}`}>
                  {result.verdict}
                </div>
                {result.confidence && (
                  <div className="text-xs text-slate-500 mt-1">
                    {language === 'ar' ? 'الثقة:' : 'Confidence:'} {result.confidence}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div>
                <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.humanScore}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full bg-gradient-to-r ${getScoreBg(result.humanScore)} rounded-full`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>🤖 AI (0%)</span>
                  <span>🔀 {language === 'ar' ? 'هجين' : 'Hybrid'} (50%)</span>
                  <span>👤 {language === 'ar' ? 'بشري' : 'Human'} (100%)</span>
                </div>
              </div>

              {/* Certificate Button */}
              {result.humanScore >= 90 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h4 className="text-emerald-400 font-bold">🏆 {language === 'ar' ? 'شهادة متاحة!' : 'Certificate Available!'}</h4>
                      <p className="text-slate-400 text-sm">{language === 'ar' ? 'محتواك مؤهل للحصول على شهادة' : 'Your content qualifies for a certificate'}</p>
                    </div>
                    <button
                      onClick={generateCertificate}
                      disabled={certificateLoading}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 rounded-lg text-sm font-medium"
                    >
                      {certificateLoading ? '...' : `📄 ${language === 'ar' ? 'تحميل PDF' : 'Download PDF'}`}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-800/30 rounded-xl text-center border border-slate-700/30">
                  <div className="text-slate-400 text-xs mb-1">{t.results.wordCount}</div>
                  <div className="text-white font-semibold">{result.analysisMetadata?.wordCount || '-'}</div>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-xl text-center border border-slate-700/30">
                  <div className="text-slate-400 text-xs mb-1">{language === 'ar' ? 'الجمل' : 'Sentences'}</div>
                  <div className="text-white font-semibold">{result.analysisMetadata?.sentenceCount || '-'}</div>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-xl text-center border border-slate-700/30">
                  <div className="text-slate-400 text-xs mb-1">{t.results.perplexityLevel}</div>
                  <div className="text-violet-400 font-semibold capitalize">{result.analysisMetadata?.perplexityLevel || '-'}</div>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-xl text-center border border-slate-700/30">
                  <div className="text-slate-400 text-xs mb-1">{t.results.burstinessScore}</div>
                  <div className="text-cyan-400 font-semibold capitalize">{result.analysisMetadata?.burstinessScore || '-'}</div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  📋 {t.results.summary}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">{result.summary}</p>
              </div>

              {/* Forensic Details */}
              {result.forensicDetails && (
                <div className="p-4 bg-slate-800/30 rounded-xl border border-violet-500/20">
                  <h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2">
                    🔬 {t.results.forensicDetails}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs block mb-1">{t.results.syntaxAnalysis}</span>
                      <span className="text-slate-200">{result.forensicDetails.syntaxAnalysis}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block mb-1">{t.results.lexicalRichness}</span>
                      <span className="text-slate-200">{result.forensicDetails.lexicalRichness}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block mb-1">{t.results.predictability}</span>
                      <span className="text-slate-200">{result.forensicDetails.predictability}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicators */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* AI Indicators */}
                {result.aiIndicators && result.aiIndicators.length > 0 && (
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-red-500/20">
                    <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                      🤖 {t.results.aiIndicators} ({result.aiIndicators.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.aiIndicators.map((item, i) => (
                        <div key={i} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-red-300 font-medium text-sm">{item.pattern}</span>
                            {item.penalty && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/30 text-red-300">-{item.penalty}</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Human Indicators */}
                {result.humanIndicators && result.humanIndicators.length > 0 && (
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-emerald-500/20">
                    <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                      👤 {t.results.humanIndicators} ({result.humanIndicators.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.humanIndicators.map((item, i) => (
                        <div key={i} className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-emerald-300 font-medium text-sm">{item.pattern}</span>
                            {item.bonus && (
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300">+{item.bonus}</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset Button */}
              <button
                onClick={resetAnalysis}
                className="w-full py-3 px-4 rounded-xl border border-slate-600/50 text-slate-300 hover:text-white hover:border-violet-500/50 hover:bg-violet-500/5 transition-all"
              >
                🔄 {t.analyzer.newAnalysis}
              </button>
            </div>
          )}
        </motion.div>

        {/* Guide */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl"
        >
          <h3 className="text-sm font-semibold text-white mb-3 text-center">📊 {t.guide.title}</h3>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <div className="text-red-400 font-bold">0-30%</div>
              <div className="text-slate-400">{t.guide.aiRange}</div>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <div className="text-yellow-400 font-bold">31-60%</div>
              <div className="text-slate-400">{t.guide.hybridRange}</div>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="text-emerald-400 font-bold">61-100%</div>
              <div className="text-slate-400">{t.guide.humanRange}</div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-slate-500 text-xs">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  )
}
