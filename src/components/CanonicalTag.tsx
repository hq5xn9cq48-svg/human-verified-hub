'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function CanonicalTag() {
  const pathname = usePathname()
  
  useEffect(() => {
    // Remove existing canonical tag if present
    const existingCanonical = document.querySelector('link[rel="canonical"]')
    if (existingCanonical) {
      existingCanonical.remove()
    }
    
    // Create and append new canonical tag
    const canonicalUrl = `https://humanverified.systems${pathname === '/' ? '' : pathname}`
    const link = document.createElement('link')
    link.rel = 'canonical'
    link.href = canonicalUrl
    document.head.appendChild(link)
    
    return () => {
      // Cleanup on unmount
      const canonical = document.querySelector('link[rel="canonical"]')
      if (canonical) {
        canonical.remove()
      }
    }
  }, [pathname])
  
  return null
}
