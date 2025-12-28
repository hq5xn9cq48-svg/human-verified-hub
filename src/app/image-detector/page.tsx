'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import ScoreGauge from '@/components/ScoreGauge'

interface AnalysisResult {
  aiProbability: number
  verdict: string
  confidenceLevel?: string
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
}

export default function ImageDetectorPage() {
  const { t, isRTL } = useLanguage()
  const [image, setImage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, or WebP)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
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

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/image-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
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

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      default: return 'bg-slate-700 text-slate-300 border-slate-600'
    }
  }

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'anatomical': return '🖐️'
      case 'mixed_media': return '🎨'
      case 'micro': return '🔬'
      case 'texture': return '🧶'
      case 'physics': return '💡'
      default: return '🔍'
    }
  }

  return (
    <div className="min-h-screen relative forensic-grid" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 -z-10" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-5">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 mb-5"
          >
            <span className="text-xl">🖼️</span>
            <span className="text-xs text-slate-300 font-medium">AI Image Forensics V3.0</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            {t.imageDetector.title}{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t.imageDetector.titleHighlight}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-2xl mx-auto"
          >
            Deep forensic analysis for hands, eyes, mixed media, and micro-artifacts
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
                  className="absolute inset-0 rounded-full border-4 border-cyan-500/20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full border-4 border-blue-500/20"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">🔬</span>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
              >
                <p className="text-slate-300 font-medium">Analyzing image...</p>
                <p className="text-slate-500 text-sm mt-1">Checking for artifacts, anomalies, and AI signatures</p>
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
                    ? 'border-cyan-500 bg-cyan-500/10' 
                    : 'border-slate-700/50 hover:border-slate-600 bg-slate-900/50'
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
                    <div className="mt-4 text-slate-300 text-sm font-medium">{fileName}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetForm() }}
                      className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
                    >
                      Remove image
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-300 font-medium text-lg">{t.imageDetector.uploadButton}</p>
                    <p className="text-slate-500 mt-1">{t.imageDetector.dragDrop}</p>
                    <p className="text-slate-600 text-sm mt-4">{t.imageDetector.supportedFormats}</p>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleAnalyze}
                disabled={!image}
                className="w-full py-4 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔍 {t.imageDetector.analyzeButton}
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
              <div className="flex flex-col md:flex-row items-center gap-8">
                <ScoreGauge score={100 - result.aiProbability} />
                
                <div className="flex-1 text-center md:text-left">
                  <div className="text-4xl mb-2">
                    {result.aiProbability >= 70 ? '🤖' : result.aiProbability >= 40 ? '🤔' : '📸'}
                  </div>
                  <div className={`text-3xl font-bold ${
                    result.aiProbability >= 70 ? 'text-red-400' 
                    : result.aiProbability >= 40 ? 'text-yellow-400' 
                    : 'text-emerald-400'
                  }`}>
                    {result.verdict}
                  </div>
                  <div className="mt-2 text-slate-400">
                    AI Probability: <span className="font-bold">{result.aiProbability}%</span>
                  </div>
                  {result.confidenceLevel && (
                    <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
                      <span className="text-xs text-slate-400">Confidence:</span>
                      <span className="text-xs font-medium text-slate-300 capitalize">{result.confidenceLevel}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.aiProbability}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      result.aiProbability >= 70 
                        ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                        : result.aiProbability >= 40 
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-emerald-500 to-green-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>📸 Authentic Photo</span>
                  <span>🤖 AI Generated</span>
                </div>
              </div>

              {/* Summary */}
              {result.summary && (
                <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/30">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span>📋</span> Forensic Summary
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{result.summary}</p>
                </div>
              )}

              {/* Analysis Details */}
              {result.analysisDetails && (
                <div className="bg-slate-800/30 rounded-xl p-5 border border-cyan-500/20">
                  <h3 className="text-sm font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                    <span>🔬</span> Detailed Analysis
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(result.analysisDetails).map(([key, value]) => (
                      value && value !== 'Not analyzed' && (
                        <div key={key} className="p-4 bg-slate-900/50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <span>{key.includes('hand') ? '🖐️' : key.includes('eye') ? '👁️' : key.includes('texture') ? '🧶' : key.includes('light') ? '💡' : key.includes('background') ? '🌄' : '📊'}</span>
                            <span className="text-slate-400 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          </div>
                          <p className="text-slate-300 text-sm">{value}</p>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Artifacts */}
              {result.artifacts && result.artifacts.length > 0 && (
                <div className="bg-slate-800/30 rounded-xl p-5 border border-orange-500/20">
                  <h3 className="text-sm font-semibold text-orange-400 mb-4 flex items-center gap-2">
                    <span>⚠️</span> {t.imageDetector.detectedArtifacts}
                  </h3>
                  <div className="space-y-3">
                    {result.artifacts.map((artifact, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCategoryIcon(artifact.category)}</span>
                            <span className="text-white font-medium">{artifact.name}</span>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full border ${getSeverityColor(artifact.severity)}`}>
                            {artifact.severity}
                          </span>
                        </div>
                        {artifact.location && (
                          <p className="text-slate-500 text-xs mb-1">📍 {artifact.location}</p>
                        )}
                        <p className="text-slate-400 text-sm">{artifact.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && (
                <div className="bg-slate-800/30 rounded-xl p-5 border border-violet-500/20">
                  <h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2">
                    <span>💡</span> Verification Tips
                  </h3>
                  <p className="text-slate-300 text-sm">{result.recommendations}</p>
                </div>
              )}

              {/* Reset Button */}
              <button
                onClick={resetForm}
                className="w-full py-3 px-4 rounded-xl border border-slate-700/50 text-slate-300 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all"
              >
                Analyze Another Image
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
          <h3 className="text-sm font-semibold text-white mb-4 text-center">🔍 Detection Categories</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <div className="text-2xl mb-2">🖐️</div>
              <div className="text-white font-medium">Hands</div>
              <div className="text-slate-500">Finger count & joints</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <div className="text-2xl mb-2">👁️</div>
              <div className="text-white font-medium">Eyes</div>
              <div className="text-slate-500">Reflections & pupils</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <div className="text-2xl mb-2">🎨</div>
              <div className="text-white font-medium">Mixed Media</div>
              <div className="text-slate-500">Composite detection</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <div className="text-2xl mb-2">🔬</div>
              <div className="text-white font-medium">Micro</div>
              <div className="text-slate-500">Subtle artifacts</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <div className="text-2xl mb-2">💡</div>
              <div className="text-white font-medium">Physics</div>
              <div className="text-slate-500">Lighting & shadows</div>
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
