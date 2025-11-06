import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

/**
 * DashboardLayout Component
 * Main layout wrapper for dashboard pages with consistent styling
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Optional subtitle
 */
export default function DashboardLayout({ children, title, subtitle }) {
  const { user } = useAuth()

  return (
    <div 
      className="min-h-screen bg-black text-white p-4 relative"
      style={{ fontFamily: "'VT323', monospace" }}
    >
      {/* Grid Background Effect */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        {(title || user) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {title && (
              <h1
                className="text-5xl uppercase tracking-wider mb-2 font-bold"
                style={{
                  color: '#00FF88',
                  textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                  fontFamily: "'Orbitron', sans-serif"
                }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xl text-gray-400 uppercase tracking-wider">
                {subtitle}
              </p>
            )}
            {user && !title && (
              <p className="text-xl text-gray-400 uppercase tracking-wider">
                USER: {user.username?.toUpperCase() || 'UNKNOWN'}
              </p>
            )}
          </motion.div>
        )}
        
        {/* Content */}
        {children}
      </div>
    </div>
  )
}


