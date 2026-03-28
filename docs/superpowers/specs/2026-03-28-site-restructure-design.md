# HYPERFIT Site Restructure — Action-Based Layout with Icon Rail

**Date:** 2026-03-28
**Goal:** Replace the current sidebar + separate-page layout with a thin icon rail navigation and action-based page structure, creating a more modern, premium feel aligned with the cyberpunk/neon theme.

---

## 1. Layout Change

### Current
- 200px left sidebar with text labels (desktop)
- Top navbar with page title + user avatar
- Bottom tab bar (mobile)
- 6 separate routes

### New
- **60px icon rail** on the left with Lucide icons + small labels (desktop)
  - Logo (H) at top, profile avatar at bottom
  - Clean style: green tinted background on active icon, no glow effects
  - Tooltip on hover showing page name
- **Bottom tab bar** on mobile (unchanged behavior, just updated to match 4 items)
- **No top navbar** — page title moves into the content area
- **4 main routes + profile** instead of 6

---

## 2. Page Structure (Action-Based)

### LOG — `/log` — "I want to record something"
All input actions consolidated into one page with tabs:
- **Foto-Scan** — AI meal photo analysis (current MealAnalyzer camera + analysis flow)
- **Barcode** — Barcode scanner + Open Food Facts lookup
- **Manuell** — Manual food entry form
- **Gewicht** — Weight logging

### TRACK — `/track` — "I'm working out now"
Active workout sessions:
- **Live-Workout** — Video/pose tracking with MediaPipe (current WorkoutTracker)
- **Workout loggen** — Manual workout entry with exercises

### REVIEW — `/review` — "How am I doing?"
All progress and analytics:
- **Heute** — Today's calorie/macro summary, recent meals, recent workouts (replaces Dashboard)
- **Woche** — Weekly trends, calorie adherence chart, weight trend
- **Historie** — Full meal + workout history with date filtering
- **Check-In** — Weekly nutrition check-in flow

### COACH — `/coach` — "Help me decide"
Full-screen AI chat interface. No tabs — single purpose.

### PROFILE — `/profile`
Accessed via avatar at bottom of icon rail. Settings, account, preferences. Unchanged from current.

---

## 3. Component Architecture

### New Components
| Component | File | Purpose |
|-----------|------|---------|
| `IconRail` | `components/IconRail.jsx` | 60px vertical nav with Lucide icons, active state, profile avatar |
| `PageTabs` | `components/PageTabs.jsx` | Reusable horizontal tab bar for sub-sections within pages |
| `LogPage` | `pages/Log.jsx` | Orchestrator with tabs for Foto-Scan, Barcode, Manuell, Gewicht |
| `TrackPage` | `pages/Track.jsx` | Orchestrator with tabs for Live-Workout, Workout loggen |
| `ReviewPage` | `pages/Review.jsx` | Orchestrator with tabs for Heute, Woche, Historie, Check-In |
| `CoachPage` | `pages/Coach.jsx` | Full-screen AI chat (rename of current AIAssistant) |

### Modified Components
| Component | Change |
|-----------|--------|
| `App.jsx` | Replace Sidebar with IconRail, update routes to /log, /track, /review, /coach |
| `BottomNav.jsx` | Update to 4 items (Log, Track, Review, Coach) matching icon rail |

### Removed Components
| Component | Reason |
|-----------|--------|
| `Sidebar.jsx` | Replaced by IconRail |
| `Navbar.jsx` | Page title moves into content area |
| `Dashboard.jsx` | Content moves to ReviewPage "Heute" tab |
| `Nutrition.jsx` | Content splits across LogPage and ReviewPage tabs |
| `MealAnalyzer.jsx` | Content moves to LogPage "Foto-Scan" and "Barcode" tabs |
| `WorkoutTracker.jsx` | Content moves to TrackPage "Live-Workout" tab |
| `AIAssistant.jsx` | Renamed to CoachPage |

### Preserved Components (moved into tab content)
The actual functional components (camera capture, barcode scanning, nutrition dashboard, check-in flow, meal history, workout tracker, AI chat) are preserved — they become the content rendered inside each tab. Only the page-level orchestration and navigation changes.

---

## 4. Icon Rail Specification

```
Width: 60px
Background: rgba(255,255,255,0.02)
Border-right: 1px solid rgba(255,255,255,0.05)

Items:
  - Logo: 32x32px, rounded-lg, green gradient, "H" text
  - Nav icons: 36x36px, rounded-lg
    - Active: bg rgba(0,255,127,0.1), icon stroke #00FF7F
    - Inactive: no bg, icon stroke rgba(255,255,255,0.35)
  - Labels: 8px uppercase, tracking 1px, below each icon
    - Active: #00FF7F
    - Inactive: rgba(255,255,255,0.3)
  - Profile avatar: 32x32px circle, border rgba(0,255,127,0.3), at bottom (margin-top auto)

Icons (Lucide):
  - Log: PlusCircle
  - Track: Zap
  - Review: BarChart3
  - Coach: MessageSquare
  - Profile: User (in circle)

Hover: bg rgba(255,255,255,0.05) on inactive items
```

---

## 5. PageTabs Specification

```
Container: flex, gap 24px, border-bottom 1px solid rgba(255,255,255,0.05)
Tab item:
  - Active: color #00FF7F, border-bottom 2px solid #00FF7F, padding-bottom 8px
  - Inactive: color rgba(255,255,255,0.4), hover color rgba(255,255,255,0.6)
  - Font: 12-13px, no uppercase
  - Transition: color 150ms

State: controlled via useState in parent page, renders corresponding content
URL sync: optional query param ?tab=barcode (not separate routes)
```

---

## 6. Route Changes

| Old Route | New Route | Content |
|-----------|-----------|---------|
| `/dashboard` | `/review` | ReviewPage, "Heute" tab |
| `/nutrition` | `/review?tab=heute` | ReviewPage, nutrition data in "Heute" tab |
| `/meal-analyzer` | `/log` | LogPage, "Foto-Scan" tab |
| `/workout-tracker` | `/track` | TrackPage, "Live-Workout" tab |
| `/ai-assistant` | `/coach` | CoachPage |
| `/profile` | `/profile` | Unchanged |
| `/` | redirect to `/review` | Default landing |

---

## 7. Mobile Behavior

- Icon rail hidden (lg:flex, hidden on smaller screens)
- Bottom tab bar shows 4 items: Log, Track, Review, Coach
- Profile accessible via icon in top-right of content area on mobile
- Tab navigation within pages remains horizontal tabs (scrollable if needed)

---

## 8. What Does NOT Change

- Color scheme / theme (#0e0e10 dark, #00FF7F neon green)
- Framer Motion page transitions
- Auth flow (login, register, onboarding)
- Backend API — no backend changes needed
- AI chat functionality
- Meal analysis logic
- Workout tracking logic
- All existing Zustand stores
- ErrorBoundary, BackendStatus, LoadingSpinner
