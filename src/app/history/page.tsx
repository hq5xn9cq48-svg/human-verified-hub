'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Verification {
  id: string
  content: string
  result_score: number
  analysis: string | null
  created_at: string
}

export default function HistoryPage() {
  const { t, isRTL } = useLanguage()
  const { user, loading: authLoading } = useAuth()
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchHistory()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setVerifications(data || [])
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteVerification = async (id: string) => {
    try {
      await supabase.from('verifications').delete().eq('id', id)
      setVerifications(verifications.filter(v => v.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const clearAllHistory = async () => {
    if (!confirm('Are you sure you want to delete all history?')) return
    try {
      await supabase.from('verifications').delete().eq('user_id', user?.id)
      setVerifications([])
    } catch (err) {
      console.error('Failed to clear history:', err)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 61) return 'text-green-400'
    if (score >= 31) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 61) return 'bg-green-500/10 border-green-500/20'
    if (score >= 31) return 'bg-yellow-500/10 border-yellow-500/20'
    return 'bg-red-500/10 border-red-500/20'
  }

  const getVerdict = (score: number) => {
    if (score >= 61) return { text: 'Human', emoji: '👤' }
    if (score >= 31) return { text: 'Hybrid', emoji: '🔀' }
    return { text: 'AI', emoji: '🤖' }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="min-h-screen relative" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 -z-10" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-5">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-accent-secondary/5 rounded-full blur-[100px]" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-800/50 border border-dark-600/30 mb-4"
          >
            <span className="text-xl">📜</span>
            <span className="text-xs text-dark-300">Verification History</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-4xl font-bold text-white mb-3"
          >
            {t.history.title} <span className="text-gradient">{t.history.titleHighlight}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-dark-400 max-w-lg mx-auto text-sm"
          >
            {t.history.description}
          </motion.p>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {!user && !authLoading ? (
            // Not logged in
            <div className="glass-card p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Sign in to view history</h3>
              <p className="text-dark-400 text-sm mb-6">Your verification history is saved when you're signed in</p>
              <Link
                href="/auth"
                className="inline-block px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-medium rounded-xl hover:opacity-90 transition-all"
              >
                {t.nav.signIn}
              </Link>
            </div>
          ) : loading ? (
            // Loading state
            <div className="glass-card p-8 text-center">
              <svg className="w-10 h-10 mx-auto mb-4 text-accent-primary animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-dark-400">{t.common.loading}</p>
            </div>
          ) : verifications.length === 0 ? (
            // Empty state
            <div className="glass-card p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t.history.noHistory}</h3>
              <p className="text-dark-400 text-sm mb-6">{t.history.noHistoryDesc}</p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-medium rounded-xl hover:opacity-90 transition-all"
              >
                Start Analyzing
              </Link>
            </div>
          ) : (
            // History list
            <div className="space-y-4">
              {/* Header */}
              <div className="flex justify-between items-center">
                <span className="text-dark-400 text-sm">{verifications.length} verifications</span>
                <button
                  onClick={clearAllHistory}
                  className="text-xs text-dark-400 hover:text-red-400 transition-colors"
                >
                  {t.history.deleteAll}
                </button>
              </div>

              {/* List */}
              <div className="space-y-3">
                <AnimatePresence>
                  {verifications.map((item, index) => {
                    const verdict = getVerdict(item.result_score)
                    const isExpanded = expandedId === item.id

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.03 }}
                        className="glass-card overflow-hidden"
                      >
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="p-4 cursor-pointer hover:bg-dark-800/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {/* Score Badge */}
                            <div className={`flex-shrink-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center ${getScoreBg(item.result_score)}`}>
                              <span className="text-xl">{verdict.emoji}</span>
                              <span className={`text-lg font-bold ${getScoreColor(item.result_score)}`}>
                                {item.result_score}%
                              </span>
                            </div>

                            {/* Content Preview */}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm line-clamp-2" dir="auto">
                                {item.content}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-dark-500">
                                <span>{formatDate(item.created_at)}</span>
                                <span className={`px-2 py-0.5 rounded ${getScoreBg(item.result_score)} ${getScoreColor(item.result_score)}`}>
                                  {verdict.text}
                                </span>
                              </div>
                            </div>

                            {/* Expand Icon */}
                            <svg
                              className={`w-5 h-5 text-dark-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-dark-700/30"
                            >
                              <div className="p-4 bg-dark-900/30 space-y-3">
                                {item.analysis && (
                                  <div>
                                    <h4 className="text-xs font-medium text-dark-400 mb-1">Analysis</h4>
                                    <p className="text-dark-300 text-sm" dir="auto">{item.analysis}</p>
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs font-medium text-dark-400 mb-1">Full Content</h4>
                                  <p className="text-dark-300 text-sm whitespace-pre-wrap" dir="auto">{item.content}</p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteVerification(item.id)
                                  }}
                                  className="text-xs text-dark-400 hover:text-red-400 transition-colors"
                                >
                                  Delete this entry
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-dark-700/30 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-5 text-center">
          <p className="text-dark-500 text-xs">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  )
}
