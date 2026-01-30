'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, X, Star, Sparkles, Lock, Zap, Infinity } from 'lucide-react'
import Link from 'next/link'

interface ProGuardProps {
  children: React.ReactNode
  featureName?: string
  featureNameAr?: string
}

/**
 * ProGuard - Protects Pro-only features
 * Shows upgrade modal for non-Pro users who are logged in
 * Redirects to auth for non-logged in users
 */
export default function ProGuard({ 
  children, 
  featureName = 'this feature',
  featureNameAr = 'هذه الميزة'
}: ProGuardProps) {
  const { user, loading: authLoading, usageStatus } = useAuth()
  const { language } = useLanguage()
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Wait for auth to complete loading
    if (authLoading) return

    // If not logged in, AuthGuard will handle it
    if (!user) return

    // If user is Pro, allow access
    if (usageStatus?.isPro) return

    // User is logged in but not Pro - show upgrade modal
    setShowModal(true)
  }, [user, authLoading, usageStatus?.isPro])

  // Show loading while checking auth/status
  if (authLoading || (user && !usageStatus)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-900/20 flex items-center justify-center animate-pulse">
            <Crown className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  // If user is Pro, render children
  if (user && usageStatus?.isPro) {
    return <>{children}</>
  }

  // Show Pro-required modal for logged-in non-Pro users
  return (
    <>
      <AnimatePresence>
        {showModal && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative max-w-md w-full rounded-2xl bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl p-8 text-center border border-yellow-500/30 shadow-[0_0_60px_-15px_rgba(234,179,8,0.3)]"
            >
              {/* Subtle glow overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none" />
              
              {/* Close button - redirects to home */}
              <button
                onClick={() => router.push('/')}
                className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon with glow effect */}
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 bg-yellow-500/20 rounded-xl blur-xl animate-pulse" />
                <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border border-yellow-500/40 flex items-center justify-center">
                  <Crown className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                </div>
              </div>

              {/* Lock badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                <Lock className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-400 text-xs font-medium">
                  {language === 'ar' ? 'ميزة Pro فقط' : 'Pro Feature'}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2">
                {language === 'ar' ? 'ترقية للـ Pro' : 'Upgrade to Pro'}
              </h2>

              {/* Description */}
              <p className="text-gray-400 text-sm mb-6">
                {language === 'ar' 
                  ? `${featureNameAr} متاح حصرياً للمشتركين Pro. ترقى الآن واستمتع بميزات غير محدودة!`
                  : `${featureName} is exclusively available for Pro subscribers. Upgrade now for unlimited access!`}
              </p>

              {/* Pro Benefits */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="p-3 bg-black/40 rounded-xl border border-yellow-500/20">
                  <Infinity className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">
                    {language === 'ar' ? 'تحليلات لا محدودة' : 'Unlimited Analyses'}
                  </p>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-yellow-500/20">
                  <Sparkles className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">
                    {language === 'ar' ? 'كل الميزات' : 'All Features'}
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                <Link
                  href="/pricing"
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-yellow-400 hover:to-amber-500 transition-all shadow-lg shadow-yellow-500/25"
                >
                  <Star className="w-5 h-5 fill-black" />
                  {language === 'ar' ? 'الترقية للـ Pro الآن' : 'Upgrade to Pro Now'}
                </Link>
                
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3 px-6 border border-gray-700 text-gray-400 font-medium rounded-xl hover:text-white hover:border-gray-600 hover:bg-white/5 transition-all"
                >
                  {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
                </button>
              </div>

              {/* Current plan info */}
              <p className="text-gray-600 text-xs mt-4 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" />
                {language === 'ar' 
                  ? `الخطة الحالية: مجاني (${usageStatus?.remaining || 0}/${usageStatus?.limit || 2} تحليلات متبقية)`
                  : `Current plan: Free (${usageStatus?.remaining || 0}/${usageStatus?.limit || 2} analyses remaining)`}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
