'use client'

import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: { img: 32, container: 'w-9 h-9' },
    md: { img: 44, container: 'w-12 h-12' },
    lg: { img: 56, container: 'w-16 h-16' },
  }

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  return (
    <div className="flex items-center gap-2 group">
      {/* Logo container: transparent background, no border */}
      <div className={`${sizeClasses[size].container} relative flex items-center justify-center overflow-visible`}>
        <Image 
          src="/logo.png"
          alt="Human-Verified Hub Logo" 
          width={sizeClasses[size].img} 
          height={sizeClasses[size].img} 
          className="object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]"
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
