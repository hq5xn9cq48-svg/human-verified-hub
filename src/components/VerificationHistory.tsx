'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Verification } from '@/types/database'

interface VerificationHistoryProps {
  userId: string
  refreshTrigger?: number
}

export default function VerificationHistory({ userId, refreshTrigger }: VerificationHistoryProps) {
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchVerifications()
  }, [refreshTrigger])

  const fetchVerifications = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error && data) {
      setVerifications(data)
    }
    setLoading(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-500/10 border-green-500/20'
    if (score >= 50) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center gap-3 text-dark-400">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 border-2 border-dark-400/30 border-t-dark-400 rounded-full"
          />
          Loading history...
        </div>
      </div>
    )
  }

  if (verifications.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <span className="text-4xl mb-4 block">📝</span>
        <p className="text-dark-400">No verifications yet. Start analyzing text above!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <span className="text-accent-primary">📜</span>
        Recent Verifications
      </h3>

      <div className="space-y-3">
        <AnimatePresence>
          {verifications.map((verification, index) => (
            <motion.div
              key={verification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === verification.id ? null : verification.id)}
                className="w-full p-4 text-left hover:bg-dark-700/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-dark-300 text-sm truncate">
                      {truncateText(verification.content)}
                    </p>
                    <p className="text-dark-500 text-xs mt-1">
                      {formatDate(verification.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${getScoreColor(
                        verification.result_score
                      )}`}
                    >
                      {verification.result_score}%
                    </span>
                    <motion.span
                      animate={{ rotate: expandedId === verification.id ? 180 : 0 }}
                      className="text-dark-400"
                    >
                      ▼
                    </motion.span>
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {expandedId === verification.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-dark-700/50"
                  >
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-dark-400 mb-2">Original Text</h4>
                        <p className="text-dark-300 text-sm bg-dark-900/50 p-3 rounded-lg max-h-40 overflow-y-auto">
                          {verification.content}
                        </p>
                      </div>
                      {verification.analysis && (
                        <div>
                          <h4 className="text-sm font-medium text-dark-400 mb-2">Analysis</h4>
                          <p className="text-dark-300 text-sm">{verification.analysis}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
