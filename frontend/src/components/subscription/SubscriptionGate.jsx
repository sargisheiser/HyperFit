import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'
import api from '../../services/api'
import logger from '../../utils/logger'

export default function SubscriptionGate({ children, feature = 'diese Funktion' }) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const { data } = await api.get('/api/subscriptions/me')
        setSubscription(data)
      } catch (err) {
        logger.error('[SubscriptionGate] Failed to fetch status:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  if (loading) return children
  if (subscription?.is_premium) return children

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none blur-sm">{children}</div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#0a0a0f]/80 backdrop-blur-sm">
        <div className="mx-4 max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#00FF7F]/10">
            <Lock className="h-5 w-5 text-[#00FF7F]" />
          </div>
          <h3 className="text-lg font-medium text-white">Premium Funktion</h3>
          <p className="mt-2 text-sm text-white/40">
            Upgrade auf HYPERFIT Pro, um {feature} freizuschalten.
          </p>
          <Link
            to="/pricing"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF7F] to-[#00CC66] px-6 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" />
            Upgrade ansehen
          </Link>
        </div>
      </div>
    </div>
  )
}
