import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function WelcomeStep({ firstName, onNext }) {
  return (
    <div className="text-center space-y-8">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="flex justify-center"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00FF7F]/20 to-[#00FF7F]/5 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-[#00FF7F]" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#00FF7F]/30"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h1 className="text-3xl font-bold text-white">
          Willkommen bei HyperFit, {firstName}!
        </h1>
        <p className="text-lg text-gray-400">
          Lass uns dein Training personalisieren
        </p>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-gray-500 max-w-sm mx-auto"
      >
        In wenigen Schritten erstellen wir deinen personalisierten Fitness-Plan
        mit optimierten Kalorien- und Makrozielen.
      </motion.p>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        className="w-full bg-gradient-to-r from-[#00FF7F] to-[#00C46A] text-black font-bold py-4 px-8 rounded-xl shadow-lg shadow-[#00FF7F]/20 transition-all"
      >
        Los geht's
      </motion.button>
    </div>
  )
}
