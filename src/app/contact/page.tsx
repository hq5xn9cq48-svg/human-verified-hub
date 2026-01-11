'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  Mail, 
  Send, 
  MessageSquare, 
  User, 
  CheckCircle,
  Loader2,
  ArrowRight,
  Globe,
  Clock,
  Shield
} from 'lucide-react'

export default function ContactPage() {
  const { language, isRTL } = useLanguage()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const content = {
    en: {
      title: 'Contact',
      titleHighlight: 'Us',
      subtitle: 'Have questions? We\'d love to hear from you.',
      form: {
        name: 'Your Name',
        namePlaceholder: 'John Doe',
        email: 'Email Address',
        emailPlaceholder: 'you@example.com',
        subject: 'Subject',
        subjectPlaceholder: 'How can we help?',
        message: 'Message',
        messagePlaceholder: 'Tell us more about your inquiry...',
        submit: 'Send Message',
        sending: 'Sending...'
      },
      success: {
        title: 'Message Sent!',
        message: 'Thank you for contacting us. We\'ll get back to you within 48 hours.',
        another: 'Send Another Message'
      },
      directContact: {
        title: 'Direct Contact',
        email: 'Email Us',
        emailDesc: 'For general inquiries and support',
        response: 'Response Time',
        responseDesc: 'We aim to respond within 48 hours',
        privacy: 'Privacy First',
        privacyDesc: 'Your data is never shared with third parties'
      },
      subjects: [
        'General Inquiry',
        'Technical Support',
        'Bug Report',
        'Feature Request',
        'Partnership',
        'Press/Media',
        'Other'
      ]
    },
    ar: {
      title: 'تواصل',
      titleHighlight: 'معنا',
      subtitle: 'هل لديك أسئلة؟ يسعدنا سماعك.',
      form: {
        name: 'اسمك',
        namePlaceholder: 'محمد أحمد',
        email: 'البريد الإلكتروني',
        emailPlaceholder: 'you@example.com',
        subject: 'الموضوع',
        subjectPlaceholder: 'كيف يمكننا مساعدتك؟',
        message: 'الرسالة',
        messagePlaceholder: 'أخبرنا المزيد عن استفسارك...',
        submit: 'إرسال الرسالة',
        sending: 'جاري الإرسال...'
      },
      success: {
        title: 'تم إرسال الرسالة!',
        message: 'شكراً لتواصلك معنا. سنرد عليك خلال 48 ساعة.',
        another: 'إرسال رسالة أخرى'
      },
      directContact: {
        title: 'التواصل المباشر',
        email: 'راسلنا',
        emailDesc: 'للاستفسارات العامة والدعم',
        response: 'وقت الاستجابة',
        responseDesc: 'نسعى للرد خلال 48 ساعة',
        privacy: 'الخصوصية أولاً',
        privacyDesc: 'بياناتك لا تُشارك مع أطراف ثالثة'
      },
      subjects: [
        'استفسار عام',
        'دعم فني',
        'الإبلاغ عن خطأ',
        'طلب ميزة',
        'شراكة',
        'صحافة/إعلام',
        'أخرى'
      ]
    }
  }

  const t = language === 'ar' ? content.ar : content.en

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Simulate form submission (in production, send to actual API)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // For now, we'll use mailto as fallback
      const mailtoLink = `mailto:contact@humanverified.systems?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`)}`
      
      // Open mailto link
      window.location.href = mailtoLink
      
      setSubmitted(true)
    } catch (err) {
      setError(language === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', subject: '', message: '' })
    setSubmitted(false)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-black cyber-grid" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 pt-24">
        {/* Hero */}
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            {t.title}{' '}
            <span className="text-gradient neon-text-glow">{t.titleHighlight}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg"
          >
            {t.subtitle}
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 glass-card p-8"
          >
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">{t.success.title}</h2>
                <p className="text-gray-400 mb-6">{t.success.message}</p>
                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors inline-flex items-center gap-2"
                >
                  {t.success.another}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      {t.form.name}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-black/50 border border-purple-900/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                      placeholder={t.form.namePlaceholder}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      {t.form.email}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-black/50 border border-purple-900/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                      placeholder={t.form.emailPlaceholder}
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t.form.subject}
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-purple-900/30 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                  >
                    <option value="">{t.form.subjectPlaceholder}</option>
                    {t.subjects.map((subject, i) => (
                      <option key={i} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    {t.form.message}
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-black/50 border border-purple-900/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
                    placeholder={t.form.messagePlaceholder}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.form.sending}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {t.form.submit}
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-white mb-6">{t.directContact.title}</h2>

            {/* Email Card */}
            <a
              href="mailto:contact@humanverified.systems"
              className="block p-6 glass-card hover:border-purple-500/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-900/50 transition-colors">
                  <Mail className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{t.directContact.email}</h3>
                  <p className="text-gray-400 text-sm">{t.directContact.emailDesc}</p>
                  <p className="text-purple-400 text-sm mt-1">contact@humanverified.systems</p>
                </div>
              </div>
            </a>

            {/* Response Time */}
            <div className="p-6 glass-card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-900/30 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{t.directContact.response}</h3>
                  <p className="text-gray-400 text-sm">{t.directContact.responseDesc}</p>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="p-6 glass-card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-900/30 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{t.directContact.privacy}</h3>
                  <p className="text-gray-400 text-sm">{t.directContact.privacyDesc}</p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="p-6 glass-card">
              <h3 className="text-white font-semibold mb-4">{language === 'ar' ? 'روابط سريعة' : 'Quick Links'}</h3>
              <div className="space-y-2">
                <Link href="/about" className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors text-sm">
                  <ArrowRight className="w-3 h-3" />
                  {language === 'ar' ? 'من نحن' : 'About Us'}
                </Link>
                <Link href="/methodology" className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors text-sm">
                  <ArrowRight className="w-3 h-3" />
                  {language === 'ar' ? 'منهجيتنا' : 'How It Works'}
                </Link>
                <Link href="/privacy" className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors text-sm">
                  <ArrowRight className="w-3 h-3" />
                  {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                </Link>
                <Link href="/terms" className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors text-sm">
                  <ArrowRight className="w-3 h-3" />
                  {language === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-900/30 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-500 text-xs">© 2026 Human-Verified Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
