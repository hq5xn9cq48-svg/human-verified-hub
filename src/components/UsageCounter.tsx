'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Crown, Zap, AlertCircle, Infinity, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface UsageCounterProps {
  variant?: 'compact' | 'full' | 'badge'
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

  // Pro users see premium unlimited badge
  if (usageStatus.isPro) {
    return (
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${className}`}
      >
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/40 via-orange-500/40 to-amber-500/40 rounded-full blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-950/80 to-orange-950/80 backdrop-blur-xl border border-yellow-500/40 rounded-full">
            <Crown className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="text-sm font-semibold bg-gradient-to-r from-yellow-300 to-amber-300 bg-clip-text text-transparent">
              {language === 'ar' ? 'برو' : 'Pro'}
            </span>
            <div className="h-4 w-px bg-yellow-500/30" />
            <Infinity className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-yellow-400/80">
              {language === 'ar' ? 'غير محدود' : 'Unlimited'}
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  // Guest users see sign-in prompt with premium styling
  if (usageStatus.isGuest || !user) {
    return (
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${className}`}
      >
        <Link 
          href="/auth"
          className="relative group block"
        >
          {/* Subtle glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-950/60 to-pink-950/60 backdrop-blur-xl border border-purple-500/30 rounded-full hover:border-purple-400/50 transition-all">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              {language === 'ar' ? 'سجل للحصول على 2 تحليل يومي' : 'Sign in for 2 free daily uses'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </motion.div>
    )
  }

  // Free users see their remaining uses
  const remaining = usageStatus.remaining
  const limit = usageStatus.limit
  const usedCount = usageStatus.usedToday
  const isLimitReached = remaining <= 0
  const isLow = remaining === 1

  // Badge variant - ultra compact for navbar
  if (variant === 'badge') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${className}`}
      >
        <div className={`relative group ${isLimitReached ? 'cursor-pointer' : ''}`}>
          {/* Glow effect based on status */}
          <div className={`absolute -inset-0.5 rounded-full blur-sm opacity-60 group-hover:opacity-100 transition-opacity ${
            isLimitReached 
              ? 'bg-gradient-to-r from-red-500/40 to-orange-500/40' 
              : isLow 
                ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30' 
                : 'bg-gradient-to-r from-purple-500/30 to-cyan-500/30'
          }`} />
          <div className={`relative flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl rounded-full border ${
            isLimitReached 
              ? 'bg-gradient-to-r from-red-950/80 to-orange-950/80 border-red-500/40' 
              : isLow 
                ? 'bg-gradient-to-r from-yellow-950/60 to-orange-950/60 border-yellow-500/30' 
                : 'bg-gradient-to-r from-purple-950/60 to-cyan-950/60 border-purple-500/30'
          }`}>
            {isLimitReached ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Zap className={`w-3.5 h-3.5 ${isLow ? 'text-yellow-400' : 'text-purple-400'}`} />
            )}
            <span className={`text-xs font-bold tabular-nums ${
              isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-purple-300'
            }`}>
              {remaining}/{limit}
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  // Compact variant - glassmorphism style
  if (variant === 'compact') {
    return (
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex items-center gap-2 ${className}`}
      >
        {/* Usage Badge with Glassmorphism */}
        <div className="relative group">
          {/* Glow effect based on status */}
          <div className={`absolute -inset-0.5 rounded-full blur-sm opacity-50 group-hover:opacity-80 transition-opacity ${
            isLimitReached 
              ? 'bg-gradient-to-r from-red-500/50 to-orange-500/50' 
              : isLow 
                ? 'bg-gradient-to-r from-yellow-500/40 to-orange-500/40' 
                : 'bg-gradient-to-r from-purple-500/40 to-cyan-500/40'
          }`} />
          <div className={`relative flex items-center gap-2 px-4 py-2 backdrop-blur-xl rounded-full border transition-all ${
            isLimitReached 
              ? 'bg-gradient-to-r from-red-950/70 to-orange-950/70 border-red-500/40 hover:border-red-400/60' 
              : isLow 
                ? 'bg-gradient-to-r from-yellow-950/50 to-orange-950/50 border-yellow-500/30 hover:border-yellow-400/50' 
                : 'bg-gradient-to-r from-purple-950/50 to-cyan-950/50 border-purple-500/30 hover:border-purple-400/50'
          }`}>
            {isLimitReached ? (
              <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
            ) : (
              <Zap className={`w-4 h-4 ${isLow ? 'text-yellow-400' : 'text-purple-400'}`} />
            )}
            <span className={`text-sm font-bold tabular-nums ${
              isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'
            }`}>
              {remaining}/{limit}
            </span>
            <span className={`text-xs ${
              isLimitReached ? 'text-red-400/70' : isLow ? 'text-yellow-400/70' : 'text-gray-400'
            }`}>
              {language === 'ar' ? 'يومي' : 'Daily'}
            </span>
          </div>
        </div>
        
        {/* Upgrade Button with Premium Styling */}
        {showUpgrade && (
          <Link 
            href="/pricing"
            className="relative group"
          >
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/40 via-pink-500/40 to-purple-500/40 rounded-full blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-xl border border-purple-400/30 rounded-full hover:border-purple-300/50 transition-all group-hover:shadow-lg group-hover:shadow-purple-500/25">
              <Crown className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-white">
                {language === 'ar' ? 'ترقية للبرو' : 'Upgrade'}
              </span>
            </div>
          </Link>
        )}
      </motion.div>
    )
  }

  // Full variant - detailed card with glassmorphism
  return (
    <motion.div 
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`relative ${className}`}
    >
      {/* Card glow effect */}
      <div className={`absolute -inset-1 rounded-2xl blur-lg opacity-40 ${
        isLimitReached 
          ? 'bg-gradient-to-r from-red-500/30 to-orange-500/30' 
          : isLow 
            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' 
            : 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20'
      }`} />
      
      <div className={`relative p-5 rounded-2xl backdrop-blur-xl border transition-all ${
        isLimitReached 
          ? 'bg-gradient-to-br from-red-950/60 to-orange-950/60 border-red-500/30' 
          : isLow 
            ? 'bg-gradient-to-br from-yellow-950/40 to-orange-950/40 border-yellow-500/20' 
            : 'bg-gradient-to-br from-purple-950/40 to-cyan-950/40 border-purple-500/20'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {isLimitReached ? (
              <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
            ) : (
              <div className={`p-2 rounded-xl ${isLow ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-purple-500/20 border border-purple-500/30'}`}>
                <Zap className={`w-5 h-5 ${isLow ? 'text-yellow-400' : 'text-purple-400'}`} />
              </div>
            )}
            <div>
              <span className={`font-semibold ${
                isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'
              }`}>
                {language === 'ar' ? 'الاستخدام اليومي' : 'Daily Usage'}
              </span>
              <p className="text-xs text-gray-500">
                {language === 'ar' ? 'يتجدد عند منتصف الليل UTC' : 'Resets at midnight UTC'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-bold tabular-nums ${
              isLimitReached ? 'text-red-400' : isLow ? 'text-yellow-400' : 'bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent'
            }`}>
              {remaining}
            </span>
            <span className="text-lg text-gray-500">/{limit}</span>
          </div>
        </div>

        {/* Progress bar with animated segments */}
        <div className="flex gap-1.5 mb-4">
          {Array.from({ length: limit }).map((_, i) => (
            <motion.div 
              key={i}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className={`flex-1 h-2.5 rounded-full ${
                i < usedCount
                  ? isLimitReached 
                    ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                    : isLow 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                      : 'bg-gradient-to-r from-purple-500 to-cyan-500'
                  : 'bg-gray-800/60'
              }`}
            />
          ))}
        </div>

        {/* Status message */}
        <p className={`text-sm mb-4 ${
          isLimitReached ? 'text-red-400' : 'text-gray-400'
        }`}>
          {isLimitReached
            ? (language === 'ar' 
                ? "لقد استخدمت تحليلاتك اليومية المجانية. قم بالترقية للحصول على وصول غير محدود."
                : "You've used your 2 free daily analyses. Upgrade to Pro for unlimited access.")
            : (language === 'ar'
                ? `${remaining} تحليل متبقي اليوم`
                : `${remaining} ${remaining === 1 ? 'analysis' : 'analyses'} remaining today`)}
        </p>

        {/* Upgrade CTA */}
        {showUpgrade && (
          <Link 
            href="/pricing"
            className="relative group block"
          >
            {/* Button glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all">
              <Crown className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>
                {language === 'ar' ? 'ترقية للبرو - تحليلات غير محدودة' : 'Upgrade to Pro - Unlimited Analyses'}
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}
      </div>
    </motion.div>
  )
}
