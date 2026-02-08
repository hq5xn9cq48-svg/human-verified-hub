'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Crown, Gift, AlertCircle, Infinity } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface UsageCounterProps {
  variant?: 'compact' | 'full'
  showUpgrade?: boolean
  className?: string
}

export default function UsageCounter({ 
  variant = 'compact', 
  showUpgrade = true,
  className = ''
}: UsageCounterProps) {
  const { usageStatus, user } = useAuth()
  const { language } = useLanguage()

  // Don't show anything if no usage status
  if (!usageStatus) {
    return null
  }

  // Pro users see simple unlimited badge
  if (usageStatus.isPro) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full">
          <Crown className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-yellow-400">
            {language === 'ar' ? 'برو' : 'Pro'}
          </span>
          <Infinity className="w-4 h-4 text-yellow-400" />
        </div>
      </div>
    )
  }

  // Guest users see sign-in prompt
  if (usageStatus.isGuest || !user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Link 
          href="/auth"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-full hover:bg-purple-900/50 transition-all"
        >
          <Gift className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-300">
            {language === 'ar' ? 'سجل دخول للتتبع' : 'Sign in to track usage'}
          </span>
        </Link>
      </div>
    )
  }

  // Free users see their remaining uses
  const remaining = usageStatus.remaining ?? 2
  const limit = usageStatus.limit ?? 2
  const usedToday = usageStatus.usedToday ?? 0
  const isLimitReached = remaining <= 0
  const isLow = remaining === 1
  const usagePercentage = limit > 0 ? (usedToday / limit) * 100 : 0

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* GLASSMORPHISM Free Uses Remaining Badge - Visually Distinct */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-xl border-2 ${
            isLimitReached 
              ? 'bg-gradient-to-r from-red-500/15 to-red-600/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]' 
              : isLow 
                ? 'bg-gradient-to-r from-yellow-500/15 to-orange-500/10 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]' 
                : 'bg-gradient-to-r from-purple-500/15 to-pink-500/10 border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]'
          }`}
        >
          {/* Subtle shimmer overlay for glassmorphism effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
          
          {/* Progress bar track */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 rounded-b-2xl overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usagePercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full ${
                isLimitReached 
                  ? 'bg-gradient-to-r from-red-500 to-red-400' 
                  : isLow 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-400' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
            />
          </div>
          
          {isLimitReached ? (
            <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
          ) : (
            <Gift className={`w-4 h-4 ${isLow ? 'text-yellow-400' : 'text-purple-400'}`} />
          )}
          
          {/* Usage count with label - Show remaining out of limit */}
          <div className="flex items-baseline gap-1.5 relative z-10">
            <span className={`text-base font-bold tabular-nums ${
              isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'
            }`}>
              {remaining}
            </span>
            <span className="text-gray-400 text-xs font-medium">
              {language === 'ar' ? 'متبقي' : 'left'}
            </span>
          </div>
          
          {/* Show used/limit for context */}
          <span className={`text-xs font-medium relative z-10 px-2 py-0.5 rounded-full ${
            isLimitReached 
              ? 'bg-red-500/20 text-red-300' 
              : isLow 
                ? 'bg-yellow-500/20 text-yellow-300' 
                : 'bg-purple-500/20 text-purple-200'
          }`}>
            {usedToday}/{limit}
          </span>
        </motion.div>
        
        {showUpgrade && (
          <Link 
            href="/pricing"
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl hover:from-purple-500 hover:to-pink-500 transition-all group shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 border border-purple-400/30"
          >
            <Crown className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">
              {language === 'ar' ? 'Pro' : 'Pro'}
            </span>
          </Link>
        )}
      </div>
    )
  }

  // Full variant with more detail
  return (
    <motion.div 
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`p-4 rounded-xl border ${
        isLimitReached 
          ? 'bg-red-500/10 border-red-500/30' 
          : isLow 
            ? 'bg-yellow-500/10 border-yellow-500/30' 
            : 'bg-purple-900/20 border-purple-500/30'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLimitReached ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : (
            <Gift className={`w-5 h-5 ${isLow ? 'text-yellow-400' : 'text-purple-400'}`} />
          )}
          <span className={`font-medium ${
            isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'
          }`}>
            {language === 'ar' ? 'الاستخدام اليومي' : 'Daily Usage'}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-2xl font-bold ${
            isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-purple-400'
          }`}>
            {remaining}
          </span>
          <span className="text-xs text-gray-400">
            {language === 'ar' ? `${usedToday}/${limit} مستخدم` : `${usedToday}/${limit} used`}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${usagePercentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            isLimitReached 
              ? 'bg-red-500' 
              : isLow 
                ? 'bg-yellow-500' 
                : 'bg-purple-500'
          }`}
        />
      </div>

      <p className={`text-sm mb-3 ${
        isLimitReached ? 'text-red-400' : 'text-gray-400'
      }`}>
        {isLimitReached
          ? (language === 'ar' 
              ? 'وصلت للحد اليومي. الترقية للحصول على استخدام غير محدود.'
              : 'Daily limit reached. Upgrade for unlimited analyses.')
          : (language === 'ar'
              ? `${remaining} تحليل متبقي اليوم. يُعاد التعيين عند منتصف الليل بتوقيت UTC.`
              : `${remaining} ${remaining === 1 ? 'analysis' : 'analyses'} remaining today. Resets at midnight UTC.`)}
      </p>

      {showUpgrade && (
        <Link 
          href="/pricing"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          <Crown className="w-4 h-4" />
          <span>
            {language === 'ar' ? 'ترقية للبرو - بلا حدود' : 'Upgrade to Pro - Unlimited'}
          </span>
        </Link>
      )}
    </motion.div>
  )
}
