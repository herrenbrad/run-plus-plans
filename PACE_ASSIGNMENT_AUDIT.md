# Pace Assignment Audit - All Gotchas & Issues

**Date:** November 22, 2025  
**Status:** Comprehensive audit of pace assignment logic

## 🔴 CRITICAL ISSUES FOUND

### 1. **Fast Finish Detection Order Bug** ⚠️
**Location:** `WorkoutDetail.js:618-648`

**Problem:**
- `isProgressionRun` check (line 618) happens BEFORE `isFastFinish` check (line 634)
- "Super Fast Finish" gets caught by progression run logic first
- Shows only easy pace instead of both easy → fast finish pace

**Current Code:**
```javascript
const isProgressionRun = workoutNameForPace.includes('fast finish') || ...  // Line 622
// ... later ...
const isFastFinish = workoutNameForPace.includes('fast finish') || ...  // Line 634

if (isProgressionRun && availablePaces.easy) {  // This catches fast finish first!
  paceGuidance = `${availablePaces.easy.min}-${availablePaces.easy.max}/mile (starting pace)`;
}
```

**Fix:** Check `isFastFinish` BEFORE `isProgressionRun` in the if-else chain

---

### 2. **Interval Workouts - Missing Track Intervals Fallback** ⚠️
**Location:** `WorkoutDetail.js:652-654`

**Problem:**
- Interval workouts show interval pace, but what if `paces.interval` doesn't exist?
- Track intervals might not be available
- Falls through to easy pace fallback (wrong!)

**Current Code:**
```javascript
else if ((workoutType === 'intervals' || intensity === 'interval') && availablePaces.interval) {
  paceGuidance = `${availablePaces.interval.pace}/mile`;
}
// If interval pace doesn't exist, falls through to easy pace (WRONG!)
```

**Fix:** Add explicit error handling or use intensityGuidance.pace as fallback

---

### 3. **Tempo Workouts - Intensity Type Mismatch** ⚠️
**Location:** `WorkoutDetail.js:655-657` and `tempo-workout-library.js:333-355`

**Problem:**
- Tempo library has different intensity types: `comfortablyHard`, `thresholdPace`, `tempoPlus`
- All map to `threshold` pace, but WorkoutDetail only checks `intensity === 'threshold'`
- If intensity is `comfortablyHard` or `tempoPlus`, it might not match

**Current Code:**
```javascript
// WorkoutDetail.js
else if ((workoutType === 'tempo' || intensity === 'threshold' || intensity === 'tempoPlus') && availablePaces.threshold) {
  paceGuidance = `${availablePaces.threshold.pace}/mile`;
}
```

**Issue:** What if intensity is `comfortablyHard`? Won't match!

**Fix:** Check for `workoutType === 'tempo'` first, then check intensity

---

### 4. **Hill Workouts - Intensity-Based Pace Selection** ⚠️
**Location:** `hill-workout-library.js:321-338` and `WorkoutDetail.js`

**Problem:**
- Hill workouts use threshold OR interval pace based on intensity
- But WorkoutDetail doesn't have specific logic for hill workouts
- Falls through to generic fallback

**Current Code:**
```javascript
// Hill library injects pace into name, but WorkoutDetail might not use it correctly
if (intensity && intensity.toLowerCase().includes('short') && paces.interval) {
  updatedName = `${name} (${paces.interval.pace}/mi)`;
} else if (paces.threshold) {
  updatedName = `${name} (${paces.threshold.pace}/mi)`;
}
```

**Issue:** WorkoutDetail doesn't check for hill workout type specifically

---

### 5. **Long Run - Fast Finish Name Injection Missing Fast Finish Pace** ⚠️
**Location:** `long-run-workout-library.js:343-395`

**Problem:**
- Fast finish workouts detected in name injection (line 354)
- But only shows easy pace: `paceDisplay = ${paces.easy.max}/mi start` (line 367)
- Should show BOTH easy and fast finish pace

**Current Code:**
```javascript
if (isProgressionRun && paces.easy) {
  // Progression runs show easy pace (where they START)
  paceDisplay = `${paces.easy.max}/mi start`;  // Missing fast finish pace!
}
```

**Fix:** Add special handling for fast finish to show both paces in name

---

### 6. **Sandwich Workouts - Race Pace vs Marathon Pace Confusion** ⚠️
**Location:** `WorkoutDetail.js:636-640` and `long-run-workout-library.js:368-372`

**Problem:**
- Uses `racePace` OR `marathon` pace
- For half marathon goal, `racePace` should be 9:09/mi (actual goal pace)
- But `marathon` pace might be 9:27/mi (marathon training pace)
- Logic is correct, but need to ensure `racePace` is always calculated

**Current Code:**
```javascript
const goalPace = availablePaces.racePace?.pace || availablePaces.marathon?.pace;
```

**Issue:** If `racePace` doesn't exist, falls back to marathon pace (wrong for half marathon!)

---

### 7. **Progression Runs - All Treated Same** ⚠️
**Location:** `WorkoutDetail.js:646-648`

**Problem:**
- "10-Second Dropdowns", "Thirds", "DUSA", "Fast Finish" all treated as progression runs
- But they have different ending paces:
  - Dropdowns/Thirds/DUSA → end at marathon pace
  - Fast Finish → ends at 5K/interval pace
- Currently all show only starting easy pace

**Fix:** Need to differentiate between progression types

---

### 8. **Missing Pace Fallback Chain** ⚠️
**Location:** `WorkoutDetail.js:607-668`

**Problem:**
- If pace doesn't match any condition, falls through to easy pace (line 665-667)
- But what if it's an interval workout and interval pace is missing?
- Should show error or use intensityGuidance, not easy pace

**Current Code:**
```javascript
} else if (availablePaces.easy) {
  // FALLBACK - default to easy pace if nothing else matches
  paceGuidance = `${availablePaces.easy.min}-${availablePaces.easy.max}/mile`;
}
```

**Issue:** Too generic - might show wrong pace for interval/tempo workouts

---

### 9. **Track Intervals - Per-Interval Time vs Mile Pace** ⚠️
**Location:** `interval-workout-library.js:412-439`

**Problem:**
- Shows track interval time (e.g., "6:32/1200m") AND mile pace conversion
- But WorkoutDetail might not use this correctly
- Track intervals stored in `trackIntervals` object, but might not be passed through

**Current Code:**
```javascript
if (repetitions.includes('1200m') && trackIntervals.threshold && trackIntervals.threshold['1200m']) {
  const milePace = this.convertToMilePace(trackIntervals.threshold['1200m'], 1200);
  updatedName = `${name} (${trackIntervals.threshold['1200m']}/1200m = ${milePace})`;
}
```

**Issue:** Track intervals might not be available in WorkoutDetail

---

### 10. **Pace Source Priority Inconsistency** ⚠️
**Location:** `WorkoutDetail.js:609`

**Problem:**
- Uses `workoutLib?.paces || vdotPaces` as fallback
- But `workoutLib.paces` might be from library injection
- `vdotPaces` is calculated from goal time
- Which takes precedence? Unclear!

**Current Code:**
```javascript
const availablePaces = workoutLib?.paces || vdotPaces;
```

**Issue:** Should prefer library-injected paces, but fallback logic unclear

---

## 🟡 MEDIUM PRIORITY ISSUES

### 11. **Tempo Workout Intensity Types Not All Handled**
- `comfortablyHard`, `thresholdPace`, `tempoPlus` all exist
- But WorkoutDetail only checks for `threshold` and `tempoPlus`
- Missing `comfortablyHard` check

### 12. **Hill Workout Intensity Types**
- `short_power`, `medium_vo2`, `long_strength` categories
- But pace assignment based on intensity string matching
- Might miss edge cases

### 13. **Long Run Intensity Field Parsing**
- Intensity can be: `"easy"`, `"easy to marathonPace"`, `"easy to fastFinish"`
- String matching might be fragile
- Should use more robust parsing

### 14. **Workout Type vs Intensity Mismatch**
- Workout type might be `"longRun"` but intensity is `"easy to marathonPace"`
- Logic checks both, but order matters
- Might show wrong pace if checks are in wrong order

---

## 🟢 LOW PRIORITY / EDGE CASES

### 15. **Cross-Training Workouts**
- Bike workouts might not have paces
- Uses equipment-specific notes instead
- Logic seems OK, but verify

### 16. **Easy/Recovery Workouts**
- Should always show easy pace
- Logic looks correct
- But verify fallback

### 17. **Workout Name Parsing**
- Pace extraction from workout names is fragile
- Relies on string matching
- Might miss variations

---

## 📋 RECOMMENDED FIXES (Priority Order)

### Fix 1: Reorder Fast Finish Check (CRITICAL)
Move `isFastFinish` check BEFORE `isProgressionRun` check

### Fix 2: Add Explicit Hill Workout Handling
Add `workoutType === 'hills'` check with intensity-based pace selection

### Fix 3: Fix Interval Workout Fallback
Add explicit error or use `intensityGuidance.pace` if interval pace missing

### Fix 4: Fix Tempo Workout Intensity Matching
Check `workoutType === 'tempo'` first, then handle all intensity types

### Fix 5: Ensure Race Pace is Always Calculated
Make sure `racePace` is always added to paces object in `getVdotPaces()`

### Fix 6: Differentiate Progression Run Types
Add separate handling for fast finish vs. other progression runs

### Fix 7: Improve Fallback Chain
Don't default to easy pace for interval/tempo workouts - use intensityGuidance

### Fix 8: Add Pace Validation
Log warnings when expected pace is missing for workout type

---

## 🔍 TESTING CHECKLIST

For each workout type, verify:
- [ ] Interval workouts show interval pace (not easy)
- [ ] Tempo workouts show threshold pace (not easy)
- [ ] Hill workouts show correct pace based on intensity
- [ ] Fast finish shows both easy → fast finish pace
- [ ] Progression runs show starting easy pace
- [ ] Sandwich workouts show race pace (not marathon pace for half marathon)
- [ ] Long runs show easy pace
- [ ] Easy/recovery workouts show easy pace
- [ ] Missing paces show appropriate fallback (not wrong pace)

---

## 📝 NOTES

- Pace assignment happens in multiple places:
  1. Library `injectPacesIntoName()` methods
  2. Library `injectPacesIntoStructure()` methods  
  3. WorkoutDetail `paceGuidance` extraction
  4. WorkoutDetail Target Pace card display

- Need to ensure consistency across all layers
- Priority: Library injection > WorkoutDetail extraction > Fallback






