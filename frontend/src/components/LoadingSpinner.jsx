import { motion } from 'framer-motion'

export default function LoadingSpinner({ label = 'Initializing systems...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      <motion.div
        className="relative h-16 w-16"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00FF7F]" />
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-[#00C46A] opacity-70" />
      </motion.div>
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-[#8cffc7]">
        {label}
      </p>
    </div>
  )
}











