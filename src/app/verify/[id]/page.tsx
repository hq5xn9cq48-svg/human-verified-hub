'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface CertificateData {
  id: string
  score: number
  issuedAt: string
  contentPreview: string
}

export default function VerifyPage() {
  const params = useParams()
  const certificateId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (certificateId) {
      verifyCertificate()
    }
  }, [certificateId])

  const verifyCertificate = async () => {
    try {
      const response = await fetch(`/api/certificate?id=${certificateId}`)
      const data = await response.json()

      if (data.valid) {
        setValid(true)
        setCertificate(data.certificate)
      } else {
        setValid(false)
        setError(data.error || 'Certificate not found')
      }
    } catch (err) {
      setError('Failed to verify certificate')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="verifyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <circle cx="32" cy="32" r="28" stroke="url(#verifyGradient)" strokeWidth="3" fill="none" />
                <path d="M20 32 L28 40 L44 24" stroke="url(#verifyGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-violet-400 bg-clip-text text-transparent">Human-Verified</h1>
              <p className="text-xs text-slate-400">Certificate Verification</p>
            </div>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {loading ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto mb-4 text-violet-500 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-slate-400">Verifying certificate...</p>
            </div>
          ) : valid && certificate ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {/* Valid Badge */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Certificate Valid</h2>
              <p className="text-emerald-400 mb-6">This certificate is authentic and verified</p>

              {/* Certificate Details */}
              <div className="space-y-4 text-left bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex justify-between items-center border-b border-slate-700/30 pb-3">
                  <span className="text-slate-400">Certificate ID</span>
                  <span className="text-white font-mono text-sm">{certificate.id}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700/30 pb-3">
                  <span className="text-slate-400">Human Score</span>
                  <span className="text-emerald-400 font-bold text-xl">{certificate.score}%</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700/30 pb-3">
                  <span className="text-slate-400">Issued On</span>
                  <span className="text-white text-sm">{formatDate(certificate.issuedAt)}</span>
                </div>
                {certificate.contentPreview && (
                  <div className="pt-2">
                    <span className="text-slate-400 text-sm block mb-2">Content Preview</span>
                    <p className="text-slate-300 text-sm italic">&ldquo;{certificate.contentPreview}...&rdquo;</p>
                  </div>
                )}
              </div>

              {/* Seal */}
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-violet-500/20 border border-emerald-500/30">
                <span className="text-lg">🏆</span>
                <span className="text-sm font-medium text-emerald-300">Verified Human Content</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {/* Invalid Badge */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h2>
              <p className="text-red-400 mb-6">{error || 'This certificate does not exist or has been revoked'}</p>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-slate-400 text-sm">
                  If you believe this is an error, please contact support or request a new verification.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Back to Human-Verified Hub
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
