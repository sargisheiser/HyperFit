import { motion } from 'framer-motion'

export default function OnboardingProgress({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1
        const isActive = stepNum === currentStep
        const isCompleted = stepNum < currentStep

        return (
          <motion.div
            key={stepNum}
            className={`h-2 rounded-full transition-all duration-300 ${
              isActive
                ? 'w-8 bg-[#00FF7F]'
                : isCompleted
                ? 'w-2 bg-[#00FF7F]/60'
                : 'w-2 bg-white/20'
            }`}
            initial={false}
            animate={{
              scale: isActive ? 1 : 0.9,
              opacity: isActive || isCompleted ? 1 : 0.5,
            }}
          />
        )
      })}
    </div>
  )
}
