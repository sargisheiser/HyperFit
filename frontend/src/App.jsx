import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Meals from './pages/Meals'
import Workouts from './pages/Workouts'
import Chat from './pages/Chat'
import AIAssistant from './pages/AIAssistant'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import TopNav from './components/TopNav'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
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
  
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user } = useAuth()
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meals"
        element={
          <ProtectedRoute>
            <Meals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workouts"
        element={
          <ProtectedRoute>
            <Workouts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <AIAssistant />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-black relative" style={{ fontFamily: "'VT323', monospace" }}>
          <TopNav />
          <div className="pt-16">
            <AppRoutes />
          </div>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
