'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { 
  Search, 
  Link as LinkIcon, 
  Clipboard, 
  X, 
  Loader2, 
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
  Minus,
  Upload,
  Shield,
  Sparkles,
  FileCheck,
  Crown
} from 'lucide-react'
import Script from 'next/script'
import UpgradeModal from '@/components/UpgradeModal'
import UsageCounter from '@/components/UsageCounter'

// Turnstile site key
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

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
  smartBreakdown?: string[]
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
  const router = useRouter()
  const { t, language, isRTL, isLoaded } = useLanguage()
  const { user, loading: authLoading, usageStatus, refreshUsageStatus } = useAuth()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [certificateLoading, setCertificateLoading] = useState(false)
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [showCookieConsent, setShowCookieConsent] = useState(true)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [welcomeStep, setWelcomeStep] = useState(0)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)

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

  // Check for cookie consent and welcome modal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const consent = localStorage.getItem('cookieConsent')
      if (consent) setShowCookieConsent(false)
      
      // Check if user has seen welcome modal
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true)
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error)
    }
  }, [])

  const handleCloseWelcome = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenWelcome', 'true')
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
    setShowWelcomeModal(false)
    setWelcomeStep(0)
  }

  const openWelcomeModal = () => {
    setWelcomeStep(0)
    setShowWelcomeModal(true)
  }

  const handleCookieConsent = (accepted: boolean) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cookieConsent', accepted ? 'accepted' : 'declined')
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
    setShowCookieConsent(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Auth check on submit - redirect to login if not authenticated
    if (!user && !authLoading) {
      router.push('/auth')
      return
    }
    
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
      // Get the user's access token for authenticated requests
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: HeadersInit = { 
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if user is logged in
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          text: inputMode === 'text' ? text : undefined, 
          url: inputMode === 'url' ? url : undefined,
          language,
          turnstileToken 
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        // Check for usage limit error
        if (data.errorCode === 'USAGE_LIMIT_REACHED') {
          setShowUpgradeModal(true)
          throw new Error(language === 'ar' ? 'وصلت للحد اليومي. الترقية للحصول على تحليلات غير محدودة.' : 'Daily limit reached. Upgrade for unlimited analyses.')
        }
        throw new Error(data.error || 'Analysis failed')
      }
      
      // Refresh usage status after successful analysis
      refreshUsageStatus()

      setResult(data)

      // Save to history (all features free in beta)
      if (user && isSupabaseConfigured()) {
        try {
          const supabase = createClient()
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
    
    // SECURITY: Check if user is Pro before allowing certificate generation
    if (!usageStatus?.isPro) {
      setShowUpgradeModal(true)
      return
    }
    
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
      const width = 297
      const height = 210
      
      // === BACKGROUND ===
      // Dark gradient background
      pdf.setFillColor(10, 10, 15)
      pdf.rect(0, 0, width, height, 'F')
      
      // === DECORATIVE BORDERS ===
      // Outer gold/purple gradient border effect
      pdf.setDrawColor(168, 85, 247) // Purple
      pdf.setLineWidth(4)
      pdf.rect(8, 8, width - 16, height - 16)
      
      // Inner decorative border
      pdf.setDrawColor(139, 92, 246)
      pdf.setLineWidth(1.5)
      pdf.rect(14, 14, width - 28, height - 28)
      
      // Corner decorations (ornamental corners)
      const cornerSize = 15
      pdf.setLineWidth(2)
      pdf.setDrawColor(168, 85, 247)
      // Top-left corner
      pdf.line(14, 14 + cornerSize, 14, 14); pdf.line(14, 14, 14 + cornerSize, 14)
      // Top-right corner  
      pdf.line(width - 14, 14, width - 14 - cornerSize, 14); pdf.line(width - 14, 14, width - 14, 14 + cornerSize)
      // Bottom-left corner
      pdf.line(14, height - 14, 14, height - 14 - cornerSize); pdf.line(14, height - 14, 14 + cornerSize, height - 14)
      // Bottom-right corner
      pdf.line(width - 14, height - 14, width - 14 - cornerSize, height - 14); pdf.line(width - 14, height - 14, width - 14, height - 14 - cornerSize)
      
      // === HEADER SECTION ===
      // Top ribbon/banner effect
      pdf.setFillColor(168, 85, 247)
      pdf.rect(20, 20, width - 40, 8, 'F')
      
      // Title
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(32)
      pdf.setFont('helvetica', 'bold')
      pdf.text('CERTIFICATE OF AUTHENTICITY', width / 2, 48, { align: 'center' })
      
      // Subtitle with decorative lines
      pdf.setDrawColor(100, 100, 120)
      pdf.setLineWidth(0.5)
      pdf.line(60, 55, 120, 55)
      pdf.line(width - 120, 55, width - 60, 55)
      
      pdf.setTextColor(148, 163, 184)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Human-Verified Hub | Forensic Linguistic Analysis', width / 2, 60, { align: 'center' })
      
      // === MAIN BADGE/SEAL SECTION ===
      // Large verification badge background
      pdf.setFillColor(20, 20, 30)
      pdf.circle(width / 2, 100, 35, 'F')
      
      // Badge outer ring
      pdf.setDrawColor(34, 197, 94)
      pdf.setLineWidth(3)
      pdf.circle(width / 2, 100, 35)
      
      // Badge inner ring
      pdf.setLineWidth(1)
      pdf.circle(width / 2, 100, 30)
      
      // Verified checkmark area
      pdf.setFillColor(34, 197, 94)
      pdf.circle(width / 2, 92, 12, 'F')
      
      // Score display
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(28)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${result.humanScore}%`, width / 2, 115, { align: 'center' })
      
      pdf.setFontSize(8)
      pdf.setTextColor(34, 197, 94)
      pdf.text('HUMAN AUTHENTICITY SCORE', width / 2, 125, { align: 'center' })
      
      // === VERDICT LABEL ===
      pdf.setTextColor(34, 197, 94)
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text('HUMAN ORIGINAL - VERIFIED', width / 2, 145, { align: 'center' })
      
      // === CERTIFICATE DETAILS BOX ===
      pdf.setFillColor(15, 15, 20)
      pdf.roundedRect(30, 152, width - 60, 28, 3, 3, 'F')
      pdf.setDrawColor(60, 60, 80)
      pdf.setLineWidth(0.5)
      pdf.roundedRect(30, 152, width - 60, 28, 3, 3)
      
      pdf.setTextColor(148, 163, 184)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Certificate ID: ${certData.certificateId}`, 40, 162)
      pdf.text(`Reference: HVH-${Date.now().toString(36).toUpperCase()}`, 40, 170)
      pdf.text(`Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 40, 178)
      
      // === QR CODE SECTION ===
      pdf.addImage(qrDataUrl, 'PNG', width - 78, 154, 32, 32)
      pdf.setFontSize(7)
      pdf.setTextColor(100, 100, 120)
      pdf.text('Scan to verify', width - 62, 188, { align: 'center' })
      
      // === FOOTER ===
      pdf.setFillColor(168, 85, 247)
      pdf.rect(20, height - 28, width - 40, 8, 'F')
      
      pdf.setTextColor(100, 100, 120)
      pdf.setFontSize(7)
      pdf.text('This certificate verifies the analyzed content was determined to be human-written by advanced AI detection algorithms.', width / 2, height - 12, { align: 'center' })
      pdf.text('humanverified.systems', width / 2, height - 8, { align: 'center' })
      
      pdf.save(`HumanVerified-Certificate-${certData.certificateId}.pdf`)
      
    } catch (err: any) {
      console.error('Certificate error:', err)
      setError(language === 'ar' ? 'فشل إنشاء الشهادة' : 'Failed to generate certificate')
    } finally {
      setCertificateLoading(false)
    }
  }

  // Download Report PDF - Pro feature only
  const downloadReport = async () => {
    if (!result) return
    
    // SECURITY: Check if user is Pro before allowing PDF download
    if (!usageStatus?.isPro) {
      setShowUpgradeModal(true)
      return
    }
    
    setCertificateLoading(true)
    
    try {
      const jsPDF = (await import('jspdf')).default
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      
      // Background
      pdf.setFillColor(0, 0, 0)
      pdf.rect(0, 0, 210, 297, 'F')
      
      // Border
      pdf.setDrawColor(147, 51, 234)
      pdf.setLineWidth(2)
      pdf.rect(10, 10, 190, 277)
      
      // Header
      pdf.setTextColor(168, 85, 247)
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.text('ANALYSIS REPORT', 105, 35, { align: 'center' })
      
      pdf.setTextColor(148, 163, 184)
      pdf.setFontSize(10)
      pdf.text('Human-Verified Hub | AI Identity Detection', 105, 45, { align: 'center' })
      
      // Score section
      const scoreColor = result.humanScore >= 61 ? [34, 197, 94] : result.humanScore >= 31 ? [234, 179, 8] : [239, 68, 68]
      pdf.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2])
      pdf.circle(105, 75, 18, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(18)
      pdf.text(`${result.humanScore}%`, 105, 79, { align: 'center' })
      
      // Verdict
      pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
      pdf.setFontSize(14)
      pdf.text(result.verdict, 105, 100, { align: 'center' })
      
      // Details
      pdf.setTextColor(226, 232, 240)
      pdf.setFontSize(10)
      let yPos = 120
      
      pdf.text(`Word Count: ${result.analysisMetadata?.wordCount || 'N/A'}`, 20, yPos)
      pdf.text(`Perplexity: ${result.analysisMetadata?.perplexityLevel || 'N/A'}`, 110, yPos)
      yPos += 10
      pdf.text(`Confidence: ${result.confidence || 'Medium'}`, 20, yPos)
      pdf.text(`Burstiness: ${result.analysisMetadata?.burstinessScore || 'N/A'}`, 110, yPos)
      
      // Summary
      yPos += 20
      pdf.setTextColor(168, 85, 247)
      pdf.setFontSize(12)
      pdf.text('Summary', 20, yPos)
      yPos += 8
      pdf.setTextColor(200, 200, 200)
      pdf.setFontSize(9)
      const summaryLines = pdf.splitTextToSize(result.summary, 170)
      pdf.text(summaryLines, 20, yPos)
      
      // Footer
      pdf.setTextColor(100, 100, 100)
      pdf.setFontSize(8)
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 105, 280, { align: 'center' })
      pdf.text('Human-Verified Hub - humanverified.ai', 105, 285, { align: 'center' })
      
      pdf.save(`Analysis-Report-${Date.now()}.pdf`)
      
    } catch (err: any) {
      console.error('Report error:', err)
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

  // Show loading only while language context is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-900/20 flex items-center justify-center animate-pulse">
            <Search className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black cyber-grid" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Status Banner - Professional styling with proper padding */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-purple-900/50 via-purple-900/60 to-purple-900/50 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            {usageStatus?.isPro ? (
              <>
                <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="text-yellow-400 text-sm font-medium truncate">
                  {language === 'ar' ? 'Pro - تحليلات غير محدودة' : 'Pro - Unlimited Analyses'}
                </span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-gray-200 text-sm font-medium truncate">
                  {language === 'ar' 
                    ? 'تحليل النصوص (2/يوم)' 
                    : 'Text Analysis Only (2/day)'}
                </span>
              </>
            )}
          </div>
          <div className="flex-shrink-0">
            <UsageCounter variant="badge" showUpgrade={!usageStatus?.isPro} />
          </div>
        </div>
      </div>



      {/* Main content with top padding for fixed navbar + thin banner */}
      <main className="max-w-5xl mx-auto px-4 py-8 pt-28">
        {/* Hero Header */}
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
          transition={{ delay: 0.2 }}
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
                    className="p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Turnstile Widget */}
              {TURNSTILE_SITE_KEY && (
                <div className="flex justify-center">
                  <div
                    ref={turnstileRef}
                    className="cf-turnstile"
                    data-sitekey={TURNSTILE_SITE_KEY}
                    data-callback="onTurnstileSuccess"
                    data-theme="dark"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (inputMode === 'text' ? text.length < 20 : !url.trim())}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
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

              {/* Download Report Button - Pro Feature */}
              <div className="flex gap-3">
                <button
                  onClick={downloadReport}
                  disabled={certificateLoading}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    usageStatus?.isPro 
                      ? 'bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300' 
                      : 'bg-gradient-to-r from-purple-600/20 to-fuchsia-600/20 border border-purple-500/40 text-purple-300 hover:border-purple-400/60'
                  }`}
                >
                  {certificateLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : usageStatus?.isPro ? (
                    <Download className="w-4 h-4" />
                  ) : (
                    <Crown className="w-4 h-4 text-fuchsia-400" />
                  )}
                  {usageStatus?.isPro 
                    ? (language === 'ar' ? 'تحميل التقرير' : 'Download Report')
                    : (language === 'ar' ? 'تقرير PDF (Pro)' : 'PDF Report (Pro)')}
                </button>
              </div>

              {/* Certificate Button (Score >= 90) - Pro Feature */}
              {result.humanScore >= 90 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-xl ${
                    usageStatus?.isPro 
                      ? 'bg-green-900/20 border border-green-500/30' 
                      : 'bg-gradient-to-r from-purple-900/20 to-fuchsia-900/20 border border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      {usageStatus?.isPro ? (
                        <Award className="w-6 h-6 text-green-400" />
                      ) : (
                        <Crown className="w-6 h-6 text-fuchsia-400" />
                      )}
                      <div>
                        <h4 className={usageStatus?.isPro ? 'text-green-400 font-bold' : 'text-fuchsia-400 font-bold'}>
                          {usageStatus?.isPro 
                            ? (language === 'ar' ? 'شهادة متاحة!' : 'Certificate Available!') 
                            : (language === 'ar' ? 'ميزة Pro - شهادة متاحة!' : 'Pro Feature - Certificate Available!')}
                        </h4>
                        <p className="text-gray-400 text-sm">
                          {usageStatus?.isPro 
                            ? (language === 'ar' ? 'محتواك مؤهل للحصول على شهادة PDF رسمية' : 'Your content qualifies for an official PDF certificate')
                            : (language === 'ar' ? 'ترقية للحصول على شهادات PDF رسمية' : 'Upgrade to get official PDF certificates')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={generateCertificate}
                      disabled={certificateLoading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                        usageStatus?.isPro 
                          ? 'bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-300'
                          : 'bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 border border-purple-500/50 text-purple-300 hover:border-purple-400/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      }`}
                    >
                      {certificateLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : usageStatus?.isPro ? (
                        <FileCheck className="w-4 h-4" />
                      ) : (
                        <Crown className="w-4 h-4 text-fuchsia-400" />
                      )}
                      {usageStatus?.isPro 
                        ? (language === 'ar' ? 'تحميل الشهادة' : 'Download Certificate')
                        : (language === 'ar' ? 'ترقية للحصول على الشهادة' : 'Upgrade for Certificate')}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Smart Analysis Breakdown */}
              {result.smartBreakdown && result.smartBreakdown.length > 0 && (
                <div className="p-4 bg-black/30 rounded-xl border border-purple-500/20">
                  <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    {language === 'ar' ? 'تحليل ذكي' : 'Smart Analysis Breakdown'}
                  </h3>
                  <ul className="space-y-2">
                    {result.smartBreakdown.map((item, i) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
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

        {/* Results Guide - Fixed for mobile */}
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
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 sm:p-3 bg-red-900/10 rounded-xl border border-red-500/20">
              <div className="text-red-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-1">
                <Bot className="w-3 h-3 hidden sm:block" /> 0-30%
              </div>
              <div className="text-gray-400 text-[10px] sm:text-xs break-words">{t.guide.aiRange}</div>
            </div>
            <div className="p-2 sm:p-3 bg-yellow-900/10 rounded-xl border border-yellow-500/20">
              <div className="text-yellow-400 font-bold text-xs sm:text-sm">31-60%</div>
              <div className="text-gray-400 text-[10px] sm:text-xs break-words">{t.guide.hybridRange}</div>
            </div>
            <div className="p-2 sm:p-3 bg-green-900/10 rounded-xl border border-green-500/20">
              <div className="text-green-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-1">
                <User className="w-3 h-3 hidden sm:block" /> 61-100%
              </div>
              <div className="text-gray-400 text-[10px] sm:text-xs break-words">{t.guide.humanRange}</div>
            </div>
          </div>
        </motion.div>

      </main>

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      {/* Footer */}
      <footer className="bg-black border-t border-purple-900/30 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">© 2026 Human-Verified Hub. All rights reserved.</p>
            <div className="flex items-center flex-wrap justify-center gap-4 md:gap-6 text-sm">
              <a href="/about" className="text-gray-400 hover:text-purple-400 transition-colors">
                {language === 'ar' ? 'من نحن' : 'About'}
              </a>
              <a href="/methodology" className="text-gray-400 hover:text-purple-400 transition-colors">
                {language === 'ar' ? 'المنهجية' : 'How It Works'}
              </a>
              <a href="/contact" className="text-gray-400 hover:text-purple-400 transition-colors">
                {language === 'ar' ? 'اتصل بنا' : 'Contact'}
              </a>
              <a href="/privacy" className="text-gray-400 hover:text-purple-400 transition-colors">
                {language === 'ar' ? 'الخصوصية' : 'Privacy'}
              </a>
              <a href="/terms" className="text-gray-400 hover:text-purple-400 transition-colors">
                {language === 'ar' ? 'الشروط' : 'Terms'}
              </a>
            </div>
          </div>
          {/* Disclaimer */}
          <div className="mt-6 pt-4 border-t border-purple-900/20">
            <p className="text-gray-600 text-[10px] text-center leading-relaxed">
              {language === 'ar' 
                ? 'هذه الأداة للأغراض التعليمية والبحثية فقط. النتائج إرشادية ولا يجب أن تكون الأساس الوحيد لاتخاذ قرارات أكاديمية أو قانونية.'
                : 'This tool is for educational and research purposes only. Results are indicative and should not be the sole basis for academic or legal decisions.'}
            </p>
          </div>
        </div>
      </footer>

      {/* Welcome Modal - Premium Dark Glass Design */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={handleCloseWelcome}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-md w-full rounded-2xl bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl p-8 text-center border border-purple-500/20 shadow-[0_0_60px_-15px_rgba(168,85,247,0.3)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
              
              {/* Step Indicators */}
              <div className="relative flex justify-center gap-3 mb-8">
                {[0, 1, 2].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      welcomeStep === step 
                        ? 'w-8 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' 
                        : welcomeStep > step
                        ? 'w-4 bg-purple-500/50'
                        : 'w-4 bg-gray-700'
                    }`}
                  />
                ))}
              </div>

              {/* Step Content */}
              <AnimatePresence mode="wait">
                {welcomeStep === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                      <Upload className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {language === 'ar' ? 'رفع المحتوى' : 'Upload Content'}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {language === 'ar' 
                        ? 'الصق النص أو أدخل رابط المقال'
                        : 'Paste text or enter an article URL to analyze'}
                    </p>
                  </motion.div>
                )}
                {welcomeStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                      <Brain className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {language === 'ar' ? 'فحص ذكي' : 'AI Analysis'}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {language === 'ar' 
                        ? 'محركنا يحلل الأنماط اللغوية'
                        : 'Our Gemini engine analyzes linguistic patterns'}
                    </p>
                  </motion.div>
                )}
                {welcomeStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                      <Shield className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {language === 'ar' ? 'احصل على التحقق' : 'Get Verified'}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {language === 'ar' 
                        ? 'احصل على نتيجتك وشهادة PDF'
                        : 'Get your score and download PDF certificates'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="relative flex gap-3 mt-8">
                {welcomeStep > 0 && (
                  <button
                    onClick={() => setWelcomeStep(welcomeStep - 1)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 hover:bg-white/5 transition-all text-sm font-medium"
                  >
                    {language === 'ar' ? 'السابق' : 'Back'}
                  </button>
                )}
                {welcomeStep < 2 ? (
                  <button
                    onClick={() => setWelcomeStep(welcomeStep + 1)}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]"
                  >
                    {language === 'ar' ? 'التالي' : 'Next'}
                  </button>
                ) : (
                  <button
                    onClick={handleCloseWelcome}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]"
                  >
                    {language === 'ar' ? 'ابدأ!' : 'Get Started'}
                  </button>
                )}
              </div>

              {/* Skip Link */}
              <button
                onClick={handleCloseWelcome}
                className="relative mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                {language === 'ar' ? 'تخطي' : 'Skip intro'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie Consent Banner */}
      <AnimatePresence>
        {showCookieConsent && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-black/95 border-t border-purple-900/30 backdrop-blur-xl"
          >
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-gray-400 text-sm text-center sm:text-left">
                {language === 'ar' 
                  ? 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك.'
                  : 'We use cookies to enhance your experience.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleCookieConsent(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
                >
                  {language === 'ar' ? 'رفض' : 'Decline'}
                </button>
                <button
                  onClick={() => handleCookieConsent(true)}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {language === 'ar' ? 'قبول' : 'Accept'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turnstile Script */}
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          onLoad={() => {
            (window as any).onTurnstileSuccess = (token: string) => {
              setTurnstileToken(token)
            }
          }}
        />
      )}
    </div>
  )
}
