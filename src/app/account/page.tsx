'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { 
  User, 
  Crown, 
  History, 
  Settings, 
  LogOut,
  FileText,
  Image,
  Calendar,
  Zap,
  Shield,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react'

interface ScanHistoryItem {
  id: string
  created_at: string
  content: string
  result_score: number
  analysis?: string
}

export default function AccountPage() {
  const { language, isRTL } = useLanguage()
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview')
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [stats, setStats] = useState({ totalScans: 0, humanScans: 0, aiScans: 0 })

  const content = {
    en: {
      title: 'My',
      titleHighlight: 'Account',
      notLoggedIn: 'Please sign in to access your account',
      signInButton: 'Sign In',
      tabs: {
        overview: 'Overview',
        history: 'Scan History',
        settings: 'Settings'
      },
      subscription: {
        title: 'Subscription Status',
        currentPlan: 'Current Plan',
        freePlan: 'Free (Beta)',
        freePlanDesc: 'All premium features unlocked during beta',
        proPlan: 'Pro',
        features: [
          'Unlimited text analysis',
          'Unlimited image analysis',
          'PDF certificate generation',
          'Scan history',
          'Priority support'
        ],
        upgradeNote: 'Pro subscriptions coming soon!'
      },
      stats: {
        title: 'Your Statistics',
        totalScans: 'Total Scans',
        humanDetected: 'Human Detected',
        aiDetected: 'AI Detected'
      },
      history: {
        title: 'Recent Scans',
        noHistory: 'No scan history yet',
        noHistoryDesc: 'Start analyzing content to see your history here',
        score: 'Score',
        viewAll: 'View All History'
      },
      settings: {
        title: 'Account Settings',
        email: 'Email Address',
        language: 'Preferred Language',
        notifications: 'Email Notifications',
        notificationsDesc: 'Receive updates about new features',
        dataPrivacy: 'Data Privacy',
        dataPrivacyDesc: 'Your analyzed content is never stored or used for training',
        deleteAccount: 'Delete Account',
        deleteAccountDesc: 'Permanently delete your account and all data',
        saveSettings: 'Save Settings',
        signOut: 'Sign Out'
      }
    },
    ar: {
      title: 'حسابي',
      titleHighlight: 'الشخصي',
      notLoggedIn: 'يرجى تسجيل الدخول للوصول إلى حسابك',
      signInButton: 'تسجيل الدخول',
      tabs: {
        overview: 'نظرة عامة',
        history: 'سجل الفحوصات',
        settings: 'الإعدادات'
      },
      subscription: {
        title: 'حالة الاشتراك',
        currentPlan: 'الخطة الحالية',
        freePlan: 'مجاني (بيتا)',
        freePlanDesc: 'جميع الميزات المميزة مفتوحة خلال البيتا',
        proPlan: 'برو',
        features: [
          'تحليل نصوص غير محدود',
          'تحليل صور غير محدود',
          'إنشاء شهادات PDF',
          'سجل الفحوصات',
          'دعم أولوية'
        ],
        upgradeNote: 'اشتراكات Pro قادمة قريباً!'
      },
      stats: {
        title: 'إحصائياتك',
        totalScans: 'إجمالي الفحوصات',
        humanDetected: 'كشف بشري',
        aiDetected: 'كشف AI'
      },
      history: {
        title: 'الفحوصات الأخيرة',
        noHistory: 'لا يوجد سجل فحوصات بعد',
        noHistoryDesc: 'ابدأ بتحليل المحتوى لرؤية سجلك هنا',
        score: 'النتيجة',
        viewAll: 'عرض كل السجل'
      },
      settings: {
        title: 'إعدادات الحساب',
        email: 'البريد الإلكتروني',
        language: 'اللغة المفضلة',
        notifications: 'إشعارات البريد',
        notificationsDesc: 'تلقي تحديثات حول الميزات الجديدة',
        dataPrivacy: 'خصوصية البيانات',
        dataPrivacyDesc: 'المحتوى المحلل لا يُخزن أبداً ولا يُستخدم للتدريب',
        deleteAccount: 'حذف الحساب',
        deleteAccountDesc: 'حذف حسابك وجميع بياناتك نهائياً',
        saveSettings: 'حفظ الإعدادات',
        signOut: 'تسجيل الخروج'
      }
    }
  }

  const t = language === 'ar' ? content.ar : content.en

  useEffect(() => {
    if (!authLoading && !user) {
      // User not logged in
      return
    }

    if (user && isSupabaseConfigured()) {
      fetchHistory()
    } else {
      setHistoryLoading(false)
    }
  }, [user, authLoading])

  const fetchHistory = async () => {
    if (!user) return
    
    setHistoryLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setScanHistory(data)
        
        // Calculate stats
        const total = data.length
        const human = data.filter(s => s.result_score >= 61).length
        const ai = data.filter(s => s.result_score <= 30).length
        setStats({ totalScans: total, humanScans: human, aiScans: ai })
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 61) return 'text-green-400 bg-green-900/20 border-green-500/30'
    if (score >= 31) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'
    return 'text-red-400 bg-red-900/20 border-red-500/30'
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black cyber-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-black cyber-grid" dir={isRTL ? 'rtl' : 'ltr'}>
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-8 pt-24">
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-purple-900/30 flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{t.notLoggedIn}</h2>
            <a
              href="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
            >
              {t.signInButton}
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black cyber-grid" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold text-white mb-2"
          >
            {t.title}{' '}
            <span className="text-gradient neon-text-glow">{t.titleHighlight}</span>
          </motion.h1>
          <p className="text-gray-400">{user.email}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-black/50 rounded-xl w-fit border border-purple-900/30">
          {(['overview', 'history', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.tabs[tab]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Subscription Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                {t.subscription.title}
              </h2>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-xl border border-purple-500/30">
                  <div className="text-gray-400 text-sm mb-1">{t.subscription.currentPlan}</div>
                  <div className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    {t.subscription.freePlan}
                  </div>
                  <div className="text-purple-400 text-sm mt-1">{t.subscription.freePlanDesc}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {t.subscription.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-purple-900/10 rounded-lg border border-purple-500/20">
                <p className="text-purple-300 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {t.subscription.upgradeNote}
                </p>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                {t.stats.title}
              </h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-black/30 rounded-xl text-center border border-purple-900/20">
                  <div className="text-3xl font-bold text-white">{stats.totalScans}</div>
                  <div className="text-gray-400 text-sm">{t.stats.totalScans}</div>
                </div>
                <div className="p-4 bg-black/30 rounded-xl text-center border border-green-900/20">
                  <div className="text-3xl font-bold text-green-400">{stats.humanScans}</div>
                  <div className="text-gray-400 text-sm">{t.stats.humanDetected}</div>
                </div>
                <div className="p-4 bg-black/30 rounded-xl text-center border border-red-900/20">
                  <div className="text-3xl font-bold text-red-400">{stats.aiScans}</div>
                  <div className="text-gray-400 text-sm">{t.stats.aiDetected}</div>
                </div>
              </div>
            </motion.div>

            {/* Recent Scans Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  {t.history.title}
                </h2>
                {scanHistory.length > 0 && (
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-purple-400 text-sm hover:text-purple-300 flex items-center gap-1"
                  >
                    {t.history.viewAll}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400">{t.history.noHistory}</p>
                  <p className="text-gray-500 text-sm">{t.history.noHistoryDesc}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scanHistory.slice(0, 3).map(scan => (
                    <div key={scan.id} className="p-4 bg-black/30 rounded-xl border border-purple-900/20">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-300 text-sm truncate">{scan.content}</p>
                          <p className="text-gray-500 text-xs mt-1">{formatDate(scan.created_at)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getScoreColor(scan.result_score)}`}>
                          {scan.result_score}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              {t.history.title}
            </h2>
            
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : scanHistory.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg">{t.history.noHistory}</p>
                <p className="text-gray-500">{t.history.noHistoryDesc}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scanHistory.map(scan => (
                  <div key={scan.id} className="p-4 bg-black/30 rounded-xl border border-purple-900/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 text-sm line-clamp-2">{scan.content}</p>
                        {scan.analysis && (
                          <p className="text-gray-500 text-xs mt-2 line-clamp-1">{scan.analysis}</p>
                        )}
                        <p className="text-gray-600 text-xs mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(scan.created_at)}
                        </p>
                      </div>
                      <div className="text-center">
                        <span className={`px-4 py-2 rounded-xl text-lg font-bold border ${getScoreColor(scan.result_score)}`}>
                          {scan.result_score}%
                        </span>
                        <p className="text-gray-500 text-xs mt-1">{t.history.score}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                {t.settings.title}
              </h2>
              
              <div className="space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t.settings.email}
                  </label>
                  <input
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-black/50 border border-purple-900/30 rounded-xl text-gray-400 cursor-not-allowed"
                  />
                </div>
                
                {/* Data Privacy */}
                <div className="p-4 bg-green-900/10 rounded-xl border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-400" />
                    <div>
                      <h3 className="text-green-400 font-medium">{t.settings.dataPrivacy}</h3>
                      <p className="text-gray-400 text-sm">{t.settings.dataPrivacyDesc}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <div className="glass-card p-6">
              <button
                onClick={handleSignOut}
                className="w-full py-3 px-4 rounded-xl border border-red-500/30 text-red-400 hover:text-red-300 hover:border-red-500/50 hover:bg-red-900/10 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t.settings.signOut}
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-900/30 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-500 text-xs">© 2026 Human-Verified Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
