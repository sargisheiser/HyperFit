import useNutritionStore from '../../store/useNutritionStore'
import useUserStore from '../../store/userStore'
import { calculateDailyCalories } from '../../utils/calorieCalculator'
import Card from '../ui/Card'
import ProgressBar from '../ui/ProgressBar'

export default function NutritionGoals() {
  const { calorieGoal, calorieIntake, macros } = useNutritionStore()
  const { profile } = useUserStore((state) => ({ profile: state.profile }))
  const { goal } = useNutritionStore((state) => ({ goal: state.checkInData?.goal ?? 'build' }))

  // Use the exact same values as NutritionDashboard
  // Both components should use calorieGoal and macros.protein.target from the store
  // These values come from the backend and are already calculated correctly in nutritionService.js
  const targetCalories = calorieGoal ?? 0
  const targetProtein = macros?.protein?.target ?? 0
  
  // Calculate AI values only for explanation/display purposes (not for actual targets)
  const aiCalculated = profile ? calculateDailyCalories(profile, goal || 'build') : null
  
  const intake = calorieIntake || 0
  const proteinCurrent = macros?.protein?.current || 0

  return (
    <Card>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-[#8cffc7]">Heute</p>
        <h3 className="mt-1 text-xl font-semibold text-white">Ernährungsziele</h3>
        {/* Only show AI explanation if no backend values are available */}
        {aiCalculated?.explanation && !calorieGoal && !macros?.protein?.target && (
          <p className="mt-2 text-xs text-white/50">{aiCalculated.explanation}</p>
        )}
      </div>
      
      {/* Calories Section */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Daily Kalorien</span>
          <span className="text-sm text-white/60">{Math.round(intake)} / {targetCalories} kcal</span>
        </div>
        <ProgressBar value={intake} max={targetCalories} label="Calories" unit="kcal" />
      </div>

      {/* Protein Section */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Daily Protein</span>
          <span className="text-sm text-white/60">{Math.round(proteinCurrent)} / {targetProtein} g</span>
        </div>
        <ProgressBar value={proteinCurrent} max={targetProtein} label="Protein" unit="g" />
      </div>
    </Card>
  )
}

