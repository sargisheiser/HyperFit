import { Link } from 'react-router-dom'
import { Camera, Dumbbell, Plus } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'

export default function QuickActions() {
  return (
    <Card>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-[#8cffc7]">Schnellaktionen</p>
        <h3 className="mt-1 text-xl font-semibold text-white">Starte deine Reise</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/track" className="block">
          <Button variant="secondary" className="w-full" size="lg">
            <Dumbbell className="h-5 w-5" />
            Training
          </Button>
        </Link>
        <Link to="/log" className="block">
          <Button variant="secondary" className="w-full" size="lg">
            <Camera className="h-5 w-5" />
          </Button>
        </Link>
        <Link to="/review" className="block">
          <Button variant="secondary" className="w-full" size="lg">
            <Plus className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </Card>
  )
}



