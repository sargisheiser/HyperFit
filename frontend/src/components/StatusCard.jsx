import { motion } from 'framer-motion'

/**
 * StatusCard Component
 * Displays a single stat with icon, label, value, and neon glow effect
 * 
 * @param {Object} props
 * @param {string} props.label - Label text (e.g., "MEALS LOGGED")
 * @param {string|number} props.value - Value to display
 * @param {string} props.suffix - Optional suffix (e.g., "KCAL", "KM")
 * @param {string} props.color - Color theme ('green', 'magenta', 'cyan', or custom hex)
 * @param {React.Component} props.icon - Lucide icon component
 * @param {number} props.delay - Animation delay in seconds
 */
export default function StatusCard({ 
  label, 
  value, 
  suffix = '', 
  color = 'green',
  icon: Icon,
  delay = 0 
}) {
  const colorMap = {
    green: '#00FF88',
    magenta: '#9D4EDD',
    cyan: '#00FFFF',
    pink: '#FF007F'
  }
  
  const borderColor = colorMap[color] || color || '#00FF88'
  const glowColor = colorMap[color] || color || '#00FF88'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="card-cyber relative group"
      style={{
        borderColor: borderColor,
        boxShadow: `0 0 10px ${glowColor}50, inset 0 0 10px ${glowColor}10`
      }}
    >
      {/* Hover glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: `0 0 30px ${glowColor}80, inset 0 0 30px ${glowColor}20`
        }}
      />
      
      <div className="relative z-10">
        {/* Header with icon and status indicator */}
        <div className="flex items-center justify-between mb-4">
          {Icon && (
            <Icon 
              className="w-8 h-8 transition-transform duration-300 group-hover:scale-110" 
              style={{ color: borderColor }} 
            />
          )}
          <div
            className="w-3 h-3 animate-pulse"
            style={{
              backgroundColor: borderColor,
              boxShadow: `0 0 10px ${glowColor}`
            }}
          />
        </div>
        
        {/* Label */}
        <div className="text-sm uppercase mb-2 text-gray-400 tracking-wider">
          {label}
        </div>
        
        {/* Value */}
        <div className="flex items-baseline space-x-2">
          <span
            className="text-4xl font-bold transition-all duration-300 group-hover:scale-105"
            style={{ color: borderColor }}
          >
            {value}
          </span>
          {suffix && (
            <span className="text-lg text-gray-400 uppercase tracking-wider">
              {suffix}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}


