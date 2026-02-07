'use client'

import { useEffect, createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

interface LemonSqueezyContextType {
  isReady: boolean
  openCheckout: (url: string, options?: CheckoutOptions) => void
  isActivating: boolean // True while polling for Pro activation after payment
}

interface CheckoutOptions {
  email?: string
  userId?: string
  onSuccess?: () => void
  onClose?: () => void
}

const LemonSqueezyContext = createContext<LemonSqueezyContextType>({
  isReady: false,
  openCheckout: () => {},
  isActivating: false
})

export function useLemonSqueezy() {
  return useContext(LemonSqueezyContext)
}

interface LemonSqueezyProviderProps {
  children: ReactNode
}

/**
 * Poll the refresh-pro endpoint until Pro status is activated
 * This handles the delay between payment and webhook processing
 * Uses progressive interval: starts fast (2s), then slows down (3s, then 5s)
 */
async function pollForProActivation(maxAttempts: number = 20): Promise<boolean> {
  console.log('[LemonSqueezy] Starting Pro activation polling...')
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[LemonSqueezy] Polling attempt ${attempt}/${maxAttempts}`)
      
      // Get fresh session token
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.log('[LemonSqueezy] No session token available')
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
      
      // Call refresh-pro endpoint to check and activate Pro
      const response = await fetch('/api/user/refresh-pro', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      const data = await response.json()
      console.log(`[LemonSqueezy] Poll result:`, { isPro: data.isPro, activated: data.activated })
      
      if (data.isPro === true) {
        console.log('[LemonSqueezy] Pro activation confirmed via refresh-pro!')
        return true
      }
      
      // Also check usage endpoint as fallback (webhook may have updated profile directly)
      const usageResponse = await fetch(`/api/user/usage?force=true&t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const usageData = await usageResponse.json()
      
      if (usageData.isPro === true) {
        console.log('[LemonSqueezy] Pro confirmed via usage endpoint!')
        return true
      }
      
    } catch (err) {
      console.error(`[LemonSqueezy] Poll error:`, err)
    }
    
    // Progressive interval: first 5 attempts = 2s, next 5 = 3s, rest = 5s
    // Total max time: ~5*2 + 5*3 + 10*5 = 10+15+50 = 75s
    if (attempt < maxAttempts) {
      const interval = attempt <= 5 ? 2000 : attempt <= 10 ? 3000 : 5000
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }
  
  console.log('[LemonSqueezy] Pro activation polling timed out')
  return false
}

export function LemonSqueezyProvider({ children }: LemonSqueezyProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const pollingRef = useRef(false)

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
      pollingRef.current = false
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
        const handleMessage = async (event: MessageEvent) => {
          if (event.data === 'Checkout.Success') {
            document.body.style.overflow = ''
            window.removeEventListener('message', handleMessage)
            
            // IMPORTANT: Don't just reload - poll for Pro activation first
            // The webhook may take a few seconds to process
            console.log('[LemonSqueezy] Payment successful! Starting Pro activation polling...')
            setIsActivating(true)
            pollingRef.current = true
            
            try {
              const activated = await pollForProActivation(20) // 20 attempts with progressive intervals (~75s max)
              
              if (activated) {
                console.log('[LemonSqueezy] Pro activated! Refreshing page...')
                // Call onSuccess callback first
                options?.onSuccess?.()
                // Small delay then reload to show Pro status
                setTimeout(() => {
                  window.location.reload()
                }, 500)
              } else {
                console.log('[LemonSqueezy] Pro not yet activated after polling, reloading anyway...')
                options?.onSuccess?.()
                // Reload anyway - user can manually refresh later
                window.location.reload()
              }
            } catch (err) {
              console.error('[LemonSqueezy] Polling error:', err)
              options?.onSuccess?.()
              window.location.reload()
            } finally {
              setIsActivating(false)
              pollingRef.current = false
            }
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
    <LemonSqueezyContext.Provider value={{ isReady, openCheckout, isActivating }}>
      {children}
    </LemonSqueezyContext.Provider>
  )
}
