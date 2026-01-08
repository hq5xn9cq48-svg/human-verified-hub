'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Verification } from '@/types/database'
import { Loader2, FileText, ChevronDown } from 'lucide-react'

interface VerificationHistoryProps {
  userId: string
  refreshTrigger?: number
}

export default function VerificationHistory({ userId, refreshTrigger }: VerificationHistoryProps) {
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchVerifications()
  }, [refreshTrigger])

  const fetchVerifications = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    const supabase = createClient()
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
    if (score >= 80) return 'text-green-400 bg-green-500/10 border-green-500/30'
    if (score >= 50) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    return 'text-red-400 bg-red-500/10 border-red-500/30'
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
      <div className="flex items-center justify-center gap-3 text-gray-400 py-8">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading history...
      </div>
    )
  }

  if (verifications.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-10 h-10 mx-auto mb-3 text-gray-600" />
        <p className="text-gray-400 text-sm">No verifications yet. Start analyzing text above!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {verifications.map((verification, index) => (
          <motion.div
            key={verification.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            className="bg-black/50 border border-purple-900/30 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === verification.id ? null : verification.id)}
              className="w-full p-3 text-left hover:bg-purple-900/10 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-sm truncate">
                    {truncateText(verification.content)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {formatDate(verification.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getScoreColor(
                      verification.result_score
                    )}`}
                  >
                    {verification.result_score}%
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      expandedId === verification.id ? 'rotate-180' : ''
                    }`}
                  />
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
                  className="border-t border-purple-900/30"
                >
                  <div className="p-3 space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-2">Original Text</h4>
                      <p className="text-gray-300 text-sm bg-black/50 p-3 rounded-lg max-h-32 overflow-y-auto">
                        {verification.content}
                      </p>
                    </div>
                    {verification.analysis && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Analysis</h4>
                        <p className="text-gray-300 text-sm">{verification.analysis}</p>
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
  )
}
