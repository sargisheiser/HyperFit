import { Camera, QrCode, PenSquare } from 'lucide-react'

const modes = [
  { id: 'foto', label: 'Foto', icon: Camera },
  { id: 'barcode', label: 'Barcode', icon: QrCode },
  { id: 'manuell', label: 'Manuell', icon: PenSquare },
]

export default function ModeToggle({ activeMode, onModeChange }) {
  return (
    <div className="mb-6 flex gap-1 rounded-xl border border-white/6 bg-white/3 p-1">
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onModeChange(id)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
            activeMode === id
              ? 'bg-[#00FF7F]/10 text-[#00FF7F]'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
