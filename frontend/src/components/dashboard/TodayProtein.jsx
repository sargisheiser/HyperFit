import useNutritionStore from '../../store/useNutritionStore'
import useUserStore from '../../store/userStore'
import Card from '../ui/Card'
import ProgressBar from '../ui/ProgressBar'
import StatBlock from '../ui/StatBlock'

export default function TodayProtein() {
  const { macros } = useNutritionStore()
  const { dailyProteinTarget } = useUserStore()

  const target = macros?.protein?.target || dailyProteinTarget || 150
  const current = macros?.protein?.current || 0
  const remaining = Math.max(target - current, 0)
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0

  return (
    <Card>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-[#8cffc7]">Today</p>
        <h3 className="mt-1 text-xl font-semibold text-white">Daily Protein</h3>
      </div>
      <ProgressBar value={current} max={target} label="Protein" unit="g" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatBlock label="Intake" value={Math.round(current)} unit="g" hint="Consumed today" />
        <StatBlock
          label="Remaining"
          value={Math.round(remaining)}
          unit="g"
          hint="Until target"
          valueColor="text-[#00FF7F]"
        />
      </div>
    </Card>
  )
}

