'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Crown, Sparkles, AlertCircle, Infinity, Zap } from 'lucide-react'
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
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-300">
            {language === 'ar' ? 'سجل دخول للتتبع' : 'Sign in to track usage'}
          </span>
        </Link>
      </div>
    )
  }

  // Free users see their remaining uses
  const remaining = usageStatus.remaining
  const limit = usageStatus.limit
  const isLimitReached = remaining <= 0
  const isLow = remaining === 1
  // Progress shows how much is LEFT (remaining), not consumed
  const remainingPercentage = (remaining / limit) * 100

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Neon Purple Glassmorphism Free Trial Badge */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`relative flex items-center gap-2.5 px-4 py-2 rounded-2xl backdrop-blur-xl border-2 transition-all ${
            isLimitReached 
              ? 'bg-gradient-to-r from-red-500/15 to-red-600/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]' 
              : isLow 
                ? 'bg-gradient-to-r from-yellow-500/15 to-orange-500/10 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]' 
                : 'bg-gradient-to-r from-purple-500/15 to-violet-500/10 border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]'
          }`}
        >
          {/* Subtle shimmer overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
          
          {/* Remaining bar at bottom - shows remaining capacity */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 rounded-b-2xl overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${remainingPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full ${
                isLimitReached 
                  ? 'bg-gradient-to-r from-red-500 to-red-400' 
                  : isLow 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-400' 
                    : 'bg-gradient-to-r from-purple-500 to-violet-400'
              }`}
            />
          </div>
          
          {/* Icon */}
          {isLimitReached ? (
            <AlertCircle className="w-4 h-4 text-red-400 animate-pulse relative z-10" />
          ) : (
            <Zap className={`w-4 h-4 relative z-10 ${isLow ? 'text-yellow-400' : 'text-purple-400'}`} />
          )}
          
          {/* Usage count display: remaining/limit */}
          <div className="flex items-baseline gap-1 relative z-10">
            <span className={`text-lg font-bold tabular-nums leading-none ${
              isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'
            }`}>
              {remaining}
            </span>
            <span className="text-gray-400 text-sm font-medium">/</span>
            <span className="text-gray-400 text-sm font-medium">{limit}</span>
          </div>
          
          {/* Label - clearly says "remaining" */}
          <span className={`text-xs font-medium relative z-10 whitespace-nowrap ${
            isLimitReached ? 'text-red-300' : isLow ? 'text-yellow-300' : 'text-purple-200'
          }`}>
            {language === 'ar' ? 'متبقي' : 'remaining'}
          </span>
        </motion.div>
        
        {/* Upgrade button */}
        {showUpgrade && (
          <Link 
            href="/pricing"
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl hover:from-purple-500 hover:to-pink-500 transition-all group shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 border border-purple-400/30"
          >
            <Crown className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">
              Pro
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
      className={`p-5 rounded-2xl border backdrop-blur-xl ${
        isLimitReached 
          ? 'bg-gradient-to-br from-red-500/10 to-red-900/5 border-red-500/30' 
          : isLow 
            ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-900/5 border-yellow-500/30' 
            : 'bg-gradient-to-br from-purple-500/10 to-purple-900/5 border-purple-500/30'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLimitReached ? (
            <div className="p-1.5 rounded-lg bg-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
          ) : (
            <div className={`p-1.5 rounded-lg ${isLow ? 'bg-yellow-500/20' : 'bg-purple-500/20'}`}>
              <Zap className={`w-5 h-5 ${isLow ? 'text-yellow-400' : 'text-purple-400'}`} />
            </div>
          )}
          <span className={`font-medium ${
            isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'
          }`}>
            {language === 'ar' ? 'التجارب المجانية' : 'Free Trials'}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold tabular-nums ${
            isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-purple-400'
          }`}>
            {remaining}
          </span>
          <span className="text-gray-500 text-lg">/</span>
          <span className="text-gray-500 text-lg font-medium">{limit}</span>
        </div>
      </div>

      {/* Progress bar - shows remaining capacity (full = all remaining, empty = all used) */}
      <div className="w-full h-2.5 bg-gray-800/80 rounded-full overflow-hidden mb-3 border border-gray-700/50">
        <motion.div 
          initial={{ width: '100%' }}
          animate={{ width: `${remainingPercentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full transition-all ${
            isLimitReached 
              ? 'bg-gradient-to-r from-red-500 to-red-400' 
              : isLow 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-400' 
                : 'bg-gradient-to-r from-purple-500 to-violet-400'
          }`}
        />
      </div>

      <p className={`text-sm mb-3 ${
        isLimitReached ? 'text-red-400' : 'text-gray-400'
      }`}>
        {isLimitReached
          ? (language === 'ar' 
              ? 'انتهت التجارب المجانية. ترقية للحصول على استخدام غير محدود.'
              : 'Free trials used up. Upgrade for unlimited analyses.')
          : (language === 'ar'
              ? `${remaining} تجربة مجانية متبقية. يعاد التعيين بعد 24 ساعة من آخر استخدام.`
              : `${remaining} free ${remaining === 1 ? 'trial' : 'trials'} remaining. Resets 24h after last use.`)}
      </p>

      {showUpgrade && (
        <Link 
          href="/pricing"
          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
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
