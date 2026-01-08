import type { Metadata } from 'next'
import { Inter, Noto_Sans_Arabic } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'
import Script from 'next/script'
import CanonicalTag from '@/components/CanonicalTag'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-arabic', weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://humanverified.systems'),
  title: 'Human-Verified Hub | AI Text Detection & Plagiarism Checker',
  description: 'Professional AI-powered tool to detect AI-generated content and check for plagiarism. Verify if text is human-written with forensic linguistic analysis. Get certified PDF reports.',
  keywords: 'AI detection, AI text detector, GPT detector, ChatGPT detector, plagiarism checker, human verification, content analysis, AI checker, text analyzer, AI content detector, humanverified, AI Detector, ChatGPT Checker, Human Text Verifier, Plagiarism Checker, AI Content Detection, كاشف الذكاء الاصطناعي, فحص النص, Human Verified',
  authors: [{ name: 'Human-Verified Hub', url: 'https://humanverified.systems' }],
  creator: 'Human-Verified Hub',
  publisher: 'Human-Verified Hub',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://humanverified.systems',
    siteName: 'Human-Verified Hub',
    title: 'Human-Verified Hub | AI Text Detection & Plagiarism Checker',
    description: 'Professional AI-powered tool to detect AI-generated content. Verify if text is human-written with forensic linguistic analysis.',
    images: [
      {
        url: 'https://humanverified.systems/logo.png',
        width: 512,
        height: 512,
        alt: 'Human-Verified Hub - AI Text Detection',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Human-Verified Hub | AI Text Detection & Plagiarism Checker',
    description: 'Detect AI-generated content with forensic linguistic analysis. Get certified PDF reports.',
    images: ['https://humanverified.systems/logo.png'],
    creator: '@humanverified',
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
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
            <CanonicalTag />
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
