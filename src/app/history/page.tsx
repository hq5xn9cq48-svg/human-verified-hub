'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import Link from 'next/link'
import { 
  Scroll, 
  User, 
  FileText, 
  Search, 
  Loader2, 
  Trash2, 
  ChevronDown, 
  Bot, 
  Shuffle, 
  UserCheck,
  LogIn
} from 'lucide-react'

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

  useEffect(() => {
    if (user && isSupabaseConfigured()) {
      fetchHistory()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchHistory = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
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
    if (!isSupabaseConfigured()) return
    try {
      const supabase = createClient()
      await supabase.from('verifications').delete().eq('id', id)
      setVerifications(verifications.filter(v => v.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const clearAllHistory = async () => {
    if (!confirm('Are you sure you want to delete all history?')) return
    if (!isSupabaseConfigured()) return
    try {
      const supabase = createClient()
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
    if (score >= 61) return 'bg-green-500/10 border-green-500/30'
    if (score >= 31) return 'bg-yellow-500/10 border-yellow-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  const getVerdict = (score: number) => {
    if (score >= 61) return { text: 'Human', icon: UserCheck, color: 'text-green-400' }
    if (score >= 31) return { text: 'Hybrid', icon: Shuffle, color: 'text-yellow-400' }
    return { text: 'AI', icon: Bot, color: 'text-red-400' }
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
    <div className="min-h-screen bg-black cyber-grid" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-4xl mx-auto px-4 pt-24 pb-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/20 border border-purple-500/30 mb-4"
          >
            <Scroll className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Verification History</span>
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
            className="text-gray-400 max-w-lg mx-auto text-sm"
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
            <div className="glass-card-dark p-8 text-center border border-purple-900/30">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-900/30 border border-purple-500/30 flex items-center justify-center">
                <User className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Sign in to view history</h3>
              <p className="text-gray-400 text-sm mb-6">Your verification history is saved when you're signed in</p>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                <LogIn className="w-4 h-4" />
                {t.nav.signIn}
              </Link>
            </div>
          ) : loading ? (
            // Loading state
            <div className="glass-card-dark p-8 text-center border border-purple-900/30">
              <Loader2 className="w-10 h-10 mx-auto mb-4 text-purple-500 animate-spin" />
              <p className="text-gray-400">{t.common.loading}</p>
            </div>
          ) : verifications.length === 0 ? (
            // Empty state
            <div className="glass-card-dark p-8 text-center border border-purple-900/30">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-900/30 border border-purple-500/30 flex items-center justify-center">
                <FileText className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t.history.noHistory}</h3>
              <p className="text-gray-400 text-sm mb-6">{t.history.noHistoryDesc}</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                <Search className="w-4 h-4" />
                Start Analyzing
              </Link>
            </div>
          ) : (
            // History list
            <div className="space-y-4">
              {/* Header */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">{verifications.length} verifications</span>
                <button
                  onClick={clearAllHistory}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  {t.history.deleteAll}
                </button>
              </div>

              {/* List */}
              <div className="space-y-3">
                <AnimatePresence>
                  {verifications.map((item, index) => {
                    const verdict = getVerdict(item.result_score)
                    const VerdictIcon = verdict.icon
                    const isExpanded = expandedId === item.id

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.03 }}
                        className="glass-card-dark overflow-hidden border border-purple-900/30"
                      >
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="p-4 cursor-pointer hover:bg-purple-900/10 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {/* Score Badge */}
                            <div className={`flex-shrink-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center ${getScoreBg(item.result_score)}`}>
                              <VerdictIcon className={`w-5 h-5 ${verdict.color}`} />
                              <span className={`text-lg font-bold ${getScoreColor(item.result_score)}`}>
                                {item.result_score}%
                              </span>
                            </div>

                            {/* Content Preview */}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm line-clamp-2" dir="auto">
                                {item.content}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>{formatDate(item.created_at)}</span>
                                <span className={`px-2 py-0.5 rounded ${getScoreBg(item.result_score)} ${getScoreColor(item.result_score)}`}>
                                  {verdict.text}
                                </span>
                              </div>
                            </div>

                            {/* Expand Icon */}
                            <ChevronDown
                              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-purple-900/30"
                            >
                              <div className="p-4 bg-black/50 space-y-3">
                                {item.analysis && (
                                  <div>
                                    <h4 className="text-xs font-medium text-gray-400 mb-1">Analysis</h4>
                                    <p className="text-gray-300 text-sm" dir="auto">{item.analysis}</p>
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs font-medium text-gray-400 mb-1">Full Content</h4>
                                  <p className="text-gray-300 text-sm whitespace-pre-wrap" dir="auto">{item.content}</p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteVerification(item.id)
                                  }}
                                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
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
      <footer className="relative z-10 border-t border-purple-900/30 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-5 text-center">
          <p className="text-gray-500 text-xs">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  )
}
