# Duration Defaults Audit

## Summary
Duration/time displays have been removed from workout detail pages. This document tracks where the "30-45 minutes" defaults were coming from.

## Removed Displays
1. **Workout Detail Subtitle** - Removed duration from subtitle (e.g., "Wednesday • 30-45 minutes")
2. **Workout Structure Text** - Removed duration from fallback structure text (e.g., "30-45 minutes at conversational pace")

## Where "30-45 minutes" Defaults Come From

### 1. WorkoutDetail.js Hardcoded Fallbacks
- **Line 533**: `const duration = workoutData.workout?.duration || workoutLib?.duration || '30-45 minutes';`
  - Used in fallback structure generation (now removed)
- **Line 746**: `let calculatedDuration = '30-45 minutes';`
  - Hardcoded fallback for duration calculation (still exists but not displayed)

### 2. Workout Library Files
All workout libraries have hardcoded `duration` fields in their workout definitions:

#### Tempo Workout Library (`src/lib/tempo-workout-library.js`)
- Line 46: `duration: "30-45 minutes total"`
- Line 58: `duration: "45-50 minutes total"`
- Line 72: `duration: "30-40 minutes total"`
- Line 86: `duration: "40-45 minutes total"`
- Line 98: `duration: "20-60 minutes total"`
- Line 113: `duration: "32-48 minutes total"`
- Line 122: `duration: "25-35 minutes total"`

#### Interval Workout Library (`src/lib/interval-workout-library.js`)
- No explicit duration fields found (uses structure-based timing)

#### Hill Workout Library (`src/lib/hill-workout-library.js`)
- Line 158: `duration: "30-45 minutes"`

#### Stand-Up Bike Workout Library (`src/lib/standup-bike-workout-library.js`)
- Line 794: `duration: "30-45 minutes"`

#### Other Cross-Training Libraries
- **Elliptical** (`src/lib/elliptical-workout-library.js`): Lines 33, 425
- **Rowing** (`src/lib/rowing-workout-library.js`): Line 63
- **Swimming** (`src/lib/swimming-workout-library.js`): Lines 75, 420
- **Stationary Bike** (`src/lib/stationary-bike-workout-library.js`): Lines 40, 482
- **Aqua Running** (`src/lib/aqua-running-workout-library.js`): Line 58
- **Brick** (`src/lib/brick-workout-library.js`): Line 156 (`totalDuration`)

## Notes
- These duration fields in the library files are **not currently used** for display
- They may be used internally for workout selection/matching
- The `prescribe` methods in libraries don't calculate duration from distance/pace - they use the hardcoded values
- Long run library has a `calculateDurationFromDistance()` method but it's not consistently used

## Recommendation
If duration is needed in the future, it should be calculated from:
- **Distance** (from workout)
- **Pace** (from user's VDOT paces)
- Formula: `duration = distance × pace`

The hardcoded "30-45 minutes" defaults are not personalized and can be misleading.




