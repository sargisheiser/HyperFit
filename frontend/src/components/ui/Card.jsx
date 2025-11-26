import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export default function Card({ children, className, ...props }) {
  return (
    <motion.div
      className={cn(
        'rounded-[24px] bg-gradient-to-br from-[#121b14]/88 via-[#0a140e]/85 to-[#060907]/88 p-6 text-[#b6fbd4] shadow-[0_0_48px_rgba(0,255,127,0.12)]',
        className,
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}



