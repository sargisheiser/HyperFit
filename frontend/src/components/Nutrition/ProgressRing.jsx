import { motion } from 'framer-motion'

const RADIUS = 60
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ProgressRing({ progress = 0, label = '', value = '', accent = '#00FF7F' }) {
  // Ensure progress is a valid number
  const safeProgress = typeof progress === 'number' && !isNaN(progress) ? progress : 0
  const normalizedProgress = Math.min(Math.max(safeProgress, 0), 1)
  const strokeDashoffset = CIRCUMFERENCE * (1 - normalizedProgress)

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg width="160" height="160" className="-rotate-90">
        <circle cx="80" cy="80" r={RADIUS} stroke="#1A1A1D" strokeWidth="12" fill="none" opacity={0.5} />
        <motion.circle
          cx="80"
          cy="80"
          r={RADIUS}
          stroke={accent}
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          strokeDasharray={CIRCUMFERENCE}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-white/40">{label}</span>
        <span className="mt-2 text-2xl font-semibold text-white">{value}</span>
      </div>
    </div>
  )
}








