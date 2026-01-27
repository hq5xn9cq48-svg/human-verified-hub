'use client'

import { useEffect, createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface LemonSqueezyContextType {
  isReady: boolean
  openCheckout: (url: string, options?: CheckoutOptions) => void
}

interface CheckoutOptions {
  email?: string
  userId?: string
  onSuccess?: () => void
  onClose?: () => void
}

const LemonSqueezyContext = createContext<LemonSqueezyContextType>({
  isReady: false,
  openCheckout: () => {}
})

export function useLemonSqueezy() {
  return useContext(LemonSqueezyContext)
}

interface LemonSqueezyProviderProps {
  children: ReactNode
}

export function LemonSqueezyProvider({ children }: LemonSqueezyProviderProps) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Load LemonSqueezy.js script
    const loadLemonSqueezy = () => {
      if (typeof window !== 'undefined' && !(window as any).createLemonSqueezy) {
        const script = document.createElement('script')
        script.src = 'https://app.lemonsqueezy.com/js/lemon.js'
        script.async = true
        script.onload = () => {
          // Initialize LemonSqueezy
          if ((window as any).createLemonSqueezy) {
            (window as any).createLemonSqueezy()
            setIsReady(true)
            console.log('[LemonSqueezy] SDK loaded and initialized')
          }
        }
        script.onerror = () => {
          console.error('[LemonSqueezy] Failed to load SDK')
        }
        document.head.appendChild(script)
      } else if ((window as any).createLemonSqueezy) {
        (window as any).createLemonSqueezy()
        setIsReady(true)
      }
    }

    loadLemonSqueezy()

    // Cleanup
    return () => {
      // LemonSqueezy doesn't require cleanup
    }
  }, [])

  const openCheckout = useCallback((url: string, options?: CheckoutOptions) => {
    if (!isReady || typeof window === 'undefined') {
      console.error('[LemonSqueezy] SDK not ready')
      // Fallback to window.open
      window.open(url, '_blank')
      return
    }

    // Build URL with parameters
    const checkoutUrl = new URL(url)
    
    if (options?.email) {
      checkoutUrl.searchParams.set('checkout[email]', options.email)
    }
    if (options?.userId) {
      checkoutUrl.searchParams.set('checkout[custom][user_id]', options.userId)
    }
    
    // Add embed=1 for overlay mode
    checkoutUrl.searchParams.set('embed', '1')

    try {
      // Use LemonSqueezy overlay
      if ((window as any).LemonSqueezy) {
        (window as any).LemonSqueezy.Url.Open(checkoutUrl.toString())
        
        // Lock body scroll when overlay opens
        document.body.style.overflow = 'hidden'
        
        // Listen for close event
        const handleMessage = (event: MessageEvent) => {
          if (event.data === 'Checkout.Success') {
            options?.onSuccess?.()
            document.body.style.overflow = ''
            window.removeEventListener('message', handleMessage)
          } else if (event.data === 'Checkout.Close') {
            options?.onClose?.()
            document.body.style.overflow = ''
            window.removeEventListener('message', handleMessage)
          }
        }
        window.addEventListener('message', handleMessage)
      } else {
        // Fallback
        window.open(checkoutUrl.toString(), '_blank')
      }
    } catch (error) {
      console.error('[LemonSqueezy] Error opening checkout:', error)
      // Fallback to window.open
      window.open(checkoutUrl.toString(), '_blank')
    }
  }, [isReady])

  return (
    <LemonSqueezyContext.Provider value={{ isReady, openCheckout }}>
      {children}
    </LemonSqueezyContext.Provider>
  )
}
