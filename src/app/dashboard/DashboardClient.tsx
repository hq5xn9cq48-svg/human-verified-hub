'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import VerificationForm from '@/components/VerificationForm'
import VerificationHistory from '@/components/VerificationHistory'
import { LogOut, FlaskConical, Lightbulb, FileText, BarChart3, Star, Zap } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface DashboardClientProps {
  user: User
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const router = useRouter()
  const { usageStatus } = useAuth()

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    router.push('/auth')
    router.refresh()
  }

  const handleNewVerification = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-black cyber-grid relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-purple-900/30 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 relative">
              <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-lg group-hover:bg-purple-600/40 transition-all" />
              <Image 
                src="/logo.png" 
                alt="Human Verified Hub Logo" 
                width={40} 
                height={40} 
                className="relative z-10 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] group-hover:drop-shadow-[0_0_16px_rgba(168,85,247,0.9)] transition-all"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gradient">Human Verified Hub</h1>
              <p className="text-xs text-gray-400">AI Content Detection</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Pro Badge */}
            {usageStatus?.isPro && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 text-sm font-bold rounded-full border border-yellow-500/40">
                <Star className="w-4 h-4 fill-yellow-400" />
                PRO
              </span>
            )}
            
            {/* Free user upgrade hint */}
            {!usageStatus?.isPro && (
              <Link
                href="/pricing"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full border border-purple-500/30 hover:bg-purple-600/30 transition-all"
              >
                <Zap className="w-3 h-3" />
                Upgrade
              </Link>
            )}
            
            <span className="text-gray-400 text-sm hidden sm:block truncate max-w-[200px]">
              {user.email}
            </span>
            <motion.button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white border border-purple-900/50 hover:border-red-500/50 rounded-lg transition-all bg-black/50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/20 border border-purple-500/30">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Dashboard</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Content <span className="text-gradient">Verification</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg">
            Analyze any text to determine if it was written by a human or generated by AI.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Form */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="glass-card-dark p-5 md:p-8 border border-purple-900/30">
              <h2 className="text-lg md:text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-400" />
                New Analysis
              </h2>
              <VerificationForm userId={user.id} onNewVerification={handleNewVerification} />
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Quick Tips */}
            <div className="glass-card-dark p-5 md:p-6 border border-purple-900/30">
              <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-400" />
                Quick Tips
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span>Provide at least 50 characters for accurate analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span>Longer texts yield more reliable results</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span>Check multiple paragraphs for best accuracy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span>Results are saved automatically to your history</span>
                </li>
              </ul>
            </div>

            {/* History */}
            <div className="glass-card-dark p-5 md:p-6 border border-purple-900/30">
              <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Recent History
              </h3>
              <VerificationHistory userId={user.id} refreshTrigger={refreshTrigger} />
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-purple-900/30 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-5 text-center">
          <p className="text-gray-500 text-xs">© 2024 Human Verified Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
