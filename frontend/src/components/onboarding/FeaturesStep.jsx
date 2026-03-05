import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, Dumbbell, Bot } from 'lucide-react'

const features = [
  {
    id: 1,
    icon: Camera,
    title: 'KI-Mahlzeitenerkennung',
    description: 'Fotografiere dein Essen – HyperFit analysiert Kalorien und Makros automatisch',
    color: '#00FF7F',
  },
  {
    id: 2,
    icon: Dumbbell,
    title: 'Intelligentes Workout-Tracking',
    description: 'Echtzeit-Formanalyse und automatische Wiederholungszählung',
    color: '#00D4FF',
  },
  {
    id: 3,
    icon: Bot,
    title: 'Dein persönlicher KI-Coach',
    description: 'Frag alles über Training, Ernährung und deine Ziele',
    color: '#9D4EDD',
  },
]

export default function FeaturesStep({ onNext, onBack }) {
  const [currentFeature, setCurrentFeature] = useState(0)

  const nextFeature = () => {
    if (currentFeature < features.length - 1) {
      setCurrentFeature((f) => f + 1)
    } else {
      onNext()
    }
  }

  const prevFeature = () => {
    if (currentFeature > 0) {
      setCurrentFeature((f) => f - 1)
    }
  }

  const feature = features[currentFeature]
  const Icon = feature.icon
  const isLastFeature = currentFeature === features.length - 1

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={currentFeature === 0 ? onBack : prevFeature}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Zurück</span>
        </button>
        <button
          onClick={onNext}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          Überspringen
        </button>
      </div>

      {/* Feature content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentFeature}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="text-center space-y-6 py-8"
        >
          {/* Icon */}
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="relative"
            >
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}05)`,
                }}
              >
                <Icon
                  className="w-16 h-16"
                  style={{ color: feature.color }}
                />
              </div>
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${feature.color}30` }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">{feature.title}</h2>
            <p className="text-gray-400 max-w-sm mx-auto">{feature.description}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots indicator */}
      <div className="flex items-center justify-center gap-2">
        {features.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentFeature(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentFeature
                ? 'w-6 bg-[#00FF7F]'
                : 'w-2 bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Continue button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={nextFeature}
        className="w-full bg-gradient-to-r from-[#00FF7F] to-[#00C46A] text-black font-bold py-4 px-8 rounded-xl shadow-lg shadow-[#00FF7F]/20 transition-all flex items-center justify-center gap-2"
      >
        {isLastFeature ? 'Fertig' : 'Weiter'}
        {!isLastFeature && <ArrowRight className="w-5 h-5" />}
      </motion.button>
    </div>
  )
}
