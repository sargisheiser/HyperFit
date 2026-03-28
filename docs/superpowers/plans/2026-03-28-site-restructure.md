# Site Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sidebar layout with a 60px icon rail and reorganize pages into action-based structure (Log, Track, Review, Coach).

**Architecture:** Create IconRail and PageTabs shared components. Create 3 new page orchestrators (LogPage, TrackPage, ReviewPage) that wrap existing functional components in tabs. Rename AIAssistant to CoachPage. Update App.jsx routes. Existing component logic stays untouched — only navigation and page-level orchestration changes.

**Tech Stack:** React 18, React Router 6, Lucide React icons, Framer Motion, Tailwind CSS

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/components/IconRail.jsx` | 60px vertical nav with Lucide icons (desktop only) |
| `frontend/src/components/PageTabs.jsx` | Reusable horizontal tab bar component |
| `frontend/src/pages/LogPage.jsx` | Log page orchestrator with tabs: Foto-Scan, Barcode, Manuell, Gewicht |
| `frontend/src/pages/TrackPage.jsx` | Track page orchestrator with tabs: Live-Workout, Workout loggen |
| `frontend/src/pages/ReviewPage.jsx` | Review page orchestrator with tabs: Heute, Woche, Historie, Check-In |
| `frontend/src/pages/CoachPage.jsx` | Copy of AIAssistant.jsx with renamed export |

### Modified Files
| File | Change |
|------|--------|
| `frontend/src/App.jsx` | Replace Sidebar with IconRail, update routes |
| `frontend/src/components/BottomNav.jsx` | Update to 4 action-based items |

### Removed (after migration verified)
| File | Reason |
|------|--------|
| `frontend/src/components/Sidebar.jsx` | Replaced by IconRail |
| `frontend/src/components/Navbar.jsx` | No longer needed (page titles in content) |
| `frontend/src/pages/Dashboard.jsx` | Content moved to ReviewPage "Heute" tab |
| `frontend/src/pages/Nutrition.jsx` | Content split into LogPage + ReviewPage |
| `frontend/src/pages/AIAssistant.jsx` | Renamed to CoachPage |

---

## Task 1: Create PageTabs Component

**Files:**
- Create: `frontend/src/components/PageTabs.jsx`

- [ ] **Step 1: Create the PageTabs component**

```jsx
// frontend/src/components/PageTabs.jsx
import { motion } from 'framer-motion'

export default function PageTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="mb-6 flex gap-6 border-b border-white/5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative pb-3 text-sm transition-colors ${
            activeTab === tab.id
              ? 'text-[#00FF7F]'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00FF7F]"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify lint passes**

```bash
cd frontend && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PageTabs.jsx
git commit -m "feat: add reusable PageTabs component with animated indicator"
```

---

## Task 2: Create IconRail Component

**Files:**
- Create: `frontend/src/components/IconRail.jsx`
- Reference: `frontend/src/components/Sidebar.jsx` (for patterns)

- [ ] **Step 1: Read Sidebar.jsx to understand current patterns**

Read `frontend/src/components/Sidebar.jsx` completely.

- [ ] **Step 2: Create IconRail component**

```jsx
// frontend/src/components/IconRail.jsx
import { NavLink } from 'react-router-dom'
import { BarChart3, LogOut, MessageSquare, PlusCircle, User, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/log', label: 'Log', icon: PlusCircle },
  { to: '/track', label: 'Track', icon: Zap },
  { to: '/review', label: 'Review', icon: BarChart3 },
  { to: '/coach', label: 'Coach', icon: MessageSquare },
]

export default function IconRail() {
  const { logout } = useAuth()

  return (
    <nav className="hidden w-[60px] flex-shrink-0 flex-col items-center gap-2 py-6 lg:flex">
      {/* Logo */}
      <div className="mb-6 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00FF7F] to-[#00CC66] text-sm font-extrabold text-[#0a0a0f]">
        H
      </div>

      {/* Nav items */}
      <div className="flex flex-col items-center gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${
                isActive
                  ? 'bg-[#00FF7F]/10 text-[#00FF7F]'
                  : 'text-white/35 hover:bg-white/5 hover:text-white/60'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            <span className="text-[8px] uppercase tracking-[1px]">{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Profile */}
      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
            isActive
              ? 'border-[#00FF7F]/60 text-[#00FF7F]'
              : 'border-[#00FF7F]/20 text-white/50 hover:border-[#00FF7F]/40'
          }`
        }
      >
        <User className="h-[14px] w-[14px]" />
      </NavLink>

      {/* Logout */}
      <button
        onClick={logout}
        className="mt-2 flex h-8 w-8 items-center justify-center rounded-full text-white/20 transition-colors hover:bg-white/5 hover:text-white/40"
        title="Abmelden"
      >
        <LogOut className="h-[14px] w-[14px]" />
      </button>
    </nav>
  )
}
```

- [ ] **Step 3: Verify lint passes**

```bash
cd frontend && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/IconRail.jsx
git commit -m "feat: add IconRail navigation component (60px vertical nav)"
```

---

## Task 3: Create ReviewPage

**Files:**
- Create: `frontend/src/pages/ReviewPage.jsx`
- Reference: `frontend/src/pages/Dashboard.jsx`, `frontend/src/components/Nutrition/NutritionDashboard.jsx`, `frontend/src/components/Nutrition/MealHistory.jsx`, `frontend/src/components/Nutrition/CheckInFlow.jsx`

- [ ] **Step 1: Read Dashboard.jsx completely**

Read `frontend/src/pages/Dashboard.jsx` to understand what renders in "Heute" tab.

- [ ] **Step 2: Read the Nutrition sub-components (first 20 lines each)**

Read imports/props of NutritionDashboard, MealHistory, CheckInFlow, WeightInput.

- [ ] **Step 3: Create ReviewPage**

```jsx
// frontend/src/pages/ReviewPage.jsx
import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PageTabs from '../components/PageTabs'

// Heute tab content
import LoadingSpinner from '../components/LoadingSpinner'
import Card from '../components/ui/Card'
import SectionTitle from '../components/ui/SectionTitle'
import NutritionGoals from '../components/dashboard/NutritionGoals'
import StatBlock from '../components/ui/StatBlock'
import ErrorMessage from '../components/ui/ErrorMessage'
import useDashboardStats from '../hooks/useDashboardStats'
import { useAuth } from '../contexts/AuthContext'
import useUserStore from '../store/userStore'

// Ernährung tab content
import NutritionDashboard from '../components/Nutrition/NutritionDashboard'
import MealHistory from '../components/Nutrition/MealHistory'

// Check-In tab content
import CheckInFlow from '../components/Nutrition/CheckInFlow'

const TABS = [
  { id: 'heute', label: 'Heute' },
  { id: 'ernaehrung', label: 'Ernährung' },
  { id: 'historie', label: 'Historie' },
  { id: 'checkin', label: 'Check-In' },
]

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState('heute')
  const { user } = useAuth()
  const { profile } = useUserStore((s) => ({ profile: s.profile }))
  const { stats, loading, error } = useDashboardStats(true)

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Review"
        subtitle="Dein Fortschritt auf einen Blick"
      />

      <PageTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'heute' && (
            <div className="space-y-6">
              {loading ? (
                <LoadingSpinner label="Lade Dashboard..." />
              ) : error ? (
                <ErrorMessage message={error} />
              ) : (
                <>
                  <NutritionGoals />
                  {stats?.today_workout && (
                    <Card>
                      <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/50">
                        Heutiges Training
                      </h3>
                      <StatBlock
                        label={stats.today_workout.name || 'Workout'}
                        value={`${stats.today_workout.duration_minutes || 0} Min`}
                      />
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'ernaehrung' && (
            <div className="space-y-6">
              <NutritionDashboard />
            </div>
          )}

          {activeTab === 'historie' && (
            <div className="space-y-6">
              <MealHistory />
            </div>
          )}

          {activeTab === 'checkin' && (
            <div className="space-y-6">
              <CheckInFlow />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
```

Note: The exact Dashboard content may need adjustment after reading Dashboard.jsx — adapt the "heute" tab to match what Dashboard currently renders. The key pattern is: wrap existing components in tabs, don't rewrite logic.

- [ ] **Step 4: Verify lint passes**

```bash
cd frontend && npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ReviewPage.jsx
git commit -m "feat: add ReviewPage with Heute/Ernährung/Historie/Check-In tabs"
```

---

## Task 4: Create LogPage

**Files:**
- Create: `frontend/src/pages/LogPage.jsx`
- Reference: `frontend/src/pages/Nutrition.jsx`, `frontend/src/pages/MealAnalyzer.jsx`

- [ ] **Step 1: Read Nutrition.jsx completely**

Read `frontend/src/pages/Nutrition.jsx` to understand how MealAnalyzer is orchestrated.

- [ ] **Step 2: Create LogPage**

```jsx
// frontend/src/pages/LogPage.jsx
import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import SectionTitle from '../components/ui/SectionTitle'
import PageTabs from '../components/PageTabs'
import MealAnalyzer from './MealAnalyzer'
import WeightInput from '../components/Nutrition/WeightInput'

const TABS = [
  { id: 'scanner', label: 'Foto & Barcode' },
  { id: 'gewicht', label: 'Gewicht' },
]

export default function LogPage() {
  const [activeTab, setActiveTab] = useState('scanner')
  const [pendingAction, setPendingAction] = useState(null)
  const analyzerRef = useRef(null)

  const handleActionHandled = useCallback(() => {
    setPendingAction(null)
  }, [])

  return (
    <div className="space-y-6">
      <SectionTitle title="Log" subtitle="Mahlzeiten & Daten erfassen" />

      <PageTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'scanner' && (
        <motion.div
          ref={analyzerRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <MealAnalyzer
            action={pendingAction}
            onActionHandled={handleActionHandled}
          />
        </motion.div>
      )}

      {activeTab === 'gewicht' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <WeightInput />
        </motion.div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify lint passes**

```bash
cd frontend && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/LogPage.jsx
git commit -m "feat: add LogPage with Scanner/Gewicht tabs"
```

---

## Task 5: Create TrackPage

**Files:**
- Create: `frontend/src/pages/TrackPage.jsx`
- Reference: `frontend/src/pages/WorkoutTracker.jsx`

- [ ] **Step 1: Create TrackPage**

```jsx
// frontend/src/pages/TrackPage.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionTitle from '../components/ui/SectionTitle'
import PageTabs from '../components/PageTabs'
import WorkoutTracker from './WorkoutTracker'

const TABS = [
  { id: 'live', label: 'Live-Workout' },
  { id: 'log', label: 'Workout loggen' },
]

export default function TrackPage() {
  const [activeTab, setActiveTab] = useState('live')

  return (
    <div className="space-y-6">
      <SectionTitle title="Track" subtitle="Training starten & loggen" />

      <PageTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'live' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <WorkoutTracker />
        </motion.div>
      )}

      {activeTab === 'log' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="rounded-2xl border border-white/10 bg-[#0B0D13]/80 p-6 text-center text-white/40"
        >
          <p>Workout manuell loggen — kommt bald</p>
        </motion.div>
      )}
    </div>
  )
}
```

Note: The "Workout loggen" tab is a placeholder for now (manual workout entry). The existing WorkoutTracker component handles the live workout flow.

- [ ] **Step 2: Verify lint passes**

```bash
cd frontend && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/TrackPage.jsx
git commit -m "feat: add TrackPage with Live-Workout/Workout-loggen tabs"
```

---

## Task 6: Create CoachPage

**Files:**
- Create: `frontend/src/pages/CoachPage.jsx`
- Reference: `frontend/src/pages/AIAssistant.jsx`

- [ ] **Step 1: Read AIAssistant.jsx completely**

Read `frontend/src/pages/AIAssistant.jsx`.

- [ ] **Step 2: Create CoachPage as a copy with renamed export**

```bash
cp frontend/src/pages/AIAssistant.jsx frontend/src/pages/CoachPage.jsx
```

Then edit CoachPage.jsx: change the default export function name from `AIAssistant` to `CoachPage`:

```javascript
// Change this line:
export default function AIAssistant() {
// To:
export default function CoachPage() {
```

- [ ] **Step 3: Verify lint passes**

```bash
cd frontend && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/CoachPage.jsx
git commit -m "feat: add CoachPage (renamed from AIAssistant)"
```

---

## Task 7: Update App.jsx — Routes and Layout

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Read current App.jsx**

Read `frontend/src/App.jsx` completely.

- [ ] **Step 2: Update imports**

Replace/add these imports at the top of App.jsx:

```javascript
// REMOVE these imports:
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import AIAssistant from './pages/AIAssistant'
import Dashboard from './pages/Dashboard'
import Nutrition from './pages/Nutrition'

// ADD these imports:
import IconRail from './components/IconRail'
import LogPage from './pages/LogPage'
import TrackPage from './pages/TrackPage'
import ReviewPage from './pages/ReviewPage'
import CoachPage from './pages/CoachPage'
```

Keep all other existing imports (WorkoutTracker, Profile, auth pages, etc).

- [ ] **Step 3: Update ProtectedLayout JSX**

Replace the ProtectedLayout return statement. Change:

```jsx
<div className="mx-auto flex max-w-7xl flex-col gap-6 pb-24 lg:flex-row lg:pb-0">
  <Sidebar />
  <div className="flex-1 space-y-8">
    <Navbar />
    <AnimatePresence mode="wait">
```

To:

```jsx
<div className="mx-auto flex max-w-7xl gap-6 pb-24 lg:pb-0">
  <IconRail />
  <div className="flex-1 space-y-8">
    <AnimatePresence mode="wait">
```

(Removed `flex-col lg:flex-row` since the icon rail is always beside content on desktop. Removed `<Navbar />`.)

- [ ] **Step 4: Update route definitions**

Replace the protected routes block:

```jsx
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
```

- [ ] **Step 5: Verify lint passes**

```bash
cd frontend && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: update App.jsx with IconRail layout and action-based routes"
```

---

## Task 8: Update BottomNav

**Files:**
- Modify: `frontend/src/components/BottomNav.jsx`

- [ ] **Step 1: Read current BottomNav.jsx**

Read `frontend/src/components/BottomNav.jsx` completely.

- [ ] **Step 2: Update navigation items to match action-based structure**

Update the links array to:

```javascript
import { BarChart3, MessageSquare, PlusCircle, Zap } from 'lucide-react'

const links = [
  { to: '/log', label: 'Log', icon: PlusCircle },
  { to: '/track', label: 'Track', icon: Zap },
  { to: '/review', label: 'Review', icon: BarChart3 },
  { to: '/coach', label: 'Coach', icon: MessageSquare },
]
```

Replace the existing nav items and icon imports to match. Keep the existing styling and NavLink pattern — just change the `to`, `label`, `icon` values.

- [ ] **Step 3: Verify lint passes**

```bash
cd frontend && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/BottomNav.jsx
git commit -m "feat: update BottomNav to action-based navigation (Log/Track/Review/Coach)"
```

---

## Task 9: Update Onboarding Redirect

**Files:**
- Modify: `frontend/src/App.jsx` (if not already done)

- [ ] **Step 1: Verify onboarding redirect**

In App.jsx `ProtectedLayout`, the onboarding redirect currently goes to `/dashboard`. Verify it now goes to `/review` (should be handled by the `/dashboard` → `/review` redirect, but check).

Check `frontend/src/pages/Onboarding.jsx` for any hardcoded navigation to `/dashboard` after onboarding completes. If found, change to `/review`.

- [ ] **Step 2: Check AIAssistantChat component**

Read `frontend/src/components/AIAssistantChat.jsx` for any references to `/ai-assistant`. If found, update to `/coach`.

- [ ] **Step 3: Search for remaining old route references**

```bash
grep -r "'/dashboard'\|'/ai-assistant'\|'/nutrition'\|'/meal-analyzer'\|'/workout-tracker'" frontend/src/ --include="*.jsx" --include="*.js" | grep -v node_modules | grep -v "Navigate to"
```

Fix any remaining hardcoded references to old routes (except in the legacy redirect routes we added in App.jsx).

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: update remaining route references to new action-based paths"
```

---

## Task 10: Clean Up Old Files

**Files:**
- Delete: `frontend/src/components/Sidebar.jsx`
- Delete: `frontend/src/components/Navbar.jsx`
- Keep (still imported by new pages): `Dashboard.jsx`, `Nutrition.jsx`, `AIAssistant.jsx`, `WorkoutTracker.jsx`, `MealAnalyzer.jsx`

- [ ] **Step 1: Delete replaced components**

```bash
rm frontend/src/components/Sidebar.jsx
rm frontend/src/components/Navbar.jsx
```

Note: Do NOT delete Dashboard.jsx, Nutrition.jsx, WorkoutTracker.jsx, or MealAnalyzer.jsx yet — they are still imported as child components by the new page orchestrators. They can be refactored into proper sub-components in a later sprint.

- [ ] **Step 2: Verify lint passes**

```bash
cd frontend && npm run lint
```

- [ ] **Step 3: Verify the app builds**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old Sidebar and Navbar components"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run lint**

```bash
cd frontend && npm run lint
```

Expected: Zero errors, zero warnings.

- [ ] **Step 2: Run build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm run test -- --run
```

Expected: Existing tests pass.

- [ ] **Step 4: Manual smoke test**

Start the app:

```bash
cd frontend && npm run dev
```

Verify:
- [ ] Icon rail shows on desktop with 4 items + profile + logout
- [ ] Bottom nav shows on mobile with 4 items
- [ ] `/review` loads ReviewPage with 4 tabs (Heute, Ernährung, Historie, Check-In)
- [ ] `/log` loads LogPage with MealAnalyzer (photo scan + barcode work)
- [ ] `/track` loads TrackPage with WorkoutTracker
- [ ] `/coach` loads AI chat
- [ ] `/profile` loads profile page
- [ ] Old routes (`/dashboard`, `/nutrition`, `/ai-assistant`) redirect correctly
- [ ] Tab switching animates smoothly
- [ ] Active nav item highlights green

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "fix: site restructure final verification fixes"
```
