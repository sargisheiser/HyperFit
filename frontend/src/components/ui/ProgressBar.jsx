import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export default function ProgressBar({
  value,
  max = 100,
  label,
  unit,
  className,
  showValue = true,
  color = '#00FF7F',
}) {
  // Calculate percentage, allow over 100% if value exceeds max
  const percentage = Math.min((value / max) * 100, 100)
  
  // Determine color: red if 100 kcal or more over goal (for calories), otherwise use provided color
  const isOverGoal = value > max
  const overGoalAmount = isOverGoal ? value - max : 0
  const shouldBeRed = isOverGoal && overGoalAmount >= 100 && (label?.toLowerCase().includes('calor') || unit === 'kcal')
  const barColor = shouldBeRed ? '#ef4444' : color // red-500

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-[0.3em] text-[#8cffc7]">{label}</span>
          {showValue && (
            <span className={cn('font-semibold', shouldBeRed ? 'text-red-400' : 'text-white')}>
              {Math.round(value)} {unit && <span className="text-white/60">{unit}</span>}
            </span>
          )}
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#07110c]/80">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Show overflow indicator if over goal */}
        {isOverGoal && (
          <div className="absolute right-0 top-0 h-full w-1 bg-red-500/50" />
        )}
      </div>
      {max && (
        <div className="flex justify-between text-[10px] text-white/40">
          <span>0</span>
          <span>{max}</span>
          {isOverGoal && (
            <span className={shouldBeRed ? 'text-red-400' : 'text-yellow-400'}>
              +{Math.round(overGoalAmount)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}



