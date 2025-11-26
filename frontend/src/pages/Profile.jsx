import { useEffect, useState } from 'react'
import { Camera, Settings, User, Save, Edit2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import useUserStore from '../store/userStore'
import useNutritionStore from '../store/useNutritionStore'
import { fetchNutritionSnapshot } from '../services/nutritionService'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import StatBlock from '../components/ui/StatBlock'
import SectionTitle from '../components/ui/SectionTitle'
import ProgressBar from '../components/ui/ProgressBar'

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
  { value: 'light', label: 'Light', desc: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Active', desc: 'Hard exercise 6-7 days/week' },
  { value: 'very_active', label: 'Very Active', desc: 'Very hard exercise, physical job' },
]

export default function Profile() {
  const { user } = useAuth()
  const {
    profile,
    name,
    age,
    height,
    weight,
    activityLevel,
    dailyCalorieTarget,
    dailyProteinTarget,
    units,
    notifications,
    language,
    isLoading,
    error,
    fetchProfile,
    updateProfile,
    updateSettings,
  } = useUserStore()
  const { setWeight, setCalorieGoal, calorieGoal } = useNutritionStore((state) => ({
    setWeight: state.setWeight,
    setCalorieGoal: state.setCalorieGoal,
    calorieGoal: state.calorieGoal,
  }))

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    age: null,
    height: null,
    weight: null,
    gender: '',
    activityLevel: 'moderate',
    dailyCalorieTarget: 2000,
    dailyProteinTarget: 150,
  })

  useEffect(() => {
    if (user && !profile) {
      fetchProfile()
    }
  }, [user, profile, fetchProfile])

  useEffect(() => {
    if (profile) {
      // Calculate age from birth_date if available
      let calculatedAge = null
      if (profile.birth_date) {
        const birthDate = new Date(profile.birth_date)
        const today = new Date()
        calculatedAge = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--
        }
      }

      // Convert height from cm to selected unit
      let displayHeight = null
      if (profile.height_cm) {
        if (units.height === 'inch') {
          displayHeight = profile.height_cm / 2.54
        } else {
          displayHeight = profile.height_cm
        }
      }

      // Convert weight from kg to selected unit
      let displayWeight = null
      if (profile.weight_kg) {
        if (units.weight === 'lbs') {
          displayWeight = profile.weight_kg * 2.20462
        } else {
          displayWeight = profile.weight_kg
        }
      }

      // Use calorieGoal from nutrition store if available, otherwise use profile value
      const targetCalories = calorieGoal || dailyCalorieTarget || profile?.daily_calorie_target || 2000
      
      setFormData({
        name: profile.full_name || profile.username || '',
        age: calculatedAge || age || null,
        height: displayHeight || height || null,
        weight: displayWeight || weight || null,
        gender: profile.gender || '',
        activityLevel: profile.activity_level || activityLevel || 'moderate',
        dailyCalorieTarget: targetCalories,
        dailyProteinTarget: dailyProteinTarget || profile?.daily_protein_target || 150,
      })
      
      // Sync calorieGoal from nutrition store if it differs from profile
      if (calorieGoal && calorieGoal !== profile?.daily_calorie_target) {
        // Update nutrition store with profile value, or keep nutrition store value if it's more recent
        // For now, we'll sync nutrition store to profile when saving
      }
    }
  }, [profile, name, age, height, weight, activityLevel, dailyCalorieTarget, dailyProteinTarget, units, calorieGoal])

  const handleSave = async () => {
    // Map form data to API format
    const apiData = {
      full_name: formData.name || null,
      gender: formData.gender || null,
      activity_level: formData.activityLevel || null,
      daily_calorie_target: formData.dailyCalorieTarget || null,
      daily_protein_target: formData.dailyProteinTarget || null,
    }
    
    // Check if activity level changed - this will trigger target recalculation
    const activityLevelChanged = formData.activityLevel !== activityLevel
    const calorieTargetChanged = formData.dailyCalorieTarget !== dailyCalorieTarget

    // Convert height to cm if needed
    if (formData.height) {
      if (units.height === 'inch') {
        // Convert inches to cm
        apiData.height_cm = Math.round(formData.height * 2.54)
      } else {
        // Already in cm
        apiData.height_cm = Math.round(formData.height)
      }
    } else {
      apiData.height_cm = null
    }

    // Convert weight to kg if needed
    let weightInKg = null
    if (formData.weight) {
      if (units.weight === 'lbs') {
        // Convert lbs to kg
        weightInKg = Math.round(formData.weight / 2.20462)
      } else {
        // Already in kg
        weightInKg = Math.round(formData.weight)
      }
      apiData.weight_kg = weightInKg
    } else {
      apiData.weight_kg = null
    }

    // Calculate birth_date from age if age is provided
    if (formData.age) {
      const today = new Date()
      const birthYear = today.getFullYear() - formData.age
      apiData.birth_date = `${birthYear}-01-01` // Approximate birth date
    }

      const result = await updateProfile(apiData)
      if (result.success) {
        // Sync weight to nutrition store if weight was updated
        if (weightInKg !== null && user?.id) {
          try {
            await setWeight(weightInKg)
            console.debug('[Profile] Weight synced to nutrition store:', weightInKg)
          } catch (error) {
            console.warn('[Profile] Failed to sync weight to nutrition store:', error)
            // Don't fail the whole operation if nutrition sync fails
          }
        }
        
        // Sync calorie goal to nutrition store if it was updated
        if (calorieTargetChanged && formData.dailyCalorieTarget) {
          try {
            setCalorieGoal(formData.dailyCalorieTarget)
            console.debug('[Profile] Calorie goal synced to nutrition store:', formData.dailyCalorieTarget)
          } catch (error) {
            console.warn('[Profile] Failed to sync calorie goal to nutrition store:', error)
          }
        }
        
        // If activity level or other relevant fields changed, trigger nutrition data refresh to recalculate targets
        if ((activityLevelChanged || weightInKg !== null) && user?.id) {
          try {
            // Refresh nutrition data to recalculate targets based on new activity level
            const updatedProfile = result.data
            const freshSnapshot = await fetchNutritionSnapshot(user.id, updatedProfile)
            const { setDailySnapshot } = useNutritionStore.getState()
            setDailySnapshot(freshSnapshot, { profile: updatedProfile, forceRecalculate: activityLevelChanged })
            console.debug('[Profile] Nutrition targets recalculated based on updated profile data')
          } catch (error) {
            console.warn('[Profile] Failed to recalculate nutrition targets:', error)
            // Don't fail the whole operation if target recalculation fails
          }
        }
        
        setIsEditing(false)
      }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const displayWeight = weight ? (units.weight === 'kg' ? weight : (weight * 2.20462).toFixed(1)) : '—'
  const displayHeight = height ? (units.height === 'cm' ? height : (height / 2.54).toFixed(1)) : '—'

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Profile"
        subtitle="HyperFit User"
        action={
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
            {isEditing ? 'Save' : 'Edit'}
          </Button>
        }
      />

      {error && (
        <Card className="border border-red-500/30 bg-red-500/10">
          <p className="text-sm text-red-200">{error}</p>
        </Card>
      )}

      {/* Profile Header */}
      <Card>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#00FF7F]/20 to-[#00C46A]/20">
              {name ? (
                <span className="text-3xl font-semibold text-[#00FF7F]">{name.charAt(0).toUpperCase()}</span>
              ) : (
                <User className="h-12 w-12 text-[#00FF7F]" />
              )}
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 rounded-full bg-[#00FF7F] p-2 text-[#0A0B0C] shadow-lg">
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full rounded-xl bg-[#07110c]/80 px-4 py-2 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
                placeholder="Your name"
              />
            ) : (
              <h3 className="text-2xl font-semibold text-white">{name || 'HyperFit User'}</h3>
            )}
            <p className="mt-1 text-sm text-white/60">{user?.email || ''}</p>
          </div>
        </div>
      </Card>

      {/* Personal Info */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-white">Personal Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Age</label>
            {isEditing ? (
              <input
                type="number"
                value={formData.age || ''}
                onChange={(e) => handleInputChange('age', parseInt(e.target.value) || null)}
                className="w-full rounded-xl bg-[#07110c]/80 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
                placeholder="Age"
              />
            ) : (
              <p className="text-lg font-semibold text-white">{age || '—'}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Height</label>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => handleInputChange('height', parseFloat(e.target.value) || null)}
                  className="flex-1 rounded-xl bg-[#07110c]/80 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
                  placeholder="Height"
                />
                <select
                  value={units.height}
                  onChange={(e) => updateSettings({ units: { ...units, height: e.target.value } })}
                  className="rounded-xl bg-[#07110c]/80 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
                >
                  <option value="cm">cm</option>
                  <option value="inch">inch</option>
                </select>
              </div>
            ) : (
              <p className="text-lg font-semibold text-white">
                {displayHeight} {units.height}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Weight</label>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || null)}
                  className="flex-1 rounded-xl bg-[#07110c]/80 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
                  placeholder="Weight"
                />
                <select
                  value={units.weight}
                  onChange={(e) => updateSettings({ units: { ...units, weight: e.target.value } })}
                  className="rounded-xl bg-[#07110c]/80 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
            ) : (
              <p className="text-lg font-semibold text-white">
                {displayWeight} {units.weight}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Gender</label>
            {isEditing ? (
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full rounded-xl bg-[#07110c]/80 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            ) : (
              <p className="text-lg font-semibold text-white">
                {formData.gender ? formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1) : '—'}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Activity Level</label>
            {isEditing ? (
              <select
                value={formData.activityLevel}
                onChange={(e) => handleInputChange('activityLevel', e.target.value)}
                className="w-full rounded-xl bg-[#07110c]/80 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
              >
                {ACTIVITY_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label} - {level.desc}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-lg font-semibold text-white">
                {ACTIVITY_LEVELS.find((l) => l.value === activityLevel)?.label || 'Moderate'}
              </p>
            )}
          </div>
        </div>
        {isEditing && (
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </Card>

      {/* Daily Targets */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-white">Daily Targets</h3>
        <div className="space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Calorie Target</label>
                <input
                  type="number"
                  value={formData.dailyCalorieTarget || ''}
                  onChange={(e) => handleInputChange('dailyCalorieTarget', parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl bg-[#07110c]/80 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Protein Target</label>
                <input
                  type="number"
                  value={formData.dailyProteinTarget || ''}
                  onChange={(e) => handleInputChange('dailyProteinTarget', parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl bg-[#07110c]/80 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
                />
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <StatBlock
                label="Calorie Target"
                value={dailyCalorieTarget}
                unit="kcal"
                hint="Daily calorie goal"
              />
              <StatBlock
                label="Protein Target"
                value={dailyProteinTarget}
                unit="g"
                hint="Daily protein goal"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Settings */}
      <Card>
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-[#00FF7F]" />
          <h3 className="text-lg font-semibold text-white">Settings</h3>
        </div>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Notifications</p>
              <p className="text-xs text-white/60">Receive workout and meal reminders</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => updateSettings({ notifications: e.target.checked })}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-[#07110c] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white/40 after:transition-all after:content-[''] peer-checked:bg-[#00FF7F] peer-checked:after:translate-x-full peer-checked:after:bg-white"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Language</p>
              <p className="text-xs text-white/60">App language preference</p>
            </div>
            <select
              value={language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="rounded-xl bg-[#07110c]/80 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  )
}

