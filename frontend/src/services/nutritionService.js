import api from './api'
import { calculateDailyCalories } from '../utils/calorieCalculator'

export const DEFAULT_SNAPSHOT = {
  calorieGoal: 0,
  calorieIntake: 0,
  macros: {
    protein: { target: 0, current: 0 },
    carbs: { target: 0, current: 0 },
    fat: { target: 0, current: 0 },
  },
  weight: null,
  bodyFat: null,
  history: [],
  compliance: null,
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Calculate total calories from macronutrients
 * Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g
 */
export function calculateCaloriesFromMacros(macros) {
  if (!macros) return 0
  
  const protein = toNumber(macros.protein?.current ?? macros.protein ?? 0)
  const carbs = toNumber(macros.carbs?.current ?? macros.carbs ?? 0)
  const fat = toNumber(macros.fat?.current ?? macros.fat ?? 0)
  
  return Math.round(protein * 4 + carbs * 4 + fat * 9)
}

const parseJSONMaybe = (value) => {
  if (!value) return undefined
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (error) {
    console.warn('Unable to parse JSON payload', value)
    return undefined
  }
}

export function normalizeMealPayload(payload = {}) {
  const meal = payload.meal ?? payload.analysis ?? payload
  if (!meal || typeof meal !== 'object') {
    return {
      id: null,
      user_id: payload.user_id ?? null,
      date: null,
      calories: 0,
      total_calories: 0,
      macronutrients: {
        protein_grams: 0,
        carbs_grams: 0,
        fat_grams: 0,
      },
      protein: 0,
      carbs: 0,
      fat: 0,
      note: '',
      image_url: null,
      food_items: [],
      confidence_score: null,
      insights: [],
      recommendations: [],
      source: 'vision',
    }
  }

  const parsedMacros = parseJSONMaybe(meal.macronutrients) ?? meal.macronutrients ?? meal.macros ?? {}

  const proteinGrams = toNumber(
    parsedMacros.protein_grams ?? parsedMacros.protein ?? meal.protein ?? meal.protein_grams,
  )
  const carbsGrams = toNumber(parsedMacros.carbs_grams ?? parsedMacros.carbs ?? meal.carbs ?? meal.carbs_grams)
  const fatGrams = toNumber(parsedMacros.fat_grams ?? parsedMacros.fat ?? meal.fat ?? meal.fat_grams)
  const calories = toNumber(meal.total_calories ?? meal.calories ?? parsedMacros.calories)

  const rawFoodItems = meal.food_items ?? meal.items
  const foodItems = Array.isArray(rawFoodItems)
    ? rawFoodItems
    : parseJSONMaybe(rawFoodItems) ?? []

  const normalizedFoodItems = foodItems.map((item = {}) => {
    const name = item.name ?? item.label ?? item.title ?? 'Unbenannte Zutat'
    const quantity = item.quantity ?? item.portion ?? item.amount ?? item.size ?? null
    const calories = toNumber(item.calories ?? item.kcal ?? item.energy, null)
    const protein = toNumber(
      item.protein_grams ?? item.protein ?? item.macros?.protein ?? item.nutrition?.protein,
      null,
    )
    const carbs = toNumber(item.carbs_grams ?? item.carbs ?? item.macros?.carbs ?? item.nutrition?.carbs, null)
    const fat = toNumber(item.fat_grams ?? item.fat ?? item.macros?.fat ?? item.nutrition?.fat, null)
    const confidence = typeof item.confidence === 'number' ? item.confidence : undefined

    return {
      name,
      quantity,
      calories,
      protein_grams: protein,
      carbs_grams: carbs,
      fat_grams: fat,
      confidence,
      source: item.source ?? meal.source ?? payload.source ?? null,
    }
  })

  // Handle image_path from backend (convert to image_url if needed)
  const imagePath = meal.image_path ?? meal.image_url ?? meal.imageUrl ?? null
  const imageUrl = imagePath 
    ? (imagePath.startsWith('http') 
        ? imagePath 
        : imagePath.startsWith('/') 
          ? imagePath 
          : `/uploads/${imagePath.replace(/^\/?uploads\//, '')}`)
    : null

  // For meals from the meals table (which don't have food_items), create a summary food item
  let finalFoodItems = normalizedFoodItems
  if (normalizedFoodItems.length === 0 && calories > 0) {
    // Create a summary food item for meals without detailed food items
    finalFoodItems = [{
      name: meal.note || 'Mahlzeit',
      quantity: null,
      calories: calories,
      protein_grams: proteinGrams,
      carbs_grams: carbsGrams,
      fat_grams: fatGrams,
      confidence: null,
      source: meal.source ?? payload.source ?? 'manual',
    }]
  }

  return {
    id: meal.id ?? meal.meal_id ?? null,
    user_id: meal.user_id ?? payload.user_id ?? null,
    date: meal.date ?? meal.logged_at ?? meal.created_at ?? null,
    created_at: meal.created_at ?? meal.date ?? meal.logged_at ?? null, // Add created_at for history display
    calories,
    total_calories: calories,
    macronutrients: {
      protein_grams: proteinGrams,
      carbs_grams: carbsGrams,
      fat_grams: fatGrams,
    },
    protein: proteinGrams,
    carbs: carbsGrams,
    fat: fatGrams,
    note: meal.note ?? '',
    image_url: imageUrl,
    image_path: imagePath, // Keep original path as well
    food_items: finalFoodItems,
    confidence_score: meal.confidence_score ?? meal.confidenceScore ?? null,
    insights: meal.insights ?? [],
    recommendations: meal.recommendations ?? [],
    source: meal.source ?? payload.source ?? (normalizedFoodItems.length > 0 ? 'vision' : 'manual'),
    is_manual: meal.is_manual ?? (normalizedFoodItems.length === 0),
    is_corrected: meal.is_corrected ?? false,
  }
}

export function mapDailyNutritionToSnapshot(payload) {
  if (!payload) {
    return DEFAULT_SNAPSHOT
  }

  // Support multiple field name variations from backend
  const caloriesGoal = toNumber(
    payload.calories_goal ?? 
    payload.calorie_goal ?? 
    payload.daily_calorie_target ?? 
    payload.target_calories ?? 
    0
  )
  
  // Debug: Log all possible calorie fields
  console.debug('[Nutrition] Mapping calories - payload fields:', {
    calories_consumed: payload.calories_consumed,
    calorie_intake: payload.calorie_intake,
    calories_intake: payload.calories_intake,
    total_calories: payload.total_calories,
    intake: payload.intake,
    calories: payload.calories,
  })
  
  // First, try to get calories from payload
  let caloriesConsumed = toNumber(
    payload.calories_consumed ?? 
    payload.calorie_intake ?? 
    payload.calories_intake ?? 
    payload.total_calories ?? 
    payload.intake ??
    payload.calories ?? // Add calories as fallback
    0
  )
  
  // Support macro variations - check for nested macros object first
  const macrosData = payload.macros ?? payload.macronutrients ?? {}
  
  // Extract protein values
  // Backend returns protein/carbs/fat as consumed values, not targets
  // Targets are calculated from weight and calories_goal
  const proteinCurrent = toNumber(
    macrosData.protein?.current ??
    macrosData.protein?.consumed ??
    payload.protein_current ??
    payload.protein_consumed ??
    payload.protein_intake ??
    payload.protein ?? // Backend returns this as consumed value
    0
  )
  
  const proteinTarget = toNumber(
    macrosData.protein?.target ??
    payload.protein_target ??
    payload.protein_goal ??
    payload.daily_protein_target ??
    payload.target_protein ??
    payload.protein_grams ??
    0
  )
  
  // Extract carbs values
  const carbsCurrent = toNumber(
    macrosData.carbs?.current ??
    macrosData.carbs?.consumed ??
    macrosData.carbohydrates?.current ??
    payload.carbs_current ??
    payload.carbs_consumed ??
    payload.carbs_intake ??
    payload.carbs ?? // Backend returns this as consumed value
    0
  )
  
  const carbsTarget = toNumber(
    macrosData.carbs?.target ??
    macrosData.carbohydrates?.target ??
    payload.carbs_target ??
    payload.carbs_goal ??
    payload.daily_carbs_target ??
    payload.target_carbs ??
    payload.carbs_grams ??
    0
  )
  
  // Extract fat values
  const fatCurrent = toNumber(
    macrosData.fat?.current ??
    macrosData.fat?.consumed ??
    payload.fat_current ??
    payload.fat_consumed ??
    payload.fat_intake ??
    payload.fat ?? // Backend returns this as consumed value
    0
  )
  
  const fatTarget = toNumber(
    macrosData.fat?.target ??
    payload.fat_target ??
    payload.fat_goal ??
    payload.daily_fat_target ??
    payload.target_fat ??
    payload.fat_grams ??
    0
  )

  // Calculate calories from macros if calories are missing/zero
  if ((caloriesConsumed === 0 || !caloriesConsumed) && (proteinCurrent > 0 || carbsCurrent > 0 || fatCurrent > 0)) {
    const calculatedFromMacros = Math.round(proteinCurrent * 4 + carbsCurrent * 4 + fatCurrent * 9)
    caloriesConsumed = calculatedFromMacros
    console.debug('[Nutrition] Calculated calories from macros:', calculatedFromMacros)
  }
  
  const weight = payload.weight ?? payload.body_weight ?? payload.profile?.weight_kg ?? null
  const date = payload.date ?? payload.logged_date ?? null
  const compliance = payload.compliance ?? payload.adherence ?? null
  
  // Get profile for target calculation
  const profile = payload.profile ?? null

  // Calculate macro targets if not provided
  // Backend stores protein/carbs/fat as consumed values, not targets
  // We need to calculate targets based on weight and calorie goal
  let calculatedProteinTarget = proteinTarget
  let calculatedCarbsTarget = carbsTarget
  let calculatedFatTarget = fatTarget

  // If we have profile data, use AI-calculated targets first
  if (profile && (!proteinTarget || !carbsTarget || !fatTarget)) {
    try {
      const goal = payload.goal || 'build'
      const aiCalculated = calculateDailyCalories(profile, goal)
      
      // Use AI-calculated targets if available and not already set
      if (aiCalculated.targetProtein && !proteinTarget) {
        calculatedProteinTarget = aiCalculated.targetProtein
      }
      if (aiCalculated.targetCarbs && !carbsTarget) {
        calculatedCarbsTarget = aiCalculated.targetCarbs
      }
      if (aiCalculated.targetFat && !fatTarget) {
        calculatedFatTarget = aiCalculated.targetFat
      }
      
      // Use AI-calculated calorie goal if backend doesn't have one
      if (!caloriesGoal && aiCalculated.targetCalories) {
        // Note: This would need to be handled in the calling function
      }
    } catch (e) {
      console.warn('[Nutrition] Failed to calculate AI targets:', e)
    }
  }
  
  // If targets are still not provided, calculate them based on weight and calorie goal
  if ((!calculatedProteinTarget || !calculatedCarbsTarget || !calculatedFatTarget) && weight && caloriesGoal > 0) {
    // Protein: 2.2g per kg bodyweight (for muscle building)
    if (!calculatedProteinTarget) {
      calculatedProteinTarget = Math.round(weight * 2.2)
    }
    
    // Fat: 25-30% of calories (use 25% for calculation)
    if (!calculatedFatTarget) {
      calculatedFatTarget = Math.round((caloriesGoal * 0.25) / 9) // 9 kcal per gram
    }
    
    // Carbs: Remaining calories
    if (!calculatedCarbsTarget) {
      const proteinCalories = calculatedProteinTarget * 4 // 4 kcal per gram
      const fatCalories = calculatedFatTarget * 9 // 9 kcal per gram
      const remainingCalories = Math.max(caloriesGoal - proteinCalories - fatCalories, 0)
      calculatedCarbsTarget = Math.round(remainingCalories / 4) // 4 kcal per gram
    }
  }

  // Build macros object - use consumed values from backend, calculated targets if needed
  const macros = {
    protein: {
      target: calculatedProteinTarget || Math.round(proteinCurrent * 1.5) || 0, // Fallback if no target
      current: Math.round(proteinCurrent),
    },
    carbs: {
      target: calculatedCarbsTarget || Math.round(carbsCurrent * 1.5) || 0, // Fallback if no target
      current: Math.round(carbsCurrent),
    },
    fat: {
      target: calculatedFatTarget || Math.round(fatCurrent * 1.5) || 0, // Fallback if no target
      current: Math.round(fatCurrent),
    },
  }
  
  console.debug('[Nutrition] Mapped macros:', {
    protein: { target: macros.protein.target, current: macros.protein.current },
    carbs: { target: macros.carbs.target, current: macros.carbs.current },
    fat: { target: macros.fat.target, current: macros.fat.current },
    rawMacros: payload.macros,
    rawMacronutrients: payload.macronutrients,
  })

  const history = date
    ? [
        {
          date,
          calories: Math.round(caloriesConsumed),
          compliance,
        },
      ]
    : []

  return {
    calorieGoal: Math.round(caloriesGoal),
    calorieIntake: Math.round(caloriesConsumed),
    macros,
    weight,
    bodyFat: null,
    history,
    compliance,
  }
}

export async function fetchNutritionSnapshot(userId, profile = null, targetDate = null) {
  if (!userId) {
    return DEFAULT_SNAPSHOT
  }

  try {
    const params = {}
    if (targetDate) {
      // Format date as YYYY-MM-DD
      const dateStr = targetDate instanceof Date 
        ? targetDate.toISOString().split('T')[0]
        : targetDate
      params.date = dateStr
    }
    const { data } = await api.get(`/api/nutrition/daily/${userId}`, { params })
    console.debug('[Nutrition] Fetched snapshot:', { userId, rawData: data })
    console.debug('[Nutrition] Raw calories_consumed:', data?.calories_consumed)
    console.debug('[Nutrition] Raw protein:', data?.protein)
    console.debug('[Nutrition] Raw carbs:', data?.carbs)
    console.debug('[Nutrition] Raw fat:', data?.fat)
    
    // If profile is provided, use it to calculate targets based on activity level
    const snapshotData = profile ? { ...data, profile } : data
    
    // If calorie_goal is 0 or missing, calculate from profile activity level
    if (profile && (!data.calories_goal || data.calories_goal === 0)) {
      try {
        const goal = 'build' // Default goal, could be from checkInData
        const aiCalculated = calculateDailyCalories(profile, goal)
        snapshotData.calories_goal = aiCalculated.targetCalories
        console.debug('[Nutrition] Calculated calorie goal from activity level:', aiCalculated.targetCalories)
      } catch (e) {
        console.warn('[Nutrition] Failed to calculate calorie goal from activity level:', e)
      }
    }
    
    const mapped = mapDailyNutritionToSnapshot(snapshotData)
    console.debug('[Nutrition] Mapped snapshot:', mapped)
    console.debug('[Nutrition] Mapped calorieIntake:', mapped.calorieIntake)
    console.debug('[Nutrition] Mapped macros:', mapped.macros)
    console.debug('[Nutrition] Mapped protein current:', mapped.macros?.protein?.current)
    console.debug('[Nutrition] Mapped carbs current:', mapped.macros?.carbs?.current)
    console.debug('[Nutrition] Mapped fat current:', mapped.macros?.fat?.current)
    return mapped
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn('[Nutrition] No snapshot found for user:', userId)
      return DEFAULT_SNAPSHOT
    }
    console.error('Failed to load nutrition snapshot', error)
    throw error
  }
}

export async function updateDailyNutrition(payload) {
  const { data } = await api.post('/api/nutrition/update', payload)
  return mapDailyNutritionToSnapshot(data)
}

export async function updateWeight({ userId, weight }) {
  const { data } = await api.post('/api/nutrition/weight', {
    user_id: userId,
    weight,
  })
  console.debug('[Nutrition] Weight updated:', { userId, weight, response: data })
  
  // If backend returns updated snapshot, return it for store update
  if (data?.daily || data?.snapshot) {
    return mapDailyNutritionToSnapshot(data.daily ?? data.snapshot ?? data)
  }
  
  return data
}

export async function requestCalorieOptimization(userId) {
  if (!userId) {
    return {
      previous: 0,
      suggested: 0,
      difference: 0,
      explanation: 'Mel­de dich an, um Kalorienempfehlungen zu erhalten.',
    }
  }

  const { data } = await api.get('/api/nutrition/ai_optimize', {
    params: { user_id: userId },
  })

  return {
    previous: Math.round(data.current_calories ?? 0),
    suggested: Math.round(data.recommended_calories ?? 0),
    difference: Math.round((data.recommended_calories ?? 0) - (data.current_calories ?? 0)),
    explanation: data.reasoning,
  }
}

export async function submitCheckIn({
  userId,
  goal,
  bodyFat,
  caloriesPrevious,
  caloriesNew,
  compliance,
}) {
  if (!userId) {
    throw new Error('userId is required for check-in')
  }

  const checkInPayload = {
    user_id: userId,
    goal,
    body_fat: bodyFat,
    calories_previous: caloriesPrevious,
    calories_new: caloriesNew,
    compliance,
  }

  const { data } = await api.post('/api/nutrition/checkin', checkInPayload)
  const optimization = await requestCalorieOptimization(userId)

  return {
    checkin: data,
    recommendation: optimization.explanation,
    suggestedCalories: optimization.suggested,
    optimization,
  }
}

export async function fetchRecipes(userId) {
  const { data } = await api.get('/api/nutrition/recipes', {
    params: { user_id: userId },
  })
  return data?.suggestions ?? []
}

export async function analyzeMealVision({ userId, file, note }) {
  if (!userId) {
    throw new Error('userId is required for vision analysis')
  }

  const formData = new FormData()
  formData.append('user_id', userId)
  if (note) {
    formData.append('note', note)
  }
  if (file) {
    formData.append('image', file)
  }

  const { data } = await api.post('/api/vision/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  console.debug('[Vision] /api/vision/analyze response', data)

  return normalizeMealPayload(data?.meal ?? data?.analysis ?? data)
}

export async function saveAnalyzedMeal({ userId, calories, protein, carbs, fat, note, imageUrl }, profile = null) {
  const payload = {
    user_id: userId,
    calories,
    protein,
    carbs,
    fat,
    note,
    image_url: imageUrl,
  }

  const { data } = await api.post('/api/nutrition/meals/add', payload)
  console.debug('[Nutrition] /api/nutrition/meals/add response', data)
  
  // Map daily snapshot - support various response structures
  const dailyData = data.daily ?? data.daily_snapshot ?? data.snapshot ?? data
  console.debug('[Nutrition] Daily data to map:', dailyData)
  console.debug('[Nutrition] Daily data calories_consumed:', dailyData?.calories_consumed)
  console.debug('[Nutrition] Daily data protein:', dailyData?.protein)
  
  // Include profile for target calculation
  const snapshotData = profile ? { ...dailyData, profile } : dailyData
  const mappedSnapshot = mapDailyNutritionToSnapshot(snapshotData)
  console.debug('[Nutrition] Mapped snapshot:', mappedSnapshot)
  console.debug('[Nutrition] Mapped calorieIntake:', mappedSnapshot.calorieIntake)
  console.debug('[Nutrition] Mapped protein current:', mappedSnapshot.macros?.protein?.current)
  
  return {
    status: data.status,
    meal: normalizeMealPayload(data.meal),
    dailySnapshot: mappedSnapshot,
  }
}

export async function fetchMealHistory(userId, { limit = 20 } = {}) {
  if (!userId) {
    console.warn('[Nutrition] fetchMealHistory called without userId')
    return []
  }

  try {
    // Use /api/nutrition/meals/history which reads from the meals table where meals are actually stored
    const { data } = await api.get('/api/nutrition/meals/history', {
      params: { user_id: userId, limit }
    })
    
    // Debug: Log raw response
    console.debug('[Nutrition] Raw API response:', { data, dataType: typeof data, isArray: Array.isArray(data) })
    
    let meals = []
    // The response should be MealReadList with structure: { user_id, meals: [...] }
    if (Array.isArray(data?.meals)) {
      meals = data.meals.map((meal) => normalizeMealPayload(meal))
    } else if (Array.isArray(data)) {
      meals = data.map((meal) => normalizeMealPayload(meal))
    } else if (data && typeof data === 'object') {
      // Handle case where data might be wrapped in an object
      console.warn('[Nutrition] Unexpected data format:', data)
      meals = []
    }
    
    // Limit is already applied by the backend, but apply again if needed
    if (limit && meals.length > limit) {
      meals = meals.slice(0, limit)
    }
    
    console.debug('[Nutrition] Fetched meal history:', { 
      userId, 
      mealCount: meals.length, 
      rawCount: Array.isArray(data) ? data.length : (data?.meals?.length || 0),
      meals: meals.slice(0, 2) // Log first 2 for debugging
    })
    return meals
  } catch (error) {
    console.error('[Nutrition] Failed to load meal history', error)
    console.error('[Nutrition] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      userId
    })
    return []
  }
}

/**
 * Aggregate meal history to calculate daily totals
 * Filters meals by today's date and sums up calories and macros
 */
export function aggregateMealHistory(meals, targetDate = new Date()) {
  if (!Array.isArray(meals) || meals.length === 0) {
    return {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      mealCount: 0,
    }
  }

  // Filter meals for today
  const today = new Date(targetDate)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayMeals = meals.filter((meal) => {
    if (!meal.created_at && !meal.date) return false
    const mealDate = new Date(meal.created_at ?? meal.date)
    return mealDate >= today && mealDate < tomorrow
  })

  console.debug('[Nutrition] Aggregating meals for today:', {
    totalMeals: meals.length,
    todayMeals: todayMeals.length,
    date: today.toISOString(),
  })

  // Sum up calories and macros
  const totals = todayMeals.reduce(
    (acc, meal) => {
      const calories = toNumber(meal.total_calories ?? meal.calories ?? 0)
      const macros = meal.macronutrients ?? {}
      const protein = toNumber(macros.protein_grams ?? macros.protein ?? meal.protein ?? 0)
      const carbs = toNumber(macros.carbs_grams ?? macros.carbs ?? meal.carbs ?? 0)
      const fat = toNumber(macros.fat_grams ?? macros.fat ?? meal.fat ?? 0)

      return {
        totalCalories: acc.totalCalories + calories,
        totalProtein: acc.totalProtein + protein,
        totalCarbs: acc.totalCarbs + carbs,
        totalFat: acc.totalFat + fat,
        mealCount: acc.mealCount + 1,
      }
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, mealCount: 0 },
  )

  console.debug('[Nutrition] Aggregated totals:', totals)

  return totals
}