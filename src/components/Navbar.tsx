'use client'

import { useState } from 'react'
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
  Globe
} from 'lucide-react'

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage()
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { href: '/', label: t.nav.analyzer, icon: Search },
    { href: '/humanizer', label: t.nav.humanizer, icon: Wand2 },
    { href: '/image-detector', label: t.nav.imageDetector, icon: ImageIcon },
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
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="p-2.5 rounded-xl text-gray-400 hover:text-purple-300 bg-white/5 hover:bg-purple-600/10 transition-all border border-transparent hover:border-purple-500/30"
              title={language === 'en' ? 'عربي' : 'English'}
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-gray-800">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-gray-400 max-w-[100px] truncate">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="p-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/30"
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
                <span className="hidden sm:inline">{t.nav.signIn}</span>
              </Link>
            )}

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
