import { motion } from 'framer-motion'
import ProgressRing from './ProgressRing'
import WeightInput from './WeightInput'
import MacrosSummary from './MacrosSummary'
import useNutritionData from '../../hooks/useNutritionData'

export default function NutritionQuickStats() {
  const { calorieGoal, calorieIntake, macros, isLoading } = useNutritionData()
  const remainingCalories = Math.max((calorieGoal ?? 0) - (calorieIntake ?? 0), 0)
  const progress = calorieGoal ? Math.min(calorieIntake / calorieGoal, 1.2) : 0

  if (isLoading) {
    return (
      <section className="space-y-5 rounded-3xl bg-[#101112] p-6 shadow-[0_10px_24px_rgba(0,255,127,0.08)]">
        <header className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-48 animate-pulse rounded-full bg-white/10" />
            <div className="h-6 w-64 animate-pulse rounded-full bg-white/10" />
          </div>
          <span className="h-6 w-24 animate-pulse rounded-full bg-white/10" />
        </header>
        <div className="grid gap-5 md:grid-cols-[160px,1fr]">
          <div className="flex items-center justify-center">
            <div className="h-40 w-40 animate-pulse rounded-full border border-[#00FF7F]/20 bg-[#07110c]/70" />
          </div>
          <div className="space-y-4">
            <div className="h-16 animate-pulse rounded-2xl bg-[#07110c]/70" />
            <div className="h-32 animate-pulse rounded-2xl bg-[#07110c]/70" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5 rounded-3xl bg-[#101112] p-6 shadow-[0_10px_24px_rgba(0,255,127,0.08)]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[#00FF7F]/70">Heutige Bilanz</p>
          <h3 className="text-xl font-semibold text-white">Tagesübersicht</h3>
        </div>
        <span className="rounded-full border border-[#00FF7F]/30 px-3 py-1 text-xs font-semibold text-[#00FF7F]">
          {Math.round(remainingCalories)} kcal frei
        </span>
      </header>

      <div className="grid gap-5 md:grid-cols-[160px,1fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center"
        >
          <ProgressRing
            progress={progress}
            label="Intake"
            value={`${Math.round(calorieIntake ?? 0)} kcal`}
            accent="#00FF7F"
          />
        </motion.div>
        <div className="space-y-4">
          <WeightInput />
          <MacrosSummary macros={macros} />
          {!calorieGoal && !calorieIntake && (
            <p className="text-xs text-white/40">
              Noch keine Ernährungsdaten für heute. Logge deine erste Mahlzeit oder aktualisiere dein Tagesziel.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
