'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { Crown, X, Zap, Infinity, Check, Sparkles, Shield, Clock, FileText, Image as ImageIcon, Wand2 } from 'lucide-react'
import Link from 'next/link'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

// Lemon Squeezy checkout URLs from environment
// IMPORTANT: Set these in Vercel Environment Variables:
// - NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL (monthly)
// - NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL_YEARLY (yearly)
const CHECKOUT_URL_MONTHLY = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL || ''
const CHECKOUT_URL_YEARLY = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL_YEARLY || ''

// Pricing
const PRICE_MONTHLY = 9.99
const PRICE_YEARLY = 69.99
const SAVINGS_PERCENT = Math.round((1 - (PRICE_YEARLY / (PRICE_MONTHLY * 12))) * 100)

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { language } = useLanguage()
  const { user, usageStatus } = useAuth()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')

  const features = [
    {
      icon: Infinity,
      title: language === 'ar' ? 'تحليلات غير محدودة' : 'Unlimited Analyses',
      description: language === 'ar' ? 'بدون حدود يومية' : 'No daily limits'
    },
    {
      icon: ImageIcon,
      title: language === 'ar' ? 'تحليل الصور' : 'Image Analysis',
      description: language === 'ar' ? 'كشف AI في الصور' : 'AI detection in images'
    },
    {
      icon: Wand2,
      title: language === 'ar' ? 'محول النص' : 'Humanizer',
      description: language === 'ar' ? 'تحويل النص للبشري' : 'Transform AI text'
    },
    {
      icon: FileText,
      title: language === 'ar' ? 'تقارير PDF' : 'PDF Reports',
      description: language === 'ar' ? 'تقارير وشهادات' : 'Reports & certificates'
    },
    {
      icon: Clock,
      title: language === 'ar' ? 'سجل دائم' : 'Forever History',
      description: language === 'ar' ? 'حفظ التحليلات' : 'Keep all analyses'
    },
    {
      icon: Zap,
      title: language === 'ar' ? 'معالجة سريعة' : 'Priority Speed',
      description: language === 'ar' ? 'نتائج أسرع' : 'Faster results'
    }
  ]

  const handleUpgrade = () => {
    const baseUrl = billingCycle === 'yearly' ? CHECKOUT_URL_YEARLY : CHECKOUT_URL_MONTHLY
    
    // Debug logging
    console.log('[UpgradeModal] Checkout attempt:', {
      billingCycle,
      baseUrl: baseUrl || 'NOT SET',
      monthlyUrl: CHECKOUT_URL_MONTHLY || 'NOT SET',
      yearlyUrl: CHECKOUT_URL_YEARLY || 'NOT SET'
    })
    
    // Check if URL is configured
    if (!baseUrl) {
      alert(language === 'ar' 
        ? 'عذراً، رابط الدفع غير متوفر حالياً.' 
        : 'Checkout not available. Please try again later.')
      return
    }
    
    try {
      let url = baseUrl
      
      if (user) {
        const params = new URLSearchParams()
        if (user.email) params.append('checkout[email]', user.email)
        params.append('checkout[custom][user_id]', user.id)
        url = `${baseUrl}?${params.toString()}`
      }
      
      console.log('[UpgradeModal] Opening checkout:', url)
      window.open(url, '_blank')
      onClose()
    } catch (error) {
      console.error('[UpgradeModal] Checkout error:', error)
      alert(language === 'ar' ? 'خطأ في الدفع' : 'Checkout error')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[95vw] sm:max-w-md md:max-w-lg rounded-2xl overflow-hidden my-2 sm:my-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glassmorphism container */}
            <div className="relative bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-[0_0_60px_-15px_rgba(168,85,247,0.4)]">
              {/* Background effects */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-purple-600/20 rounded-full blur-[80px] sm:blur-[100px]" />
                <div className="absolute bottom-0 right-0 w-[150px] sm:w-[200px] h-[150px] sm:h-[200px] bg-pink-600/10 rounded-full blur-[60px] sm:blur-[80px]" />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="relative p-3 sm:p-6 md:p-8 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="text-center mb-4 sm:mb-6">
                  <div className="relative inline-flex mb-3 sm:mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50 animate-pulse" />
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center border border-purple-400/30">
                      <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                  </div>
                  
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
                    {language === 'ar' ? 'الترقية إلى Pro' : 'Upgrade to Pro'}
                  </h2>
                  
                  {/* Usage limit message */}
                  {usageStatus && !usageStatus.isPro && (
                    <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/10 border border-red-500/30 rounded-full">
                      <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                      <span className="text-red-400 text-xs sm:text-sm">
                        {language === 'ar' 
                          ? `الحد اليومي (${usageStatus.usedToday}/${usageStatus.limit})`
                          : `Limit: ${usageStatus.usedToday}/${usageStatus.limit}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Features grid - responsive, 2 cols on mobile, 3 on tablet+ */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-3 mb-3 sm:mb-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * index }}
                      className="p-2 sm:p-3 bg-white/5 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                    >
                      <feature.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-purple-400 mb-1 sm:mb-2" />
                      <h4 className="text-white font-semibold text-[10px] sm:text-sm leading-tight line-clamp-1">{feature.title}</h4>
                      <p className="text-gray-400 text-[9px] sm:text-xs mt-0.5 hidden sm:block">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Billing Cycle Toggle */}
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  <div className="inline-flex p-1 bg-black/50 rounded-lg border border-purple-500/20">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                        billingCycle === 'monthly'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {language === 'ar' ? 'شهري' : 'Monthly'}
                    </button>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all relative ${
                        billingCycle === 'yearly'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {language === 'ar' ? 'سنوي' : 'Yearly'}
                      <span className="absolute -top-2 -right-2 text-[8px] sm:text-[9px] bg-green-500 text-white px-1 sm:px-1.5 py-0.5 rounded-full font-bold">
                        -{SAVINGS_PERCENT}%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Pricing */}
                <div className="text-center mb-3 sm:mb-6 p-2.5 sm:p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    {billingCycle === 'yearly' && (
                      <span className="text-gray-400 line-through text-xs sm:text-lg">${(PRICE_MONTHLY * 12).toFixed(0)}</span>
                    )}
                    <span className="text-2xl sm:text-4xl font-bold text-white">
                      ${billingCycle === 'yearly' ? PRICE_YEARLY : PRICE_MONTHLY}
                    </span>
                    <span className="text-gray-400 text-xs sm:text-sm">
                      /{billingCycle === 'yearly' ? (language === 'ar' ? 'سنة' : 'yr') : (language === 'ar' ? 'شهر' : 'mo')}
                    </span>
                  </div>
                  <p className="text-purple-400 text-[10px] sm:text-sm flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                    {billingCycle === 'yearly' 
                      ? (language === 'ar' ? `وفر ${SAVINGS_PERCENT}%` : `Save ${SAVINGS_PERCENT}%`)
                      : (language === 'ar' ? 'مرونة شهرية' : 'Flexible')}
                  </p>
                </div>

                {/* Guarantee */}
                <div className="flex items-center justify-center gap-1 sm:gap-2 text-gray-400 text-[10px] sm:text-sm mb-3 sm:mb-6">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                  <span>{language === 'ar' ? 'ضمان استرداد 14 يوم' : '14-day money-back'}</span>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-2 sm:gap-3">
                  <button
                    onClick={handleUpgrade}
                    className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                    {language === 'ar' ? 'الترقية الآن' : 'Upgrade Now'}
                  </button>
                  
                  <Link
                    href="/pricing"
                    onClick={onClose}
                    className="w-full py-2.5 sm:py-3 px-4 sm:px-6 text-center border border-purple-500/30 text-purple-400 hover:text-white hover:border-purple-500/50 font-medium rounded-xl transition-all text-sm"
                  >
                    {language === 'ar' ? 'عرض الخطط' : 'View Plans'}
                  </Link>
                </div>

                {/* Not logged in notice */}
                {!user && (
                  <p className="text-center text-gray-500 text-xs mt-3 sm:mt-4">
                    {language === 'ar' 
                      ? 'سجل الدخول للترقية'
                      : 'Sign in to upgrade'}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
