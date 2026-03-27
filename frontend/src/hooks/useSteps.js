import { useState, useEffect } from 'react'
import api from '../services/api'
import logger from '../utils/logger'

/**
 * Custom hook for managing step count and distance tracking
 * @returns {Object} Steps data, loading state, and functions to add steps
 */
// Track if we've already logged the 404 warning
let hasLogged404 = false

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
        hasLogged404 = false // Reset if endpoint becomes available
      }
    } catch (err) {
      // Silently handle 404 - endpoint might not exist yet
      if (err.response?.status === 404) {
        // Only log once globally, not on every call
        if (!hasLogged404) {
          logger.debug('Activity endpoint not available (404). Using default values.')
          hasLogged404 = true
        }
        setActivityStats({
          steps: 0,
          caloriesBurned: 0,
          distanceKm: 0
        })
        setError(null) // Don't show error for missing endpoint
      } else if (err.code === 'ERR_NETWORK' || err.code === 'ERR_CONNECTION_REFUSED') {
        // Backend not running - use defaults silently (no logging)
        setActivityStats({
          steps: 0,
          caloriesBurned: 0,
          distanceKm: 0
        })
        setError(null) // Don't show error for connection issues
      } else {
        logger.error('Error fetching steps:', err)
        setError(err.message)
        setActivityStats({
          steps: 0,
          caloriesBurned: 0,
          distanceKm: 0
        })
      }
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
      // Silently handle 404 for addSteps too
      if (err.response?.status === 404) {
        return { success: false, error: 'Activity endpoint not available' }
      }
      logger.error('Error adding steps:', err)
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


