'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language } from '@/i18n/translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: typeof translations.en
  isRTL: boolean
  availableLanguages: { code: Language; name: string; nativeName: string }[]
  isLoaded: boolean
}

const availableLanguages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'fr', name: 'French', nativeName: 'Francais' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
]

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('language') as Language
    if (saved && ['en', 'ar', 'fr', 'es'].includes(saved)) {
      setLanguageState(saved)
      // Update document direction for RTL languages
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = saved
    }
    // Mark as loaded after hydration
    setIsLoaded(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
    
    // Update document direction for RTL languages
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = lang
    }
  }

  const t = translations[language]
  const isRTL = language === 'ar'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, availableLanguages, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
