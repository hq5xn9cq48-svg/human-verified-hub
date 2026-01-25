import type { Metadata } from 'next'
import { Inter, Noto_Sans_Arabic } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-arabic', weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://humanverified.systems'),
  title: 'Human-Verified Hub | AI Text Detection & Plagiarism Checker',
  description: 'Professional AI-powered tool to detect AI-generated content and check for plagiarism. Verify if text is human-written with forensic linguistic analysis. Get certified PDF reports. Free AI Humanizer tool available.',
  keywords: 'AI detection, AI text detector, GPT detector, ChatGPT detector, plagiarism checker, human verification, content analysis, AI checker, text analyzer, AI content detector, humanverified, AI Detector, ChatGPT Checker, Human Text Verifier, Plagiarism Checker, AI Content Detection, كاشف الذكاء الاصطناعي, فحص النص, Human Verified, Arabic AI Check, Gemini Detection, Free AI Humanizer, فاحص الذكاء الاصطناعي, كشف GPT, أداة تحويل النص',
  authors: [{ name: 'Human-Verified Hub', url: 'https://humanverified.systems' }],
  creator: 'Human-Verified Hub',
  publisher: 'Human-Verified Hub',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://humanverified.systems',
    siteName: 'Human-Verified Hub',
    title: 'Human-Verified Hub | AI Text Detection & Plagiarism Checker',
    description: 'Professional AI-powered tool to detect AI-generated content. Verify if text is human-written with forensic linguistic analysis. Free AI Humanizer included.',
    images: [
      {
        url: 'https://creative-indigo-59qe7dqjqu.edgeone.app/Untitled%20design.png',
        width: 1200,
        height: 675,
        alt: 'Human-Verified Hub - Advanced AI Detection Platform Dashboard',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@humanverified',
    creator: '@humanverified',
    title: 'Human-Verified Hub | AI Text Detection & Plagiarism Checker',
    description: 'Detect AI-generated content with forensic linguistic analysis. Get certified PDF reports. Free AI Humanizer tool.',
    images: [
      {
        url: 'https://creative-indigo-59qe7dqjqu.edgeone.app/Untitled%20design.png',
        width: 1200,
        height: 675,
        alt: 'Human-Verified Hub - Advanced AI Detection Platform Dashboard',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://humanverified.systems',
  },
  other: {
    'google-site-verification': '',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        {/* Organization Schema for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Human-Verified Hub",
              "url": "https://humanverified.systems",
              "logo": "https://humanverified.systems/logo.png",
              "description": "Professional AI-powered platform to detect AI-generated content, verify human-written text, and provide certified authenticity reports.",
              "sameAs": [
                "https://twitter.com/humanverified"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer support",
                "url": "https://humanverified.systems/contact"
              },
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://humanverified.systems/?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        {/* Google Analytics Placeholder - Replace GA_MEASUREMENT_ID with actual ID */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'GA_MEASUREMENT_ID');
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${notoArabic.variable} font-sans antialiased min-h-screen bg-dark-950 w-full overflow-x-hidden`}>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
