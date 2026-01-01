'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
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
  CheckCircle
} from 'lucide-react'

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
                  <Microscope className="w-10 h-10 text-purple-400" />
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
              >
                <p className="text-gray-300 font-medium">Analyzing image...</p>
                <p className="text-gray-500 text-sm mt-1">Checking for artifacts, anomalies, and AI signatures</p>
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
                      Remove image
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
              <div className="flex flex-col md:flex-row items-center gap-8">
                <ScoreGauge score={100 - result.aiProbability} />
                
                <div className="flex-1 text-center md:text-left">
                  <div className="text-4xl mb-2">
                    {result.aiProbability >= 70 ? <Bot className="w-12 h-12 text-red-400 mx-auto md:mx-0" /> : result.aiProbability >= 40 ? <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto md:mx-0" /> : <Camera className="w-12 h-12 text-green-400 mx-auto md:mx-0" />}
                  </div>
                  <div className={`text-3xl font-bold ${
                    result.aiProbability >= 70 ? 'text-red-400' 
                    : result.aiProbability >= 40 ? 'text-yellow-400' 
                    : 'text-green-400'
                  }`}>
                    {result.verdict}
                  </div>
                  <div className="mt-2 text-gray-400">
                    AI Probability: <span className="font-bold">{result.aiProbability}%</span>
                  </div>
                  {result.confidenceLevel && (
                    <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-purple-900/30">
                      <span className="text-xs text-gray-400">Confidence:</span>
                      <span className="text-xs font-medium text-gray-300 capitalize">{result.confidenceLevel}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="relative h-4 bg-black/50 rounded-full overflow-hidden border border-purple-900/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.aiProbability}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      result.aiProbability >= 70 
                        ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                        : result.aiProbability >= 40 
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> Authentic Photo</span>
                  <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> AI Generated</span>
                </div>
              </div>

              {/* Summary */}
              {result.summary && (
                <div className="bg-black/30 rounded-xl p-5 border border-purple-900/20">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-400" />
                    Forensic Summary
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
                </div>
              )}

              {/* Analysis Details */}
              {result.analysisDetails && (
                <div className="bg-black/30 rounded-xl p-5 border border-purple-500/20">
                  <h3 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
                    <Microscope className="w-4 h-4" />
                    Detailed Analysis
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(result.analysisDetails).map(([key, value]) => {
                      if (!value || value === 'Not analyzed') return null
                      const getIcon = () => {
                        if (key.includes('hand')) return Hand
                        if (key.includes('eye')) return Eye
                        if (key.includes('texture')) return Palette
                        if (key.includes('light')) return Lightbulb
                        if (key.includes('background')) return ImageIcon
                        return Microscope
                      }
                      const Icon = getIcon()
                      return (
                        <div key={key} className="p-4 bg-black/50 rounded-xl border border-purple-900/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-4 h-4 text-purple-400" />
                            <span className="text-gray-400 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
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
                    {t.imageDetector.detectedArtifacts}
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
                            <p className="text-gray-500 text-xs mb-1">Location: {artifact.location}</p>
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
                    Verification Tips
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
          <h3 className="text-sm font-semibold text-white mb-4 text-center flex items-center justify-center gap-2">
            <Microscope className="w-4 h-4 text-purple-400" />
            Detection Categories
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Hand className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">Hands</div>
              <div className="text-gray-500">Finger count & joints</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Eye className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">Eyes</div>
              <div className="text-gray-500">Reflections & pupils</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Palette className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">Mixed Media</div>
              <div className="text-gray-500">Composite detection</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Microscope className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">Micro</div>
              <div className="text-gray-500">Subtle artifacts</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-purple-900/20">
              <Lightbulb className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-white font-medium">Physics</div>
              <div className="text-gray-500">Lighting & shadows</div>
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
