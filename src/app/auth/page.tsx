'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft, CheckCircle, Lock, User, Eye, EyeOff } from 'lucide-react'

type AuthMode = 'login' | 'signup' | 'magic-link' | 'sent' | 'email-confirm'

export default function AuthPage() {
  const { t, isRTL, language, isLoaded } = useLanguage()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prevent hydration mismatch by showing loading state until client-side
  if (!isLoaded) {
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
          <div className="glass-card-dark p-8 border border-purple-900/30">
            <div className="space-y-6">
              <div className="text-center">
                <div className="h-7 w-32 mx-auto bg-purple-900/30 rounded animate-pulse" />
                <div className="h-4 w-48 mx-auto bg-purple-900/20 rounded mt-2 animate-pulse" />
              </div>
              <div className="h-12 w-full bg-purple-900/20 rounded-xl animate-pulse" />
              <div className="h-12 w-full bg-purple-900/20 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleGoogleSignIn = async () => {
    if (typeof window === 'undefined') return;
    
    if (!isSupabaseConfigured()) {
      setError('Authentication service not configured')
      return
    }
    
    setGoogleLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    if (typeof window === 'undefined') return;

    if (!isSupabaseConfigured()) {
      setError('Authentication service not configured')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) {
        setError(error.message)
      } else {
        setAuthMode('sent')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link')
    }
    
    setLoading(false)
  }

  const resetAuth = () => {
    setAuthMode('login')
    setError(null)
    setEmail('')
    setPassword('')
    setFullName('')
  }

  // Handle email/password login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    
    if (!isSupabaseConfigured()) {
      setError('Authentication service not configured')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      
      if (error) {
        setError(error.message)
      } else {
        // Redirect to home on success
        window.location.href = '/'
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    }
    
    setLoading(false)
  }

  // Handle email/password signup
  const handlePasswordSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    
    if (password.length < 6) {
      setError(language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters')
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
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
          },
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      })
      
      if (error) {
        setError(error.message)
      } else {
        setAuthMode('email-confirm')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    }
    
    setLoading(false)
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

        {/* Auth Card */}
        <div className="glass-card-dark p-8 border border-purple-900/30">
          <AnimatePresence mode="wait">
            {/* Login Mode */}
            {authMode === 'login' && (
              <motion.div
                key="login-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white">{t.auth.signInTitle}</h2>
                  <p className="text-gray-400 text-sm mt-2">
                    {language === 'ar' ? 'سجل الدخول للوصول إلى جميع الأدوات' : 'Sign in to access all tools'}
                  </p>
                </div>

                {/* Google Sign In Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full py-3.5 px-6 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {googleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  {language === 'ar' ? 'المتابعة مع Google' : 'Continue with Google'}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-purple-900/50"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-black text-gray-500">
                      {language === 'ar' ? 'أو' : 'or'}
                    </span>
                  </div>
                </div>

                {/* Email/Password Login Form */}
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      {t.auth.email}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'}
                      className="w-full px-4 py-3 bg-black/80 border border-purple-900/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Lock className="w-4 h-4 inline mr-2" />
                      {language === 'ar' ? 'كلمة المرور' : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password'}
                        className="w-full px-4 py-3 pr-12 bg-black/80 border border-purple-900/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                        required
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

                  <button
                    type="submit"
                    disabled={loading || !email.trim() || !password}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {language === 'ar' ? 'جارِ تسجيل الدخول...' : 'Signing in...'}
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                      </>
                    )}
                  </button>
                </form>

                {/* Magic Link Option */}
                <button
                  type="button"
                  onClick={() => { setAuthMode('magic-link'); setError(null); }}
                  className="w-full py-2 text-purple-400 hover:text-purple-300 text-sm transition-all flex items-center justify-center gap-1"
                >
                  <Mail className="w-4 h-4" />
                  {language === 'ar' ? 'تسجيل الدخول برابط سحري' : 'Sign in with Magic Link instead'}
                </button>

                {/* Sign Up Link */}
                <div className="text-center text-gray-400 text-sm">
                  {language === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?"}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setError(null); }}
                    className="text-purple-400 hover:text-purple-300 ml-2 font-medium"
                  >
                    {language === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Signup Mode */}
            {authMode === 'signup' && (
              <motion.div
                key="signup-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white">
                    {language === 'ar' ? 'إنشاء حساب' : 'Create Account'}
                  </h2>
                  <p className="text-gray-400 text-sm mt-2">
                    {language === 'ar' ? 'انضم للحصول على تحليلات مجانية' : 'Join to get free daily analyses'}
                  </p>
                </div>

                {/* Google Sign Up Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full py-3.5 px-6 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {googleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  {language === 'ar' ? 'التسجيل مع Google' : 'Sign up with Google'}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-purple-900/50"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-black text-gray-500">
                      {language === 'ar' ? 'أو' : 'or'}
                    </span>
                  </div>
                </div>

                {/* Email/Password Signup Form */}
                <form onSubmit={handlePasswordSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      {language === 'ar' ? 'الاسم الكامل (اختياري)' : 'Full Name (optional)'}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                      className="w-full px-4 py-3 bg-black/80 border border-purple-900/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                      dir="auto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      {t.auth.email}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'}
                      className="w-full px-4 py-3 bg-black/80 border border-purple-900/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Lock className="w-4 h-4 inline mr-2" />
                      {language === 'ar' ? 'كلمة المرور' : 'Password'}
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

                  <button
                    type="submit"
                    disabled={loading || !email.trim() || !password}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {language === 'ar' ? 'جارِ الإنشاء...' : 'Creating account...'}
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4" />
                        {language === 'ar' ? 'إنشاء حساب' : 'Create Account'}
                      </>
                    )}
                  </button>
                </form>

                {/* Login Link */}
                <div className="text-center text-gray-400 text-sm">
                  {language === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(null); }}
                    className="text-purple-400 hover:text-purple-300 ml-2 font-medium"
                  >
                    {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Magic Link Mode */}
            {authMode === 'magic-link' && (
              <motion.div
                key="magic-link-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white">
                    {language === 'ar' ? 'رابط سحري' : 'Magic Link'}
                  </h2>
                  <p className="text-gray-400 text-sm mt-2">
                    {language === 'ar' ? 'سنرسل لك رابطًا للدخول بدون كلمة مرور' : "We'll send you a link to sign in without password"}
                  </p>
                </div>

                {/* Email Form - Magic Link */}
                <form onSubmit={handleSendMagicLink} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      {t.auth.email}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'}
                      className="w-full px-4 py-3 bg-black/80 border border-purple-900/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                      required
                      dir="ltr"
                    />
                  </div>

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

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {language === 'ar' ? 'جارِ الإرسال...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        {language === 'ar' ? 'إرسال الرابط السحري' : 'Send Magic Link'}
                      </>
                    )}
                  </button>
                </form>

                {/* Back to Password Login */}
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setError(null); }}
                  className="w-full py-2 text-gray-400 hover:text-white text-sm transition-all flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {language === 'ar' ? 'العودة لتسجيل الدخول بكلمة مرور' : 'Back to password login'}
                </button>
              </motion.div>
            )}

            {/* Email Sent / Confirmation Step */}
            {(authMode === 'sent' || authMode === 'email-confirm') && (
              <motion.div
                key="sent-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {language === 'ar' ? 'تحقق من بريدك!' : 'Check Your Email!'}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {authMode === 'email-confirm'
                      ? (language === 'ar' 
                          ? 'لقد أرسلنا رابط تأكيد إلى'
                          : "We've sent a confirmation link to")
                      : (language === 'ar' 
                          ? 'لقد أرسلنا رابطًا سحريًا إلى'
                          : "We've sent a magic link to")}
                  </p>
                  <p className="text-purple-400 font-medium mt-1">{email}</p>
                </div>

                <div className="p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                  <p className="text-gray-300 text-sm">
                    {authMode === 'email-confirm'
                      ? (language === 'ar' 
                          ? 'انقر على الرابط لتأكيد حسابك والبدء في استخدام الخدمة.'
                          : 'Click the link to confirm your account and start using the service.')
                      : (language === 'ar' 
                          ? 'انقر على الرابط في البريد الإلكتروني لتسجيل الدخول تلقائيًا. لا حاجة لإدخال أي رمز!'
                          : 'Click the link in the email to sign in automatically. No code needed!')}
                  </p>
                </div>

                <div className="text-gray-500 text-xs">
                  {language === 'ar' 
                    ? 'لم تستلم البريد؟ تحقق من مجلد الرسائل غير المرغوب فيها.'
                    : "Didn't receive it? Check your spam folder."}
                </div>

                <button
                  onClick={resetAuth}
                  className="w-full py-2 text-gray-400 hover:text-white text-sm transition-all flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                </button>
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
