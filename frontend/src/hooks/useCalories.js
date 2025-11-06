import { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * Custom hook for managing calorie tracking (in/out/net)
 * @returns {Object} Calorie balance data and loading state
 */
export function useCalories() {
  const [calorieBalance, setCalorieBalance] = useState({
    caloriesIn: 0,
    caloriesOut: 0,
    netCalories: 0,
    steps: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCalorieBalance = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/activity/calorie-balance')
      if (response.data) {
        setCalorieBalance({
          caloriesIn: response.data.calories_in || 0,
          caloriesOut: response.data.calories_out || 0,
          netCalories: response.data.net_calories || 0,
          steps: response.data.steps || 0
        })
      }
    } catch (err) {
      console.error('Error fetching calorie balance:', err)
      setError(err.message)
      // Set defaults on error
      setCalorieBalance({
        caloriesIn: 0,
        caloriesOut: 0,
        netCalories: 0,
        steps: 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalorieBalance()
  }, [])

  return {
    calorieBalance,
    loading,
    error,
    refetch: fetchCalorieBalance
  }
}


