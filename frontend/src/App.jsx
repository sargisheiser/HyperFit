import { AnimatePresence, motion } from 'framer-motion'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import IconRail from './components/IconRail'
import BottomNav from './components/BottomNav'
import BackendStatus from './components/BackendStatus'
import LoadingSpinner from './components/LoadingSpinner'
import AIAssistantChat from './components/AIAssistantChat'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useUserStore } from './store/userStore'
import LogPage from './pages/LogPage'
import TrackPage from './pages/TrackPage'
import ReviewPage from './pages/ReviewPage'
import CoachPage from './pages/CoachPage'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'
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

  if (!onboardingComplete && location.pathname !== '/profile') {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="relative min-h-screen bg-[#0e0e10] p-4 text-white md:p-8">
      <BackendStatus />
      <div className="mx-auto flex max-w-7xl gap-6 pb-24 lg:pb-0">
        <IconRail />
        <div className="flex-1 space-y-8">
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
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/log" element={<LogPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route path="/profile" element={<Profile />} />
        {/* Legacy redirects */}
        <Route path="/dashboard" element={<Navigate to="/review" replace />} />
        <Route path="/nutrition" element={<Navigate to="/review" replace />} />
        <Route path="/meal-analyzer" element={<Navigate to="/log" replace />} />
        <Route path="/ai-assistant" element={<Navigate to="/coach" replace />} />
        <Route path="/workout-tracker" element={<Navigate to="/track" replace />} />
      </Route>
      <Route path="/" element={<Navigate to="/review" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
