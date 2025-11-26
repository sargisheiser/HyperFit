import { cn } from '../../utils/cn'

export default function SectionTitle({ title, subtitle, className, action }) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        {subtitle && <p className="text-xs uppercase tracking-[0.4em] text-[#00FF7F]/70">{subtitle}</p>}
        <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}



