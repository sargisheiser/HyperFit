import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Tooltip Component
 * Hover tooltip with neon styling
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Trigger element
 * @param {string} props.content - Tooltip text
 * @param {string} props.position - Position ('top', 'bottom', 'left', 'right')
 */
export default function Tooltip({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute z-50 ${positionClasses[position]}`}
          >
            <div
              className="px-3 py-2 bg-black border border-cyan-500 text-white text-sm uppercase whitespace-nowrap"
              style={{
                boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                fontFamily: "'Rajdhani', sans-serif"
              }}
            >
              {content}
              {/* Arrow */}
              <div
                className={`absolute w-2 h-2 bg-black border-r border-b border-cyan-500 ${
                  position === 'top' ? 'top-full left-1/2 transform -translate-x-1/2 rotate-45 -mt-1' :
                  position === 'bottom' ? 'bottom-full left-1/2 transform -translate-x-1/2 rotate-45 -mb-1' :
                  position === 'left' ? 'left-full top-1/2 transform -translate-y-1/2 rotate-45 -ml-1' :
                  'right-full top-1/2 transform -translate-y-1/2 rotate-45 -mr-1'
                }`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


