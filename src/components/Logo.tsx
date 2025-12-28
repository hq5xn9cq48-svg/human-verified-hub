'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} relative`}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="url(#logoGradient)"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M20 32 L28 40 L44 24"
            stroke="url(#logoGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <div>
        <h1 className={`font-bold ${textSizes[size]} text-gradient`}>
          Human-Verified
        </h1>
        {size !== 'sm' && (
          <p className="text-[10px] text-dark-400 tracking-wider uppercase">
            AI Detection Hub
          </p>
        )}
      </div>
    </div>
  )
}
