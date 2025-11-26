import { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * Custom hook for managing workout session tracking
 * @returns {Object} Workout data, loading state, and functions
 */
export function useWorkouts() {
  const [workouts, setWorkouts] = useState([])
  const [workoutCount, setWorkoutCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWorkouts = async (limit = 10) => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/workouts/history')
      const allWorkouts = response.data || []
      const workoutsData = allWorkouts.slice(0, limit)
      setWorkouts(workoutsData)
      setWorkoutCount(allWorkouts.length)
    } catch (err) {
      console.error('Error fetching workouts:', err)
      setError(err.message)
      setWorkouts([])
      setWorkoutCount(0)
    } finally {
      setLoading(false)
    }
  }

  const createWorkout = async (workoutData) => {
    try {
      const response = await api.post('/api/workouts/history', workoutData)
      await fetchWorkouts() // Refresh list
      return { success: true, data: response.data }
    } catch (err) {
      console.error('Error creating workout:', err)
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    fetchWorkouts()
  }, [])

  return {
    workouts,
    workoutCount,
    loading,
    error,
    createWorkout,
    refetch: fetchWorkouts
  }
}


