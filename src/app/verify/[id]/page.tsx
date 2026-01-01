'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, Award, ArrowLeft, Calendar, Hash, FileText } from 'lucide-react'

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
    <div className="min-h-screen bg-black cyber-grid flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 relative">
              <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-lg group-hover:bg-purple-600/40 transition-all" />
              <Image 
                src="/logo.png" 
                alt="Human-Verified Hub Logo" 
                width={48} 
                height={48} 
                className="relative z-10 drop-shadow-[0_0_12px_rgba(168,85,247,0.6)] group-hover:drop-shadow-[0_0_20px_rgba(168,85,247,0.9)] transition-all"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">Human-Verified Hub</h1>
              <p className="text-xs text-gray-400">Certificate Verification</p>
            </div>
          </Link>
        </div>

        {/* Main Card */}
        <div className="glass-card-dark p-8 border border-purple-900/30">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-spin" />
              <p className="text-gray-400">Verifying certificate...</p>
            </div>
          ) : valid && certificate ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {/* Valid Badge */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Certificate Valid</h2>
              <p className="text-green-400 mb-6">This certificate is authentic and verified</p>

              {/* Certificate Details */}
              <div className="space-y-4 text-left bg-black/50 rounded-xl p-6 border border-purple-900/30">
                <div className="flex justify-between items-center border-b border-purple-900/30 pb-3">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Certificate ID
                  </span>
                  <span className="text-white font-mono text-sm">{certificate.id}</span>
                </div>
                <div className="flex justify-between items-center border-b border-purple-900/30 pb-3">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Human Score
                  </span>
                  <span className="text-green-400 font-bold text-xl">{certificate.score}%</span>
                </div>
                <div className="flex justify-between items-center border-b border-purple-900/30 pb-3">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Issued On
                  </span>
                  <span className="text-white text-sm">{formatDate(certificate.issuedAt)}</span>
                </div>
                {certificate.contentPreview && (
                  <div className="pt-2">
                    <span className="text-gray-400 text-sm flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" />
                      Content Preview
                    </span>
                    <p className="text-gray-300 text-sm italic">&ldquo;{certificate.contentPreview}...&rdquo;</p>
                  </div>
                )}
              </div>

              {/* Seal */}
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-900/30 to-green-900/30 border border-purple-500/30">
                <Award className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-gradient">Verified Human Content</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {/* Invalid Badge */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h2>
              <p className="text-red-400 mb-6">{error || 'This certificate does not exist or has been revoked'}</p>

              <div className="bg-black/50 rounded-xl p-4 border border-purple-900/30">
                <p className="text-gray-400 text-sm">
                  If you believe this is an error, please contact support or request a new verification.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-purple-400 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Human-Verified Hub
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
