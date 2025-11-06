import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

/**
 * QuickActionCard Component
 * Interactive card for quick actions (Log Meal, Start Workout, etc.)
 * 
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {string} props.description - Card description
 * @param {string} props.color - Color theme ('green', 'magenta', 'cyan')
 * @param {React.Component} props.icon - Lucide icon component
 * @param {Function} props.onClick - Click handler
 * @param {string} props.navigateTo - Optional route to navigate to
 * @param {React.ReactNode} props.children - Optional custom content
 */
export default function QuickActionCard({
  title,
  description,
  color = 'green',
  icon: Icon,
  onClick,
  navigateTo,
  children
}) {
  const navigate = useNavigate()
  
  const colorMap = {
    green: {
      border: '#00FF88',
      bg: 'rgba(0, 255, 136, 0.1)',
      hoverBg: '#00FF88',
      hoverText: '#000000'
    },
    magenta: {
      border: '#9D4EDD',
      bg: 'rgba(157, 78, 221, 0.1)',
      hoverBg: '#9D4EDD',
      hoverText: '#000000'
    },
    cyan: {
      border: '#00FFFF',
      bg: 'rgba(0, 255, 255, 0.1)',
      hoverBg: '#00FFFF',
      hoverText: '#000000'
    }
  }
  
  const theme = colorMap[color] || colorMap.green

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (navigateTo) {
      navigate(navigateTo)
    }
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="card-cyber text-left relative overflow-hidden group"
      style={{
        borderColor: theme.border,
        boxShadow: `0 0 10px ${theme.border}50, inset 0 0 10px ${theme.border}10`
      }}
    >
      {/* Hover background effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
        style={{
          backgroundColor: theme.hoverBg,
          transform: 'scale(1.1)'
        }}
      />
      
      <div className="relative z-10">
        {/* Header with icon and status indicator */}
        <div className="flex items-center justify-between mb-4">
          {Icon && (
            <Icon
              className="w-10 h-10 transition-transform duration-300 group-hover:scale-110"
              style={{ color: theme.border }}
            />
          )}
          <div
            className="w-3 h-3 transition-all duration-300 group-hover:scale-150"
            style={{
              backgroundColor: theme.border,
              boxShadow: `0 0 10px ${theme.border}`
            }}
          />
        </div>
        
        {/* Title */}
        <h3
          className="text-2xl uppercase mb-2 font-bold transition-colors duration-300"
          style={{ color: theme.border }}
        >
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-sm uppercase text-gray-400 mb-4 tracking-wider">
          {description}
        </p>
        
        {/* Custom content */}
        {children && (
          <div className="mt-4">{children}</div>
        )}
      </div>
    </motion.button>
  )
}


