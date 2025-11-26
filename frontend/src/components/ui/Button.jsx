import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  onClick,
  type = 'button',
  ...props
}) {
  const variants = {
    primary:
      'bg-gradient-to-r from-[#00FF7F] to-[#00C46A] text-[#0A0B0C] font-semibold hover:shadow-[0_8px_24px_rgba(0,255,127,0.16)]',
    secondary:
      'bg-[#00FF7F]/10 text-[#9fffcf] hover:bg-[#00FF7F]/20 hover:shadow-[0_8px_24px_rgba(0,255,127,0.16)]',
    ghost: 'bg-transparent text-[#9fffcf] hover:text-white',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      {...props}
    >
      {children}
    </motion.button>
  )
}



