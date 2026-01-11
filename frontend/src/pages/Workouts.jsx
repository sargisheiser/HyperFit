import { useState, useEffect } from 'react'
import api from '../services/api'
import { Plus, Dumbbell, Upload, Video, Sparkles, X, Zap, Activity, Camera } from 'lucide-react'
import LiveWorkout from '../components/LiveWorkout'
import { workoutCategories, bodyParts, getEquipmentForBodyPart, getExercisesForEquipment } from '../data/workoutCategories'

export default function Workouts() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState('')
  const [showLiveWorkout, setShowLiveWorkout] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    workout_type: '',
    duration_minutes: '',
    body_part: '',
    equipment: '',
    exercise: '',
    notes: ''
  })
  const [availableEquipment, setAvailableEquipment] = useState([])
  const [availableExercises, setAvailableExercises] = useState([])

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async () => {
    try {
      const response = await api.get('/api/workouts/history')
      setWorkouts(response.data || [])
    } catch (error) {
      console.error('Error fetching workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBodyPartChange = (bodyPart) => {
    const equipment = getEquipmentForBodyPart(bodyPart)
    setAvailableEquipment(equipment)
    setAvailableExercises([])
    setFormData({
      ...formData,
      body_part: bodyPart,
      equipment: '',
      exercise: ''
    })
  }

  const handleEquipmentChange = (equipment) => {
    const exercises = getExercisesForEquipment(formData.body_part, equipment)
    setAvailableExercises(exercises)
    setFormData({
      ...formData,
      equipment,
      exercise: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Build workout name from selections if not provided
      const workoutName = formData.name || 
        (formData.body_part && formData.exercise 
          ? `${workoutCategories[formData.body_part]?.name} - ${formData.exercise}`
          : formData.body_part 
            ? `${workoutCategories[formData.body_part]?.name} Workout`
            : 'Workout')

      await api.post('/api/workouts/history', {
        name: workoutName,
        workout_type: formData.body_part || formData.workout_type || 'strength',
        exercise: formData.exercise || workoutName,
        duration_seconds: formData.duration_minutes ? parseInt(formData.duration_minutes, 10) * 60 : null,
        feedback: formData.notes ? [formData.notes] : undefined,
        notes: formData.notes || `Body Part: ${formData.body_part || 'N/A'}, Equipment: ${formData.equipment || 'N/A'}, Exercise: ${formData.exercise || 'N/A'}`
      })
      setShowForm(false)
      setFormData({ name: '', workout_type: '', duration_minutes: '', body_part: '', equipment: '', exercise: '', notes: '' })
      setAvailableEquipment([])
      setAvailableExercises([])
      await fetchWorkouts()
    } catch (error) {
      console.error('Error creating workout:', error)
      setError(error.response?.data?.detail || 'Failed to create workout')
    }
  }

  const handleVideoUpload = async (file) => {
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file')
      return
    }

    setUploading(true)
    setError('')
    setAnalysisResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/api/workouts/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setAnalysisResult(response.data)
      await fetchWorkouts()
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to analyze workout video')
      console.error('Error analyzing workout:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleVideoInputChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      await handleVideoUpload(file)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyber-primary border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-cyber-secondary border-t-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4" style={{ fontFamily: "'VT323', monospace" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl uppercase tracking-wider mb-4" style={{ color: '#00FF00', textShadow: '0 0 10px rgba(0, 255, 0, 0.5)' }}>
            TRAINING MODULE
          </h1>
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setShowLiveWorkout(true)}
              className="px-6 py-3 border-2 uppercase text-xl hover:bg-cyan-500 hover:text-black transition-all"
              style={{ 
                borderColor: '#00FFFF',
                color: '#00FFFF',
                boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
              }}
            >
              <Camera className="w-5 h-5 inline mr-2" />
              LIVE TRACK
            </button>
            <label className="px-6 py-3 border-2 uppercase text-xl hover:bg-magenta-500 hover:text-black transition-all cursor-pointer inline-block">
              <Video className="w-5 h-5 inline mr-2" />
              UPLOAD VIDEO
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoInputChange}
                className="hidden"
                disabled={uploading || analyzing}
              />
            </label>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 border-2 uppercase text-xl hover:bg-green-500 hover:text-black transition-all"
              style={{ 
                borderColor: '#00FF00',
                color: '#00FF00',
                boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
              }}
            >
              <Plus className="w-5 h-5 inline mr-2" />
              LOG WORKOUT
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 border-4 border-cyber-secondary bg-cyber-dark p-4 flex items-center justify-between">
            <span className="text-cyber-secondary font-mono uppercase tracking-wider">{error}</span>
            <button onClick={() => setError('')} className="text-cyber-secondary hover:text-cyber-primary">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {(uploading || analyzing) && (
          <div className="mb-6 card-cyber border-4 border-cyber-accent">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-cyber-accent border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-cyber-primary border-t-transparent animate-spin" style={{ animationDirection: 'reverse' }}></div>
              </div>
              <div>
                <p className="font-mono font-bold text-cyber-accent uppercase tracking-wider">
                  {uploading ? 'UPLOADING VIDEO...' : 'ANALYZING WITH AI...'}
                </p>
                <p className="text-xs font-mono text-cyber-gray-light uppercase mt-1">
                  PROCESSING...
                </p>
              </div>
            </div>
          </div>
        )}

        {analysisResult && (
          <div className="mb-6 card-cyber border-4 border-cyber-primary holographic">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-8 h-8 text-cyber-primary animate-pulse-neon" />
                <h3 className="text-2xl font-display font-bold text-neon uppercase tracking-wider">
                  ANALYSIS COMPLETE
                </h3>
              </div>
              <button onClick={() => setAnalysisResult(null)} className="text-cyber-gray-light hover:text-cyber-primary">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-mono font-bold text-cyber-primary uppercase tracking-widest mb-4 text-sm">
                  DETECTED EXERCISES
                </h4>
                <div className="space-y-2">
                  {analysisResult.detected_exercises?.map((exercise, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border-2 border-cyber-gray-light bg-cyber-dark hover:border-cyber-primary transition-all">
                      <span className="font-mono font-bold text-cyber-primary uppercase">{exercise.name}</span>
                      <span className="text-xs font-mono text-cyber-gray-light">
                        {exercise.reps} REPS, {exercise.sets} SETS
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-mono font-bold text-cyber-accent uppercase tracking-widest mb-4 text-sm">
                  SUMMARY
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 border-2 border-cyber-primary bg-cyber-dark">
                    <span className="font-mono text-xs uppercase tracking-widest text-cyber-gray-light">TOTAL REPS</span>
                    <span className="font-display font-black text-2xl text-cyber-primary">{analysisResult.total_reps}</span>
                  </div>
                  <div className="flex justify-between p-3 border-2 border-cyber-secondary bg-cyber-dark">
                    <span className="font-mono text-xs uppercase tracking-widest text-cyber-gray-light">TOTAL SETS</span>
                    <span className="font-display font-black text-2xl text-cyber-secondary">{analysisResult.total_sets}</span>
                  </div>
                  <div className="flex justify-between p-3 border-2 border-cyber-accent bg-cyber-dark">
                    <span className="font-mono text-xs uppercase tracking-widest text-cyber-gray-light">CALORIES</span>
                    <span className="font-display font-black text-2xl text-cyber-accent">
                      {Math.round(analysisResult.estimated_calories)}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t-2 border-cyber-gray-light">
                    <div className="flex justify-between text-xs font-mono mb-2">
                      <span className="text-cyber-gray-light uppercase">FORM SCORE:</span>
                      <span className="text-cyber-primary font-bold">
                        {analysisResult.form_analysis?.overall_score?.toFixed(1)}/10
                      </span>
                    </div>
                    {analysisResult.form_analysis?.recommendations && (
                      <div>
                        <p className="text-xs font-mono font-bold text-cyber-gray-light uppercase mb-2">RECOMMENDATIONS:</p>
                        <ul className="text-xs font-mono text-cyber-gray-light space-y-1">
                          {analysisResult.form_analysis.recommendations.map((rec, idx) => (
                            <li key={idx}>• {rec?.replace(/\*\*/g, '').replace(/__/g, '').replace(/\*/g, '').replace(/_/g, '').trim() || rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="mb-6 card-cyber border-4 border-cyber-secondary">
            <h2 className="text-2xl font-display font-bold text-cyber-secondary uppercase mb-6 tracking-wider">
              LOG WORKOUT
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                  BODY PART
                </label>
                <select
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                  value={formData.body_part}
                  onChange={(e) => handleBodyPartChange(e.target.value)}
                  required
                >
                  <option value="">SELECT BODY PART</option>
                  {bodyParts.map(part => (
                    <option key={part.value} value={part.value}>
                      {part.icon} {part.label.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {formData.body_part && (
                <div>
                  <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                    EQUIPMENT
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                    value={formData.equipment}
                    onChange={(e) => handleEquipmentChange(e.target.value)}
                    required
                  >
                    <option value="">SELECT EQUIPMENT</option>
                    {availableEquipment.map(eq => (
                      <option key={eq.value} value={eq.value}>
                        {eq.label.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.equipment && availableExercises.length > 0 && (
                <div>
                  <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                    EXERCISE
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                    value={formData.exercise}
                    onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
                  >
                    <option value="">SELECT EXERCISE (OPTIONAL)</option>
                    {availableExercises.map(ex => (
                      <option key={ex} value={ex}>
                        {ex.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                  WORKOUT NAME (OPTIONAL)
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 placeholder:text-cyber-gray-light"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="CUSTOM WORKOUT NAME"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                    TYPE
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                    value={formData.workout_type}
                    onChange={(e) => setFormData({ ...formData, workout_type: e.target.value })}
                  >
                    <option value="">SELECT TYPE</option>
                    <option value="strength">STRENGTH</option>
                    <option value="cardio">CARDIO</option>
                    <option value="yoga">YOGA</option>
                    <option value="calisthenics">CALISTHENICS</option>
                    <option value="other">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                    DURATION (MIN)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 placeholder:text-cyber-gray-light"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                  NOTES
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 placeholder:text-cyber-gray-light"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="WORKOUT NOTES..."
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-cyber flex-1">
                  SAVE WORKOUT
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ name: '', workout_type: '', duration_minutes: '', body_part: '', equipment: '', exercise: '', notes: '' })
                    setAvailableEquipment([])
                    setAvailableExercises([])
                  }}
                  className="btn-cyber border-cyber-gray-light text-cyber-gray-light hover:border-cyber-secondary hover:text-cyber-secondary"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Workouts List */}
        <div className="card-cyber card-cyber-green">
          <h2 className="text-3xl uppercase mb-6" style={{ color: '#00FF00' }}>
            WORKOUT HISTORY
          </h2>
          {workouts.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="w-20 h-20 text-cyber-gray-light mx-auto mb-4 opacity-50" />
              <p className="text-cyber-gray-light font-mono uppercase mb-2">NO WORKOUTS LOGGED</p>
              <p className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest">
                START TRACKING YOUR TRAINING SESSIONS
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workouts.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Workout Modal */}
      {showLiveWorkout && (
        <LiveWorkout onClose={() => setShowLiveWorkout(false)} />
      )}
    </div>
  )
}

function WorkoutCard({ workout }) {
  const primaryExercise = workout.exercises?.[0]
  const notes =
    workout.ai_summary ||
    workout.ai_metadata?.notes ||
    (Array.isArray(workout.ai_metadata?.feedback) ? workout.ai_metadata.feedback.join(' • ') : null)
  const workoutLabel = primaryExercise?.name || workout.name || workout.workout_type || 'WORKOUT'

  return (
    <div className="border-4 border-cyber-gray-light bg-cyber-dark p-6 hover:border-cyber-primary transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 border-4 border-cyber-primary flex items-center justify-center group-hover:shadow-neon-green transition-all">
            <Dumbbell className="w-8 h-8 text-cyber-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-cyber-primary text-xl uppercase mb-1">
              {workoutLabel}
            </h3>
            <p className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest">
              {(workout.workout_type || primaryExercise?.name || 'SESSION').toUpperCase()} •{' '}
              {new Date(workout.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        {workout.duration_minutes && (
          <div className="px-4 py-2 border-2 border-cyber-accent bg-cyber-dark">
            <span className="text-xs font-mono font-bold text-cyber-accent uppercase">
              {workout.duration_minutes} MIN
            </span>
          </div>
        )}
      </div>
      
      {workout.calories_burned && (
        <div className="mt-4 pt-4 border-t-2 border-cyber-gray-light">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-cyber-secondary" />
            <span className="font-mono text-sm text-cyber-gray-light uppercase">KALORIEN BURNED:</span>
            <span className="font-display font-bold text-cyber-secondary text-lg">
              {Math.round(workout.calories_burned)}
            </span>
          </div>
        </div>
      )}
      
      {notes && (
        <div className="mt-4 pt-4 border-t-2 border-cyber-gray-light">
          <p className="text-sm font-mono text-cyber-gray-light whitespace-pre-line">{notes}</p>
        </div>
      )}
    </div>
  )
}