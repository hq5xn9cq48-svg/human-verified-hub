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
  BookOpen
} from 'lucide-react'

export default function Navbar() {
  const { language, setLanguage, t, availableLanguages, isLoaded } = useLanguage()
  const { user, signOut } = useAuth()
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
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image 
              src="/logo-new.png" 
              alt="Human-Verified Hub Logo" 
              width={48} 
              height={48} 
              className="h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] group-hover:drop-shadow-[0_0_16px_rgba(168,85,247,0.8)] transition-all"
              priority
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gradient">Human-Verified Hub</h1>
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

            {/* User Profile Section - Desktop */}
            <div className="hidden md:flex items-center">
              {user ? (
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/5 border border-purple-900/30">
                  {/* User Avatar with Status */}
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-black" />
                  </div>
                  {/* My Account Link */}
                  <Link
                    href="/account"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      pathname === '/account'
                        ? 'text-purple-300 bg-purple-600/20'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {language === 'ar' ? 'حسابي' : 'My Account'}
                  </Link>
                  {/* Sign Out Button */}
                  <button
                    onClick={signOut}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title={t.nav.signOut}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
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
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">
                              {user.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-black" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {user.email}
                          </p>
                          <p className="text-green-400 text-xs">
                            {language === 'ar' ? 'متصل' : 'Online'}
                          </p>
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
