import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'

const overlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const panel = {
  hidden: { opacity: 0, scale: 0.94, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.94, y: 20 },
}

export default function CalorieOptimizerModal({ open, onClose, suggestion, onAccept, onDecline }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
          variants={overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-[#111113] p-8 text-white shadow-[0_0_40px_rgba(0,255,127,0.2)]"
            variants={panel}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full border border-[#00FF7F]/20 bg-[#07110c]/70 p-2 text-[#9fffcf] transition hover:border-[#00FF7F]/40 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-[#00FF7F]/80">Kalorienoptimierung</p>
              <h2 className="text-2xl font-semibold">HyperFit hat deinen Plan angepasst</h2>
              <p className="text-sm text-white/70">
                Basierend auf deinem letzten Check-In und den Trainingsdaten empfehlen wir eine Feinjustierung deiner
                täglichen Kalorien.
              </p>

              <div className="rounded-2xl border border-white/10 bg-[#0A0B0C]/80 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Empfehlung</p>
                <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-white/60">Bisher</p>
                    <p className="text-2xl font-semibold text-white">{suggestion.previous} kcal</p>
                  </div>
                  <ArrowRight className="hidden h-5 w-5 text-[#00FF7F] md:block" />
                  <div>
                    <p className="text-sm text-white/60">Neu</p>
                    <p className="text-2xl font-semibold text-[#00FF7F]">{suggestion.suggested} kcal</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#00FF7F]">
                  Unterschied: {suggestion.difference > 0 ? '+' : ''}
                  {suggestion.difference} kcal
                </p>
                <p className="mt-2 text-sm text-white/60">{suggestion.explanation}</p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                <button
                  onClick={onDecline}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/20"
                >
                  Ablehnen
                </button>
                <button
                  onClick={onAccept}
                  className="rounded-full border border-transparent bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  Annehmen
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}




