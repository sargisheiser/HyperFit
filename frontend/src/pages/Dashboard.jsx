import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Utensils, Dumbbell, Activity, Footprints, TrendingUp, TrendingDown } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import StatusCard from '../components/StatusCard'
import QuickActionCard from '../components/QuickActionCard'
import ProgressBar from '../components/ProgressBar'
import AIButton from '../components/AIButton'
import { useCalories } from '../hooks/useCalories'
import { useSteps } from '../hooks/useSteps'
import { useWorkouts } from '../hooks/useWorkouts'
import { useMeals } from '../hooks/useMeals'

/**
 * Dashboard Page - Production Ready
 * Main dashboard displaying system status, calorie tracking, and quick actions
 * 
 * Features:
 * - System status cards (meals, workouts, calories)
 * - Activity stats (steps, distance, calories burned)
 * - Calorie system status (in/out/net)
 * - Quick access actions (log meal, start workout, add steps)
 * - AI assistant button
 */
export default function Dashboard() {
  const navigate = useNavigate()
  const [stepsInput, setStepsInput] = useState('')
  
  // Custom hooks for data management
  const { calorieBalance, refetch: refetchCalories } = useCalories()
  const { activityStats, addSteps, refetch: refetchSteps } = useSteps()
  const { workoutCount } = useWorkouts()
  const { mealCount, totalCalories } = useMeals()

  const handleAddSteps = async () => {
    const steps = parseInt(stepsInput) || 0
    if (steps > 0) {
      const result = await addSteps(steps)
      if (result.success) {
        setStepsInput('')
        // Refresh both steps and calories (since steps affect calories)
        await refetchSteps()
        await refetchCalories()
      }
    }
  }

  const handleAIButtonClick = () => {
    // Navigate to AI assistant
    navigate('/chat')
  }

  // Calculate calorie progress (assuming 2000 kcal as baseline)
  const calorieProgress = Math.min((calorieBalance.caloriesIn / 2000) * 100, 100)
  const deficitProgress = calorieBalance.netCalories < 0 
    ? Math.abs((calorieBalance.netCalories / 500) * 100) 
    : 0

  return (
    <>
      <DashboardLayout title="SYSTEM STATUS">
        {/* Top Section - System Status Cards */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusCard
              label="MEALS LOGGED"
              value={mealCount}
              color="green"
              icon={Utensils}
              delay={0}
            />
            <StatusCard
              label="WORKOUTS"
              value={workoutCount}
              color="magenta"
              icon={Dumbbell}
              delay={0.1}
            />
            <StatusCard
              label="TOTAL CALORIES"
              value={Math.round(totalCalories)}
              suffix="KCAL"
              color="cyan"
              icon={Activity}
              delay={0.2}
            />
          </div>
        </section>

        {/* Activity Stats Section */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusCard
              label="TODAY'S STEPS"
              value={activityStats.steps.toLocaleString()}
              color="magenta"
              icon={Footprints}
              delay={0.3}
            />
            <StatusCard
              label="CALORIES BURNED"
              value={Math.round(activityStats.caloriesBurned)}
              suffix="KCAL"
              color="cyan"
              icon={Activity}
              delay={0.4}
            />
            <StatusCard
              label="DISTANCE"
              value={activityStats.distanceKm.toFixed(1)}
              suffix="KM"
              color="green"
              icon={Footprints}
              delay={0.5}
            />
          </div>
        </section>

        {/* Calorie System Status Section */}
        <section className="mb-8">
          <h2
            className="text-3xl uppercase mb-6 font-bold tracking-wider"
            style={{
              color: '#00FF88',
              textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            CALORIE SYSTEM STATUS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Calories In */}
            <div className="card-cyber card-cyber-green">
              <div className="flex items-center justify-between mb-4">
                <Utensils className="w-8 h-8" style={{ color: '#00FF88' }} />
                <div
                  className="w-3 h-3 bg-green-500 animate-pulse"
                  style={{ boxShadow: '0 0 10px rgba(0, 255, 136, 1)' }}
                />
              </div>
              <div className="text-sm uppercase mb-2 text-gray-400 tracking-wider">
                CALORIES IN
              </div>
              <div className="text-5xl font-bold mb-4" style={{ color: '#00FF88' }}>
                {Math.round(calorieBalance.caloriesIn)}
              </div>
              <div className="text-sm uppercase text-gray-400 tracking-wider mb-2">
                KCAL
              </div>
              <div className="mt-4">
                <ProgressBar
                  value={calorieProgress}
                  max={100}
                  color="green"
                  size="sm"
                />
              </div>
            </div>

            {/* Calories Out */}
            <div className="card-cyber card-cyber-magenta">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8" style={{ color: '#9D4EDD' }} />
                <div
                  className="w-3 h-3 bg-magenta-500 animate-pulse"
                  style={{ boxShadow: '0 0 10px rgba(157, 78, 221, 1)' }}
                />
              </div>
              <div className="text-sm uppercase mb-2 text-gray-400 tracking-wider">
                CALORIES OUT
              </div>
              <div className="text-5xl font-bold mb-4" style={{ color: '#9D4EDD' }}>
                {Math.round(calorieBalance.caloriesOut)}
              </div>
              <div className="text-sm uppercase text-gray-400 tracking-wider">
                KCAL
              </div>
            </div>

            {/* Net Calories */}
            <div
              className={`card-cyber ${
                calorieBalance.netCalories >= 0 ? 'card-cyber-cyan' : 'card-cyber-green'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                {calorieBalance.netCalories >= 0 ? (
                  <TrendingUp className="w-8 h-8" style={{ color: '#00FFFF' }} />
                ) : (
                  <TrendingDown className="w-8 h-8" style={{ color: '#00FF88' }} />
                )}
                <div
                  className="w-3 h-3 animate-pulse"
                  style={{
                    backgroundColor: calorieBalance.netCalories >= 0 ? '#00FFFF' : '#00FF88',
                    boxShadow:
                      calorieBalance.netCalories >= 0
                        ? '0 0 10px rgba(0, 255, 255, 1)'
                        : '0 0 10px rgba(0, 255, 136, 1)'
                  }}
                />
              </div>
              <div className="text-sm uppercase mb-2 text-gray-400 tracking-wider">
                NET CALORIES
              </div>
              <div
                className="text-5xl font-bold mb-4"
                style={{
                  color: calorieBalance.netCalories >= 0 ? '#00FFFF' : '#00FF88'
                }}
              >
                {calorieBalance.netCalories >= 0 ? '+' : ''}
                {Math.round(calorieBalance.netCalories)}
              </div>
              <div className="text-sm uppercase text-gray-400 tracking-wider mb-4">
                {calorieBalance.netCalories >= 0 ? 'SURPLUS' : 'DEFICIT'}
              </div>
              {calorieBalance.netCalories < 0 && (
                <ProgressBar
                  value={deficitProgress}
                  max={100}
                  color="green"
                  size="sm"
                  label="DEFICIT PROGRESS"
                />
              )}
            </div>
          </div>
        </section>

        {/* Quick Access Section */}
        <section className="mb-8">
          <h2
            className="text-3xl uppercase mb-6 font-bold tracking-wider"
            style={{
              color: '#00FF88',
              textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            QUICK ACCESS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Log Meal */}
            <QuickActionCard
              title="LOG MEAL"
              description="ANALYZE FOOD WITH AI"
              color="green"
              icon={Utensils}
              navigateTo="/meals"
            />

            {/* Start Workout */}
            <QuickActionCard
              title="START WORKOUT"
              description="TRACK EXERCISES LIVE"
              color="magenta"
              icon={Dumbbell}
              navigateTo="/workouts"
            />

            {/* Add Steps */}
            <QuickActionCard
              title="ADD STEPS"
              description="MANUAL ENTRY"
              color="cyan"
              icon={Footprints}
            >
              <div className="flex gap-2 mt-4">
                <input
                  type="number"
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  placeholder="STEPS"
                  min="0"
                  className="flex-1 px-3 py-2 bg-black border border-cyan-500 text-white focus:outline-none focus:border-cyan-400 uppercase"
                  style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: '1.25rem',
                    boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSteps()
                    }
                  }}
                />
                <button
                  onClick={handleAddSteps}
                  className="px-4 py-2 border border-cyan-500 text-cyan-500 uppercase hover:bg-cyan-500 hover:text-black transition-all font-bold"
                  style={{
                    boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                    fontFamily: "'VT323', monospace"
                  }}
                >
                  ADD
                </button>
              </div>
            </QuickActionCard>
          </div>
        </section>
      </DashboardLayout>

      {/* AI Button - Floating */}
      <AIButton onOpen={handleAIButtonClick} />
    </>
  )
}
