import { AnimatePresence, motion } from 'framer-motion'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import BackendStatus from './components/BackendStatus'
import LoadingSpinner from './components/LoadingSpinner'
import AIAssistantChat from './components/AIAssistantChat'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useUserStore } from './store/userStore'
import AIAssistant from './pages/AIAssistant'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import WorkoutTracker from './pages/WorkoutTracker'
import Nutrition from './pages/Nutrition'
import Profile from './pages/Profile'
import Onboarding from './pages/Onboarding'

function ProtectedOnboarding() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0e0e10]">
        <LoadingSpinner label="Booting HyperFit systems" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Onboarding />
}

function ProtectedLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const onboardingComplete = useUserStore((state) => state.onboardingComplete)

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0e0e10]">
        <LoadingSpinner label="Booting HyperFit systems" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Redirect to onboarding if not completed (but allow profile page for manual setup)
  if (!onboardingComplete && location.pathname !== '/profile') {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="relative min-h-screen bg-[#0e0e10] p-4 text-white md:p-8">
      <BackendStatus />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-24 lg:flex-row lg:pb-0">
        <Sidebar />
        <div className="flex-1 space-y-8">
          <Navbar />
          <AnimatePresence mode="wait">
            <motion.main
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <Outlet />
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
      <BottomNav />
      <AIAssistantChat />
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<ProtectedOnboarding />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/workout-tracker" element={<WorkoutTracker />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/meal-analyzer" element={<Nutrition focusSection="analyzer" />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
