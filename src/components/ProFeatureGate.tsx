'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Crown, Lock, Sparkles, Infinity, Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ProFeatureGateProps {
  children: ReactNode
  featureName: string
  featureNameAr?: string
  description?: string
  descriptionAr?: string
}

/**
 * Component to gate Pro-only features
 * Shows a beautiful upgrade prompt for free users
 * Renders children normally for Pro users
 */
export default function ProFeatureGate({ 
  children, 
  featureName,
  featureNameAr,
  description,
  descriptionAr
}: ProFeatureGateProps) {
  const { usageStatus, user, loading } = useAuth()
  const { language } = useLanguage()

  // If loading, show skeleton
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // If user is Pro, render children normally
  if (usageStatus?.isPro) {
    return <>{children}</>
  }

  // For non-Pro users (including guests), show the upgrade gate
  const isGuest = !user
  const displayName = language === 'ar' && featureNameAr ? featureNameAr : featureName
  const displayDescription = language === 'ar' && descriptionAr ? descriptionAr : description

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full"
        >
          {/* Main Card */}
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30 rounded-3xl blur-xl opacity-70" />
            
            <div className="relative bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl">
              {/* Lock Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute -inset-3 bg-gradient-to-r from-purple-500/40 to-pink-500/40 rounded-full blur-lg animate-pulse" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <Lock className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-center text-white mb-3">
                {language === 'ar' ? 'ميزة خاصة بالبرو' : 'Pro Feature'}
              </h1>
              
              <p className="text-center text-purple-300 text-lg font-medium mb-2">
                {displayName}
              </p>
              
              {displayDescription && (
                <p className="text-center text-gray-400 text-sm mb-6">
                  {displayDescription}
                </p>
              )}

              {/* Features List */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">
                      {language === 'ar' ? 'تحليلات غير محدودة' : 'Unlimited Analyses'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {language === 'ar' ? 'لا حدود يومية' : 'No daily limits'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">
                      {language === 'ar' ? 'جميع الأدوات المتقدمة' : 'All Advanced Tools'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {language === 'ar' ? 'تحليل الصور، الأنسنة، والمزيد' : 'Image analysis, humanizer & more'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">
                      {language === 'ar' ? 'معالجة ذات أولوية' : 'Priority Processing'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {language === 'ar' ? 'تحليلات أسرع' : 'Faster analysis times'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                <Link href="/pricing" className="block group">
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-xl blur opacity-70 group-hover:opacity-100 transition-opacity" />
                    <button className="relative w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl flex items-center justify-center gap-3 hover:from-purple-500 hover:to-pink-500 transition-all">
                      <Crown className="w-5 h-5" />
                      <span>
                        {language === 'ar' ? 'ترقية للبرو الآن' : 'Upgrade to Pro Now'}
                      </span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </Link>

                {isGuest && (
                  <Link 
                    href="/auth" 
                    className="block w-full py-3 text-center text-gray-400 hover:text-white border border-gray-700 hover:border-purple-500/50 rounded-xl transition-all"
                  >
                    {language === 'ar' ? 'تسجيل الدخول (2 تحليل نص يومياً مجاناً)' : 'Sign in (2 free text analyses daily)'}
                  </Link>
                )}

                <Link 
                  href="/" 
                  className="block w-full py-2 text-center text-gray-500 hover:text-gray-300 text-sm transition-colors"
                >
                  {language === 'ar' ? '← العودة لتحليل النصوص' : '← Back to Text Analysis'}
                </Link>
              </div>

              {/* Pricing Note */}
              <div className="mt-6 text-center">
                <p className="text-gray-500 text-xs">
                  {language === 'ar' ? 'ابتداءً من $9/شهر • ضمان استرداد 14 يوم' : 'Starting at $9/month • 14-day money-back guarantee'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
