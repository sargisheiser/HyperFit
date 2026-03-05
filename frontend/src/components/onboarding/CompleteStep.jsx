import { motion } from 'framer-motion'
import { ArrowLeft, Check, Camera, LayoutDashboard, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const goalLabels = {
  build: 'Muskelaufbau',
  lose: 'Fettabbau',
  maintain: 'Gewicht halten',
  fitness: 'Fitness verbessern',
}

export default function CompleteStep({ data, targets, onComplete, onBack, isSubmitting, error }) {
  const navigate = useNavigate()

  const handleScanMeal = async () => {
    await onComplete()
    // After successful completion, navigate to meal analyzer
    navigate('/nutrition?panel=analyzer', { replace: true })
  }

  const handleGoToDashboard = async () => {
    await onComplete()
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        disabled={isSubmitting}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Zurück</span>
      </button>

      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="flex justify-center"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00FF7F]/20 to-[#00FF7F]/5 flex items-center justify-center">
            <Check className="w-12 h-12 text-[#00FF7F]" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#00FF7F]/30"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Dein Plan ist bereit!</h2>
        <p className="text-gray-400">Basierend auf deinen Angaben:</p>
      </div>

      {/* Calculated targets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#121b14]/80 rounded-2xl p-6 space-y-4 border border-[#00FF7F]/20"
      >
        {/* Goal */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Ziel</span>
          <span className="font-semibold text-white">{goalLabels[data.goal]}</span>
        </div>

        <div className="h-px bg-white/10" />

        {/* Daily calories */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Tägliches Kalorienziel</span>
          <span className="font-bold text-[#00FF7F] text-xl">
            {targets?.dailyCalorieTarget?.toLocaleString('de-DE')} kcal
          </span>
        </div>

        {/* Daily protein */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Proteinziel</span>
          <span className="font-bold text-[#00D4FF] text-xl">
            {targets?.dailyProteinTarget}g
          </span>
        </div>

        <div className="h-px bg-white/10" />

        {/* TDEE info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Grundumsatz (TDEE)</span>
          <span className="text-gray-400">{targets?.tdee?.toLocaleString('de-DE')} kcal</span>
        </div>
      </motion.div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
        >
          {error}
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Primary CTA - Scan meal */}
        <motion.button
          whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          onClick={handleScanMeal}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-[#00FF7F] to-[#00C46A] text-black font-bold py-4 px-8 rounded-xl shadow-lg shadow-[#00FF7F]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Speichern...</span>
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span>Erste Mahlzeit scannen</span>
            </>
          )}
        </motion.button>

        {/* Secondary CTA - Dashboard */}
        <motion.button
          whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          onClick={handleGoToDashboard}
          disabled={isSubmitting}
          className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Zum Dashboard</span>
        </motion.button>
      </div>
    </div>
  )
}
