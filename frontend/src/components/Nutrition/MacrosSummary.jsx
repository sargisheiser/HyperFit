import { motion } from 'framer-motion'

const bars = [
  { key: 'protein', label: 'Protein', color: '#00FF7F' },
  { key: 'carbs', label: 'Carbs', color: '#50BFFE' },
  { key: 'fat', label: 'Fett', color: '#FF7F50' },
]

export default function MacrosSummary({ macros }) {
  if (!macros) return null
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#121315] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Makronährstoffe</p>
        <span className="text-xs text-white/50">heute</span>
      </div>

      <div className="space-y-3">
        {bars.map((bar) => {
          const macro = macros[bar.key]
          const target = Math.round(macro?.target ?? 0)
          const current = Math.round(macro?.current ?? 0)
          const progress =
            target > 0 ? Math.min(Math.max(current / target, 0), 1.2) : 0
          const remaining = Math.max(target - current, 0)
          
          return (
            <div key={bar.key} className="space-y-2">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>{bar.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{current}g</span>
                  <span className="text-white/40">/</span>
                  <span className="text-white/60">{target}g</span>
                  {remaining > 0 && (
                    <span className="text-xs text-white/40">({remaining}g verbleibend)</span>
                  )}
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${bar.color}, rgba(0,255,127,0.5))` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

