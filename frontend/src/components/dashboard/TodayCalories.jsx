import useNutritionStore from '../../store/useNutritionStore'
import useUserStore from '../../store/userStore'
import Card from '../ui/Card'
import ProgressBar from '../ui/ProgressBar'
import StatBlock from '../ui/StatBlock'

export default function TodayCalories() {
  const { calorieGoal, calorieIntake } = useNutritionStore()
  const { dailyCalorieTarget } = useUserStore()

  const target = calorieGoal || dailyCalorieTarget || 2000
  const intake = calorieIntake || 0
  const remaining = Math.max(target - intake, 0)
  const progress = target > 0 ? Math.min((intake / target) * 100, 100) : 0

  return (
    <Card>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-[#8cffc7]">Heute</p>
        <h3 className="mt-1 text-xl font-semibold text-white">Daily Kalorien</h3>
      </div>
      <ProgressBar value={intake} max={target} label="Calories" unit="kcal" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatBlock label="Intake" value={Math.round(intake)} unit="kcal" hint="Heute konsumiert" />
        <StatBlock
          label="Remaining"
          value={Math.round(remaining)}
          unit="kcal"
          hint="Until target"
          valueColor="text-[#00FF7F]"
        />
      </div>
    </Card>
  )
}

