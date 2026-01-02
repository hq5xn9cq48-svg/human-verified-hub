import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Human-Verified Hub | AI Identity Detection',
  description: 'Professional AI-powered tool to analyze and verify if content is written by humans or AI. Includes text humanizer and AI image detection. Get certified with official PDF certificates.',
  keywords: 'AI detection, human verification, content analysis, AI checker, GPT detector, text analyzer, humanizer',
  authors: [{ name: 'Human-Verified Hub' }],
  creator: 'Human-Verified Hub',
  publisher: 'Human-Verified Hub',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://humanverified.ai',
    siteName: 'Human-Verified Hub',
    title: 'Human-Verified Hub | AI Identity Detection',
    description: 'Professional AI-powered tool to analyze and verify if content is written by humans or AI.',
    images: [
      {
        url: '/logo-new.png',
        width: 512,
        height: 512,
        alt: 'Human-Verified Hub Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Human-Verified Hub | AI Identity Detection',
    description: 'Professional AI-powered tool to analyze and verify if content is written by humans or AI.',
    images: ['/logo-new.png'],
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
  verification: {
    google: 'your-google-verification-code', // Replace with actual verification code
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
      <body className={`${inter.className} antialiased min-h-screen bg-dark-950`}>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
