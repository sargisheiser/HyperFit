import { cn } from '../../utils/cn'

export default function StatBlock({ label, value, unit, hint, className, valueColor = 'text-white' }) {
  return (
    <div className={cn('rounded-[20px] bg-[#07110c]/80 p-4 shadow-[0_12px_24px_rgba(0,255,127,0.08)]', className)}>
      <p className="text-[11px] uppercase tracking-[0.35em] text-[#8cffc7]">{label}</p>
      <p className={cn('mt-3 text-lg font-semibold', valueColor)}>
        {value}
        {unit && <span className="ml-1 text-sm text-white/60">{unit}</span>}
      </p>
      {hint && <p className="mt-2 text-[11px] text-[#9bfcd0]/80">{hint}</p>}
    </div>
  )
}



