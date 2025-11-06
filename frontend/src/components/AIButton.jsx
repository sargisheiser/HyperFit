import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

/**
 * AIButton Component
 * Top-right AI assistant button with modal
 * 
 * @param {Object} props
 * @param {Function} props.onOpen - Callback when modal opens
 */
export default function AIButton({ onOpen }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleClick = () => {
    setIsOpen(true)
    if (onOpen) {
      onOpen()
    }
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <>
      {/* Floating AI Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className="fixed top-20 right-6 z-50 px-6 py-3 bg-black border-2 border-cyan-500 text-cyan-500 uppercase font-bold tracking-wider shadow-lg hover:bg-cyan-500 hover:text-black transition-all duration-300 flex items-center gap-2"
        style={{
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 20px rgba(0, 255, 255, 0.1)',
          fontFamily: "'Orbitron', sans-serif"
        }}
      >
        <Sparkles className="w-5 h-5" />
        <span>⚙ HyperAI</span>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl p-6 bg-black border-4 border-cyan-500"
              style={{
                boxShadow: '0 0 40px rgba(0, 255, 255, 0.6), inset 0 0 40px rgba(0, 255, 255, 0.1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-3xl uppercase font-bold tracking-wider"
                  style={{
                    color: '#00FFFF',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                    fontFamily: "'Orbitron', sans-serif"
                  }}
                >
                  ⚙ HyperAI Assistant
                </h2>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-cyan-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Content */}
              <div className="space-y-4">
                <p className="text-gray-300 text-lg">
                  Ask HyperAI for personalized fitness insights
                </p>
                <p className="text-gray-400">
                  This feature will connect to the AI assistant endpoint for personalized 
                  fitness recommendations, meal suggestions, and workout analysis.
                </p>
                
                {/* Placeholder for future AI chat interface */}
                <div className="mt-6 p-4 border border-cyan-500/30 bg-cyan-500/5">
                  <p className="text-cyan-400 text-sm uppercase tracking-wider">
                    Coming Soon: Interactive AI Chat
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}


