import useNutritionStore from '../../store/useNutritionStore'
import useUserStore from '../../store/userStore'
import { calculateDailyCalories } from '../../utils/calorieCalculator'
import Card from '../ui/Card'
import ProgressBar from '../ui/ProgressBar'
import StatBlock from '../ui/StatBlock'

export default function NutritionGoals() {
  const { calorieGoal, calorieIntake, macros } = useNutritionStore()
  const { profile } = useUserStore((state) => ({ profile: state.profile }))
  const { goal } = useNutritionStore((state) => ({ goal: state.checkInData?.goal ?? 'build' }))

  // Calculate AI-recommended values
  const aiCalculated = calculateDailyCalories(profile, goal || 'build')
  
  // Use AI calculated values if available, otherwise fall back to store values
  const targetCalories = aiCalculated.targetCalories || calorieGoal || 2500
  const targetProtein = aiCalculated.targetProtein || macros?.protein?.target || 160
  
  const intake = calorieIntake || 0
  const proteinCurrent = macros?.protein?.current || 0
  
  const caloriesRemaining = Math.max(targetCalories - intake, 0)
  const proteinRemaining = Math.max(targetProtein - proteinCurrent, 0)
  
  const caloriesProgress = targetCalories > 0 ? Math.min((intake / targetCalories) * 100, 100) : 0
  const proteinProgress = targetProtein > 0 ? Math.min((proteinCurrent / targetProtein) * 100, 100) : 0

  return (
    <Card>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-[#8cffc7]">Today</p>
        <h3 className="mt-1 text-xl font-semibold text-white">Ernährungsziele</h3>
        {aiCalculated.explanation && (
          <p className="mt-2 text-xs text-white/50">{aiCalculated.explanation}</p>
        )}
      </div>
      
      {/* Calories Section */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Daily Calories</span>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatBlock
          label="Calories Remaining"
          value={Math.round(caloriesRemaining)}
          unit="kcal"
          hint="Until target"
          valueColor="text-[#00FF7F]"
        />
        <StatBlock
          label="Protein Remaining"
          value={Math.round(proteinRemaining)}
          unit="g"
          hint="Until target"
          valueColor="text-[#00FF7F]"
        />
      </div>
    </Card>
  )
}

