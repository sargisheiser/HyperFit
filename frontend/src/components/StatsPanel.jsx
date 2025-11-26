import { motion } from 'framer-motion'
import NeonCard from './NeonCard'

const fallbackGrid = (items) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {items.map(({ icon: Icon, label, value, footnote }, index) => (
      <motion.div
        key={`${label}-${index}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <NeonCard className="group h-full">
          <div className="flex h-full flex-col gap-4 rounded-2xl bg-[#0f111a]/80 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">{label}</p>
              {Icon && <Icon className="h-5 w-5 text-[#00FF7F]" />}
            </div>
            <span className="text-3xl font-semibold text-white">{value}</span>
            {footnote && <p className="text-xs text-white/45">{footnote}</p>}
          </div>
        </NeonCard>
      </motion.div>
    ))}
  </div>
)

const faces = (items) => items.slice(0, 4)
const extraItems = (items) => items.slice(4)

export function CubeStats({ items = [], className = '' }) {
  const activeFaces = faces(items)
 
   if (activeFaces.length < 4) {
     return fallbackGrid(items)
   }
 
   return (
    <div className={`mx-auto w-full ${className}`}>
      <div className="relative overflow-hidden rounded-[40px] border border-[#00FF7F]/25 bg-gradient-to-br from-[#09110c] via-[#050807] to-[#030405]">
        <div className="pointer-events-none absolute inset-0 rounded-[40px] bg-gradient-to-br from-[#00ff7f0d] via-transparent to-[#00ff7f05]" />
        <div className="relative m-6 rounded-[28px] border border-[#00FF7F]/20 bg-[#07100b]/60 p-1">
          <div className="grid grid-cols-2 gap-4 p-5">
            {activeFaces.map(({ icon: Icon, label, value, footnote }, index) => (
              <motion.div
                key={`${label}-${index}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.35, ease: 'easeOut' }}
                className="flex flex-col justify-between rounded-[24px] border border-[#00FF7F]/26 bg-gradient-to-br from-[#101c15]/95 via-[#0a150f]/92 to-[#050807]/92 p-6 text-[#d0ffe8] shadow-[0_18px_36px_rgba(0,255,127,0.12)] backdrop-blur-sm"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-[#8cffc7]">
                  <span>{label}</span>
                  {Icon && <Icon className="h-5 w-5 text-[#00FF7F]" />}
                </div>
                <span className="text-4xl font-semibold text-white drop-shadow-[0_0_12px_rgba(0,255,127,0.25)]">{value}</span>
                {footnote && <p className="text-xs text-[#9bfcd0]">{footnote}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StatsPanel({ items = [] }) {
  const activeFaces = faces(items)
  const extras = extraItems(items)

  if (activeFaces.length < 4) {
    return fallbackGrid(items)
  }

  return (
    <div className="space-y-6">
      <div className="md:hidden">{fallbackGrid(items)}</div>
      <div className="hidden md:block">
        <CubeStats items={activeFaces} />
      </div>
      {extras.length > 0 && fallbackGrid(extras)}
    </div>
  )
}











