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
  Zap,
  AlertCircle
} from 'lucide-react'

export default function Navbar() {
  const { language, setLanguage, t, availableLanguages, isLoaded } = useLanguage()
  const { user, signOut, usageStatus } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const langMenuRef = useRef<HTMLDivElement>(null)

  // Close language menu when clicking outside - MUST be called before any conditional returns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false)
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
          {/* Logo - Clean circle with proper sizing */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-full bg-black flex items-center justify-center overflow-hidden border border-gray-800/80 group-hover:border-purple-500/50 transition-all flex-shrink-0">
              <Image 
                src="/logo-new.png" 
                alt="Human-Verified Hub Logo" 
                width={36} 
                height={36} 
                className="h-9 w-9 object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gradient leading-tight">Human-Verified Hub</h1>
              <p className="text-[10px] text-gray-500">{t.header.subtitle}</p>
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
          <div className="flex items-center gap-3">
            {/* Language Switcher Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-400 hover:text-purple-300 bg-white/5 hover:bg-purple-600/10 transition-all border border-transparent hover:border-purple-500/30"
              >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-medium uppercase hidden sm:inline">{language}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {langMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-40 py-2 bg-black/95 backdrop-blur-xl border border-purple-900/50 rounded-xl shadow-lg shadow-purple-500/10 z-50"
                  >
                    {availableLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code)
                          setLangMenuOpen(false)
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-all flex items-center justify-between ${
                          language === lang.code
                            ? 'bg-purple-600/20 text-purple-300'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{lang.nativeName}</span>
                        {language === lang.code && (
                          <span className="w-2 h-2 rounded-full bg-purple-400" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile Section - Desktop (Compact & Modern) */}
            <div className="hidden md:flex items-center">
              {user ? (
                <div className="flex items-center gap-2">
                  {/* Pro Badge or Usage Counter + Upgrade Button */}
                  {usageStatus?.isPro ? (
                    /* Pro User Badge - Beautiful & Prominent */
                    <div className="relative group">
                      <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-orange-500/30 text-yellow-300 border border-yellow-500/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:shadow-[0_0_20px_rgba(251,191,36,0.5)] transition-all">
                        <Crown className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                        <span>Pro</span>
                        <Sparkles className="w-3 h-3 text-amber-300" />
                      </div>
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    </div>
                  ) : (
                    /* Usage Counter + Upgrade Button for Free Users */
                    <div className="flex items-center gap-2">
                      {/* Usage Counter Badge */}
                      {usageStatus && (
                        <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                          usageStatus.remaining <= 0 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : usageStatus.remaining === 1
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        }`}>
                          {usageStatus.remaining <= 0 ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          <span>{usageStatus.remaining}/{usageStatus.limit}</span>
                        </div>
                      )}
                      {/* Upgrade Button */}
                      <Link
                        href="/pricing"
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600/40 to-fuchsia-600/40 text-purple-200 border border-purple-500/30 flex items-center gap-1.5 hover:border-purple-400/50 hover:shadow-[0_0_12px_rgba(168,85,247,0.25)] transition-all group"
                      >
                        <Crown className="w-3 h-3 text-fuchsia-400 group-hover:animate-bounce" />
                        <span className="hidden lg:inline">{language === 'ar' ? 'ترقية للبرو' : 'Upgrade'}</span>
                        <span className="lg:hidden">{language === 'ar' ? 'ترقية' : 'Pro'}</span>
                      </Link>
                    </div>
                  )}
                  {/* User Avatar */}
                  <Link href="/account" className="relative group">
                    {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                      <img 
                        src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full object-cover border-2 border-purple-500/30 group-hover:border-purple-400/60 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center group-hover:from-purple-400 group-hover:to-purple-600 transition-all border-2 border-purple-400/30">
                        <span className="text-white text-xs font-bold">
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    {/* Pro indicator on avatar */}
                    {usageStatus?.isPro && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center border border-black">
                        <Crown className="w-2 h-2 text-black" />
                      </div>
                    )}
                  </Link>
                  {/* Sign Out */}
                  <button
                    onClick={signOut}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title={t.nav.signOut}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2"
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
              className="md:hidden mt-4 pt-4 border-t border-purple-900/30 overflow-visible"
            >
              <div className="flex flex-col gap-2 max-h-[calc(100vh-120px)] overflow-y-auto pb-4">
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

                {/* User Profile Section - Mobile (Compact) */}
                <div className="mt-3 pt-3 border-t border-purple-900/20">
                  {user ? (
                    <div className="p-3 rounded-xl bg-white/[0.03]">
                      {/* User Info Row */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative">
                          {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                            <img 
                              src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                              alt="Profile" 
                              className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center border-2 border-purple-400/30">
                              <span className="text-white text-sm font-bold">
                                {user.email?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          )}
                          {/* Pro indicator on avatar */}
                          {usageStatus?.isPro && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center border border-black">
                              <Crown className="w-2.5 h-2.5 text-black" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white text-sm font-medium truncate">
                              {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}
                            </p>
                            {/* Pro Badge inline */}
                            {usageStatus?.isPro && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-500/30 to-yellow-400/30 text-yellow-400 border border-yellow-500/40">
                                PRO
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      {/* Pro Status Banner for Pro Users */}
                      {usageStatus?.isPro ? (
                        <div className="mb-3 p-2 rounded-lg bg-gradient-to-r from-amber-500/10 via-yellow-400/10 to-orange-500/10 border border-yellow-500/30 flex items-center justify-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-300 text-xs font-semibold">
                            {language === 'ar' ? 'تحليلات غير محدودة' : 'Unlimited Analyses'}
                          </span>
                          <Sparkles className="w-3 h-3 text-amber-300" />
                        </div>
                      ) : usageStatus && (
                        /* Usage Counter for Free Users in Mobile */
                        <div className={`mb-3 p-2.5 rounded-lg flex items-center justify-between ${
                          usageStatus.remaining <= 0 
                            ? 'bg-red-500/10 border border-red-500/30'
                            : usageStatus.remaining === 1
                              ? 'bg-yellow-500/10 border border-yellow-500/30'
                              : 'bg-purple-500/10 border border-purple-500/30'
                        }`}>
                          <div className="flex items-center gap-2">
                            {usageStatus.remaining <= 0 ? (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            ) : (
                              <Zap className={`w-4 h-4 ${usageStatus.remaining === 1 ? 'text-yellow-400' : 'text-purple-400'}`} />
                            )}
                            <span className={`text-xs font-semibold ${
                              usageStatus.remaining <= 0 ? 'text-red-400' : usageStatus.remaining === 1 ? 'text-yellow-400' : 'text-purple-300'
                            }`}>
                              {language === 'ar' ? 'التحليلات المتبقية' : 'Analyses remaining'}
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${
                            usageStatus.remaining <= 0 ? 'text-red-400' : usageStatus.remaining === 1 ? 'text-yellow-400' : 'text-purple-300'
                          }`}>
                            {usageStatus.remaining}/{usageStatus.limit}
                          </span>
                        </div>
                      )}
                      
                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        <Link
                          href="/account"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5" />
                          {language === 'ar' ? 'حسابي' : 'Account'}
                        </Link>
                        {!usageStatus?.isPro && (
                          <Link
                            href="/pricing"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 text-purple-200 border border-purple-500/30 flex items-center justify-center gap-1.5"
                          >
                            <Crown className="w-3.5 h-3.5 text-fuchsia-400" />
                            {language === 'ar' ? 'ترقية للبرو' : 'Upgrade'}
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            signOut()
                            setMobileMenuOpen(false)
                          }}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
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
