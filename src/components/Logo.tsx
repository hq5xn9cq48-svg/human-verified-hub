'use client'

import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

// Use external logo URL as specified in requirements
const LOGO_URL = 'https://i.postimg.cc/nrxFXPRs/IMG-8462.png'

export default function Logo({ size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: { img: 28, container: 'w-8 h-8' },
    md: { img: 36, container: 'w-10 h-10' },
    lg: { img: 48, container: 'w-14 h-14' },
  }

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  return (
    <div className="flex items-center gap-2 group">
      {/* Logo container: full circle with black background, no glow/shadows */}
      <div className={`${sizeClasses[size].container} relative rounded-full bg-black border border-gray-800 flex items-center justify-center overflow-hidden`}>
        <Image 
          src={LOGO_URL}
          alt="Human-Verified Hub Logo" 
          width={sizeClasses[size].img} 
          height={sizeClasses[size].img} 
          className="object-contain"
          priority
        />
      </div>
      <div>
        <h1 className={`font-bold ${textSizes[size]} text-gradient`}>
          Human-Verified Hub
        </h1>
        {size !== 'sm' && (
          <p className="text-[10px] text-gray-500 tracking-wider uppercase">
            AI Detection System
          </p>
        )}
      </div>
    </div>
  )
}
