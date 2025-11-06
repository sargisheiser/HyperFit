import { motion } from 'framer-motion'

/**
 * ProgressBar Component
 * Animated progress bar with neon glow effect
 * 
 * @param {Object} props
 * @param {number} props.value - Current value (0-100)
 * @param {number} props.max - Maximum value (default: 100)
 * @param {string} props.color - Color theme ('green', 'magenta', 'cyan')
 * @param {string} props.label - Optional label
 * @param {string} props.size - Size variant ('sm', 'md', 'lg')
 */
export default function ProgressBar({
  value,
  max = 100,
  color = 'green',
  label,
  size = 'md'
}) {
  const percentage = Math.min((value / max) * 100, 100)
  
  const colorMap = {
    green: '#00FF88',
    magenta: '#9D4EDD',
    cyan: '#00FFFF',
    pink: '#FF007F'
  }
  
  const borderColor = colorMap[color] || color || '#00FF88'
  
  const sizeMap = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6'
  }
  
  const heightClass = sizeMap[size] || sizeMap.md

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm uppercase text-gray-400 tracking-wider">
            {label}
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: borderColor }}
          >
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div
        className={`w-full ${heightClass} bg-black border`}
        style={{
          borderColor: borderColor,
          boxShadow: `inset 0 0 10px ${borderColor}20`
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full ${heightClass}`}
          style={{
            backgroundColor: borderColor,
            boxShadow: `0 0 10px ${borderColor}80, inset 0 0 10px ${borderColor}40`
          }}
        />
      </div>
    </div>
  )
}


