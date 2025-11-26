/**
 * Calculate daily calorie needs based on user profile data
 * Uses Mifflin-St Jeor Equation for BMR calculation
 * Then applies activity multiplier and goal-specific adjustments
 */

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
 */
function calculateBMR(weight, height, age, gender) {
  // Weight in kg, height in cm, age in years
  if (!weight || !height || !age) return null
  
  // Mifflin-St Jeor Equation
  // Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
  // Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
  
  const baseBMR = 10 * weight + 6.25 * height - 5 * age
  const genderAdjustment = gender === 'female' ? -161 : 5
  
  return baseBMR + genderAdjustment
}

/**
 * Activity multipliers
 */
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,      // Little to no exercise
  light: 1.375,        // Light exercise 1-3 days/week
  moderate: 1.55,      // Moderate exercise 3-5 days/week
  active: 1.725,       // Hard exercise 6-7 days/week
  very_active: 1.9,    // Very hard exercise, physical job
}

/**
 * Goal-specific calorie adjustments
 */
const GOAL_ADJUSTMENTS = {
  build: 500,      // Muscle gain: +500 kcal surplus
  maintain: 0,     // Maintenance: no adjustment
  recomp: 200,     // Recomposition: slight surplus
  lose: -500,      // Fat loss: -500 kcal deficit
}

/**
 * Calculate daily calorie target based on user profile
 * @param {Object} profile - User profile data
 * @param {string} goal - Fitness goal (build, maintain, recomp, lose)
 * @returns {Object} Calculated values
 */
export function calculateDailyCalories(profile, goal = 'build') {
  const {
    weight_kg: weight,
    height_cm: height,
    age,
    gender,
    activity_level: activityLevel = 'moderate',
  } = profile || {}

  // Calculate age from birth_date if age not provided
  let calculatedAge = age
  if (!calculatedAge && profile?.birth_date) {
    const birthDate = new Date(profile.birth_date)
    const today = new Date()
    calculatedAge = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--
    }
  }

  if (!weight || !height || !calculatedAge) {
    // Return default values if insufficient data
    return {
      bmr: null,
      tdee: null,
      targetCalories: 2500,
      targetProtein: 160,
      targetCarbs: 300,
      targetFat: 80,
      explanation: 'Bitte vervollständige dein Profil (Gewicht, Größe, Alter) für präzise Berechnungen.',
    }
  }

  // Calculate BMR
  const bmr = calculateBMR(weight, height, calculatedAge, gender)
  
  // Calculate TDEE (Total Daily Energy Expenditure)
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate
  const tdee = bmr * activityMultiplier
  
  // Apply goal-specific adjustment
  const goalAdjustment = GOAL_ADJUSTMENTS[goal] || GOAL_ADJUSTMENTS.build
  const targetCalories = Math.round(tdee + goalAdjustment)
  
  // Calculate macros for muscle building
  // Protein: 2.2g per kg bodyweight (for muscle building)
  const targetProtein = Math.round(weight * 2.2)
  
  // Carbs: 40-50% of calories (for muscle building and recovery)
  const targetCarbs = Math.round((targetCalories * 0.45) / 4) // 4 kcal per gram
  
  // Fat: Remaining calories (25-30% of calories)
  const targetFat = Math.round((targetCalories * 0.25) / 9) // 9 kcal per gram

  // Generate explanation
  const goalLabels = {
    build: 'Muskelaufbau',
    maintain: 'Gewicht halten',
    recomp: 'Rekomposition',
    lose: 'Fettabbau',
  }
  
  const explanation = `Basierend auf deinem Gewicht (${weight}kg), Größe (${height}cm), Alter (${calculatedAge}J) und Aktivitätslevel (${activityLevel}) berechnet für ${goalLabels[goal] || 'Muskelaufbau'}.`

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    explanation,
  }
}

/**
 * Get recommended calories for different goals
 */
export function getRecommendedCaloriesForGoals(profile) {
  const goals = ['build', 'maintain', 'recomp', 'lose']
  return goals.reduce((acc, goal) => {
    acc[goal] = calculateDailyCalories(profile, goal)
    return acc
  }, {})
}

