'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, X, Shield } from 'lucide-react'
import Link from 'next/link'

interface AuthGuardProps {
  children: React.ReactNode
  featureName?: string
}

export default function AuthGuard({ children, featureName = 'this feature' }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const { language } = useLanguage()
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Show modal when not authenticated and not loading
    if (!authLoading && !user) {
      setShowModal(true)
    }
  }, [user, authLoading])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-900/20 flex items-center justify-center animate-pulse">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  // If authenticated, render children
  if (user) {
    return <>{children}</>
  }

  // Show auth required modal
  return (
    <>
      <AnimatePresence>
        {showModal && (
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
              className="relative max-w-md w-full rounded-2xl bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl p-8 text-center border border-purple-500/30 shadow-[0_0_60px_-15px_rgba(168,85,247,0.3)]"
            >
              {/* Close button - redirects to home */}
              <button
                onClick={() => router.push('/')}
                className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <LogIn className="w-8 h-8 text-purple-400" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2">
                {language === 'ar' ? 'تسجيل الدخول مطلوب' : 'Sign In Required'}
              </h2>

              {/* Description */}
              <p className="text-gray-400 text-sm mb-6">
                {language === 'ar' 
                  ? `يجب تسجيل الدخول للوصول إلى ${featureName}. انضم مجاناً واحصل على تحليلين يومياً.`
                  : `Sign in to access ${featureName}. Join for free and get 2 analyses per day.`}
              </p>

              {/* CTA Buttons */}
              <div className="space-y-3">
                <Link
                  href="/auth"
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25"
                >
                  <LogIn className="w-5 h-5" />
                  {language === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Sign Up'}
                </Link>
                
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3 px-6 border border-gray-700 text-gray-400 font-medium rounded-xl hover:text-white hover:border-gray-600 hover:bg-white/5 transition-all"
                >
                  {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
                </button>
              </div>

              {/* Feature info */}
              <p className="text-gray-600 text-xs mt-4">
                {language === 'ar' 
                  ? 'تسجيل سريع عبر Google أو البريد الإلكتروني'
                  : 'Quick sign up via Google or Email'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
