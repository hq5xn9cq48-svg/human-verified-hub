'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import ProFeatureGate from '@/components/ProFeatureGate'
import { 
  Image as ImageIcon, 
  Upload, 
  Loader2, 
  AlertCircle,
  X,
  Wand2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Tag,
  Ban,
  Palette
} from 'lucide-react'
import UpgradeModal from '@/components/UpgradeModal'

interface PromptResult {
  prompt: string
  shortPrompt: string
  style: string
  tags: string[]
  negativePrompt: string
}

function ImageToPromptContent() {
  const router = useRouter()
  const { language, isRTL, isLoaded } = useLanguage()
  const { user, loading: authLoading, refreshUsageStatus } = useAuth()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])
  const [image, setImage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PromptResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(language === 'ar' ? 'يرجى اختيار ملف صورة (JPG, PNG, WebP)' : 'Please select an image file (JPG, PNG, or WebP)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(language === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 10MB' : 'Image size must be less than 10MB')
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

  const handleGenerate = async () => {
    if (!image) return

    // Auth check on submit - redirect to login if not authenticated
    if (!user && !authLoading) {
      router.push('/auth')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Get auth token for authenticated request
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch('/api/image-to-prompt', {
        method: 'POST',
        headers,
        body: JSON.stringify({ image, language }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        // Check for usage limit error
        if (data.errorCode === 'USAGE_LIMIT_REACHED') {
          setShowUpgradeModal(true)
          throw new Error(language === 'ar' ? 'وصلت للحد اليومي. الترقية للحصول على تحليلات غير محدودة.' : 'Daily limit reached. Upgrade for unlimited analyses.')
        }
        throw new Error(data.error || 'Generation failed')
      }
      
      // Refresh usage status after successful analysis
      refreshUsageStatus()

      setResult(data)
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    } finally {
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

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
      } catch (e) {
        console.error('Failed to copy:', e)
      }
    }
  }

  // Show loading only while language context is loading or component not mounted
  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-900/20 flex items-center justify-center animate-pulse">
            <Wand2 className="w-8 h-8 text-purple-400" />
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
            <Wand2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-300 font-medium">
              {language === 'ar' ? 'مولد الأوامر V1.0' : 'Prompt Generator V1.0'}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            {language === 'ar' ? 'صورة إلى' : 'Image to'}{' '}
            <span className="text-gradient neon-text-glow">
              {language === 'ar' ? 'أمر نصي' : 'Prompt'}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto"
          >
            {language === 'ar' 
              ? 'ارفع صورة واحصل على أمر نصي مفصل لإعادة إنشائها باستخدام مولدات الصور بالذكاء الاصطناعي'
              : 'Upload an image and get a detailed text prompt to recreate it using AI image generators'}
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
                  className="absolute inset-4 rounded-full border-4 border-purple-400/20"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wand2 className="w-10 h-10 text-purple-400" />
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
              >
                <p className="text-gray-300 font-medium">
                  {language === 'ar' ? 'جاري تحليل الصورة...' : 'Analyzing image...'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {language === 'ar' ? 'استخراج التفاصيل وإنشاء الأمر النصي' : 'Extracting details and generating prompt'}
                </p>
              </motion.div>
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
                      {language === 'ar' ? 'اختر صورة' : 'Choose Image'}
                    </p>
                    <p className="text-gray-500 mt-1">
                      {language === 'ar' ? 'أو اسحب وأفلت هنا' : 'or drag and drop here'}
                    </p>
                    <p className="text-gray-600 text-sm mt-4">
                      {language === 'ar' ? 'الصيغ المدعومة: JPG, PNG, WebP (الحد الأقصى 10MB)' : 'Supported formats: JPG, PNG, WebP (Max 10MB)'}
                    </p>
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
                onClick={handleGenerate}
                disabled={!image}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Wand2 className="w-5 h-5" />
                {language === 'ar' ? 'إنشاء الأمر النصي' : 'Generate Prompt'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="flex justify-center">
                <img
                  src={image!}
                  alt="Analyzed"
                  className="max-h-48 rounded-xl object-contain shadow-lg"
                />
              </div>

              {/* Style Badge */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/20 rounded-full border border-purple-500/30">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300 font-medium">{result.style}</span>
                </div>
              </div>

              {/* Main Prompt */}
              <div className="bg-black/30 rounded-xl p-5 border border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {language === 'ar' ? 'الأمر النصي الكامل' : 'Full Prompt'}
                  </h3>
                  <button
                    onClick={() => copyToClipboard(result.prompt, 'prompt')}
                    className="px-3 py-1.5 text-xs bg-black/50 hover:bg-purple-900/20 text-gray-400 hover:text-purple-300 rounded-lg transition-all flex items-center gap-1 border border-purple-900/20 hover:border-purple-500/30"
                  >
                    {copiedField === 'prompt' ? (
                      <>
                        <Check className="w-3 h-3" />
                        {language === 'ar' ? 'تم النسخ!' : 'Copied!'}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        {language === 'ar' ? 'نسخ' : 'Copy'}
                      </>
                    )}
                  </button>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{result.prompt}</p>
              </div>

              {/* Short Prompt */}
              <div className="bg-black/30 rounded-xl p-5 border border-purple-900/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />
                    {language === 'ar' ? 'الأمر المختصر' : 'Short Prompt'}
                  </h3>
                  <button
                    onClick={() => copyToClipboard(result.shortPrompt, 'short')}
                    className="px-3 py-1.5 text-xs bg-black/50 hover:bg-purple-900/20 text-gray-400 hover:text-purple-300 rounded-lg transition-all flex items-center gap-1 border border-purple-900/20 hover:border-purple-500/30"
                  >
                    {copiedField === 'short' ? (
                      <>
                        <Check className="w-3 h-3" />
                        {language === 'ar' ? 'تم النسخ!' : 'Copied!'}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        {language === 'ar' ? 'نسخ' : 'Copy'}
                      </>
                    )}
                  </button>
                </div>
                <p className="text-gray-300 text-sm">{result.shortPrompt}</p>
              </div>

              {/* Tags */}
              {result.tags && result.tags.length > 0 && (
                <div className="bg-black/30 rounded-xl p-5 border border-purple-900/20">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {language === 'ar' ? 'الكلمات المفتاحية' : 'Tags'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-xs bg-purple-900/30 text-purple-300 rounded-full border border-purple-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Negative Prompt */}
              {result.negativePrompt && (
                <div className="bg-black/30 rounded-xl p-5 border border-red-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      {language === 'ar' ? 'الأمر السلبي' : 'Negative Prompt'}
                    </h3>
                    <button
                      onClick={() => copyToClipboard(result.negativePrompt, 'negative')}
                      className="px-3 py-1.5 text-xs bg-black/50 hover:bg-red-900/20 text-gray-400 hover:text-red-300 rounded-lg transition-all flex items-center gap-1 border border-purple-900/20 hover:border-red-500/30"
                    >
                      {copiedField === 'negative' ? (
                        <>
                          <Check className="w-3 h-3" />
                          {language === 'ar' ? 'تم النسخ!' : 'Copied!'}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          {language === 'ar' ? 'نسخ' : 'Copy'}
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm">{result.negativePrompt}</p>
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

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 p-5 glass-card"
        >
          <h3 className="text-sm font-semibold text-white mb-4 text-center flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            {language === 'ar' ? 'نصائح للاستخدام' : 'Usage Tips'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <ImageIcon className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">{language === 'ar' ? 'صور واضحة' : 'Clear Images'}</div>
              <div className="text-gray-500">{language === 'ar' ? 'استخدم صوراً عالية الجودة' : 'Use high-quality images'}</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Wand2 className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">{language === 'ar' ? 'تعديل الأوامر' : 'Edit Prompts'}</div>
              <div className="text-gray-500">{language === 'ar' ? 'عدّل الأوامر حسب حاجتك' : 'Customize prompts as needed'}</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">{language === 'ar' ? 'جرب مولدات مختلفة' : 'Try Different AIs'}</div>
              <div className="text-gray-500">{language === 'ar' ? 'Midjourney, DALL-E, SD' : 'Midjourney, DALL-E, SD'}</div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      {/* Footer */}
      <footer className="border-t border-purple-900/30 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-500 text-xs">
            {language === 'ar' ? '© 2026 Human Verified Hub. جميع الحقوق محفوظة.' : '© 2026 Human Verified Hub. All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  )
}

// Wrap with Pro Feature Gate - Image to Prompt is Pro-only
export default function ImageToPromptPage() {
  return (
    <ProFeatureGate 
      featureName="Image to Prompt"
      featureNameAr="صورة إلى أمر نصي"
      description="Generate AI prompts from any image"
      descriptionAr="إنشاء أوامر نصية للذكاء الاصطناعي من أي صورة"
    >
      <ImageToPromptContent />
    </ProFeatureGate>
  )
}
