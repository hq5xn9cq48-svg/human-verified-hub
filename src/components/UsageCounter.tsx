'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Crown, Zap, AlertCircle, Infinity } from 'lucide-react'
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
          <Zap className="w-4 h-4 text-purple-400" />
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
  const isLow = remaining <= 1 && remaining > 0

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
            isLimitReached 
              ? 'bg-red-500/20 border-red-500/30' 
              : isLow 
                ? 'bg-yellow-500/20 border-yellow-500/30' 
                : 'bg-purple-900/30 border-purple-500/30'
          }`}
        >
          {isLimitReached ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <Zap className={`w-4 h-4 ${isLow ? 'text-yellow-400' : 'text-purple-400'}`} />
          )}
          <span className={`text-sm font-medium ${
            isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-gray-300'
          }`}>
            {language === 'ar' 
              ? `${remaining}/${limit} متبقي`
              : `${remaining}/${limit} left`}
          </span>
        </motion.div>
        
        {showUpgrade && (
          <Link 
            href="/pricing"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-full hover:from-purple-600/30 hover:to-pink-600/30 transition-all group"
          >
            <Crown className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
            <span className="text-sm text-purple-400 group-hover:text-purple-300">
              {language === 'ar' ? 'ترقية' : 'Upgrade'}
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
            <Zap className={`w-5 h-5 ${isLow ? 'text-yellow-400' : 'text-purple-400'}`} />
          )}
          <span className={`font-medium ${
            isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'
          }`}>
            {language === 'ar' ? 'الاستخدام اليومي' : 'Daily Usage'}
          </span>
        </div>
        <span className={`text-2xl font-bold ${
          isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-purple-400'
        }`}>
          {remaining}/{limit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((limit - remaining) / limit) * 100}%` }}
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
