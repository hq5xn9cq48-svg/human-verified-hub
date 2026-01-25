'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Search, 
  Wand2, 
  Image as ImageIcon, 
  History, 
  LogIn, 
  LogOut, 
  Menu, 
  X,
  Globe,
  Sparkles,
  ChevronDown,
  User,
  Info,
  Mail,
  BookOpen,
  Crown,
  Zap
} from 'lucide-react'

export default function Navbar() {
  const { language, setLanguage, t, availableLanguages, isLoaded } = useLanguage()
  const { user, signOut, usageStatus } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  // Close account menu when clicking outside - MUST be called before any conditional returns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Prevent hydration mismatch by not rendering language-dependent content until loaded
  if (!isLoaded) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-purple-900/30 bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-12 w-12 bg-purple-900/30 rounded-xl animate-pulse" />
              <div className="hidden sm:block">
                <div className="h-5 w-32 bg-purple-900/30 rounded animate-pulse" />
                <div className="h-3 w-24 bg-purple-900/20 rounded mt-1 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-20 bg-purple-900/30 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </header>
    )
  }

  const navItems = [
    { href: '/', label: t.nav.analyzer, icon: Search },
    { href: '/humanizer', label: t.nav.humanizer, icon: Wand2 },
    { href: '/image-detector', label: t.nav.imageDetector, icon: ImageIcon },
    { href: '/image-to-prompt', label: t.nav.imageToPrompt, icon: Sparkles },
    { href: '/history', label: t.nav.history, icon: History },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-purple-900/30 bg-black/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo - Clean transparent logo, properly sized without background */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
            <div className="relative w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center overflow-visible transition-transform group-hover:scale-105">
              <Image 
                src="/logo.png" 
                alt="Human-Verified Hub Logo" 
                width={56} 
                height={56} 
                className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold text-gradient leading-tight">Human-Verified Hub</h1>
              <p className="text-[9px] sm:text-[10px] text-gray-500 leading-tight">{t.header.subtitle}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 neon-glow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'icon-glow' : ''}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Free Uses Remaining Counter - Very compact on mobile */}
            {user && usageStatus && !usageStatus.isPro && (
              <div className="flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-purple-900/30 border border-purple-500/30">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
                <span className={`text-[10px] sm:text-sm font-bold ${usageStatus.remaining <= 0 ? 'text-red-400' : usageStatus.remaining <= 1 ? 'text-yellow-400' : 'text-white'}`}>
                  {usageStatus.remaining}/{usageStatus.limit}
                </span>
              </div>
            )}
            
            {/* Upgrade to Pro Button - Icon only on small mobile, with text on larger */}
            {user && !usageStatus?.isPro && (
              <Link
                href="/pricing"
                className="flex items-center justify-center gap-1 p-1.5 sm:px-3 sm:py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg sm:rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all text-white text-xs sm:text-sm font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
              >
                <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{language === 'ar' ? 'ترقية' : 'Pro'}</span>
              </Link>
            )}

            {/* User Profile Section - Desktop with My Account Dropdown */}
            <div className="hidden md:flex items-center">
              {user ? (
                <div className="relative" ref={accountMenuRef}>
                  <button
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-purple-900/30 hover:border-purple-500/30 transition-all"
                  >
                    {/* User Avatar */}
                    {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                      <img 
                        src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full object-cover border border-purple-500/30"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-300">
                      {language === 'ar' ? 'حسابي' : 'My Account'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Account Dropdown Menu */}
                  <AnimatePresence>
                    {accountMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 py-2 bg-black/95 backdrop-blur-xl border border-purple-900/50 rounded-xl shadow-lg shadow-purple-500/10 z-50"
                      >
                        {/* Account Settings */}
                        <Link
                          href="/account"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <User className="w-4 h-4" />
                          {language === 'ar' ? 'إعدادات الحساب' : 'Account Settings'}
                        </Link>
                        
                        {/* Language Switcher Section */}
                        <div className="px-4 py-2 border-t border-purple-900/30 mt-1">
                          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {language === 'ar' ? 'اللغة' : 'Language'}
                          </p>
                          <div className="flex gap-2">
                            {availableLanguages.map((lang) => (
                              <button
                                key={lang.code}
                                onClick={() => {
                                  setLanguage(lang.code)
                                }}
                                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  language === lang.code
                                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                              >
                                {lang.nativeName}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Sign Out */}
                        <button
                          onClick={() => {
                            setAccountMenuOpen(false)
                            signOut()
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all w-full mt-1 border-t border-purple-900/30"
                        >
                          <LogOut className="w-4 h-4" />
                          {language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t.nav.signIn}</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden mt-4 pt-4 border-t border-purple-900/30 overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                {/* Main Navigation Items */}
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${
                        isActive
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'icon-glow' : ''}`} />
                      {item.label}
                    </Link>
                  )
                })}

                {/* User Profile Section - Mobile */}
                <div className="mt-4 pt-4 border-t border-purple-900/30">
                  {user ? (
                    <div className="p-4 rounded-xl bg-white/5 border border-purple-900/30">
                      {/* User Info */}
                      <div className="flex items-center gap-3 mb-4">
                        {/* User Avatar - Google profile picture or letter fallback */}
                        {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                          <img 
                            src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                            alt="Profile" 
                            className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">
                              {user.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                          </p>
                          <p className="text-gray-400 text-xs truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      
                      {/* Free Uses Counter - Mobile */}
                      {usageStatus && !usageStatus.isPro && (
                        <div className="mb-3 p-3 rounded-xl bg-purple-900/20 border border-purple-500/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-purple-400" />
                              <span className="text-sm text-gray-300">
                                {language === 'ar' ? 'الاستخدام المتبقي' : 'Free Uses'}
                              </span>
                            </div>
                            <span className={`text-sm font-bold ${usageStatus.remaining <= 0 ? 'text-red-400' : usageStatus.remaining <= 1 ? 'text-yellow-400' : 'text-purple-300'}`}>
                              {usageStatus.remaining}/{usageStatus.limit}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Upgrade to Pro - Mobile */}
                      {!usageStatus?.isPro && (
                        <Link
                          href="/pricing"
                          onClick={() => setMobileMenuOpen(false)}
                          className="mb-3 p-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-fuchsia-400" />
                            <span className="bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent text-sm font-semibold">
                              {language === 'ar' ? 'الترقية للاحترافي' : 'Upgrade to Pro'}
                            </span>
                          </div>
                          <span className="text-purple-400 text-xs">→</span>
                        </Link>
                      )}
                      
                      {/* Language Switcher - Mobile */}
                      <div className="mb-3 p-3 rounded-xl bg-white/5 border border-purple-900/30">
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {language === 'ar' ? 'اللغة' : 'Language'}
                        </p>
                        <div className="flex gap-2">
                          {availableLanguages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => setLanguage(lang.code)}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                language === lang.code
                                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                              }`}
                            >
                              {lang.nativeName}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Link
                          href="/account"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            pathname === '/account'
                              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                              : 'bg-purple-600/20 text-gray-300 hover:text-white border border-purple-900/30'
                          }`}
                        >
                          <User className="w-4 h-4" />
                          {language === 'ar' ? 'حسابي' : 'My Account'}
                        </Link>
                        <button
                          onClick={() => {
                            signOut()
                            setMobileMenuOpen(false)
                          }}
                          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all flex items-center justify-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          {language === 'ar' ? 'خروج' : 'Sign Out'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      {t.nav.signIn}
                    </Link>
                  )}
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>

      {/* Neon bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
    </header>
  )
}
