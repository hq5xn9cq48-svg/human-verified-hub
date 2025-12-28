'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'

const intentOptions = [
  { id: 'default', label: 'Default', icon: '✨', description: 'Natural, balanced humanization' },
  { id: 'academic', label: 'Academic', icon: '🎓', description: 'Scholarly tone with variety' },
  { id: 'casual', label: 'Casual', icon: '💬', description: 'Relaxed, conversational' },
  { id: 'business', label: 'Business', icon: '💼', description: 'Professional but personable' },
  { id: 'creative', label: 'Creative', icon: '🎨', description: 'Vivid, artistic expression' },
  { id: 'marketing', label: 'Marketing', icon: '📢', description: 'Engaging and persuasive' },
  { id: 'undetectable', label: 'Undetectable', icon: '🥷', description: 'Maximum humanization' },
]

export default function HumanizerPage() {
  const { t, isRTL } = useLanguage()
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [intent, setIntent] = useState('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length

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
      setError('Please enter at least 20 characters')
      return
    }

    setLoading(true)
    setError(null)
    setOutputText('')

    try {
      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, intent }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Humanization failed')
      }

      setOutputText(data.humanizedText || '')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
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

  return (
    <div className="min-h-screen relative forensic-grid" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 -z-10" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-5">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[150px]" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 mb-5"
          >
            <span className="text-xl">🎭</span>
            <span className="text-xs text-slate-300 font-medium">Text Humanization Engine V2.0</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            {t.humanizer.title}{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              {t.humanizer.titleHighlight}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-2xl mx-auto"
          >
            Transform AI-generated text to sound natural and human-like while preserving the original meaning and dialect.
          </motion.p>
        </div>

        {/* Intent Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Select Writing Style
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {intentOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setIntent(option.id)}
                className={`p-3 rounded-xl text-center transition-all ${
                  intent === option.id
                    ? 'bg-violet-500/20 border-2 border-violet-500/50 text-violet-300'
                    : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">{option.icon}</div>
                <div className="text-xs font-medium">{option.label}</div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {intentOptions.find((o) => o.id === intent)?.description}
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <form onSubmit={handleHumanize} className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-300">
                  Input Text
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                  >
                    📋 Paste
                  </button>
                  {inputText && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                    >
                      🗑️ Clear
                    </button>
                  )}
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={14}
                className="flex-1 w-full px-4 py-4 bg-slate-900/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none font-mono text-sm"
                placeholder="Paste AI-generated text here..."
                dir="auto"
              />

              <div className="flex justify-between mt-3 text-xs text-slate-500">
                <span>Min 20 characters</span>
                <div className="flex gap-4">
                  <span>{wordCount} words</span>
                  <span>{inputText.length} chars</span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || inputText.length < 20}
                className="mt-4 w-full py-4 px-6 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-fuchsia-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Humanizing...
                  </span>
                ) : (
                  <>🎭 Humanize Text</>
                )}
              </button>
            </form>
          </motion.div>

          {/* Output Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-300">
                  Humanized Output
                </label>
                {outputText && (
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-lg transition-all flex items-center gap-1"
                  >
                    {copied ? (
                      <>✓ Copied!</>
                    ) : (
                      <>📋 Copy</>
                    )}
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-[350px] px-4 py-4 bg-slate-900/80 border border-slate-700/50 rounded-xl text-white overflow-y-auto">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 flex items-center justify-center animate-pulse">
                        <span className="text-3xl">🎭</span>
                      </div>
                      <p className="text-slate-400">Processing your text...</p>
                      <p className="text-slate-500 text-sm mt-1">Preserving meaning & dialect</p>
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
                    <p className="text-slate-500 text-center">
                      Humanized text will appear here...
                    </p>
                  </div>
                )}
              </div>

              {outputText && (
                <div className="mt-3 text-xs text-slate-500 text-right">
                  {outputText.split(/\s+/).filter(Boolean).length} words • {outputText.length} chars
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
            <span>💡</span> Tips for Best Results
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="text-violet-400 text-lg mb-2">🌍</div>
              <h4 className="text-white font-medium text-sm mb-1">Dialect Preservation</h4>
              <p className="text-slate-400 text-xs">The tool detects and preserves your original dialect (Fusha, Egyptian, Gulf, etc.)</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="text-violet-400 text-lg mb-2">💬</div>
              <h4 className="text-white font-medium text-sm mb-1">Meaning Intact</h4>
              <p className="text-slate-400 text-xs">Your opinions and facts remain unchanged - only style is modified</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="text-violet-400 text-lg mb-2">📊</div>
              <h4 className="text-white font-medium text-sm mb-1">Higher Burstiness</h4>
              <p className="text-slate-400 text-xs">Varied sentence lengths make text appear more naturally written</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="text-violet-400 text-lg mb-2">🥷</div>
              <h4 className="text-white font-medium text-sm mb-1">Undetectable Mode</h4>
              <p className="text-slate-400 text-xs">For maximum humanization, use the Undetectable style option</p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-slate-500 text-xs">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  )
}
