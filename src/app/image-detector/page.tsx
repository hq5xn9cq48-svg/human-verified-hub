'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import ScoreGauge from '@/components/ScoreGauge'
import { 
  Image as ImageIcon, 
  Upload, 
  Loader2, 
  AlertCircle,
  X,
  Hand,
  Eye,
  Palette,
  Microscope,
  Lightbulb,
  Camera,
  Bot,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle,
  Cpu,
  Shield,
  Zap
} from 'lucide-react'

interface AnalysisResult {
  aiProbability: number
  verdict: string
  confidenceLevel?: string
  likelyModel?: string | null
  artifacts: { 
    name: string
    category?: string
    severity: string
    location?: string
    description: string 
  }[]
  analysisDetails?: {
    handAnalysis?: string
    eyeAnalysis?: string
    textureAnalysis?: string
    lightingAnalysis?: string
    backgroundAnalysis?: string
    overallQuality?: string
  }
  summary?: string
  recommendations?: string
  modelUsed?: string
}

export default function ImageDetectorPage() {
  const router = useRouter()
  const { t, language, isRTL, isLoaded } = useLanguage()
  const { user, loading: authLoading } = useAuth()
  const [image, setImage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadingSteps = language === 'ar' 
    ? ['جاري تحميل الصورة...', 'تحليل التشريح البشري...', 'فحص الأنسجة والتفاصيل...', 'تحليل الإضاءة والفيزياء...', 'البحث عن بصمات AI...', 'إعداد التقرير...']
    : ['Uploading image...', 'Analyzing human anatomy...', 'Examining textures & details...', 'Checking lighting & physics...', 'Detecting AI fingerprints...', 'Preparing report...']

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(language === 'ar' ? 'يرجى اختيار ملف صورة (JPG, PNG, أو WebP)' : 'Please select an image file (JPG, PNG, or WebP)')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setError(language === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 15MB' : 'Image size must be less than 15MB')
      return
    }

    setFileName(file.name)
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      setImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleAnalyze = async () => {
    if (!image) return

    // Auth check on submit - redirect to login if not authenticated
    if (!user && !authLoading) {
      router.push('/auth')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setLoadingStep(0)

    // Animate through loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingSteps.length)
    }, 2000)

    try {
      const response = await fetch('/api/image-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, language }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || (language === 'ar' ? 'فشل التحليل' : 'Analysis failed'))
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    } finally {
      clearInterval(stepInterval)
      setLoading(false)
    }
  }

  const resetForm = () => {
    setImage(null)
    setFileName('')
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-900/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-900/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30'
      case 'low': return 'bg-green-900/20 text-green-400 border-green-500/30'
      default: return 'bg-gray-800 text-gray-300 border-gray-600'
    }
  }

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'anatomical': return Hand
      case 'mixed_media': return Palette
      case 'micro': return Microscope
      case 'texture': return Palette
      case 'physics': return Lightbulb
      default: return Microscope
    }
  }

  const getVerdictInfo = (probability: number) => {
    if (probability >= 81) return { icon: Bot, color: 'text-red-400', bg: 'from-red-500 to-rose-600', label: language === 'ar' ? 'مُنشأ بالذكاء الاصطناعي' : 'AI Generated' }
    if (probability >= 61) return { icon: AlertTriangle, color: 'text-orange-400', bg: 'from-orange-500 to-amber-500', label: language === 'ar' ? 'على الأرجح AI' : 'Likely AI' }
    if (probability >= 41) return { icon: AlertTriangle, color: 'text-yellow-400', bg: 'from-yellow-500 to-orange-500', label: language === 'ar' ? 'غير مؤكد' : 'Uncertain' }
    if (probability >= 21) return { icon: Camera, color: 'text-emerald-400', bg: 'from-emerald-500 to-green-500', label: language === 'ar' ? 'على الأرجح أصلية' : 'Likely Authentic' }
    return { icon: CheckCircle, color: 'text-green-400', bg: 'from-green-500 to-emerald-500', label: language === 'ar' ? 'صورة أصلية' : 'Authentic Photo' }
  }

  // Show loading only while language context is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-900/20 flex items-center justify-center animate-pulse">
            <Microscope className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black cyber-grid" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 pt-24">
        {/* Hero */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/20 border border-purple-500/30 mb-5"
          >
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-300 font-medium">AI Image Forensics V3.0</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            {t.imageDetector.title}{' '}
            <span className="text-gradient neon-text-glow">
              {t.imageDetector.titleHighlight}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto"
          >
            {language === 'ar' 
              ? 'تحليل جنائي عميق للأيدي والعيون والأنسجة وبصمات الذكاء الاصطناعي'
              : 'Deep forensic analysis for hands, eyes, mixed media, and micro-artifacts'}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 md:p-8"
        >
          {loading ? (
            <div className="py-16 text-center">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-purple-500/20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full border-4 border-purple-400/30"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-8 rounded-full border-4 border-purple-300/40"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Microscope className="w-10 h-10 text-purple-400" />
                </div>
              </div>
              <motion.div
                key={loadingStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <p className="text-gray-300 font-medium">{loadingSteps[loadingStep]}</p>
                <p className="text-gray-500 text-sm mt-1">
                  {language === 'ar' ? 'قد يستغرق هذا 30-60 ثانية' : 'This may take 30-60 seconds'}
                </p>
              </motion.div>
              <div className="mt-6 flex justify-center gap-2">
                {loadingSteps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full transition-all ${i <= loadingStep ? 'bg-purple-500' : 'bg-gray-700'}`} 
                  />
                ))}
              </div>
            </div>
          ) : !result ? (
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragOver 
                    ? 'border-purple-500 bg-purple-900/10' 
                    : 'border-purple-900/30 hover:border-purple-500/50 bg-black/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                {image ? (
                  <div className="relative">
                    <img
                      src={image}
                      alt="Selected"
                      className="max-h-72 mx-auto rounded-xl object-contain shadow-lg"
                    />
                    <div className="mt-4 text-gray-300 text-sm font-medium">{fileName}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetForm() }}
                      className="mt-2 text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 mx-auto"
                    >
                      <X className="w-3 h-3" />
                      {language === 'ar' ? 'إزالة الصورة' : 'Remove image'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-purple-900/20 flex items-center justify-center">
                      <Upload className="w-10 h-10 text-purple-400" />
                    </div>
                    <p className="text-gray-300 font-medium text-lg flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5" />
                      {t.imageDetector.uploadButton}
                    </p>
                    <p className="text-gray-500 mt-1">{t.imageDetector.dragDrop}</p>
                    <p className="text-gray-600 text-sm mt-4">{t.imageDetector.supportedFormats}</p>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleAnalyze}
                disabled={!image}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Microscope className="w-5 h-5" />
                {t.imageDetector.analyzeButton}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="flex justify-center">
                <img
                  src={image!}
                  alt="Analyzed"
                  className="max-h-56 rounded-xl object-contain shadow-lg"
                />
              </div>

              {/* Score Display */}
              {(() => {
                const verdictInfo = getVerdictInfo(result.aiProbability)
                const VerdictIcon = verdictInfo.icon
                return (
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <ScoreGauge score={100 - result.aiProbability} />
                    
                    <div className="flex-1 text-center md:text-left">
                      <div className="mb-2">
                        <VerdictIcon className={`w-12 h-12 mx-auto md:mx-0 ${verdictInfo.color}`} />
                      </div>
                      <div className={`text-3xl font-bold ${verdictInfo.color}`}>
                        {result.verdict}
                      </div>
                      <div className="mt-2 text-gray-400">
                        {language === 'ar' ? 'احتمالية AI:' : 'AI Probability:'}{' '}
                        <span className="font-bold text-xl">{result.aiProbability}%</span>
                      </div>
                      
                      {/* Confidence Badge */}
                      {result.confidenceLevel && (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-purple-900/30">
                          <Zap className="w-3 h-3 text-purple-400" />
                          <span className="text-xs text-gray-400">{language === 'ar' ? 'الثقة:' : 'Confidence:'}</span>
                          <span className="text-xs font-medium text-gray-300 capitalize">{result.confidenceLevel}</span>
                        </div>
                      )}
                      
                      {/* Model Classification */}
                      {result.likelyModel && result.aiProbability > 60 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-900/20 border border-red-500/30"
                        >
                          <Cpu className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-red-300">
                            {language === 'ar' ? 'النموذج المحتمل:' : 'Likely Model:'}{' '}
                            <span className="font-bold">{result.likelyModel}</span>
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Progress Bar */}
              <div>
                <div className="relative h-4 bg-black/50 rounded-full overflow-hidden border border-purple-900/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.aiProbability}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full bg-gradient-to-r ${getVerdictInfo(result.aiProbability).bg}`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> {language === 'ar' ? 'صورة أصلية' : 'Authentic Photo'}</span>
                  <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {language === 'ar' ? 'مُنشأ بـ AI' : 'AI Generated'}</span>
                </div>
              </div>

              {/* Summary */}
              {result.summary && (
                <div className="bg-black/30 rounded-xl p-5 border border-purple-900/20">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-400" />
                    {language === 'ar' ? 'ملخص التحليل الجنائي' : 'Forensic Summary'}
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
                </div>
              )}

              {/* Analysis Details */}
              {result.analysisDetails && Object.keys(result.analysisDetails).length > 0 && (
                <div className="bg-black/30 rounded-xl p-5 border border-purple-500/20">
                  <h3 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
                    <Microscope className="w-4 h-4" />
                    {language === 'ar' ? 'التحليل المفصل' : 'Detailed Analysis'}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(result.analysisDetails).map(([key, value]) => {
                      if (!value || value === 'Not analyzed' || value === 'N/A') return null
                      const getIcon = () => {
                        if (key.includes('hand')) return Hand
                        if (key.includes('eye')) return Eye
                        if (key.includes('texture')) return Palette
                        if (key.includes('light')) return Lightbulb
                        if (key.includes('background')) return ImageIcon
                        return Microscope
                      }
                      const Icon = getIcon()
                      const formatKey = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
                      return (
                        <div key={key} className="p-4 bg-black/50 rounded-xl border border-purple-900/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-4 h-4 text-purple-400" />
                            <span className="text-gray-400 text-xs">{formatKey(key)}</span>
                          </div>
                          <p className="text-gray-300 text-sm">{value}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Detected Artifacts */}
              {result.artifacts && result.artifacts.length > 0 && (
                <div className="bg-black/30 rounded-xl p-5 border border-orange-500/20">
                  <h3 className="text-sm font-semibold text-orange-400 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {language === 'ar' ? 'الأدلة المكتشفة' : 'Detected Artifacts'} ({result.artifacts.length})
                  </h3>
                  <div className="space-y-3">
                    {result.artifacts.map((artifact, index) => {
                      const CategoryIcon = getCategoryIcon(artifact.category)
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-xl bg-black/50 border border-purple-900/20"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CategoryIcon className="w-4 h-4 text-purple-400" />
                              <span className="text-white font-medium">{artifact.name}</span>
                            </div>
                            <span className={`text-xs px-3 py-1 rounded-full border ${getSeverityColor(artifact.severity)}`}>
                              {artifact.severity}
                            </span>
                          </div>
                          {artifact.location && (
                            <p className="text-gray-500 text-xs mb-1">
                              {language === 'ar' ? 'الموقع:' : 'Location:'} {artifact.location}
                            </p>
                          )}
                          <p className="text-gray-400 text-sm">{artifact.description}</p>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && (
                <div className="bg-black/30 rounded-xl p-5 border border-purple-500/20">
                  <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {language === 'ar' ? 'نصائح التحقق' : 'Verification Tips'}
                  </h3>
                  <p className="text-gray-300 text-sm">{result.recommendations}</p>
                </div>
              )}

              {/* Reset Button */}
              <button
                onClick={resetForm}
                className="w-full py-3 px-4 rounded-xl border border-purple-500/30 text-gray-300 hover:text-white hover:border-purple-500/50 hover:bg-purple-900/10 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {language === 'ar' ? 'تحليل صورة أخرى' : 'Analyze Another Image'}
              </button>
            </div>
          )}
        </motion.div>

        {/* Guide */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 p-5 glass-card"
        >
          <h3 className="text-sm font-semibold text-white mb-4 text-center flex items-center justify-center gap-2">
            <Microscope className="w-4 h-4 text-purple-400" />
            {language === 'ar' ? 'فئات الكشف' : 'Detection Categories'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Hand className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">{language === 'ar' ? 'الأيدي' : 'Hands'}</div>
              <div className="text-gray-500">{language === 'ar' ? 'عدد الأصابع والمفاصل' : 'Finger count & joints'}</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Eye className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">{language === 'ar' ? 'العيون' : 'Eyes'}</div>
              <div className="text-gray-500">{language === 'ar' ? 'الانعكاسات والحدقات' : 'Reflections & pupils'}</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Palette className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">{language === 'ar' ? 'الأنسجة' : 'Textures'}</div>
              <div className="text-gray-500">{language === 'ar' ? 'الجلد والشعر والملابس' : 'Skin, hair & fabric'}</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Microscope className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">{language === 'ar' ? 'البصمات الدقيقة' : 'Micro Artifacts'}</div>
              <div className="text-gray-500">{language === 'ar' ? 'أنماط AI الخفية' : 'Subtle AI patterns'}</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Lightbulb className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">{language === 'ar' ? 'الفيزياء' : 'Physics'}</div>
              <div className="text-gray-500">{language === 'ar' ? 'الإضاءة والظلال' : 'Lighting & shadows'}</div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-900/30 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-500 text-xs">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  )
}
