'use client'

import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: { img: 32, container: 'w-8 h-8' },
    md: { img: 40, container: 'w-10 h-10' },
    lg: { img: 56, container: 'w-14 h-14' },
  }

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  return (
    <div className="flex items-center gap-2 group">
      <div className={`${sizeClasses[size].container} relative`}>
        <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-md group-hover:bg-purple-600/40 transition-all" />
        <Image 
          src="/logo.png" 
          alt="Human-Verified Hub Logo" 
          width={sizeClasses[size].img} 
          height={sizeClasses[size].img} 
          className="relative z-10 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.8)] transition-all"
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
