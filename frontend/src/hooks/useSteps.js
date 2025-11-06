import { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * Custom hook for managing step count and distance tracking
 * @returns {Object} Steps data, loading state, and functions to add steps
 */
export function useSteps() {
  const [activityStats, setActivityStats] = useState({
    steps: 0,
    caloriesBurned: 0,
    distanceKm: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSteps = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/activity/')
      if (response.data) {
        setActivityStats({
          steps: response.data.steps || 0,
          caloriesBurned: response.data.calories_burned || 0,
          distanceKm: response.data.distance_km || 0
        })
      }
    } catch (err) {
      console.error('Error fetching steps:', err)
      setError(err.message)
      // Set defaults on error
      setActivityStats({
        steps: 0,
        caloriesBurned: 0,
        distanceKm: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const addSteps = async (steps) => {
    try {
      if (steps > 0) {
        await api.post(`/api/activity/steps?steps=${steps}`)
        await fetchSteps() // Refresh data
        return { success: true }
      }
      return { success: false, error: 'Steps must be greater than 0' }
    } catch (err) {
      console.error('Error adding steps:', err)
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    fetchSteps()
  }, [])

  return {
    activityStats,
    loading,
    error,
    addSteps,
    refetch: fetchSteps
  }
}


