import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { Utensils, Dumbbell, TrendingUp, Calendar } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    meals: 0,
    workouts: 0,
    totalCalories: 0,
    recentMeals: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [mealsRes, workoutsRes] = await Promise.all([
        api.get('/api/meals/?limit=10'),
        api.get('/api/workouts/?limit=10')
      ])

      const meals = mealsRes.data || []
      const workouts = workoutsRes.data || []
      
      const totalCalories = meals.reduce((sum, meal) => sum + (meal.estimated_calories || 0), 0)

      setStats({
        meals: meals.length,
        workouts: workouts.length,
        totalCalories,
        recentMeals: meals.slice(0, 5)
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.username || user?.full_name}!
        </h1>
        <p className="mt-2 text-gray-600">Here's your fitness overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 rounded-lg p-3">
              <Utensils className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Meals Tracked</p>
              <p className="text-2xl font-bold text-gray-900">{stats.meals}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
              <Dumbbell className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Workouts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.workouts}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Calories</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(stats.totalCalories)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Meals</h2>
        {stats.recentMeals.length === 0 ? (
          <p className="text-gray-500">No meals tracked yet. Start by uploading a meal image!</p>
        ) : (
          <div className="space-y-4">
            {stats.recentMeals.map((meal) => (
              <div key={meal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{meal.name || 'Meal'}</p>
                  <p className="text-sm text-gray-500">
                    {meal.estimated_calories ? `${Math.round(meal.estimated_calories)} cal` : 'No data'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(meal.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
