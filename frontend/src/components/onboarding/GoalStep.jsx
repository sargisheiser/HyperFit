import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

const goals = [
  {
    id: 'build',
    icon: '💪',
    title: 'Muskelaufbau',
    description: 'Kraft und Masse aufbauen',
  },
  {
    id: 'lose',
    icon: '🔥',
    title: 'Fettabbau',
    description: 'Körperfett reduzieren, Muskeln erhalten',
  },
  {
    id: 'maintain',
    icon: '⚖️',
    title: 'Gewicht halten',
    description: 'Deine Form beibehalten',
  },
  {
    id: 'fitness',
    icon: '🏃',
    title: 'Fitness verbessern',
    description: 'Allgemeine Gesundheit steigern',
  },
]

export default function GoalStep({ selectedGoal, onSelect, onNext, onBack }) {
  const handleSelect = (goalId) => {
    onSelect(goalId)
  }

  const handleContinue = () => {
    if (selectedGoal) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Zurück</span>
      </button>

      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Was ist dein Ziel?</h2>
        <p className="text-gray-400">
          Wähle dein Hauptziel – du kannst es später ändern
        </p>
      </div>

      {/* Goal cards */}
      <div className="space-y-3">
        {goals.map((goal, index) => (
          <motion.button
            key={goal.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelect(goal.id)}
            className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
              selectedGoal === goal.id
                ? 'border-[#00FF7F] bg-[#00FF7F]/10'
                : 'border-white/10 bg-[#121b14]/80 hover:border-[#00FF7F]/40'
            }`}
          >
            <span className="text-3xl">{goal.icon}</span>
            <div>
              <h3 className="font-semibold text-white">{goal.title}</h3>
              <p className="text-sm text-gray-400">{goal.description}</p>
            </div>
            {selectedGoal === goal.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto w-6 h-6 rounded-full bg-[#00FF7F] flex items-center justify-center"
              >
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Continue button */}
      <motion.button
        whileHover={{ scale: selectedGoal ? 1.02 : 1 }}
        whileTap={{ scale: selectedGoal ? 0.98 : 1 }}
        onClick={handleContinue}
        disabled={!selectedGoal}
        className={`w-full py-4 px-8 rounded-xl font-bold transition-all ${
          selectedGoal
            ? 'bg-gradient-to-r from-[#00FF7F] to-[#00C46A] text-black shadow-lg shadow-[#00FF7F]/20'
            : 'bg-white/10 text-gray-500 cursor-not-allowed'
        }`}
      >
        Weiter
      </motion.button>
    </div>
  )
}
