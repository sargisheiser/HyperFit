import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export default function SubscriptionSuccess() {
  useEffect(() => {
    // Could verify session_id with backend here
  }, [])

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#00FF7F]/30 bg-[#00FF7F]/10"
      >
        <CheckCircle2 className="h-10 w-10 text-[#00FF7F]" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h1 className="text-2xl font-light text-white">Willkommen bei HYPERFIT Pro!</h1>
        <p className="mt-3 text-sm text-white/40">
          Dein Upgrade ist aktiv. Alle Premium-Funktionen sind jetzt freigeschaltet.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <Link
          to="/review"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF7F] to-[#00CC66] px-8 py-3 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90"
        >
          Los geht's
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </div>
  )
}
