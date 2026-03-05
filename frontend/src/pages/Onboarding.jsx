import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useUserStore } from '../store/userStore'
import OnboardingProgress from '../components/onboarding/OnboardingProgress'
import WelcomeStep from '../components/onboarding/WelcomeStep'
import GoalStep from '../components/onboarding/GoalStep'
import MetricsStep from '../components/onboarding/MetricsStep'
import FeaturesStep from '../components/onboarding/FeaturesStep'
import CompleteStep from '../components/onboarding/CompleteStep'

const TOTAL_STEPS = 5

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const updateProfile = useUserStore((state) => state.updateProfile)

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [data, setData] = useState({
    goal: null,
    height: null,
    weight: null,
    age: null,
    activityLevel: null,
    gender: null,
  })

  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'Nutzer'

  const updateData = (newData) => {
    setData((prev) => ({ ...prev, ...newData }))
  }

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      setDirection(1)
      setStep((s) => s + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }

  const calculateTargets = () => {
    const { weight, height, age, gender, activityLevel, goal } = data

    // Mifflin-St Jeor formula
    const bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : -161)

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    }

    const tdee = bmr * activityMultipliers[activityLevel]

    // Adjust for goal
    const calorieAdjustments = {
      build: 300,      // Surplus
      lose: -500,      // Deficit
      maintain: 0,
      fitness: 0,
    }

    const dailyCalorieTarget = Math.round(tdee + (calorieAdjustments[goal] || 0))

    // Protein calculation based on goal
    const proteinMultipliers = {
      build: 2.0,      // g per kg
      lose: 2.2,       // Higher to preserve muscle
      maintain: 1.8,
      fitness: 1.6,
    }

    const dailyProteinTarget = Math.round(weight * (proteinMultipliers[goal] || 1.8))

    return { dailyCalorieTarget, dailyProteinTarget, tdee: Math.round(tdee) }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const { dailyCalorieTarget, dailyProteinTarget } = calculateTargets()

      // Convert age to birth_date (approximate: Jan 1 of birth year)
      const birthYear = new Date().getFullYear() - data.age
      const birthDate = `${birthYear}-01-01`

      // Update profile with all onboarding data
      // Note: Backend expects height_cm, weight_kg, fitness_goals (array)
      await updateProfile({
        fitness_goals: [data.goal], // Backend expects array
        height_cm: data.height,
        weight_kg: data.weight,
        birth_date: birthDate,
        activity_level: data.activityLevel,
        gender: data.gender,
        daily_calorie_target: dailyCalorieTarget,
        daily_protein_target: dailyProteinTarget,
        onboarding_complete: true,
      })

      // Navigate to dashboard
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Failed to save onboarding data:', err)
      setError('Fehler beim Speichern. Bitte versuche es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  const renderStep = () => {
    const targets = step === TOTAL_STEPS ? calculateTargets() : null

    switch (step) {
      case 1:
        return <WelcomeStep firstName={firstName} onNext={nextStep} />
      case 2:
        return (
          <GoalStep
            selectedGoal={data.goal}
            onSelect={(goal) => updateData({ goal })}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 3:
        return (
          <MetricsStep
            data={data}
            onUpdate={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 4:
        return <FeaturesStep onNext={nextStep} onBack={prevStep} />
      case 5:
        return (
          <CompleteStep
            data={data}
            targets={targets}
            onComplete={handleComplete}
            onBack={prevStep}
            isSubmitting={isSubmitting}
            error={error}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f0a] to-[#000] flex flex-col">
      {/* Progress indicator */}
      <div className="pt-6 px-6">
        <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
