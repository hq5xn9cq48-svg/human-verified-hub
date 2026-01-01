'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  Wand2, 
  Clipboard, 
  Trash2, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle,
  Sparkles,
  GraduationCap,
  MessageCircle,
  Briefcase,
  Palette,
  Megaphone,
  Shield,
  Globe,
  FileText,
  Activity,
  Eye
} from 'lucide-react'

const intentOptions = [
  { id: 'default', label: 'Default', labelAr: 'افتراضي', icon: Sparkles, description: 'Natural, balanced humanization', descriptionAr: 'تحسين طبيعي ومتوازن' },
  { id: 'academic', label: 'Academic', labelAr: 'أكاديمي', icon: GraduationCap, description: 'Scholarly tone with variety', descriptionAr: 'أسلوب علمي مع تنوع' },
  { id: 'casual', label: 'Casual', labelAr: 'عفوي', icon: MessageCircle, description: 'Relaxed, conversational', descriptionAr: 'مريح وحواري' },
  { id: 'business', label: 'Business', labelAr: 'تجاري', icon: Briefcase, description: 'Professional but personable', descriptionAr: 'مهني وودود' },
  { id: 'creative', label: 'Creative', labelAr: 'إبداعي', icon: Palette, description: 'Vivid, artistic expression', descriptionAr: 'تعبير فني وحيوي' },
  { id: 'marketing', label: 'Marketing', labelAr: 'تسويقي', icon: Megaphone, description: 'Engaging and persuasive', descriptionAr: 'جذاب ومقنع' },
  { id: 'undetectable', label: 'Undetectable', labelAr: 'مخفي', icon: Shield, description: 'Maximum humanization - bypass AI detectors', descriptionAr: 'أقصى تحسين - تجاوز كاشفات AI' },
]

const loadingMessages = [
  "Detecting language and dialect...",
  "Analyzing sentence structure...",
  "Increasing burstiness...",
  "Adding natural variations...",
  "Preserving meaning and intent...",
  "Finalizing humanization..."
]

const loadingMessagesAr = [
  "جاري كشف اللغة واللهجة...",
  "تحليل بنية الجمل...",
  "زيادة التنوع...",
  "إضافة تغييرات طبيعية...",
  "الحفاظ على المعنى والنية...",
  "إنهاء التحسين..."
]

export default function HumanizerPage() {
  const { t, language, isRTL } = useLanguage()
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [intent, setIntent] = useState('default')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length
  const outputWordCount = outputText.trim().split(/\s+/).filter(Boolean).length

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText()
      setInputText(clipText)
    } catch {}
  }

  const handleClear = () => {
    setInputText('')
    setOutputText('')
    setError(null)
  }

  const handleHumanize = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || inputText.length < 20) {
      setError(language === 'ar' ? 'أدخل 20 حرفاً على الأقل' : 'Please enter at least 20 characters')
      return
    }

    setLoading(true)
    setError(null)
    setOutputText('')

    const messages = language === 'ar' ? loadingMessagesAr : loadingMessages
    let index = 0
    const interval = setInterval(() => {
      setLoadingMessage(messages[index % messages.length])
      index++
    }, 1500)

    try {
      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, intent, language }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Humanization failed')
      }

      setOutputText(data.humanizedText || '')
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = outputText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const selectedIntent = intentOptions.find((o) => o.id === intent)

  return (
    <div className="min-h-screen bg-black cyber-grid" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 pt-24">
        {/* Hero */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/20 border border-purple-500/30 mb-5"
          >
            <Wand2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-300 font-medium">Text Humanization Engine V3.0</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            {t.humanizer.title}{' '}
            <span className="text-gradient neon-text-glow">
              {t.humanizer.titleHighlight}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto"
          >
            {language === 'ar' 
              ? 'حوّل النصوص الآلية لتبدو طبيعية وبشرية مع الحفاظ على المعنى الأصلي واللهجة'
              : 'Transform AI-generated text to sound natural and human-like while preserving the original meaning and dialect.'}
          </motion.p>
        </div>

        {/* Intent Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <label className="block text-sm font-medium text-gray-300 mb-3">
            {language === 'ar' ? 'اختر أسلوب الكتابة' : 'Select Writing Style'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {intentOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  onClick={() => setIntent(option.id)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    intent === option.id
                      ? 'bg-purple-600/20 border-2 border-purple-500/50 text-purple-300 neon-glow'
                      : 'bg-black/30 border border-purple-900/30 text-gray-400 hover:text-white hover:border-purple-500/30'
                  }`}
                >
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${intent === option.id ? 'icon-glow' : ''}`} />
                  <div className="text-xs font-medium">{language === 'ar' ? option.labelAr : option.label}</div>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {language === 'ar' ? selectedIntent?.descriptionAr : selectedIntent?.description}
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <form onSubmit={handleHumanize} className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  {language === 'ar' ? 'النص المدخل' : 'Input Text'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-3 py-1.5 text-xs bg-black/50 hover:bg-purple-900/20 text-gray-400 hover:text-purple-300 rounded-lg transition-all flex items-center gap-1 border border-purple-900/20 hover:border-purple-500/30"
                  >
                    <Clipboard className="w-3 h-3" />
                    {language === 'ar' ? 'لصق' : 'Paste'}
                  </button>
                  {inputText && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 py-1.5 text-xs bg-black/50 hover:bg-red-900/20 text-gray-400 hover:text-red-400 rounded-lg transition-all flex items-center gap-1 border border-purple-900/20 hover:border-red-500/30"
                    >
                      <Trash2 className="w-3 h-3" />
                      {language === 'ar' ? 'مسح' : 'Clear'}
                    </button>
                  )}
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={14}
                className="flex-1 w-full px-4 py-4 bg-black/50 border border-purple-900/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none font-mono text-sm"
                placeholder={language === 'ar' ? 'الصق النص المُنشأ بالذكاء الاصطناعي هنا...' : 'Paste AI-generated text here...'}
                dir="auto"
              />

              <div className="flex justify-between mt-3 text-xs text-gray-500">
                <span>{language === 'ar' ? 'الحد الأدنى 20 حرف' : 'Min 20 characters'}</span>
                <div className="flex gap-4">
                  <span>{wordCount} {language === 'ar' ? 'كلمة' : 'words'}</span>
                  <span>{inputText.length} {language === 'ar' ? 'حرف' : 'chars'}</span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || inputText.length < 20}
                className="mt-4 w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 spinner" />
                    {loadingMessage}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    {t.humanizer.button}
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Output Section */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  {language === 'ar' ? 'النص المُحسَّن' : 'Humanized Output'}
                </label>
                {outputText && (
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-1.5 text-xs bg-black/50 hover:bg-green-900/20 text-gray-400 hover:text-green-400 rounded-lg transition-all flex items-center gap-1 border border-purple-900/20 hover:border-green-500/30"
                  >
                    {copied ? (
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
                )}
              </div>

              <div className="flex-1 min-h-[350px] px-4 py-4 bg-black/50 border border-purple-900/30 rounded-xl text-white overflow-y-auto">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-900/20 flex items-center justify-center pulse-neon">
                        <Wand2 className="w-8 h-8 text-purple-400" />
                      </div>
                      <p className="text-gray-400">{language === 'ar' ? 'جاري معالجة النص...' : 'Processing your text...'}</p>
                      <p className="text-gray-500 text-sm mt-1">{language === 'ar' ? 'الحفاظ على المعنى واللهجة' : 'Preserving meaning & dialect'}</p>
                    </div>
                  </div>
                ) : outputText ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="whitespace-pre-wrap leading-relaxed font-mono text-sm"
                    dir="auto"
                  >
                    {outputText}
                  </motion.div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500 text-center">
                      {language === 'ar' ? 'سيظهر النص المُحسَّن هنا...' : 'Humanized text will appear here...'}
                    </p>
                  </div>
                )}
              </div>

              {outputText && (
                <div className="mt-3 text-xs text-gray-500 flex justify-between">
                  <span className="text-green-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {language === 'ar' ? 'تم التحسين بنجاح' : 'Humanization complete'}
                  </span>
                  <span>{outputWordCount} {language === 'ar' ? 'كلمة' : 'words'} • {outputText.length} {language === 'ar' ? 'حرف' : 'chars'}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 glass-card p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            {language === 'ar' ? 'نصائح للحصول على أفضل النتائج' : 'Tips for Best Results'}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-black/30 rounded-xl border border-purple-900/20">
              <Globe className="w-5 h-5 text-purple-400 mb-2" />
              <h4 className="text-white font-medium text-sm mb-1">{language === 'ar' ? 'حفظ اللهجة' : 'Dialect Preservation'}</h4>
              <p className="text-gray-400 text-xs">{language === 'ar' ? 'الأداة تكتشف وتحافظ على لهجتك الأصلية' : 'The tool detects and preserves your original dialect'}</p>
            </div>
            <div className="p-4 bg-black/30 rounded-xl border border-purple-900/20">
              <MessageCircle className="w-5 h-5 text-purple-400 mb-2" />
              <h4 className="text-white font-medium text-sm mb-1">{language === 'ar' ? 'المعنى سليم' : 'Meaning Intact'}</h4>
              <p className="text-gray-400 text-xs">{language === 'ar' ? 'آراؤك وحقائقك تبقى كما هي' : 'Your opinions and facts remain unchanged'}</p>
            </div>
            <div className="p-4 bg-black/30 rounded-xl border border-purple-900/20">
              <Activity className="w-5 h-5 text-purple-400 mb-2" />
              <h4 className="text-white font-medium text-sm mb-1">{language === 'ar' ? 'تنوع أعلى' : 'Higher Burstiness'}</h4>
              <p className="text-gray-400 text-xs">{language === 'ar' ? 'تنويع أطوال الجمل يجعل النص طبيعياً' : 'Varied sentence lengths make text appear natural'}</p>
            </div>
            <div className="p-4 bg-black/30 rounded-xl border border-purple-900/20">
              <Eye className="w-5 h-5 text-purple-400 mb-2" />
              <h4 className="text-white font-medium text-sm mb-1">{language === 'ar' ? 'وضع التخفي' : 'Undetectable Mode'}</h4>
              <p className="text-gray-400 text-xs">{language === 'ar' ? 'لأقصى درجات التحسين، استخدم خيار "مخفي"' : 'For maximum humanization, use the Undetectable option'}</p>
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
