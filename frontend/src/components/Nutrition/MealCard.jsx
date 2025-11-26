import { motion } from 'framer-motion'
import { Clock, Edit2 } from 'lucide-react'
import Card from '../ui/Card'
import StatBlock from '../ui/StatBlock'

export default function MealCard({ meal, onEdit, className }) {
  const calories = meal?.calories ?? meal?.total_calories ?? 0
  const protein = meal?.protein ?? meal?.macronutrients?.protein_grams ?? 0
  const carbs = meal?.carbs ?? meal?.macronutrients?.carbs_grams ?? 0
  const fat = meal?.fat ?? meal?.macronutrients?.fat_grams ?? 0

  const time = meal?.created_at
    ? new Date(meal.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {meal?.image_url && (
            <div className="mb-4 overflow-hidden rounded-xl">
              <img
                src={meal.image_url}
                alt={meal.note || 'Meal'}
                className="h-32 w-full object-cover"
              />
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-white/60">
            {time && (
              <>
                <Clock className="h-3 w-3" />
                <span>{time}</span>
              </>
            )}
          </div>
          {meal?.note && (
            <p className="mt-2 text-sm font-medium text-white">{meal.note}</p>
          )}
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(meal)}
            className="ml-4 rounded-lg bg-[#07110c]/80 p-2 text-[#00FF7F] transition hover:bg-[#00FF7F]/10"
            aria-label="Edit meal"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBlock label="Calories" value={Math.round(calories)} unit="kcal" />
        <StatBlock label="Protein" value={protein.toFixed(1)} unit="g" />
        <StatBlock label="Carbs" value={carbs.toFixed(1)} unit="g" />
        <StatBlock label="Fat" value={fat.toFixed(1)} unit="g" />
      </div>
      {meal?.food_items?.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Food Items</p>
          <div className="flex flex-wrap gap-2">
            {meal.food_items.slice(0, 5).map((item, idx) => (
              <span
                key={idx}
                className="rounded-full bg-[#07110c]/80 px-3 py-1 text-xs text-white/70"
              >
                {item.name || 'Unknown'}
              </span>
            ))}
            {meal.food_items.length > 5 && (
              <span className="rounded-full bg-[#07110c]/80 px-3 py-1 text-xs text-white/40">
                +{meal.food_items.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}



