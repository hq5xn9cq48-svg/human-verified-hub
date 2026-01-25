'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { Crown, X, Zap, Infinity, Check, Sparkles, Shield, Clock, FileText } from 'lucide-react'
import Link from 'next/link'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

// Lemon Squeezy checkout URLs from environment
const CHECKOUT_URL_MONTHLY = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL || 
  'https://human-verified-hub.lemonsqueezy.com/checkout/buy/e6bf03be-7d02-4457-bcd2-e4d34260fdc7'
const CHECKOUT_URL_YEARLY = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL_YEARLY || 
  'https://human-verified-hub.lemonsqueezy.com/checkout/buy/yearly-variant'

// Pricing
const PRICE_MONTHLY = 9.99
const PRICE_YEARLY = 69.99
const SAVINGS_PERCENT = Math.round((1 - (PRICE_YEARLY / (PRICE_MONTHLY * 12))) * 100)

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { language } = useLanguage()
  const { user, usageStatus } = useAuth()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly') // Default to yearly for better value

  const features = [
    {
      icon: Infinity,
      title: language === 'ar' ? 'تحليلات غير محدودة' : 'Unlimited Analyses',
      description: language === 'ar' ? 'بدون حدود يومية' : 'No daily limits'
    },
    {
      icon: Zap,
      title: language === 'ar' ? 'معالجة أولوية' : 'Priority Processing',
      description: language === 'ar' ? 'نتائج أسرع' : 'Faster results'
    },
    {
      icon: FileText,
      title: language === 'ar' ? 'تصدير التقارير' : 'Export Reports',
      description: language === 'ar' ? 'تقارير PDF مفصلة' : 'Detailed PDF reports'
    },
    {
      icon: Clock,
      title: language === 'ar' ? 'سجل دائم' : 'Forever History',
      description: language === 'ar' ? 'احفظ تحليلاتك للأبد' : 'Keep analyses forever'
    }
  ]

  const handleUpgrade = () => {
    // Select checkout URL based on billing cycle
    const baseUrl = billingCycle === 'yearly' ? CHECKOUT_URL_YEARLY : CHECKOUT_URL_MONTHLY
    
    // Build checkout URL with user info for prefilling
    let url = baseUrl
    
    if (user) {
      const params = new URLSearchParams()
      if (user.email) params.append('checkout[email]', user.email)
      params.append('checkout[custom][user_id]', user.id)
      
      url = `${baseUrl}?${params.toString()}`
    }
    
    window.open(url, '_blank')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glassmorphism container */}
            <div className="relative bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-[0_0_80px_-15px_rgba(168,85,247,0.4)]">
              {/* Background effects */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-purple-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-pink-600/10 rounded-full blur-[80px]" />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="relative p-6 md:p-8">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="relative inline-flex mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50 animate-pulse" />
                    <div className="relative w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center border border-purple-400/30">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {language === 'ar' ? 'الترقية إلى Pro' : 'Upgrade to Pro'}
                  </h2>
                  
                  {/* Usage limit message */}
                  {usageStatus && !usageStatus.isPro && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full">
                      <Shield className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm">
                        {language === 'ar' 
                          ? `وصلت للحد اليومي (${usageStatus.usedToday}/${usageStatus.limit})`
                          : `Daily limit reached (${usageStatus.usedToday}/${usageStatus.limit})`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 bg-white/5 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                    >
                      <feature.icon className="w-6 h-6 text-purple-400 mb-2" />
                      <h4 className="text-white font-semibold text-sm mb-1">{feature.title}</h4>
                      <p className="text-gray-400 text-xs">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Billing Cycle Toggle */}
                <div className="flex items-center justify-center mb-4">
                  <div className="inline-flex p-1 bg-black/50 rounded-lg border border-purple-500/20">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        billingCycle === 'monthly'
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {language === 'ar' ? 'شهري' : 'Monthly'}
                    </button>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all relative ${
                        billingCycle === 'yearly'
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {language === 'ar' ? 'سنوي' : 'Yearly'}
                      <span className="absolute -top-2 -right-2 text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                        -{SAVINGS_PERCENT}%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Pricing */}
                <div className="text-center mb-6 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {billingCycle === 'yearly' && (
                      <span className="text-gray-400 line-through text-lg">${(PRICE_MONTHLY * 12).toFixed(0)}</span>
                    )}
                    <span className="text-4xl font-bold text-white">
                      ${billingCycle === 'yearly' ? PRICE_YEARLY : PRICE_MONTHLY}
                    </span>
                    <span className="text-gray-400">
                      /{billingCycle === 'yearly' ? (language === 'ar' ? 'سنة' : 'year') : (language === 'ar' ? 'شهر' : 'month')}
                    </span>
                  </div>
                  <p className="text-purple-400 text-sm flex items-center justify-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    {billingCycle === 'yearly' 
                      ? (language === 'ar' ? `وفر ${SAVINGS_PERCENT}% - أفضل قيمة!` : `Save ${SAVINGS_PERCENT}% - Best value!`)
                      : (language === 'ar' ? 'مرونة شهرية' : 'Monthly flexibility')}
                  </p>
                </div>

                {/* Guarantee */}
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-6">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>{language === 'ar' ? 'ضمان استرداد الأموال لمدة 14 يومًا' : '14-day money-back guarantee'}</span>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleUpgrade}
                    className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center justify-center gap-2"
                  >
                    <Crown className="w-5 h-5" />
                    {language === 'ar' ? 'الترقية الآن' : 'Upgrade Now'}
                  </button>
                  
                  <Link
                    href="/pricing"
                    onClick={onClose}
                    className="w-full py-3 px-6 text-center border border-purple-500/30 text-purple-400 hover:text-white hover:border-purple-500/50 font-medium rounded-xl transition-all"
                  >
                    {language === 'ar' ? 'عرض جميع الخطط' : 'View All Plans'}
                  </Link>
                </div>

                {/* Not logged in notice */}
                {!user && (
                  <p className="text-center text-gray-500 text-xs mt-4">
                    {language === 'ar' 
                      ? 'ستحتاج لتسجيل الدخول لإكمال الترقية'
                      : 'You\'ll need to sign in to complete upgrade'}
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
