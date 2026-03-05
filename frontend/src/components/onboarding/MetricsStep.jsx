import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

const activityLevels = [
  { id: 'sedentary', label: 'Sitzend', description: 'Wenig bis keine Bewegung' },
  { id: 'light', label: 'Leicht aktiv', description: '1-3 Tage Sport/Woche' },
  { id: 'moderate', label: 'Moderat aktiv', description: '3-5 Tage Sport/Woche' },
  { id: 'active', label: 'Aktiv', description: '6-7 Tage Sport/Woche' },
  { id: 'very_active', label: 'Sehr aktiv', description: 'Körperliche Arbeit + Sport' },
]

const genderOptions = [
  { id: 'male', label: 'Männlich' },
  { id: 'female', label: 'Weiblich' },
  { id: 'other', label: 'Divers' },
]

export default function MetricsStep({ data, onUpdate, onNext, onBack }) {
  const [errors, setErrors] = useState({})

  const validateAndContinue = () => {
    const newErrors = {}

    if (!data.height || data.height < 100 || data.height > 250) {
      newErrors.height = 'Bitte gib eine gültige Größe ein (100-250 cm)'
    }
    if (!data.weight || data.weight < 30 || data.weight > 300) {
      newErrors.weight = 'Bitte gib ein gültiges Gewicht ein (30-300 kg)'
    }
    if (!data.age || data.age < 13 || data.age > 100) {
      newErrors.age = 'Bitte gib ein gültiges Alter ein (13-100)'
    }
    if (!data.activityLevel) {
      newErrors.activityLevel = 'Bitte wähle dein Aktivitätslevel'
    }
    if (!data.gender) {
      newErrors.gender = 'Bitte wähle dein Geschlecht'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      onNext()
    }
  }

  const handleInputChange = (field, value) => {
    onUpdate({ [field]: value })
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Zurück</span>
      </button>

      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Erzähl uns von dir</h2>
        <p className="text-gray-400">
          Für genaue Kalorien- und Makroberechnungen
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Height & Weight row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Größe (cm)</label>
            <input
              type="number"
              value={data.height || ''}
              onChange={(e) => handleInputChange('height', parseInt(e.target.value) || null)}
              placeholder="175"
              className={`w-full p-3 rounded-xl bg-[#121b14] border-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF7F] transition-colors ${
                errors.height ? 'border-red-500' : 'border-white/10'
              }`}
            />
            {errors.height && (
              <p className="text-xs text-red-400 mt-1">{errors.height}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Gewicht (kg)</label>
            <input
              type="number"
              value={data.weight || ''}
              onChange={(e) => handleInputChange('weight', parseInt(e.target.value) || null)}
              placeholder="75"
              className={`w-full p-3 rounded-xl bg-[#121b14] border-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF7F] transition-colors ${
                errors.weight ? 'border-red-500' : 'border-white/10'
              }`}
            />
            {errors.weight && (
              <p className="text-xs text-red-400 mt-1">{errors.weight}</p>
            )}
          </div>
        </div>

        {/* Age */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Alter</label>
          <input
            type="number"
            value={data.age || ''}
            onChange={(e) => handleInputChange('age', parseInt(e.target.value) || null)}
            placeholder="28"
            className={`w-full p-3 rounded-xl bg-[#121b14] border-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF7F] transition-colors ${
              errors.age ? 'border-red-500' : 'border-white/10'
            }`}
          />
          {errors.age && (
            <p className="text-xs text-red-400 mt-1">{errors.age}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Geschlecht</label>
          <div className="grid grid-cols-3 gap-2">
            {genderOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleInputChange('gender', option.id)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  data.gender === option.id
                    ? 'border-[#00FF7F] bg-[#00FF7F]/10 text-white'
                    : 'border-white/10 bg-[#121b14] text-gray-400 hover:border-[#00FF7F]/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {errors.gender && (
            <p className="text-xs text-red-400 mt-1">{errors.gender}</p>
          )}
        </div>

        {/* Activity Level */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Aktivitätslevel</label>
          <div className="space-y-2">
            {activityLevels.map((level) => (
              <button
                key={level.id}
                onClick={() => handleInputChange('activityLevel', level.id)}
                className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                  data.activityLevel === level.id
                    ? 'border-[#00FF7F] bg-[#00FF7F]/10'
                    : 'border-white/10 bg-[#121b14] hover:border-[#00FF7F]/40'
                }`}
              >
                <span className="font-medium text-white">{level.label}</span>
                <span className="text-sm text-gray-400 ml-2">– {level.description}</span>
              </button>
            ))}
          </div>
          {errors.activityLevel && (
            <p className="text-xs text-red-400 mt-1">{errors.activityLevel}</p>
          )}
        </div>
      </div>

      {/* Continue button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={validateAndContinue}
        className="w-full bg-gradient-to-r from-[#00FF7F] to-[#00C46A] text-black font-bold py-4 px-8 rounded-xl shadow-lg shadow-[#00FF7F]/20 transition-all"
      >
        Weiter
      </motion.button>
    </div>
  )
}
