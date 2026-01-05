'use client'

import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PrivacyPage() {
  const { language, isRTL } = useLanguage()

  return (
    <div className="min-h-screen bg-[#0a0a0a]" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-purple-900/30 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{language === 'ar' ? 'العودة' : 'Back'}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="text-white font-semibold">Human-Verified Hub</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              <span className="text-purple-400">Privacy</span> Policy
            </h1>
            <p className="text-gray-400">Last updated: January 2026</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              Human-Verified Hub ("we," "our," or "us") operates the AI Text Detection & Plagiarism Checking service 
              at humanverified.systems. This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">2. Information We Collect</h2>
            <div className="text-gray-300 leading-relaxed space-y-3">
              <p><strong className="text-white">Account Information:</strong> When you create an account, we collect your email address and authentication data.</p>
              <p><strong className="text-white">Text Submissions:</strong> We process text content you submit for AI detection analysis. This content is used solely for providing the analysis service.</p>
              <p><strong className="text-white">Usage Data:</strong> We collect information about how you interact with our service, including analysis history and timestamps.</p>
              <p><strong className="text-white">Device Information:</strong> We may collect browser type, IP address, and device identifiers for security and analytics purposes.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">3. How We Use Your Information</h2>
            <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
              <li>To provide and maintain our AI detection service</li>
              <li>To process and analyze text submissions</li>
              <li>To generate verification certificates and reports</li>
              <li>To communicate with you about your account or service updates</li>
              <li>To improve our detection algorithms and service quality</li>
              <li>To prevent fraud and ensure platform security</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">4. Data Processing & Ownership</h2>
            <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl">
              <p className="text-gray-300 leading-relaxed">
                <strong className="text-white">Important:</strong> We process text submitted for analysis but do not claim ownership 
                of your content. Your submitted text remains your intellectual property. We retain analysis results 
                to provide history features but you may delete your data at any time.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">5. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your account information and analysis history for as long as your account is active. 
              You can request deletion of your data by contacting us at contact@humanverified.systems. 
              Anonymized, aggregated data may be retained for service improvement purposes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">6. Data Security</h2>
            <p className="text-gray-300 leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption in transit 
              (TLS/SSL), secure authentication, and access controls. However, no method of transmission over the 
              Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">7. Third-Party Services</h2>
            <p className="text-gray-300 leading-relaxed">
              Our service uses third-party providers including Google Gemini AI for analysis, Supabase for data storage, 
              and Cloudflare for security. These providers have their own privacy policies governing their data practices.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">8. Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              We use essential cookies for authentication and session management, and optional analytics cookies 
              to improve our service. You can manage cookie preferences through your browser settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">9. Your Rights</h2>
            <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your analysis history</li>
              <li>Withdraw consent for optional data processing</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">10. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our service is not intended for users under 13 years of age. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">11. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">12. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="p-4 bg-black/50 border border-purple-900/30 rounded-xl">
              <p className="text-white font-semibold">Human-Verified Hub</p>
              <p className="text-gray-400">Email: <a href="mailto:contact@humanverified.systems" className="text-purple-400 hover:underline">contact@humanverified.systems</a></p>
              <p className="text-gray-400">Website: <a href="https://humanverified.systems" className="text-purple-400 hover:underline">humanverified.systems</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-900/30 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-500 text-sm">© 2026 Human-Verified Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
