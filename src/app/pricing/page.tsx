'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { 
  Crown, Check, X, Zap, Shield, Clock, FileText, 
  Image, Wand2, History, Download, ArrowRight, Sparkles,
  Infinity
} from 'lucide-react'

// Lemon Squeezy checkout URLs from environment variables
// No fallback - if not configured, the upgrade button will be disabled
const LEMONSQUEEZY_CHECKOUT_URL_MONTHLY = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL || ''
const LEMONSQUEEZY_CHECKOUT_URL_YEARLY = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL_YEARLY || ''

interface PlanFeature {
  name: { en: string; ar: string }
  free: boolean | string
  pro: boolean | string
  icon: React.ReactNode
}

const features: PlanFeature[] = [
  {
    name: { en: 'AI Text Detection', ar: 'كشف النصوص بالذكاء الاصطناعي' },
    free: true,
    pro: true,
    icon: <FileText className="w-4 h-4" />
  },
  {
    name: { en: 'AI Image Detection', ar: 'كشف الصور بالذكاء الاصطناعي' },
    free: false,
    pro: true,
    icon: <Image className="w-4 h-4" />
  },
  {
    name: { en: 'Image to Prompt', ar: 'تحويل الصورة إلى نص' },
    free: false,
    pro: true,
    icon: <Wand2 className="w-4 h-4" />
  },
  {
    name: { en: 'Daily Text Analyses', ar: 'التحليلات النصية اليومية' },
    free: '2 / day',
    pro: 'Unlimited',
    icon: <Zap className="w-4 h-4" />
  },
  {
    name: { en: 'Analysis History', ar: 'سجل التحليلات' },
    free: '7 days',
    pro: 'Forever',
    icon: <History className="w-4 h-4" />
  },
  {
    name: { en: 'Priority Processing', ar: 'معالجة بالأولوية' },
    free: false,
    pro: true,
    icon: <Clock className="w-4 h-4" />
  },
  {
    name: { en: 'Export Reports (PDF)', ar: 'تصدير التقارير (PDF)' },
    free: false,
    pro: true,
    icon: <Download className="w-4 h-4" />
  },
  {
    name: { en: 'API Access', ar: 'الوصول للواجهة البرمجية' },
    free: false,
    pro: 'Coming Soon',
    icon: <Shield className="w-4 h-4" />
  },
]

export default function PricingPage() {
  const { language, isRTL, isLoaded } = useLanguage()
  const { user, usageStatus } = useAuth()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  // Prevent hydration mismatch
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <Sparkles className="w-8 h-8 text-purple-500" />
        </div>
      </div>
    )
  }

  const isPro = usageStatus?.isPro ?? false

  // Pricing details
  const monthlyPrice = 9.99
  const yearlyPrice = 69.99
  const yearlySavings = Math.round(((monthlyPrice * 12) - yearlyPrice) / (monthlyPrice * 12) * 100)
  const yearlyPerMonth = (yearlyPrice / 12).toFixed(2)

  // Handle checkout
  const handleUpgrade = () => {
    if (!user) {
      // Redirect to auth first
      window.location.href = '/auth?redirect=/pricing'
      return
    }
    
    // Select the correct checkout URL based on billing cycle
    const checkoutBaseUrl = billingCycle === 'yearly' 
      ? LEMONSQUEEZY_CHECKOUT_URL_YEARLY 
      : LEMONSQUEEZY_CHECKOUT_URL_MONTHLY
    
    // Check if checkout URL is configured
    if (!checkoutBaseUrl) {
      console.error('Checkout URL not configured')
      return
    }
    
    // Redirect to Lemon Squeezy checkout with user info
    const checkoutUrl = new URL(checkoutBaseUrl)
    if (user.email) {
      checkoutUrl.searchParams.set('checkout[email]', user.email)
    }
    checkoutUrl.searchParams.set('checkout[custom][user_id]', user.id)
    checkoutUrl.searchParams.set('checkout[custom][billing_cycle]', billingCycle)
    
    window.location.href = checkoutUrl.toString()
  }

  return (
    <div className="min-h-screen bg-black cyber-grid relative" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[150px]" />
      </div>

      <Navbar />

      <main className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/30 border border-purple-500/30 mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">
                {language === 'ar' ? 'اختر خطتك' : 'Choose Your Plan'}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {language === 'ar' ? 'أسعار بسيطة وشفافة' : 'Simple, Transparent Pricing'}
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'ابدأ مجانًا، ثم قم بالترقية عندما تحتاج المزيد'
                : 'Start free, upgrade when you need more power'}
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <div className="relative flex items-center p-1 bg-gray-900 rounded-xl border border-purple-900/30">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? 'شهري' : 'Monthly'}
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`relative px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? 'سنوي' : 'Yearly'}
                <span className="absolute -top-2 -right-2 text-[10px] bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full font-bold shadow-lg">
                  -{yearlySavings}%
                </span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card-dark p-8 border border-purple-900/30 rounded-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gray-800 rounded-xl">
                  <Zap className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {language === 'ar' ? 'مجاني' : 'Free'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {language === 'ar' ? 'للبدء' : 'Get started'}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">$0</span>
                  <span className="text-gray-400">
                    /{language === 'ar' ? 'شهر' : 'month'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {language === 'ar' ? 'مجاني للأبد' : 'Free forever'}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    {feature.free ? (
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    )}
                    <span className={feature.free ? 'text-gray-300' : 'text-gray-500'}>
                      {language === 'ar' ? feature.name.ar : feature.name.en}
                      {typeof feature.free === 'string' && feature.free !== 'true' && (
                        <span className="ml-2 text-xs text-purple-400">({feature.free})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {!user ? (
                <Link
                  href="/auth"
                  className="block w-full py-3 px-6 bg-gray-800 text-white font-medium rounded-xl text-center hover:bg-gray-700 transition-all"
                >
                  {language === 'ar' ? 'ابدأ مجانًا' : 'Get Started Free'}
                </Link>
              ) : !isPro ? (
                <div className="py-3 px-6 bg-gray-800/50 text-gray-400 font-medium rounded-xl text-center">
                  {language === 'ar' ? 'خطتك الحالية' : 'Current Plan'}
                </div>
              ) : (
                <div className="py-3 px-6 bg-gray-800/50 text-gray-400 font-medium rounded-xl text-center">
                  {language === 'ar' ? 'أنت على البرو' : "You're on Pro"}
                </div>
              )}
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative glass-card-dark p-8 border-2 border-purple-500/50 rounded-2xl"
            >
              {/* Popular badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white text-sm font-medium">
                  <Crown className="w-4 h-4" />
                  {language === 'ar' ? 'الأكثر شعبية' : 'Most Popular'}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="p-3 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/30">
                  <Crown className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {language === 'ar' ? 'برو' : 'Pro'}
                  </h3>
                  <p className="text-sm text-purple-400">
                    {language === 'ar' ? 'للمحترفين' : 'For professionals'}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                {billingCycle === 'monthly' ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white">${monthlyPrice}</span>
                      <span className="text-gray-400">/{language === 'ar' ? 'شهر' : 'month'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {language === 'ar' ? 'يُدفع شهريًا' : 'Billed monthly'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white">${yearlyPerMonth}</span>
                      <span className="text-gray-400">/{language === 'ar' ? 'شهر' : 'month'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-green-400">
                        {language === 'ar' ? `يُدفع $${yearlyPrice} سنويًا` : `Billed $${yearlyPrice} yearly`}
                      </p>
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        {language === 'ar' ? `وفر ${yearlySavings}%` : `Save ${yearlySavings}%`}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300">
                      {language === 'ar' ? feature.name.ar : feature.name.en}
                      {typeof feature.pro === 'string' && feature.pro !== 'true' && (
                        <span className="ml-2 text-xs text-purple-400 inline-flex items-center gap-1">
                          ({feature.pro === 'Unlimited' ? (
                            <><Infinity className="w-3 h-3" /> {feature.pro}</>
                          ) : feature.pro})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {isPro ? (
                <div className="py-3 px-6 bg-purple-600/20 text-purple-400 font-medium rounded-xl text-center border border-purple-500/30">
                  <Crown className="w-4 h-4 inline mr-2" />
                  {language === 'ar' ? 'أنت مشترك بالفعل' : 'You have Pro'}
                </div>
              ) : !LEMONSQUEEZY_CHECKOUT_URL_MONTHLY && !LEMONSQUEEZY_CHECKOUT_URL_YEARLY ? (
                <div className="py-3 px-6 bg-red-600/20 text-red-400 font-medium rounded-xl text-center border border-red-500/30 text-sm">
                  {language === 'ar' ? 'التسعير غير متاح حالياً' : 'Checkout not configured'}
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-purple-500/25"
                >
                  {billingCycle === 'yearly' ? (
                    language === 'ar' ? `ترقية للبرو - $${yearlyPrice}/سنة` : `Upgrade to Pro - $${yearlyPrice}/year`
                  ) : (
                    language === 'ar' ? `ترقية للبرو - $${monthlyPrice}/شهر` : `Upgrade to Pro - $${monthlyPrice}/mo`
                  )}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </motion.div>
          </div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-20 text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-8">
              {language === 'ar' ? 'أسئلة شائعة' : 'Frequently Asked Questions'}
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
              <div className="glass-card-dark p-6 rounded-xl border border-purple-900/30">
                <h3 className="font-semibold text-white mb-2">
                  {language === 'ar' ? 'متى يُعاد تعيين الحد اليومي؟' : 'When does the daily limit reset?'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' 
                    ? 'يُعاد تعيين الحد اليومي بعد 24 ساعة من آخر استخدام.'
                    : 'The daily limit resets 24 hours after your last use (rolling window).'}
                </p>
              </div>
              
              <div className="glass-card-dark p-6 rounded-xl border border-purple-900/30">
                <h3 className="font-semibold text-white mb-2">
                  {language === 'ar' ? 'هل يمكنني إلغاء الاشتراك؟' : 'Can I cancel anytime?'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' 
                    ? 'نعم! يمكنك إلغاء اشتراكك في أي وقت من حسابك.'
                    : 'Yes! You can cancel your subscription anytime from your account.'}
                </p>
              </div>
              
              <div className="glass-card-dark p-6 rounded-xl border border-purple-900/30">
                <h3 className="font-semibold text-white mb-2">
                  {language === 'ar' ? 'ما طرق الدفع المقبولة؟' : 'What payment methods are accepted?'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' 
                    ? 'نقبل جميع بطاقات الائتمان الرئيسية وPayPal عبر Lemon Squeezy.'
                    : 'We accept all major credit cards and PayPal via Lemon Squeezy.'}
                </p>
              </div>
              
              <div className="glass-card-dark p-6 rounded-xl border border-purple-900/30">
                <h3 className="font-semibold text-white mb-2">
                  {language === 'ar' ? 'هل هناك ضمان استرداد الأموال؟' : 'Is there a refund policy?'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' 
                    ? 'نقدم ضمان استرداد كامل للأموال خلال 14 يومًا.'
                    : 'We offer a full 14-day money-back guarantee.'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
