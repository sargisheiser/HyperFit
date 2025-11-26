import { useCallback, useEffect, useState } from 'react'
import { fetchRecipes } from '../services/nutritionService'

export default function useNutritionRecipes(userId) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const suggestions = await fetchRecipes(userId)
      setRecipes(suggestions)
    } catch (error) {
      console.error('Failed to load recipe suggestions', error)
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  return { recipes, loading, reload }
}







