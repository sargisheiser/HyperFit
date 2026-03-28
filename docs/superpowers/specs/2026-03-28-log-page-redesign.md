# Log Page Redesign — Split + Restyle

**Date:** 2026-03-28
**Goal:** Redesign the Log page from a cluttered 1,657-line monolith into a clean, focused input experience with mode toggle, hero capture area, and celebration-style results view. Split MealAnalyzer into ~5 smaller components.

---

## 1. Design Decisions (From Brainstorming)

- **Layout:** Mode Toggle + Hero Area (pill toggle switches between Foto/Barcode/Manuell)
- **Results:** Celebration View (full takeover with checkmark, big calorie number, macro circles, explicit Save)
- **History:** Removed from Log page (lives in Review page Historie tab)
- **Refactor:** Full split of MealAnalyzer.jsx into focused components
- **Auto-save:** Removed. User explicitly clicks "Mahlzeit speichern"

---

## 2. New Component Architecture

### Split MealAnalyzer.jsx (1,657 lines) Into:

| Component | File | Lines (est.) | Responsibility |
|-----------|------|-------------|----------------|
| `LogPage` | `pages/LogPage.jsx` | ~80 | Page orchestrator with mode toggle + weight tab |
| `ModeToggle` | `components/log/ModeToggle.jsx` | ~40 | Pill toggle (Foto / Barcode / Manuell) |
| `PhotoCapture` | `components/log/PhotoCapture.jsx` | ~200 | Hero drop-zone, camera modal, gallery picker, image preview |
| `BarcodeCapture` | `components/log/BarcodeCapture.jsx` | ~180 | Barcode scanner modal, manual EAN input, Open Food Facts fetch |
| `ResultsView` | `components/log/ResultsView.jsx` | ~250 | Celebration view: checkmark, calories, macro circles, food items, Save/Discard |
| `FoodItemList` | `components/log/FoodItemList.jsx` | ~120 | Collapsible food item list with inline quantity editing |
| `CameraModal` | `components/log/CameraModal.jsx` | ~80 | Shared camera overlay (used by PhotoCapture + BarcodeCapture) |

### Kept As-Is (Not Refactored)
| Component | File | Reason |
|-----------|------|--------|
| `ManualMealEntry` | `components/Nutrition/ManualMealEntry.jsx` | Already a separate modal component, works fine |
| `WeightInput` | `components/Nutrition/WeightInput.jsx` | Already clean + focused |

### Removed From Log Page
| Component | Where It Goes |
|-----------|--------------|
| Meal history section (last 3 meals) | `ReviewPage` Historie tab (already exists via `MealHistory` component) |
| `AnalysisCorrection` modal | Stays available but triggered from Review page history, not Log page |

---

## 3. LogPage Layout

```
┌──────────────────────────────────────┐
│  Log                                 │
│  Mahlzeit erfassen                   │
│                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ Foto │ │Barcode│ │Manuell│  ← pills│
│  └──────┘ └──────┘ └──────┘         │
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │      HERO CAPTURE AREA       │    │
│  │   (changes per active mode)  │    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  💬 Optionale Notiz...       │    │
│  └──────────────────────────────┘    │
│                                      │
│  ═══════════════════════════════════  │
│  (after scan: ResultsView appears)   │
│                                      │
│  ┌──────────────────────────────┐    │
│  │        ✓ Analysiert          │    │
│  │         580 kcal             │    │
│  │    (P) 28  (C) 65  (F) 18   │    │
│  │                              │    │
│  │  Spaghetti Bolognese  350g ▸ │    │
│  │  Parmesan              20g ▸ │    │
│  │                              │    │
│  │  [████ Mahlzeit speichern ████]│  │
│  │         Verwerfen             │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

---

## 4. Mode Toggle Spec

```
Container: flex, gap 6px, p-1, bg white/3, border white/6, rounded-xl
Pill items:
  - Active: bg rgba(0,255,127,0.1), rounded-lg, color #00FF7F, font-weight 500
  - Inactive: color white/40, hover white/60
  - Each has emoji + label: "📸 Foto", "📱 Barcode", "✏️ Manuell"
State: controlled via activeMode in LogPage
```

When active mode is:
- **Foto:** PhotoCapture component renders in hero area
- **Barcode:** BarcodeCapture component renders in hero area
- **Manuell:** ManualMealEntry renders inline (not as modal)

---

## 5. PhotoCapture Spec

**Idle state (no image selected):**
- Dashed border container (2px dashed, rgba(0,255,127,0.2))
- Large camera icon centered (64px circle, green tint)
- "Foto aufnehmen oder hochladen" text
- Two buttons: "Kamera" (green) + "Galerie" (subtle)
- Drag-and-drop support for desktop

**Image selected (preview):**
- Shows image preview in the hero area (rounded, max-height constrained)
- "Analyse starten" button appears (green, prominent)
- "Anderes Foto" link to reset

**Analyzing state:**
- Image stays visible but dims
- Pulsing green ring animation over the image
- "KI analysiert..." text

**After analysis:**
- Hero area collapses/fades
- ResultsView slides in below

---

## 6. BarcodeCapture Spec

**Default state:**
- Same hero container style as PhotoCapture
- Large barcode icon centered
- "Barcode scannen" text
- "Scanner starten" button (green)
- Below: manual EAN input field ("oder EAN-Code eingeben")

**Scanner active:**
- Full-width video feed in hero area (not modal overlay)
- Scanning animation border
- Auto-detection with BarcodeDetector API
- Close button to return to default

**Product found:**
- Show product name + image (from Open Food Facts) briefly
- Transition to ResultsView with product data

---

## 7. ResultsView Spec (Celebration View)

**Layout:**
```
Success icon: 56px circle, green border, checkmark
Title: "Mahlzeit analysiert" (18px, white)
Subtitle: "Konfidenz 92% · 2 Lebensmittel" (12px, white/30)

Big calorie: 580 (48px, font-weight 200, white)
Label: "KALORIEN" (11px, uppercase, green/50)

Macro circles (3x):
  52px diameter, border 2px
  Protein: green border, value inside
  Carbs: white/10 border
  Fat: white/10 border

Food items: collapsible list
  Each row: name, quantity, calories, expand arrow
  Expanded: shows edit inputs for quantity (same fix as barcode edit)

Save button: full-width, green gradient, "Mahlzeit speichern"
Discard link: centered, subtle, "Verwerfen"
```

**On Save:**
- Button shows checkmark animation
- Toast/flash: "Gespeichert!"
- After 1s, resets to hero capture area (ready for next meal)

**On Discard:**
- Resets to hero capture area immediately
- No confirmation needed (data wasn't saved)

---

## 8. Data Flow

```
LogPage (orchestrator)
  ├── ModeToggle (activeMode state)
  ├── PhotoCapture / BarcodeCapture / ManualMealEntry
  │     ├── captures image/barcode/manual input
  │     ├── calls analyzeMealVision() or fetchProduct()
  │     └── passes analysis result UP via onAnalysisComplete(result)
  ├── ResultsView (receives analysis result)
  │     ├── displays celebration view
  │     ├── FoodItemList (inline quantity editing)
  │     ├── onSave → calls saveAnalyzedMeal() + refreshes nutrition store
  │     └── onDiscard → resets to capture
  └── WeightInput (separate tab, unchanged)
```

**State lifted to LogPage:**
- `activeMode`: 'foto' | 'barcode' | 'manuell'
- `analysis`: the AI/barcode result object (null when no result)
- `note`: optional text note

**State internal to each component:**
- PhotoCapture: selectedFile, previewUrl, isAnalyzing, cameraModal
- BarcodeCapture: scannerActive, manualBarcode, isFetching
- ResultsView: editingItemIndex, editQuantityValue, isSaving

---

## 9. What Does NOT Change

- Backend API endpoints (no backend changes)
- `analyzeMealVision()`, `saveAnalyzedMeal()`, `fetchMealHistory()` from nutritionService
- Nutrition store updates after save
- Camera/barcode detection logic (just moved to new component files)
- ManualMealEntry component (stays in components/Nutrition/)
- WeightInput component (stays as-is)
- Analysis data format from AI

---

## 10. Files Changed Summary

### New Files (7)
- `frontend/src/components/log/ModeToggle.jsx`
- `frontend/src/components/log/PhotoCapture.jsx`
- `frontend/src/components/log/BarcodeCapture.jsx`
- `frontend/src/components/log/ResultsView.jsx`
- `frontend/src/components/log/FoodItemList.jsx`
- `frontend/src/components/log/CameraModal.jsx`
- `frontend/src/components/log/index.js` (barrel export)

### Modified Files (1)
- `frontend/src/pages/LogPage.jsx` — rewrite with ModeToggle + new components

### Preserved (not deleted yet)
- `frontend/src/pages/MealAnalyzer.jsx` — keep until all components extracted and verified working. Delete in final cleanup task.
