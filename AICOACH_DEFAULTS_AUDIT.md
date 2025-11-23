# AICoach Defaults Audit - CRITICAL ISSUES

**Date:** November 22, 2025  
**Issue:** User has asked about defaults 1000 times. With AICoach, there should be NO defaults.

---

## 🚨 CRITICAL DEFAULTS FOUND

### 1. **Units Default** (Line 527)
```javascript
const units = profile.units || 'imperial';
```
**Problem:** If user doesn't specify units, defaults to imperial.  
**Fix:** Should require units from user profile. If missing, ERROR or ask user.

---

### 2. **Name Fallback** (Line 531)
```javascript
const fullName = profile.name || profile.displayName;
```
**Problem:** Falls back to displayName if name doesn't exist.  
**Fix:** Only use if explicitly provided. Don't assume.

---

### 3. **Cross-Training Equipment Default** (Line 620)
```javascript
const crossTrainingEquipment = profile.crossTrainingEquipment || {};
```
**Problem:** Defaults to empty object.  
**Fix:** Only include in prompt if user actually has equipment. Don't default to empty.

---

### 4. **Rest Days Default** (Line 632, 659)
```javascript
const restDaysCount = (profile.restDays || []).length;
const restDays = profile.restDays || [];
```
**Problem:** Defaults to empty array.  
**Fix:** Only include rest days in prompt if user explicitly set them. Don't default.

---

### 5. **Quality Days Default** (Line 649)
```javascript
const qualityDays = profile.qualityDays || [];
```
**Problem:** Defaults to empty array.  
**Fix:** Only include quality days if user explicitly set them.

---

### 6. **Pace Fallbacks** (Lines 1077, 1083, 1089)
```javascript
const thresholdPace = paces.threshold?.pace || paces.tempo;
const intervalPace = paces.interval?.pace || paces.interval;
const marathonPace = paces.marathon?.pace || paces.marathonPace;
```
**Problem:** Falls back to alternative pace names if primary doesn't exist.  
**Fix:** Should calculate from VDOT if missing, not fallback to different field names.

---

### 7. **Fallback Workout Type** (Line 1232)
```javascript
const fallbackType = workout.workoutType || 'easy';
```
**Problem:** Defaults to 'easy' if workout type is missing.  
**Fix:** Should extract from workout description or ERROR, not default.

---

### 8. **Workout Details Fallbacks** (Lines 1201-1204)
```javascript
name: details.name || workout.description,
description: details.description || workout.description,
focus: focusMap[normalizedType] || details.focus || 'Training',
```
**Problem:** Multiple fallbacks - defaults to description, then 'Training'.  
**Fix:** Should have proper workout details from library. If missing, ERROR.

---

### 9. **Focus Default** (Line 1250)
```javascript
focus: fallbackFocusMap[fallbackType] || 'Training',
```
**Problem:** Defaults to 'Training' if type not found.  
**Fix:** Should map correctly or ERROR.

---

## ✅ WHAT SHOULD HAPPEN

**With AICoach, EVERYTHING should come from:**
1. User profile (explicitly set during onboarding)
2. VDOT calculations (from user's goal time)
3. Workout library (curated workouts, not defaults)

**NO defaults should be used because:**
- User explicitly provided all data during onboarding
- AICoach should work with REAL user data, not assumptions
- Defaults can lead to incorrect training plans

---

## 🔧 FIXES APPLIED ✅

1. ✅ **Removed units default** - Now throws error if units missing
2. ✅ **Removed cross-training equipment default** - Only includes if user has equipment
3. ✅ **Removed rest days defaults** - Only uses if explicitly set
4. ✅ **Removed quality days defaults** - Only uses if explicitly set
5. ✅ **Removed pace fallbacks** - Uses structured VDOT paces only, no legacy field names
6. ✅ **Improved fallback workout type detection** - Extracts from description instead of defaulting to 'easy'
7. ✅ **Added validation** - Throws errors for missing required fields
8. ✅ **Fixed AICoachService defaults** - Only includes workout data that exists (no 'N/A' or 0 defaults)

## 📝 CHANGES MADE

### TrainingPlanAIService.js
- **Line 527-531:** Added validation - throws error if units missing
- **Line 620-627:** Only includes cross-training equipment if user actually has it
- **Line 632:** Only counts rest days if explicitly set
- **Line 1077-1089:** Removed pace fallbacks - uses structured VDOT paces only
- **Line 1232-1242:** Improved fallback type detection from description
- **Line 502-520:** Added comprehensive validation for all required fields

### AICoachService.js
- **Line 145-148:** Removed 'N/A' and 0 defaults - only includes data that exists

## ✅ RESULT

**NO DEFAULTS REMAIN** - AICoach now only works with:
1. User profile data (explicitly provided during onboarding)
2. VDOT calculations (from user's goal time)
3. Workout library data (curated workouts)

If required data is missing, the system will ERROR instead of using defaults.

