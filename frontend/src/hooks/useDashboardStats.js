import { BrainCircuit, Dumbbell, Flame, Salad } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { useSteps } from './useSteps'

export default function useDashboardStats(enabled = true) {
  const [workouts, setWorkouts] = useState([])
  const [foodLogs, setFoodLogs] = useState([])
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error, setError] = useState(null)
  const { activityStats } = useSteps()

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let isMounted = true
    const fetchStats = async () => {
      setLoading(true)
      try {
        const [workoutRes, foodRes] = await Promise.all([
          api.get('/api/workouts/history').catch(() => ({ data: [] })),
          api.get('/api/food/history').catch(() => ({ data: [] })),
        ])

        if (!isMounted) return
        setWorkouts(Array.isArray(workoutRes.data) ? workoutRes.data : [])
        setFoodLogs(Array.isArray(foodRes.data) ? foodRes.data : [])
        setError(null)
      } catch (err) {
        if (!isMounted) return
        setError(err.response?.data?.detail || err.message || 'Unable to load dashboard data')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchStats()

    return () => {
      isMounted = false
    }
  }, [enabled])

  const stats = useMemo(() => {
    const totalWorkouts = workouts.length
    // Use activityStats.caloriesBurned which includes both steps-based and workout calories
    const totalCaloriesBurned = activityStats?.caloriesBurned || 0
    const latestMeal = foodLogs[0] || null
    const recentMealCalories = latestMeal?.total_calories || 0
    const latestMealName = latestMeal?.food_items?.[0]?.name || 'Upload a meal to analyze'
    const confidenceAvg =
      foodLogs.length > 0
        ? Math.round(
            (foodLogs.reduce((acc, log) => acc + (log.confidence_score || 0), 0) / foodLogs.length) * 100,
          )
        : 0

    return [
      {
        icon: Dumbbell,
        label: 'Total Sessions',
        value: totalWorkouts,
        footnote: 'Tracked with MediaPipe vision',
      },
      {
        icon: Flame,
        label: 'Calories Burned',
        value: `${Math.round(totalCaloriesBurned)} kcal`,
        footnote: 'Total from workouts and activity',
      },
      {
        icon: Salad,
        label: 'Latest Meal',
        value: `${Math.round(recentMealCalories)} kcal`,
        footnote: latestMealName,
      },
      {
        icon: BrainCircuit,
        label: 'AI Confidence',
        value: `${confidenceAvg}%`,
        footnote: 'Average nutrition model certainty',
      },
    ]
  }, [workouts, foodLogs, activityStats])

  const chartData = useMemo(
    () =>
      workouts
        .slice(0, 6)
        .reverse()
        .map((workout) => ({
          label: new Date(workout.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          value: Math.round(workout.calories_burned || 0),
        })),
    [workouts],
  )

  return {
    workouts,
    foodLogs,
    stats,
    chartData,
    loading,
    error,
  }
}
