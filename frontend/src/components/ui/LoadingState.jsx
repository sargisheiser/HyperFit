import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoadingState({ 
  label = 'Lädt...',
  size = 'md',
  variant = 'default',
  className = '',
  inline = false 
}) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }

  const variants = {
    default: 'text-[#00FF7F]',
    muted: 'text-white/60',
    primary: 'text-[#00FF7F]',
  }

  const spinnerSize = sizes[size] || sizes.md
  const spinnerColor = variants[variant] || variants.default

  if (inline) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className={`${spinnerSize} ${spinnerColor} animate-spin`} />
        {label && <span className="text-sm text-white/70">{label}</span>}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}
    >
      <Loader2 className={`${spinnerSize} ${spinnerColor} animate-spin`} />
      {label && (
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-[#8cffc7]">
          {label}
        </p>
      )}
    </motion.div>
  )
}



