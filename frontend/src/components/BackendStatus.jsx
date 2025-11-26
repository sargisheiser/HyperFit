import { useState, useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/api'

/**
 * Global component to show backend connection status
 * Only displays when backend is unreachable
 */
export default function BackendStatus() {
  const [isOffline, setIsOffline] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  const checkBackend = async () => {
    setIsChecking(true)
    try {
      // Try /docs endpoint (FastAPI always has this) - more reliable than /health
      await api.get('/docs', { timeout: 2000 })
      setIsOffline(false)
    } catch (error) {
      // Check if it's a connection error
      if (
        error.code === 'ERR_NETWORK' ||
        error.code === 'ERR_CONNECTION_REFUSED' ||
        error.message?.includes('CONNECTION') ||
        (!error.response && error.code !== 'ERR_BAD_REQUEST')
      ) {
        setIsOffline(true)
      } else {
        // Server responded (even with 404) = backend is online
        setIsOffline(false)
      }
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Check on mount
    checkBackend()

    // Check periodically (every 30 seconds)
    const interval = setInterval(checkBackend, 30000)

    return () => clearInterval(interval)
  }, [])

  if (!isOffline) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 z-50 w-[90%] max-w-2xl -translate-x-1/2"
      >
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200 shadow-[0_0_20px_rgba(255,193,7,0.2)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-400" />
            <div className="flex-1">
              <p className="font-medium text-yellow-100">Backend Server Not Reachable</p>
              <p className="mt-1 text-xs text-yellow-200/80">
                The backend server is not running or not accessible at{' '}
                <code className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[10px]">
                  http://localhost:8000
                </code>
              </p>
              <div className="mt-2 space-y-1 text-xs text-yellow-200/70">
                <p>• Start the backend server:</p>
                <code className="block rounded bg-yellow-500/20 px-2 py-1 font-mono text-[10px]">
                  ./start_backend.sh
                </code>
                <p className="mt-2">• Or manually:</p>
                <code className="block rounded bg-yellow-500/20 px-2 py-1 font-mono text-[10px]">
                  cd backend && uvicorn backend.main:app --reload
                </code>
              </div>
            </div>
            <button
              onClick={() => setIsOffline(false)}
              className="flex-shrink-0 rounded-lg p-1 text-yellow-200/60 transition hover:bg-yellow-500/20 hover:text-yellow-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

