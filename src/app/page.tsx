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
  Crown,
  Image as ImageIcon,
  Wand2
} from 'lucide-react'
import Link from 'next/link'
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
  detectedLanguage?: string // Language detected from the analysis
}

// Detect if text is primarily Arabic/RTL
function detectTextLanguage(text: string): 'ar' | 'en' {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g
  const arabicChars = (text.match(arabicPattern) || []).length
  return arabicChars > text.length * 0.3 ? 'ar' : 'en'
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
  const { user, loading: authLoading, usageStatus, refreshUsageStatus, updateUsageFromResponse } = useAuth()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [inputMode, setInputMode] = useState<'text' | 'url' | 'file'>('text')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file type
      const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt']
      const fileName = file.name.toLowerCase()
      const isValid = allowedExtensions.some(ext => fileName.endsWith(ext))
      
      if (!isValid) {
        setError(language === 'ar' 
          ? 'نوع الملف غير مدعوم. يرجى رفع ملف PDF أو Word أو نص عادي.'
          : 'Unsupported file type. Please upload a PDF, Word, or plain text file.')
        return
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(language === 'ar' ? 'الملف كبير جداً (الحد الأقصى 10 ميجابايت)' : 'File too large (max 10MB)')
        return
      }
      
      setSelectedFile(file)
      setError(null)
    }
  }

  // Handle file upload and analysis
  const handleFileAnalysis = async () => {
    if (!selectedFile) return
    
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Get access token
      let accessToken: string | null = null
      if (user && isSupabaseConfigured()) {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        accessToken = session?.access_token || null
      }

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('language', language)

      const headers: HeadersInit = {}
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch('/api/analyze-file', {
        method: 'POST',
        headers,
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        if (data.errorCode === 'FEATURE_LOCKED' || data.errorCode === 'AUTH_REQUIRED') {
          setShowUpgradeModal(true)
        }
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data)

      // INSTANT UI UPDATE: Use usage status from API response if available
      if (data.usageStatus) {
        console.log('[HomePage] Updating usage from file analysis response:', data.usageStatus)
        updateUsageFromResponse(data.usageStatus)
      }
      
      // Also do a background refresh for consistency
      refreshUsageStatus()

    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    } finally {
      setLoading(false)
    }
  }

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
      // Get access token for authenticated requests
      let accessToken: string | null = null
      if (user && isSupabaseConfigured()) {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        accessToken = session?.access_token || null
      }

      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
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
      
      setResult(data)

      // INSTANT UI UPDATE: Use usage status from API response if available
      if (data.usageStatus) {
        console.log('[HomePage] Updating usage from API response:', data.usageStatus)
        updateUsageFromResponse(data.usageStatus)
      }
      
      // Also do a background refresh to ensure full consistency
      refreshUsageStatus()

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
    
    // Check if user is Pro - PDF is Pro-only feature
    if (!usageStatus?.isPro) {
      setShowUpgradeModal(true)
      return
    }
    
    setCertificateLoading(true)
    
    try {
      // Get access token for authenticated requests
      let accessToken: string | null = null
      if (user && isSupabaseConfigured()) {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        accessToken = session?.access_token || null
      }
      
      const jsPDF = (await import('jspdf')).default
      const QRCode = await import('qrcode')
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }
      
      const certResponse = await fetch('/api/certificate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          verificationId,
          humanScore: result.humanScore,
          content: text.substring(0, 200),
          userId: user?.id
        })
      })
      
      const certData = await certResponse.json()
      
      // Check for Pro-only restriction
      if (certData.errorCode === 'FEATURE_LOCKED') {
        setShowUpgradeModal(true)
        setCertificateLoading(false)
        return
      }
      
      if (!certData.certificateId) {
        throw new Error(certData.error || 'Failed to generate certificate')
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
      pdf.text('Human Verified Hub | Forensic Linguistic Analysis', width / 2, 60, { align: 'center' })
      
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

  // Download Report PDF for any score - Pro only feature
  const downloadReport = async () => {
    if (!result) return
    
    // Check if user is Pro - PDF is Pro-only feature
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
      pdf.text('Human Verified Hub | AI Identity Detection', 105, 45, { align: 'center' })
      
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
      pdf.text('Human Verified Hub - humanverified.ai', 105, 285, { align: 'center' })
      
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
    setSelectedFile(null)
    setResult(null)
    setError(null)
    setVerificationId(null)
    setInputMode('text')
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

      {/* Usage Status Banner - Only shown to LOGGED IN users */}
      {user && (
        <div className="fixed top-16 left-0 right-0 z-40 h-10 bg-black/80 backdrop-blur-md border-b border-purple-500/20">
          <div className="h-full max-w-5xl mx-auto px-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {usageStatus?.isPro ? (
                <>
                  <Crown className="w-3 h-3 text-yellow-400" />
                  <span className="text-yellow-400 text-xs font-medium">
                    {language === 'ar' ? 'Pro - تحليلات غير محدودة' : 'Pro - Unlimited Analyses'}
                  </span>
                </>
              ) : (
                <>
                  <Shield className="w-3 h-3 text-purple-400" />
                  <span className="text-gray-300 text-xs font-medium">
                    {language === 'ar' 
                      ? 'تجربة مجانية: تحليل النص فقط' 
                      : 'Free Trial: Text Analysis Only'}
                  </span>
                </>
              )}
            </div>
            <UsageCounter variant="compact" showUpgrade={!usageStatus?.isPro} />
          </div>
        </div>
      )}

      {/* Main content with top padding for fixed navbar (+ thin banner if logged in) */}
      <main className={`max-w-5xl mx-auto px-4 py-8 ${user ? 'pt-28' : 'pt-20'}`}>
        
        {/* HERO SECTION for non-logged in users */}
        {!user && !authLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            {/* Hero Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/20 border border-purple-500/30 mb-6">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">
                {language === 'ar' ? 'كشف الذكاء الاصطناعي بدقة جنائية' : 'Forensic AI Detection'}
              </span>
            </div>

            {/* Hero Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {language === 'ar' ? (
                <>
                  اكتشف المحتوى المولّد
                  <br />
                  <span className="text-gradient">بالذكاء الاصطناعي</span>
                </>
              ) : (
                <>
                  Detect AI-Generated
                  <br />
                  <span className="text-gradient">Content with Forensic Accuracy</span>
                </>
              )}
            </h1>

            {/* Hero Description */}
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              {language === 'ar' 
                ? 'Human Verified Hub يساعدك على كشف النصوص والصور المولدة بالذكاء الاصطناعي بدقة جنائية. تحليل متقدم يكشف الأنماط الخفية التي تفوت الأدوات الأخرى.'
                : 'Human Verified Hub helps you detect AI-generated text and images with forensic accuracy. Advanced analysis reveals hidden patterns that other tools miss.'}
            </p>

            {/* Hero CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/auth"
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center gap-2 text-lg"
              >
                {language === 'ar' ? 'ابدأ الآن - مجاني' : 'Get Started - Free'}
                <Zap className="w-5 h-5" />
              </Link>
              <button
                onClick={() => {
                  // Scroll to analyzer section
                  document.getElementById('analyzer-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="px-8 py-4 border border-purple-500/30 text-purple-300 font-medium rounded-xl hover:bg-purple-900/20 transition-all flex items-center gap-2"
              >
                {language === 'ar' ? 'جرب الأداة' : 'Try the Tool'}
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Hero Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="p-4 rounded-xl bg-white/5 border border-purple-500/20">
                <FileText className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <h3 className="text-white font-medium mb-1">
                  {language === 'ar' ? 'تحليل النصوص' : 'Text Analysis'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' ? 'كشف ChatGPT, Claude, Gemini' : 'Detect ChatGPT, Claude, Gemini'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-purple-500/20 relative">
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">PRO</div>
                <ImageIcon className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <h3 className="text-white font-medium mb-1">
                  {language === 'ar' ? 'كشف الصور' : 'Image Detection'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' ? 'DALL-E, Midjourney, SD' : 'DALL-E, Midjourney, SD'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-purple-500/20 relative">
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">PRO</div>
                <Wand2 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <h3 className="text-white font-medium mb-1">
                  {language === 'ar' ? 'محول بشري' : 'Humanizer'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' ? 'تحويل AI لنص بشري' : 'Convert AI to human text'}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="my-12 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
          </motion.div>
        )}

        {/* Analyzer Section Header - Only shown to logged-in users */}
        {user && (
          <div id="analyzer-section" className="text-center mb-8">
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
        )}
        
        {/* How It Works Section - For non-logged in users instead of analyzer */}
        {!user && !authLoading && (
          <motion.div
            id="how-it-works"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                {language === 'ar' ? 'كيف يعمل' : 'How It Works'}
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto text-sm">
                {language === 'ar' 
                  ? 'ثلاث خطوات بسيطة للتحقق من محتواك'
                  : 'Three simple steps to verify your content'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-purple-900/20 to-transparent border border-purple-500/20 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-purple-400 text-sm font-medium mb-2">
                  {language === 'ar' ? 'الخطوة 1' : 'Step 1'}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {language === 'ar' ? 'رفع المحتوى' : 'Upload Content'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' 
                    ? 'الصق النص أو أدخل رابط المقال للتحليل'
                    : 'Paste your text or enter an article URL to analyze'}
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-purple-900/20 to-transparent border border-purple-500/20 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-purple-400 text-sm font-medium mb-2">
                  {language === 'ar' ? 'الخطوة 2' : 'Step 2'}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {language === 'ar' ? 'التحليل الذكي' : 'AI Analysis'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' 
                    ? 'محركنا يحلل الأنماط اللغوية والبصرية'
                    : 'Our engine analyzes linguistic patterns and forensic markers'}
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-purple-900/20 to-transparent border border-purple-500/20 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-purple-400 text-sm font-medium mb-2">
                  {language === 'ar' ? 'الخطوة 3' : 'Step 3'}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {language === 'ar' ? 'احصل على التقرير' : 'Get Results'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' 
                    ? 'احصل على نتيجتك وتقرير PDF مفصل'
                    : 'Receive your score and detailed PDF report'}
                </p>
              </div>
            </div>
            
            {/* CTA */}
            <div className="text-center">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 text-lg"
              >
                {language === 'ar' ? 'ابدأ الآن - مجاني' : 'Get Started - Free'}
                <Zap className="w-5 h-5" />
              </Link>
              <p className="text-gray-500 text-sm mt-3">
                {language === 'ar' ? 'تحليلان مجانيان يومياً' : '2 free analyses per day'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Main Card - Only shown to logged-in users */}
        {user && (
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
                  onClick={() => {
                    if (!usageStatus?.isPro) {
                      setShowUpgradeModal(true)
                      return
                    }
                    setInputMode('url')
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative ${
                    inputMode === 'url' 
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  {language === 'ar' ? 'رابط' : 'URL'}
                  {!usageStatus?.isPro && (
                    <span className="ml-1 text-[10px] text-yellow-400 font-bold">PRO</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!usageStatus?.isPro) {
                      setShowUpgradeModal(true)
                      return
                    }
                    setInputMode('file')
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative ${
                    inputMode === 'file' 
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  {language === 'ar' ? 'ملف' : 'File'}
                  {!usageStatus?.isPro && (
                    <span className="ml-1 text-[10px] text-yellow-400 font-bold">PRO</span>
                  )}
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
                ) : inputMode === 'url' ? (
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
                ) : (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'رفع ملف PDF أو Word' : 'Upload PDF or Word File'}
                    </label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative p-8 border-2 border-dashed border-purple-500/30 rounded-xl bg-black/30 hover:bg-purple-900/10 hover:border-purple-500/50 cursor-pointer transition-all text-center"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Upload className="w-10 h-10 mx-auto mb-3 text-purple-400" />
                      {selectedFile ? (
                        <div>
                          <p className="text-white font-medium">{selectedFile.name}</p>
                          <p className="text-gray-400 text-sm mt-1">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFile(null)
                            }}
                            className="mt-2 text-xs text-red-400 hover:text-red-300"
                          >
                            {language === 'ar' ? 'إزالة الملف' : 'Remove file'}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-300">
                            {language === 'ar' ? 'اضغط لاختيار ملف' : 'Click to select a file'}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            {language === 'ar' ? 'PDF, Word, أو نص عادي (الحد 10MB)' : 'PDF, Word, or plain text (max 10MB)'}
                          </p>
                        </div>
                      )}
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
              {inputMode === 'file' ? (
                <button
                  type="button"
                  onClick={handleFileAnalysis}
                  disabled={loading || !selectedFile}
                  className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {loadingMessage}
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      {language === 'ar' ? 'تحليل الملف' : 'Analyze File'}
                    </>
                  )}
                </button>
              ) : (
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
              )}
            </form>
          ) : (
            /* Results Section - Neon Purple Premium Report Display */
            (() => {
              // Detect input text language for result display
              const inputText = text || url || ''
              const resultLang = detectTextLanguage(inputText)
              const isResultRTL = resultLang === 'ar'
              
              // Bilingual labels
              const labels = {
                reportTitle: resultLang === 'ar' ? 'تقرير التحليل الجنائي' : 'Forensic Analysis Report',
                confidenceLevel: resultLang === 'ar' ? 'مستوى الثقة' : 'Confidence Level',
                ai: 'AI',
                hybrid: resultLang === 'ar' ? 'هجين' : 'Hybrid',
                human: resultLang === 'ar' ? 'بشري' : 'Human',
                downloadReport: resultLang === 'ar' ? 'تحميل التقرير' : 'Download Report',
                certificateAvailable: resultLang === 'ar' ? 'شهادة متاحة!' : 'Certificate Available!',
                certificateDesc: resultLang === 'ar' ? 'محتواك مؤهل للحصول على شهادة PDF رسمية' : 'Your content qualifies for an official PDF certificate',
                upgradeForCert: resultLang === 'ar' ? 'ترقية للحصول على شهادة PDF رسمية' : 'Upgrade to Pro for an official PDF certificate',
                downloadCert: resultLang === 'ar' ? 'تحميل الشهادة' : 'Download Certificate',
                upgradeCert: resultLang === 'ar' ? 'ترقية للشهادة' : 'Upgrade for Certificate',
                smartAnalysis: resultLang === 'ar' ? 'التحليل الذكي' : 'Smart Analysis',
                wordCount: resultLang === 'ar' ? 'عدد الكلمات' : 'Words',
                sentences: resultLang === 'ar' ? 'الجمل' : 'Sentences',
                perplexity: resultLang === 'ar' ? 'مستوى الحيرة' : 'Perplexity',
                burstiness: resultLang === 'ar' ? 'الانفجارية' : 'Burstiness',
                summary: resultLang === 'ar' ? 'ملخص التحليل' : 'Analysis Summary',
                forensicDetails: resultLang === 'ar' ? 'التفاصيل الجنائية' : 'Forensic Details',
                syntaxAnalysis: resultLang === 'ar' ? 'تحليل البناء' : 'Syntax Analysis',
                lexicalRichness: resultLang === 'ar' ? 'الثراء اللغوي' : 'Lexical Richness',
                predictability: resultLang === 'ar' ? 'قابلية التوقع' : 'Predictability',
                aiIndicators: resultLang === 'ar' ? 'مؤشرات الذكاء الاصطناعي' : 'AI Indicators',
                humanIndicators: resultLang === 'ar' ? 'مؤشرات البشرية' : 'Human Indicators',
                newAnalysis: resultLang === 'ar' ? 'تحليل نص جديد' : 'Analyze New Text',
                verificationId: resultLang === 'ar' ? 'رقم التحقق' : 'Verification ID',
                analyzedAt: resultLang === 'ar' ? 'تاريخ التحليل' : 'Analyzed',
              }

              // Neon glow color based on score
              const neonScoreGlow = result.humanScore >= 61 
                ? 'shadow-[0_0_30px_rgba(34,197,94,0.15)]' 
                : result.humanScore >= 31 
                  ? 'shadow-[0_0_30px_rgba(234,179,8,0.15)]' 
                  : 'shadow-[0_0_30px_rgba(239,68,68,0.15)]'
              
              return (
            <div className="space-y-5" dir={isResultRTL ? 'rtl' : 'ltr'}>
              {/* Premium Neon Purple Report Header Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-black via-purple-950/30 to-black border border-purple-500/40 ${neonScoreGlow}`}
              >
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03]">
                  <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(168,85,247,0.8) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
                </div>
                
                {/* Neon Top Line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                
                {/* Header Banner with Neon Glow */}
                <div className="relative bg-gradient-to-r from-purple-600/30 via-purple-500/20 to-purple-600/30 px-6 py-4 border-b border-purple-500/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <Shield className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-white">{labels.reportTitle}</h2>
                        <p className="text-xs text-purple-300/60">Human Verified Hub &bull; {new Date().toLocaleDateString(resultLang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-900/50 border border-purple-500/30 text-purple-300/80">Gemini Flash</span>
                    </div>
                  </div>
                </div>
                
                {/* Main Score Section */}
                <div className="relative p-8">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Score Circle with Neon Glow */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                      className="relative"
                    >
                      {/* Outer Neon Ring */}
                      <div className={`relative w-40 h-40 rounded-full p-1 ${result.humanScore >= 61 ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-[0_0_40px_rgba(34,197,94,0.4)]' : result.humanScore >= 31 ? 'bg-gradient-to-br from-yellow-500 to-orange-600 shadow-[0_0_40px_rgba(234,179,8,0.4)]' : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_0_40px_rgba(239,68,68,0.4)]'}`}>
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                          <div className="text-center">
                            <div className={`text-5xl font-bold ${getScoreColor(result.humanScore)}`} style={{ textShadow: result.humanScore >= 61 ? '0 0 20px rgba(34,197,94,0.5)' : result.humanScore >= 31 ? '0 0 20px rgba(234,179,8,0.5)' : '0 0 20px rgba(239,68,68,0.5)' }}>
                              {result.humanScore}
                            </div>
                            <div className="text-lg text-gray-500">%</div>
                          </div>
                        </div>
                      </div>
                      {/* Icon Badge */}
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full ${result.humanScore >= 61 ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-[0_0_20px_rgba(34,197,94,0.5)] text-white' : result.humanScore >= 31 ? 'bg-gradient-to-r from-yellow-600 to-orange-600 shadow-[0_0_20px_rgba(234,179,8,0.5)] text-white' : 'bg-gradient-to-r from-red-600 to-rose-600 shadow-[0_0_20px_rgba(239,68,68,0.5)] text-white'}`}
                      >
                        <div className="flex items-center gap-2">
                          {getScoreIcon(result.humanScore)}
                          <span className="text-sm font-bold">{result.humanScore >= 61 ? (resultLang === 'ar' ? 'بشري' : 'Human') : result.humanScore >= 31 ? (resultLang === 'ar' ? 'هجين' : 'Mixed') : (resultLang === 'ar' ? 'آلي' : 'AI')}</span>
                        </div>
                      </motion.div>
                    </motion.div>
                    
                    {/* Verdict & Confidence */}
                    <div className="flex-1 text-center md:text-start">
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <h3 className={`text-2xl md:text-3xl font-bold mb-3 ${getScoreColor(result.humanScore)}`} style={{ textShadow: result.humanScore >= 61 ? '0 0 15px rgba(34,197,94,0.3)' : result.humanScore >= 31 ? '0 0 15px rgba(234,179,8,0.3)' : '0 0 15px rgba(239,68,68,0.3)' }}>
                          {result.verdict}
                        </h3>
                        {result.confidence && (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-purple-500/30 backdrop-blur-sm">
                            <div className={`w-2 h-2 rounded-full ${result.confidence === 'high' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : result.confidence === 'medium' ? 'bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.8)]' : 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]'} animate-pulse`} />
                            <span className="text-sm text-gray-400">{labels.confidenceLevel}:</span>
                            <span className={`text-sm font-semibold capitalize ${result.confidence === 'high' ? 'text-green-400' : result.confidence === 'medium' ? 'text-yellow-400' : 'text-orange-400'}`}>
                              {result.confidence === 'high' ? (resultLang === 'ar' ? 'عالي' : 'High') : result.confidence === 'medium' ? (resultLang === 'ar' ? 'متوسط' : 'Medium') : (resultLang === 'ar' ? 'منخفض' : 'Low')}
                            </span>
                          </div>
                        )}
                      </motion.div>
                      
                      {/* Progress Bar with Neon */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-6"
                      >
                        <div className="relative h-4 bg-black/60 rounded-full overflow-hidden border border-purple-500/20">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${result.humanScore}%` }}
                            transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                            className={`h-full bg-gradient-to-r ${getScoreBg(result.humanScore)} rounded-full relative`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                          </motion.div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-600">
                          <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {labels.ai} (0%)</span>
                          <span>{labels.hybrid} (50%)</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {labels.human} (100%)</span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
                
                {/* Neon Bottom Line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              </motion.div>

              {/* Action Buttons Row - Neon Style */}
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  onClick={downloadReport}
                  disabled={certificateLoading}
                  className={`flex-1 py-3.5 px-6 rounded-xl font-medium flex items-center justify-center gap-3 transition-all ${usageStatus?.isPro ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 border border-purple-500/30' : 'bg-black/60 hover:bg-purple-900/20 border border-purple-500/20 hover:border-purple-500/40 text-gray-300'}`}
                >
                  {certificateLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : usageStatus?.isPro ? <Download className="w-5 h-5" /> : <Crown className="w-5 h-5 text-yellow-400" />}
                  {labels.downloadReport}
                  {!usageStatus?.isPro && <span className="text-xs text-yellow-400 ml-1">(Pro)</span>}
                </motion.button>
                
                {/* Certificate Button (Score >= 90) */}
                {result.humanScore >= 90 && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    onClick={generateCertificate}
                    disabled={certificateLoading}
                    className={`flex-1 py-3.5 px-6 rounded-xl font-medium flex items-center justify-center gap-3 transition-all ${usageStatus?.isPro ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 border border-green-500/30' : 'bg-black/60 hover:bg-green-900/20 border border-green-500/20 hover:border-green-500/40 text-gray-300'}`}
                  >
                    {certificateLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : usageStatus?.isPro ? <Award className="w-5 h-5" /> : <Crown className="w-5 h-5 text-yellow-400" />}
                    {usageStatus?.isPro ? labels.downloadCert : labels.upgradeCert}
                    {!usageStatus?.isPro && <span className="text-xs text-yellow-400 ml-1">(Pro)</span>}
                  </motion.button>
                )}
              </div>

              {/* Summary Card - Neon Glass */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-5 bg-gradient-to-br from-purple-950/40 to-black/80 rounded-xl border border-purple-500/20 backdrop-blur-sm shadow-[0_0_20px_rgba(168,85,247,0.08)]"
              >
                <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
                    <Zap className="w-4 h-4 text-purple-400" />
                  </div>
                  {labels.summary}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
              </motion.div>

              {/* Smart Analysis Breakdown - Neon Style */}
              {result.smartBreakdown && result.smartBreakdown.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="p-5 bg-gradient-to-br from-purple-950/30 to-black/80 rounded-xl border border-purple-500/25 shadow-[0_0_20px_rgba(168,85,247,0.08)]"
                >
                  <h3 className="text-base font-semibold text-purple-300 mb-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
                      <Brain className="w-4 h-4 text-purple-400" />
                    </div>
                    {labels.smartAnalysis}
                  </h3>
                  <div className="grid gap-2.5">
                    {result.smartBreakdown.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-black/40 rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="p-1 rounded bg-purple-500/20 mt-0.5">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                        </div>
                        <p className="text-gray-300 text-sm flex-1">{item}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Metrics Grid - Neon Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                {[
                  { label: labels.wordCount, value: result.analysisMetadata?.wordCount || '-', icon: FileText, color: 'text-blue-400', border: 'border-blue-500/20 hover:border-blue-500/40', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.08)]' },
                  { label: labels.sentences, value: result.analysisMetadata?.sentenceCount || '-', icon: Activity, color: 'text-cyan-400', border: 'border-cyan-500/20 hover:border-cyan-500/40', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.08)]' },
                  { label: labels.perplexity, value: result.analysisMetadata?.perplexityLevel || '-', icon: Brain, color: 'text-purple-400', border: 'border-purple-500/20 hover:border-purple-500/40', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.08)]' },
                  { label: labels.burstiness, value: result.analysisMetadata?.burstinessScore || '-', icon: Zap, color: 'text-yellow-400', border: 'border-yellow-500/20 hover:border-yellow-500/40', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.08)]' },
                ].map((metric, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className={`p-4 rounded-xl bg-black/50 border ${metric.border} ${metric.glow} text-center transition-all`}
                  >
                    <metric.icon className={`w-5 h-5 ${metric.color} mx-auto mb-2`} />
                    <div className="text-xs text-gray-500 mb-1">{metric.label}</div>
                    <div className="text-lg font-semibold text-white capitalize">{metric.value}</div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Forensic Details - Neon Glass */}
              {result.forensicDetails && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="p-5 bg-black/50 rounded-xl border border-purple-500/15 shadow-[0_0_15px_rgba(168,85,247,0.05)]"
                >
                  <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/20">
                      <Search className="w-4 h-4 text-purple-400" />
                    </div>
                    {labels.forensicDetails}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-3">
                    {[
                      { label: labels.syntaxAnalysis, value: result.forensicDetails.syntaxAnalysis },
                      { label: labels.lexicalRichness, value: result.forensicDetails.lexicalRichness },
                      { label: labels.predictability, value: result.forensicDetails.predictability },
                    ].map((detail, i) => (
                      <div key={i} className="p-3 bg-black/40 rounded-lg border border-purple-500/10 hover:border-purple-500/25 transition-colors">
                        <div className="text-xs text-purple-400/60 mb-1 font-medium">{detail.label}</div>
                        <div className="text-sm text-gray-200">{detail.value}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Indicators Grid - Neon Style */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* AI Indicators */}
                {result.aiIndicators && result.aiIndicators.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 }}
                    className="p-5 bg-gradient-to-br from-red-950/30 to-black/80 rounded-xl border border-red-500/25 shadow-[0_0_20px_rgba(239,68,68,0.06)]"
                  >
                    <h3 className="text-base font-semibold text-red-400 mb-4 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                      {labels.aiIndicators}
                      <span className="ms-auto px-2.5 py-0.5 text-xs rounded-full bg-red-500/15 border border-red-500/20 text-red-300">{result.aiIndicators.length}</span>
                    </h3>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {result.aiIndicators.map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-black/40 border border-red-500/10 hover:border-red-500/30 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-red-300 font-medium text-sm">{item.pattern}</span>
                            {item.penalty && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/20 text-red-300">-{item.penalty}</span>}
                          </div>
                          <p className="text-gray-400 text-xs leading-relaxed">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Human Indicators */}
                {result.humanIndicators && result.humanIndicators.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 }}
                    className="p-5 bg-gradient-to-br from-green-950/30 to-black/80 rounded-xl border border-green-500/25 shadow-[0_0_20px_rgba(34,197,94,0.06)]"
                  >
                    <h3 className="text-base font-semibold text-green-400 mb-4 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-green-500/20 border border-green-500/30">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      {labels.humanIndicators}
                      <span className="ms-auto px-2.5 py-0.5 text-xs rounded-full bg-green-500/15 border border-green-500/20 text-green-300">{result.humanIndicators.length}</span>
                    </h3>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {result.humanIndicators.map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-black/40 border border-green-500/10 hover:border-green-500/30 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-green-300 font-medium text-sm">{item.pattern}</span>
                            {item.bonus && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-300">+{item.bonus}</span>}
                          </div>
                          <p className="text-gray-400 text-xs leading-relaxed">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Reset Button - Neon Purple */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={resetAnalysis}
                className="w-full py-4 px-6 rounded-xl border border-purple-500/25 text-gray-300 hover:text-white hover:border-purple-500/60 hover:bg-purple-900/15 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all flex items-center justify-center gap-3 group"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                {labels.newAnalysis}
              </motion.button>
            </div>
              );
            })()
          )}
        </motion.div>
        )}

        {/* Results Guide - Only shown to logged-in users */}
        {user && (
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
        )}

      </main>

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      {/* Footer */}
      <footer className="bg-black border-t border-purple-900/30 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">© 2026 Human Verified Hub. All rights reserved.</p>
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
