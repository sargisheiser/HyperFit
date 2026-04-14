# Review Page Redesign

**Date:** 2026-03-28
**Goal:** Redesign all 4 tabs of the Review page: clean daily summary (Heute), weekly trends (Woche), timeline meal history (Historie), and restyled Check-In.

---

## 1. Design Decisions

- **Heute tab:** Big Number + List Rows (dominant calorie number, macros as list rows with current/target, weight + workouts + steps at bottom)
- **Ernährung tab → renamed to "Woche":** Weekly 7-day calorie/macro chart with averages and trends
- **Historie tab:** Timeline view with vertical dots, compact cards grouped by day, tap to expand
- **Check-In tab:** Keep 5-step wizard flow, restyle with larger fonts (min 14px) and cleaner layout
- **All text min 14px** (`text-sm` or larger) for mobile readability

---

## 2. Tab Structure Change

| Old | New | Content |
|-----|-----|---------|
| Heute | Heute | Redesigned daily summary |
| Ernährung | Woche | NEW: 7-day chart + weekly averages |
| Historie | Historie | Redesigned timeline view |
| Check-In | Check-In | Restyled existing flow |

---

## 3. Heute Tab — Big Number + Macro List

### Layout
```
"Heute" title + "Dein Tag auf einen Blick" subtitle

┌─────────────────────────────────┐
│         1,847                    │
│    von 2,200 kcal · 84%         │
│    ████████████████░░░░          │
└─────────────────────────────────┘

● Protein     120 / 150g
● Carbs       185 / 250g
● Fett         62 / 80g

┌──────┐ ┌──────┐ ┌──────┐
│78.5kg│ │ 3/4  │ │6,842 │
│Gewicht│ │Workouts│ │Schritte│
└──────┘ └──────┘ └──────┘
```

### Data Sources
- Calories/macros: `useNutritionStore` (calorieGoal, calorieIntake, macros)
- Weight: `useNutritionStore` (weight)
- Workouts: `useDashboardStats` hook
- Steps: `useSteps` hook

### Component
New: `frontend/src/components/review/HeuteTab.jsx` (~120 lines)
- Replaces current Dashboard.jsx content in ReviewPage
- Uses existing hooks, no new API calls

---

## 4. Woche Tab — Weekly Overview

### Layout
```
"Diese Woche" header + date range

┌─────────────────────────────────┐
│  Bar chart: 7 days              │
│  Mo Di Mi Do Fr Sa So           │
│  ██ ██ ██ ██ ██ ░░ ░░           │
│  (green bars = actual,          │
│   dashed line = goal)           │
└─────────────────────────────────┘

Durchschnitt
● Kalorien    1,920 kcal/Tag
● Protein     125g/Tag
● Compliance  86%
```

### Data Sources
- Weekly data from `useDashboardStats` (already computes chartData for 7 days)
- Can use existing `fetchNutritionSnapshot` for each day or aggregate from history

### Component
New: `frontend/src/components/review/WocheTab.jsx` (~150 lines)
- Simple bar chart using inline divs (no charting library needed for 7 bars)
- Average calculations from available data

---

## 5. Historie Tab — Timeline View

### Layout
```
Heute
  ● ──┬── Pasta Bolognese        580 kcal
      │   12:30 · 2 items · 92%
  ○ ──┬── Griechischer Salat     320 kcal
      │   08:15 · 3 items · 88%
  ○ ──┬── Banane + Joghurt       210 kcal
      │   07:00 · 2 items · 95%

Gestern
  ○ ──┬── Pizza Margherita       750 kcal
      │   19:45 · 1 item · 90%
```

### Behavior
- Tap a row to expand: shows food items, macros per item, edit/delete buttons
- Most recent entry gets green dot, others get gray dots
- Grouped by day with sticky headers
- Load 20 entries initially, "Mehr laden" button for pagination

### Component
Rewrite: `frontend/src/components/review/HistorieTab.jsx` (~200 lines)
- Replaces current MealHistory.jsx (422 lines)
- Keep edit (AnalysisCorrection modal) and delete functionality
- Remove the 3-column grid, images, confidence pills, insights

---

## 6. Check-In Tab — Restyle Only

### Changes
- Bump all `text-xs` and `text-sm` to `text-base` (16px) for step content
- Bump button text to `text-base`
- Keep 5-step wizard flow unchanged
- Increase step indicator size
- Increase spacing between elements

### Component
Modify: `frontend/src/components/Nutrition/CheckInFlow.jsx`
- CSS-only changes (font sizes, padding, spacing)
- No logic changes

---

## 7. ReviewPage.jsx Update

### Tab Definition Change
```javascript
const TABS = [
  { id: 'heute', label: 'Heute' },
  { id: 'woche', label: 'Woche' },      // was 'ernaehrung'
  { id: 'historie', label: 'Historie' },
  { id: 'checkin', label: 'Check-In' },
]
```

### Component Imports Change
```javascript
// Remove:
import Dashboard from './Dashboard'
import NutritionDashboard from '../components/Nutrition/NutritionDashboard'
import MealHistory from '../components/Nutrition/MealHistory'

// Add:
import HeuteTab from '../components/review/HeuteTab'
import WocheTab from '../components/review/WocheTab'
import HistorieTab from '../components/review/HistorieTab'
```

---

## 8. New Files

| File | Lines (est.) | Purpose |
|------|-------------|---------|
| `components/review/HeuteTab.jsx` | ~120 | Daily summary with big calorie number + macro list |
| `components/review/WocheTab.jsx` | ~150 | Weekly bar chart + averages |
| `components/review/HistorieTab.jsx` | ~200 | Timeline meal history |

### Modified Files
| File | Change |
|------|--------|
| `pages/ReviewPage.jsx` | Update tabs + imports |
| `components/Nutrition/CheckInFlow.jsx` | Font size bumps only |

---

## 9. What Does NOT Change

- Backend API endpoints
- Check-In flow logic (5 steps, AI feedback)
- Nutrition store (useNutritionStore)
- Auth flow
- Edit/delete meal functionality (AnalysisCorrection modal stays)
- useDashboardStats hook
