'use client'

import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  Shield, 
  Target, 
  Users, 
  Sparkles, 
  Globe, 
  Award,
  CheckCircle,
  Zap,
  Lock,
  Heart
} from 'lucide-react'

export default function AboutPage() {
  const { language, isRTL } = useLanguage()
  
  const content = {
    en: {
      title: 'About',
      titleHighlight: 'Human-Verified Hub',
      subtitle: 'Empowering authenticity in the age of AI',
      missionTitle: 'Our Mission',
      missionText: 'Human-Verified Hub is dedicated to promoting transparency and authenticity in digital content. As AI-generated content becomes increasingly sophisticated, we provide the tools needed to distinguish between human and AI-created text and images.',
      visionTitle: 'Our Vision',
      visionText: 'We envision a world where content authenticity is verifiable, trust in digital communication is maintained, and creators are empowered to prove the originality of their work.',
      valuesTitle: 'Our Values',
      values: [
        { icon: Shield, title: 'Privacy First', desc: 'Your data is never stored or used for training. We analyze and forget.' },
        { icon: Target, title: 'Accuracy', desc: 'We continuously improve our detection algorithms for maximum precision.' },
        { icon: Users, title: 'Accessibility', desc: 'Free tools for everyone to verify content authenticity.' },
        { icon: Sparkles, title: 'Innovation', desc: 'Staying ahead with cutting-edge AI detection technology.' },
      ],
      useCasesTitle: 'Who Uses Human-Verified Hub?',
      useCases: [
        { icon: Award, title: 'Academic Institutions', desc: 'Universities and schools verify academic integrity.' },
        { icon: Globe, title: 'Publishers & Media', desc: 'News organizations ensure content authenticity.' },
        { icon: Users, title: 'Content Creators', desc: 'Writers prove their work is original and human-made.' },
        { icon: Lock, title: 'Businesses', desc: 'Companies verify authenticity of submitted content.' },
      ],
      teamTitle: 'Team HumanVerified',
      teamText: 'We are a dedicated team of AI researchers, linguists, and software engineers passionate about maintaining trust in digital communication. Our team combines expertise in natural language processing, computer vision, and web technologies to build the most accurate detection tools available.',
      contactCta: 'Have questions? We\'d love to hear from you.',
      contactButton: 'Contact Us',
    },
    ar: {
      title: 'عن',
      titleHighlight: 'Human-Verified Hub',
      subtitle: 'تمكين الأصالة في عصر الذكاء الاصطناعي',
      missionTitle: 'مهمتنا',
      missionText: 'Human-Verified Hub مكرس لتعزيز الشفافية والأصالة في المحتوى الرقمي. مع تزايد تطور المحتوى المولد بالذكاء الاصطناعي، نوفر الأدوات اللازمة للتمييز بين النصوص والصور البشرية والمولدة آلياً.',
      visionTitle: 'رؤيتنا',
      visionText: 'نتصور عالماً تكون فيه أصالة المحتوى قابلة للتحقق، والثقة في التواصل الرقمي محفوظة، والمبدعون قادرون على إثبات أصالة أعمالهم.',
      valuesTitle: 'قيمنا',
      values: [
        { icon: Shield, title: 'الخصوصية أولاً', desc: 'بياناتك لا تُخزن أبداً ولا تُستخدم للتدريب. نحلل وننسى.' },
        { icon: Target, title: 'الدقة', desc: 'نحسن خوارزميات الكشف باستمرار لتحقيق أقصى دقة.' },
        { icon: Users, title: 'الوصولية', desc: 'أدوات مجانية للجميع للتحقق من أصالة المحتوى.' },
        { icon: Sparkles, title: 'الابتكار', desc: 'البقاء في المقدمة مع أحدث تقنيات كشف الذكاء الاصطناعي.' },
      ],
      useCasesTitle: 'من يستخدم Human-Verified Hub؟',
      useCases: [
        { icon: Award, title: 'المؤسسات الأكاديمية', desc: 'الجامعات والمدارس تتحقق من النزاهة الأكاديمية.' },
        { icon: Globe, title: 'الناشرون والإعلام', desc: 'المؤسسات الإخبارية تضمن أصالة المحتوى.' },
        { icon: Users, title: 'صناع المحتوى', desc: 'الكتاب يثبتون أن أعمالهم أصلية وبشرية.' },
        { icon: Lock, title: 'الشركات', desc: 'الشركات تتحقق من أصالة المحتوى المقدم.' },
      ],
      teamTitle: 'فريق HumanVerified',
      teamText: 'نحن فريق متخصص من باحثي الذكاء الاصطناعي واللغويين ومهندسي البرمجيات الشغوفين بالحفاظ على الثقة في التواصل الرقمي. يجمع فريقنا بين الخبرة في معالجة اللغة الطبيعية والرؤية الحاسوبية وتقنيات الويب لبناء أدق أدوات الكشف المتاحة.',
      contactCta: 'هل لديك أسئلة؟ يسعدنا سماعك.',
      contactButton: 'تواصل معنا',
    }
  }

  const t = language === 'ar' ? content.ar : content.en

  return (
    <div className="min-h-screen bg-black cyber-grid" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 pt-24">
        {/* Hero */}
        <div className="text-center mb-16">
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
            className="text-gray-400 text-lg max-w-2xl mx-auto"
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{t.missionTitle}</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">{t.missionText}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-900/30 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{t.visionTitle}</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">{t.visionText}</p>
          </motion.div>
        </div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">{t.valuesTitle}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {t.values.map((value, i) => {
              const Icon = value.icon
              return (
                <div key={i} className="glass-card p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{value.title}</h3>
                  <p className="text-gray-400 text-sm">{value.desc}</p>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Use Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">{t.useCasesTitle}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {t.useCases.map((useCase, i) => {
              const Icon = useCase.icon
              return (
                <div key={i} className="glass-card p-6">
                  <Icon className="w-8 h-8 text-purple-400 mb-4" />
                  <h3 className="text-white font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-gray-400 text-sm">{useCase.desc}</p>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Team Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-8 mb-16 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Heart className="w-8 h-8 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">{t.teamTitle}</h2>
          </div>
          <p className="text-gray-300 leading-relaxed max-w-3xl mx-auto mb-8">{t.teamText}</p>
          <div className="border-t border-purple-900/30 pt-8">
            <p className="text-gray-400 mb-4">{t.contactCta}</p>
            <a 
              href="/contact" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
            >
              {t.contactButton}
            </a>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-900/30">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-500 text-xs">© 2026 Human-Verified Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
