'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Loader2, Lock, CheckCircle, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const { language, isRTL, isLoaded } = useLanguage()
  const router = useRouter()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check if user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured()) {
        setError('Authentication service not configured')
        setCheckingSession(false)
        return
      }

      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          setIsValidSession(true)
        } else {
          setError(language === 'ar' 
            ? 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.'
            : 'Reset link is invalid or expired. Please request a new one.')
        }
      } catch (err) {
        setError(language === 'ar' 
          ? 'حدث خطأ أثناء التحقق من الجلسة.'
          : 'An error occurred while verifying your session.')
      }
      
      setCheckingSession(false)
    }

    if (isLoaded) {
      checkSession()
    }
  }, [isLoaded, language])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password.length < 6) {
      setError(language === 'ar' 
        ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
        : 'Password must be at least 6 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setError(language === 'ar' 
        ? 'كلمات المرور غير متطابقة'
        : 'Passwords do not match')
      return
    }

    if (!isSupabaseConfigured()) {
      setError('Authentication service not configured')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        // Redirect to home after 3 seconds
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    }

    setLoading(false)
  }

  // Loading state
  if (!isLoaded || checkingSession) {
    return (
      <div className="min-h-screen bg-black cyber-grid relative flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[150px]" />
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="glass-card-dark p-8 border border-purple-900/30 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-gray-400">
              {language === 'ar' ? 'جارِ التحميل...' : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black cyber-grid relative flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="h-12 relative">
            <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-lg group-hover:bg-purple-600/40 transition-all" />
            <Image 
              src="/logo-new.png" 
              alt="Human-Verified Hub Logo" 
              width={48} 
              height={48} 
              className="h-12 w-auto object-contain relative z-10 drop-shadow-[0_0_12px_rgba(168,85,247,0.6)] group-hover:drop-shadow-[0_0_20px_rgba(168,85,247,0.9)] transition-all"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gradient">Human-Verified Hub</h1>
            <p className="text-xs text-gray-400">AI Content Detection System</p>
          </div>
        </Link>

        {/* Reset Password Card */}
        <div className="glass-card-dark p-8 border border-purple-900/30">
          {success ? (
            // Success State
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {language === 'ar' ? 'تم بنجاح!' : 'Password Reset!'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' 
                    ? 'تم تغيير كلمة المرور بنجاح. جاري توجيهك...'
                    : 'Your password has been changed successfully. Redirecting...'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-purple-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  {language === 'ar' ? 'جاري التوجيه للرئيسية...' : 'Redirecting to home...'}
                </span>
              </div>
            </motion.div>
          ) : !isValidSession ? (
            // Invalid Session State
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {language === 'ar' ? 'رابط غير صالح' : 'Invalid Link'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {error}
                </p>
              </div>

              <Link
                href="/auth"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                {language === 'ar' ? 'طلب رابط جديد' : 'Request New Link'}
              </Link>
            </motion.div>
          ) : (
            // Reset Password Form
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                </h2>
                <p className="text-gray-400 text-sm mt-2">
                  {language === 'ar' 
                    ? 'أدخل كلمة المرور الجديدة'
                    : 'Enter your new password'}
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={language === 'ar' ? '6 أحرف على الأقل' : 'At least 6 characters'}
                      className="w-full px-4 py-3 pr-12 bg-black/80 border border-purple-900/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                      required
                      minLength={6}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={language === 'ar' ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'}
                      className="w-full px-4 py-3 pr-12 bg-black/80 border border-purple-900/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                      required
                      minLength={6}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {language === 'ar' ? 'جارِ التحديث...' : 'Updating...'}
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      {language === 'ar' ? 'تحديث كلمة المرور' : 'Update Password'}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-gray-400 hover:text-purple-400 text-sm transition-all flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
