import { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * Custom hook for managing meal logging and AI image recognition
 * @returns {Object} Meal data, loading state, and functions
 */
export function useMeals() {
  const [meals, setMeals] = useState([])
  const [mealCount, setMealCount] = useState(0)
  const [totalCalories, setTotalCalories] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMeals = async (limit = 10) => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/food/history')
      const allMeals = response.data || []
      const mealsData = allMeals.slice(0, limit)
      setMeals(mealsData)
      setMealCount(allMeals.length)
      
      // Calculate total calories
      const total = mealsData.reduce((sum, meal) => sum + (meal.estimated_calories || 0), 0)
      setTotalCalories(total)
    } catch (err) {
      console.error('Error fetching meals:', err)
      setError(err.message)
      setMeals([])
      setMealCount(0)
      setTotalCalories(0)
    } finally {
      setLoading(false)
    }
  }

  const createMeal = async (mealData) => {
    try {
      console.warn('Manual meal logging is not yet supported by the backend.', mealData)
      return { success: false, error: 'Manual meal logging is not yet supported.' }
    } catch (err) {
      console.error('Error creating meal:', err)
      return { success: false, error: err.message }
    }
  }

  const analyzeMealImage = async (imageFile) => {
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      
      const response = await api.post('/api/food/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      return { success: true, data: response.data }
    } catch (err) {
      console.error('Error analyzing meal image:', err)
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    fetchMeals()
  }, [])

  return {
    meals,
    mealCount,
    totalCalories,
    loading,
    error,
    createMeal,
    analyzeMealImage,
    refetch: fetchMeals
  }
}


