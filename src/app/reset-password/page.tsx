'use client'

import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

function ResetPasswordContent() {
  const { language, isLoaded } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check for valid recovery session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured()) {
        setError(language === 'ar' ? 'خدمة المصادقة غير مكونة' : 'Authentication service not configured')
        setCheckingSession(false)
        return
      }

      try {
        const supabase = createClient()
        
        // First, try to handle the hash fragment for recovery (Supabase sends tokens in URL hash)
        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
          console.log('[RESET] Found hash fragment, attempting to set session')
          
          // Extract tokens from hash and set session
          const params = new URLSearchParams(hash.substring(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          const type = params.get('type')
          
          console.log('[RESET] Token type:', type)
          
          if (accessToken) {
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            })
            
            if (!setSessionError && data.session) {
              console.log('[RESET] Session set successfully')
              // Clear the hash to prevent issues on refresh
              window.history.replaceState(null, '', window.location.pathname)
              setSessionReady(true)
              setCheckingSession(false)
              return
            } else {
              console.error('[RESET] Error setting session:', setSessionError)
            }
          }
        }
        
        // Check URL search params (some email clients might convert hash to query params)
        const urlParams = new URLSearchParams(window.location.search)
        const tokenFromQuery = urlParams.get('access_token')
        const typeFromQuery = urlParams.get('type')
        
        if (tokenFromQuery && (typeFromQuery === 'recovery' || !typeFromQuery)) {
          console.log('[RESET] Found token in query params')
          const refreshFromQuery = urlParams.get('refresh_token')
          
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: tokenFromQuery,
            refresh_token: refreshFromQuery || ''
          })
          
          if (!setSessionError && data.session) {
            console.log('[RESET] Session set from query params')
            // Clear the URL params
            window.history.replaceState(null, '', window.location.pathname)
            setSessionReady(true)
            setCheckingSession(false)
            return
          }
        }
        
        // Check if we have a valid session already (user might have refreshed)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[RESET] Session error:', sessionError)
          setError(language === 'ar' ? 'انتهت صلاحية الرابط أو غير صالح' : 'Link has expired or is invalid')
          setCheckingSession(false)
          return
        }

        if (session) {
          console.log('[RESET] Found existing session')
          setSessionReady(true)
        } else {
          console.log('[RESET] No valid session found')
          setError(language === 'ar' ? 'لم يتم العثور على جلسة صالحة. يرجى طلب رابط إعادة تعيين جديد.' : 'No valid session found. Please request a new reset link.')
        }
      } catch (err) {
        console.error('[RESET] Session check error:', err)
        setError(language === 'ar' ? 'حدث خطأ في التحقق' : 'Verification error occurred')
      }
      
      setCheckingSession(false)
    }

    if (isLoaded) {
      // Small delay to ensure hash is available
      setTimeout(checkSession, 100)
    }
  }, [isLoaded, language])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password || !confirmPassword) {
      setError(language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields')
      return
    }

    if (password.length < 6) {
      setError(language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError(language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth')
        }, 3000)
      }
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'فشل في تحديث كلمة المرور' : 'Failed to update password'))
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
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-12 w-12 bg-purple-900/30 rounded-full animate-pulse" />
            <div>
              <div className="h-6 w-40 bg-purple-900/30 rounded animate-pulse" />
              <div className="h-3 w-32 bg-purple-900/20 rounded mt-1 animate-pulse" />
            </div>
          </div>
          <div className="glass-card-dark p-8 border border-purple-900/30 text-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">
              {language === 'ar' ? 'جاري التحقق من الرابط...' : 'Verifying link...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black cyber-grid relative flex items-center justify-center p-4">
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
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
            <Image 
              src="/logo.png" 
              alt="Human-Verified Hub Logo" 
              width={48} 
              height={48} 
              className="w-12 h-12 object-contain"
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
          <AnimatePresence mode="wait">
            {/* Success State */}
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {language === 'ar' ? 'تم تحديث كلمة المرور!' : 'Password Updated!'}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {language === 'ar' 
                      ? 'تم تغيير كلمة المرور بنجاح. جاري التحويل لتسجيل الدخول...'
                      : 'Your password has been changed successfully. Redirecting to login...'}
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                </div>
              </motion.div>
            ) : !sessionReady ? (
              /* Error State - Invalid/Expired Link */
              <motion.div
                key="error-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
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
                    {error || (language === 'ar' 
                      ? 'انتهت صلاحية الرابط أو تم استخدامه بالفعل.'
                      : 'This link has expired or has already been used.')}
                  </p>
                </div>

                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {language === 'ar' ? 'طلب رابط جديد' : 'Request New Link'}
                </Link>
              </motion.div>
            ) : (
              /* Reset Form */
              <motion.div
                key="reset-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white">
                    {language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                  </h2>
                  <p className="text-gray-400 text-sm mt-2">
                    {language === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter your new password'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New Password Field */}
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

                  {/* Confirm Password Field */}
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

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
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

                {/* Back to Login Link */}
                <Link
                  href="/auth"
                  className="w-full py-2 text-gray-400 hover:text-white text-sm transition-all flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
