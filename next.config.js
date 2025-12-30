/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Disable powered by header
  poweredByHeader: false,
  
  // Image optimization
  images: {
    unoptimized: true,
  },
  
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['cheerio'],
  },
}

module.exports = nextConfig
