'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

interface HeatmapItem {
  sentence: string
  score: number
  classification: 'ai' | 'mixed' | 'human'
  reason: string
}

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
  aiIndicators: { pattern: string; severity?: string; penalty?: number; description: string }[]
  humanIndicators: { pattern: string; severity?: string; bonus?: number; description: string }[]
  forensicDetails: {
    syntaxAnalysis: string
    lexicalRichness: string
    predictability: string
  }
  heatmap?: HeatmapItem[]
}

const loadingMessages = [
  "Initializing forensic scanner...",
  "Analyzing syntax patterns...",
  "Checking burstiness levels...",
  "Detecting AI fingerprints...",
  "Measuring perplexity...",
  "Scanning lexical diversity...",
  "Compiling forensic report..."
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
      }, 1500)
      return () => clearInterval(interval)
    }
  }, [loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (inputMode === 'text' && (!text.trim() || text.length < 20)) {
      setError(t.analyzer.errorShortText)
      return
    }
    
    if (inputMode === 'url' && !url.trim()) {
      setError('Please enter a valid URL')
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
        const { data: insertData } = await supabase.from('verifications').insert({
          user_id: user.id,
          content: (inputMode === 'text' ? text : url).substring(0, 500),
          result_score: data.humanScore,
          analysis: data.summary,
        }).select().single()
        
        if (insertData) {
          setVerificationId(insertData.id)
        }
      }
    } catch (err: any) {
      setError(err.message || t.common.error)
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
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, 297, 210, 'F')
      
      pdf.setDrawColor(212, 175, 55)
      pdf.setLineWidth(3)
      pdf.rect(10, 10, 277, 190)
      pdf.setLineWidth(1)
      pdf.rect(15, 15, 267, 180)
      
      pdf.setTextColor(212, 175, 55)
      pdf.setFontSize(32)
      pdf.setFont('helvetica', 'bold')
      pdf.text('CERTIFICATE OF AUTHENTICITY', 148.5, 45, { align: 'center' })
      
      pdf.setTextColor(148, 163, 184)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Human-Verified Content Authentication', 148.5, 58, { align: 'center' })
      
      pdf.setFillColor(34, 197, 94)
      pdf.circle(148.5, 95, 25, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(28)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${result.humanScore}%`, 148.5, 100, { align: 'center' })
      pdf.setFontSize(10)
      pdf.text('HUMAN SCORE', 148.5, 108, { align: 'center' })
      
      pdf.setTextColor(226, 232, 240)
      pdf.setFontSize(12)
      pdf.text(`Certificate ID: ${certData.certificateId}`, 148.5, 135, { align: 'center' })
      pdf.text(`Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 148.5, 145, { align: 'center' })
      
      pdf.addImage(qrDataUrl, 'PNG', 230, 140, 35, 35)
      pdf.setFontSize(8)
      pdf.setTextColor(148, 163, 184)
      pdf.text('Scan to verify', 247.5, 180, { align: 'center' })
      
      pdf.save(`Human-Verified-Certificate-${certData.certificateId}.pdf`)
      
    } catch (err: any) {
      console.error('Certificate generation error:', err)
      setError('Failed to generate certificate')
    } finally {
      setCertificateLoading(false)
    }
  }

  const clearText = () => {
    setText('')
    setUrl('')
    if (textareaRef.current) textareaRef.current.focus()
  }

  const pasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText()
      if (inputMode === 'text') {
        setText(clipText)
      } else {
        setUrl(clipText)
      }
    } catch {}
  }

  const getScoreColor = (score: number) => {
    if (score >= 61) return 'text-emerald-400'
    if (score >= 31) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreGradient = (score: number) => {
    if (score >= 61) return 'from-emerald-500 to-green-500'
    if (score >= 31) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-rose-500'
  }

  const getHeatmapClass = (classification: string) => {
    switch (classification) {
      case 'ai': return 'heatmap-ai'
      case 'mixed': return 'heatmap-mixed'
      case 'human': return 'heatmap-human'
      default: return ''
    }
  }

  const resetAnalysis = () => {
    setText('')
    setUrl('')
    setResult(null)
    setError(null)
    setVerificationId(null)
  }

  return (
    <div className="min-h-screen relative grid-bg" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 -z-10" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-5">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] float" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] float" style={{ animationDelay: '-3s' }} />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 mb-5 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-slate-300 font-medium">{t.analyzer.badge}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            {t.analyzer.title}{' '}
            <span className="text-gradient">{t.analyzer.titleHighlight}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base"
          >
            {t.analyzer.description}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 md:p-8"
        >
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-center gap-2 p-1 bg-slate-800/50 rounded-xl w-fit mx-auto">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    inputMode === 'text' 
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📝 Text Input
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    inputMode === 'url' 
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔗 URL Scanner
                </button>
              </div>

              <AnimatePresence mode="wait">
                {inputMode === 'text' ? (
                  <motion.div
                    key="text-input"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="content" className="text-sm font-medium text-slate-300">
                        {t.analyzer.inputLabel}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={pasteFromClipboard}
                          className="text-xs text-slate-400 hover:text-violet-400 transition-colors px-2 py-1 rounded hover:bg-slate-800/50"
                        >
                          📋 Paste
                        </button>
                        <button
                          type="button"
                          onClick={clearText}
                          className="text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-slate-800/50"
                        >
                          ✕ Clear
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={textareaRef}
                      id="content"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                      placeholder={t.analyzer.inputPlaceholder}
                      dir="auto"
                    />
                    <div className="mt-2 flex justify-between text-xs text-slate-500">
                      <span>{t.analyzer.minChars}</span>
                      <span className={text.length >= 20 ? 'text-emerald-400' : ''}>{text.length} {t.analyzer.characters}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="url-input"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-2">
                      Enter article URL to scan
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔗</span>
                      <input
                        id="url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                        placeholder="https://example.com/article"
                        dir="ltr"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      We'll extract and analyze the main content from the URL
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    ⚠️ {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || (inputMode === 'text' ? text.length < 20 : !url.trim())}
                className="w-full py-4 px-6 btn-gradient text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{loadingMessage}</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>🔬</span>
                    {t.analyzer.analyzeButton}
                  </span>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Score Display */}
              <div className="text-center py-8 rounded-2xl bg-slate-800/30 border border-slate-700/30">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className={`text-6xl font-bold ${getScoreColor(result.humanScore)}`}
                >
                  {result.humanScore}%
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`text-xl font-semibold mt-2 ${getScoreColor(result.humanScore)}`}
                >
                  {result.verdict}
                </motion.div>
                {result.confidence && (
                  <span className="text-xs text-slate-500 mt-1">Confidence: {result.confidence}</span>
                )}
              </div>

              {/* Progress Bar */}
              <div>
                <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.humanScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full bg-gradient-to-r ${getScoreGradient(result.humanScore)} rounded-full`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>🤖 AI (0%)</span>
                  <span>🔀 Hybrid (50%)</span>
                  <span>👤 Human (100%)</span>
                </div>
              </div>

              {/* Certificate Button (90%+ only) */}
              {result.humanScore >= 90 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl neon-border-green bg-emerald-500/5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h4 className="text-emerald-400 font-bold flex items-center gap-2">
                        <span>🏆</span> Certificate Available!
                      </h4>
                      <p className="text-slate-400 text-sm">Your content qualifies for a Digital Certificate</p>
                    </div>
                    <button
                      onClick={generateCertificate}
                      disabled={certificateLoading}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 rounded-lg transition-all text-sm font-medium"
                    >
                      {certificateLoading ? 'Generating...' : '📄 Download PDF'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-800/30 rounded-xl text-center border border-slate-700/30">
                  <div className="text-slate-400 mb-1">{t.results.wordCount}</div>
                  <div className="text-white font-medium">{result.analysisMetadata?.wordCount || '-'}</div>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-xl text-center border border-slate-700/30">
                  <div className="text-slate-400 mb-1">Sentences</div>
                  <div className="text-white font-medium">{result.analysisMetadata?.sentenceCount || '-'}</div>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-xl text-center border border-slate-700/30">
                  <div className="text-slate-400 mb-1">{t.results.perplexityLevel}</div>
                  <div className="text-violet-400 font-medium">{result.analysisMetadata?.perplexityLevel || '-'}</div>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-xl text-center border border-slate-700/30">
                  <div className="text-slate-400 mb-1">{t.results.burstinessScore}</div>
                  <div className="text-cyan-400 font-medium">{result.analysisMetadata?.burstinessScore || '-'}</div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-5 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>📋</span> {t.results.summary}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">{result.summary}</p>
              </div>

              {/* Heatmap */}
              {result.heatmap && result.heatmap.length > 0 && (
                <div className="p-5 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <span>🗺️</span> AI Heatmap
                    <span className="text-xs text-slate-500 font-normal ml-2">
                      (🔴 AI • 🟡 Mixed • 🟢 Human)
                    </span>
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.heatmap.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`p-3 rounded-lg ${getHeatmapClass(item.classification)}`}
                      >
                        <p className="text-slate-200 text-sm" dir="auto">{item.sentence}</p>
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="text-slate-400">{item.reason}</span>
                          <span className={`font-medium ${
                            item.classification === 'ai' ? 'text-red-400' :
                            item.classification === 'mixed' ? 'text-yellow-400' : 'text-emerald-400'
                          }`}>
                            {item.score}%
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forensic Details */}
              <div className="p-5 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <h3 className="text-sm font-semibold text-violet-400 mb-4 flex items-center gap-2">
                  <span>🔬</span> {t.results.forensicDetails}
                </h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs mb-1">{t.results.syntaxAnalysis}</span>
                    <span className="text-slate-200">{result.forensicDetails?.syntaxAnalysis}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs mb-1">{t.results.lexicalRichness}</span>
                    <span className="text-slate-200">{result.forensicDetails?.lexicalRichness}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs mb-1">{t.results.predictability}</span>
                    <span className="text-slate-200">{result.forensicDetails?.predictability}</span>
                  </div>
                </div>
              </div>

              {/* AI & Human Indicators */}
              <div className="grid md:grid-cols-2 gap-4">
                {result.aiIndicators && result.aiIndicators.length > 0 && (
                  <div className="p-5 bg-slate-800/30 rounded-xl border border-red-500/20">
                    <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                      <span>🤖</span> {t.results.aiIndicators}
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.aiIndicators.map((item, index) => (
                        <div key={index} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
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

                {result.humanIndicators && result.humanIndicators.length > 0 && (
                  <div className="p-5 bg-slate-800/30 rounded-xl border border-emerald-500/20">
                    <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                      <span>👤</span> {t.results.humanIndicators}
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.humanIndicators.map((item, index) => (
                        <div key={index} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
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
                type="button"
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
          transition={{ delay: 0.5 }}
          className="mt-8 p-5 glass-card"
        >
          <h3 className="text-sm font-semibold text-white mb-4 text-center">📊 {t.guide.title}</h3>
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

      <footer className="relative z-10 border-t border-slate-800/50 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-slate-500 text-xs">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  )
}
