'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, CheckCircle, Globe, Lock, Trash2 } from 'lucide-react'
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

          {/* Key Privacy Highlights */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <div className="p-4 bg-green-900/10 border border-green-500/20 rounded-xl text-center">
              <Trash2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <h3 className="text-white font-semibold mb-1">No Data Storage</h3>
              <p className="text-gray-400 text-sm">Your text and images are NOT stored after analysis</p>
            </div>
            <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl text-center">
              <Lock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h3 className="text-white font-semibold mb-1">No Training Use</h3>
              <p className="text-gray-400 text-sm">Your content is NEVER used to train AI models</p>
            </div>
            <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl text-center">
              <Globe className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h3 className="text-white font-semibold mb-1">GDPR & CCPA Compliant</h3>
              <p className="text-gray-400 text-sm">Full compliance with international privacy laws</p>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              Human-Verified Hub ("we," "our," or "us") operates the AI Text Detection & Plagiarism Checking service 
              at humanverified.systems. This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our service. We are committed to protecting your privacy and ensuring 
              transparency in our data practices.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">2. Our Privacy Commitment</h2>
            <div className="p-6 bg-green-900/10 border border-green-500/20 rounded-xl">
              <h3 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Core Privacy Principles
              </h3>
              <ul className="text-gray-300 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                  <span><strong className="text-white">No Content Storage:</strong> Text and images submitted for analysis are processed in real-time and immediately discarded. We do not store the content you analyze.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                  <span><strong className="text-white">No AI Training:</strong> Your submitted content is NEVER used to train, fine-tune, or improve any AI models.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                  <span><strong className="text-white">Minimal Data Collection:</strong> We only collect information necessary to provide our service.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                  <span><strong className="text-white">User Control:</strong> You can delete your account and all associated data at any time.</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">3. Information We Collect</h2>
            <div className="text-gray-300 leading-relaxed space-y-3">
              <p><strong className="text-white">Account Information:</strong> When you create an account, we collect your email address for authentication purposes only.</p>
              <p><strong className="text-white">Analysis Metadata:</strong> For registered users, we store metadata about analyses (date, score, brief excerpt) to provide history features. The full content is NOT stored.</p>
              <p><strong className="text-white">Technical Data:</strong> We collect minimal technical data (browser type, anonymized IP) for security and service improvement.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">4. GDPR Compliance (EU Users)</h2>
            <div className="text-gray-300 leading-relaxed space-y-3">
              <p>Under the General Data Protection Regulation (GDPR), EU users have the following rights:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-white">Right to Access:</strong> Request a copy of your personal data</li>
                <li><strong className="text-white">Right to Rectification:</strong> Correct inaccurate personal data</li>
                <li><strong className="text-white">Right to Erasure:</strong> Request deletion of your personal data</li>
                <li><strong className="text-white">Right to Data Portability:</strong> Receive your data in a portable format</li>
                <li><strong className="text-white">Right to Object:</strong> Object to processing of your personal data</li>
                <li><strong className="text-white">Right to Restrict Processing:</strong> Request limitation of processing</li>
              </ul>
              <p>To exercise these rights, contact us at contact@humanverified.systems.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">5. CCPA Compliance (California Users)</h2>
            <div className="text-gray-300 leading-relaxed space-y-3">
              <p>Under the California Consumer Privacy Act (CCPA), California residents have additional rights:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-white">Right to Know:</strong> What personal information we collect and how it's used</li>
                <li><strong className="text-white">Right to Delete:</strong> Request deletion of personal information</li>
                <li><strong className="text-white">Right to Opt-Out:</strong> Opt-out of sale of personal information (Note: We do NOT sell personal information)</li>
                <li><strong className="text-white">Right to Non-Discrimination:</strong> Not be discriminated against for exercising privacy rights</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">6. Data Security</h2>
            <p className="text-gray-300 leading-relaxed">
              We implement industry-standard security measures including:
            </p>
            <ul className="text-gray-300 list-disc list-inside space-y-1">
              <li>HTTPS/TLS encryption for all data in transit</li>
              <li>Secure authentication systems</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and monitoring</li>
              <li>Compliance with OWASP security guidelines</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">7. Third-Party Services</h2>
            <p className="text-gray-300 leading-relaxed">
              Our service uses the following third-party providers:
            </p>
            <ul className="text-gray-300 list-disc list-inside space-y-1">
              <li><strong className="text-white">Google Gemini AI:</strong> For analysis processing (content is processed but not stored by Google for training)</li>
              <li><strong className="text-white">Cloudflare:</strong> For security and content delivery</li>
              <li><strong className="text-white">Supabase:</strong> For secure user authentication (optional registration)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">8. Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              We use only essential cookies for authentication and session management. We do not use 
              tracking cookies or share cookie data with advertisers. You can manage cookies through 
              your browser settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">9. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our service is not intended for users under 13 years of age (or 16 in the EU). We do not 
              knowingly collect personal information from children. If we become aware of such collection, 
              we will delete the information immediately.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">10. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify users of material changes 
              by posting a notice on our website and updating the "Last updated" date. Continued use of the 
              service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">11. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              For questions about this Privacy Policy, data requests, or privacy concerns:
            </p>
            <div className="p-4 bg-black/50 border border-purple-900/30 rounded-xl">
              <p className="text-white font-semibold">Human-Verified Hub - Privacy Team</p>
              <p className="text-gray-400">Email: <a href="mailto:contact@humanverified.systems" className="text-purple-400 hover:underline">contact@humanverified.systems</a></p>
              <p className="text-gray-400">Website: <a href="https://humanverified.systems" className="text-purple-400 hover:underline">humanverified.systems</a></p>
              <p className="text-gray-500 text-sm mt-2">We aim to respond to all privacy inquiries within 48 hours.</p>
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
