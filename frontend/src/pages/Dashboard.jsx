import { useEffect } from 'react'
import { Camera } from 'lucide-react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import Card from '../components/ui/Card'
import SectionTitle from '../components/ui/SectionTitle'
import NutritionGoals from '../components/dashboard/NutritionGoals'
import StatBlock from '../components/ui/StatBlock'
import ErrorMessage from '../components/ui/ErrorMessage'
import useDashboardStats from '../hooks/useDashboardStats'
import { useAuth } from '../contexts/AuthContext'
import useUserStore from '../store/userStore'

export default function Dashboard() {
  const { user } = useAuth()
  const { profile, fetchProfile } = useUserStore()
  const { stats, loading, error } = useDashboardStats(true)

  // Load profile if not already loaded
  useEffect(() => {
    if (user && !profile) {
      fetchProfile()
    }
  }, [user, profile, fetchProfile])

  if (loading) {
    return <LoadingSpinner label="Synthesizing your stats" />
  }

  return (
    <div className="space-y-6">
      {/* Header with Camera Icon */}
      <div className="flex items-center justify-between">
        <SectionTitle title="Heute" subtitle="HyperFit Dashboard" />
        <Link
          to="/log"
          className="hidden flex h-12 w-12 items-center justify-center rounded-xl bg-[#121315] text-white shadow-[0_6px_20px_rgba(0,255,127,0.1)] transition hover:shadow-[0_8px_24px_rgba(0,255,127,0.16)]"
          aria-label="Scan meal"
        >
          <Camera className="h-5 w-5" />
        </Link>
      </div>

      {error && (
        <ErrorMessage 
          message={error}
          title="Dashboard konnte nicht geladen werden"
          variant="error"
          dismissible={false}
        />
      )}

      {/* Nutrition Goals - Combined Calories & Protein */}
      <NutritionGoals />

      {/* Today's Workout */}
      {stats && stats.length > 0 && (
        <Card>
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.4em] text-[#8cffc7]">Letzte Aktivität</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Heutiges Training</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.slice(0, 2).map((stat, idx) => (
              <StatBlock
                key={idx}
                label={stat.label}
                value={stat.value}
                hint={stat.footnote}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}


