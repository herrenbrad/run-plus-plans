# TrainingPlanService Refactor - Complete

**Date:** November 22, 2025  
**Goal:** Eliminate hardcoded defaults by migrating plan generation to AI

---

## ✅ What Was Done

### 1. Created AI Plan Regeneration Method
- **New Method:** `TrainingPlanAIService.regeneratePlanStructureFromCurrentWeek()`
- **Purpose:** Regenerate plan structure from current week using AI (no defaults!)
- **Features:**
  - Only generates weeks from current week forward
  - Uses updated settings (no defaults)
  - Maintains periodization from where plan left off
  - Returns new weeks array for merging

### 2. Updated ManagePlanModal
- **Before:** Called `TrainingPlanService.regeneratePlanFromCurrentWeek()` (rule-based with defaults)
- **After:** Calls `TrainingPlanAIService.regeneratePlanStructureFromCurrentWeek()` (AI, no defaults)
- **Then:** Uses `TrainingPlanService.preserveAndMergeWeeks()` utility to merge

### 3. Extracted Utility Functions
- **New Method:** `TrainingPlanService.preserveAndMergeWeeks()`
- **Purpose:** Pure utility function - preserves completed weeks, merges with new weeks
- **No defaults, no plan generation** - just technical manipulation

### 4. Deprecated Old Method
- **Old Method:** `TrainingPlanService.regeneratePlanFromCurrentWeek()`
- **Status:** Deprecated - throws error if called
- **Reason:** Uses rule-based generator with hardcoded defaults

---

## 📋 What's Left for TrainingPlanService

### ✅ Still Needed (Utility Functions):

1. **`preserveAndMergeWeeks()`** ✅
   - Preserves completed weeks
   - Merges with new AI-generated weeks
   - Pure utility - no defaults

2. **`regeneratePlanWithInjury()`** ✅
   - Replaces running workouts with cross-training
   - Uses cross-training libraries
   - This is fine - it's just replacing workouts, not generating plan structure

3. **Cross-Training Libraries** ✅
   - Aqua Running, Elliptical, Stationary Bike, Swimming, Rowing, Stand-Up Bike
   - Needed for injury recovery

4. **Workout Replacement Logic** ✅
   - `createCrossTrainingWeek()` - Replaces workouts with cross-training
   - `createReturnToRunningWeek()` - Gradual return to running
   - `reduceWeekTrainingDays()` - Reduces training days

### ❌ No Longer Needed (But Still Exists):

1. **`generatePlanFromOnboarding()`** ⚠️
   - Legacy method - not used for new plans
   - Still called internally by deprecated `regeneratePlanFromCurrentWeek()`
   - Uses `TrainingPlanGenerator` (rule-based with defaults)
   - **Should be removed or kept only as fallback**

2. **`TrainingPlanGenerator` usage** ⚠️
   - Rule-based plan generation
   - Has hardcoded defaults
   - **No longer used for plan updates**

3. **Plan templates** ⚠️
   - `this.planTemplates` - Hardcoded week counts
   - **Not needed if AI generates plans**

---

## 🎯 Current Architecture

### Plan Generation Flow (NEW):
```
User adjusts plan in ManagePlanModal
    ↓
TrainingPlanAIService.regeneratePlanStructureFromCurrentWeek()
    ↓
AI generates weeks from current week forward (NO DEFAULTS!)
    ↓
TrainingPlanService.preserveAndMergeWeeks()
    ↓
Merged plan saved to Firestore
```

### Injury Recovery Flow (UNCHANGED):
```
User creates injury recovery plan
    ↓
TrainingPlanService.regeneratePlanWithInjury()
    ↓
Replaces running workouts with cross-training
    ↓
TrainingPlanAIService.generateInjuryRecoveryCoaching()
    ↓
Plan + coaching saved to Firestore
```

---

## 🚨 Defaults Eliminated

### Before (TrainingPlanService):
- ❌ `runningStatus || 'active'`
- ❌ `trainingPhilosophy || 'Zone-Based Training'`
- ❌ `totalWeeks || 12`
- ❌ `standUpBikeType || 'cyclete'`
- ❌ `hasGarmin !== false` (defaults to true)

### After (TrainingPlanAIService):
- ✅ All fields validated - throws error if missing
- ✅ No defaults - AI uses only what user provided
- ✅ Settings explicitly passed in prompt

---

## 📝 Summary

**TrainingPlanService is now a utility service:**
- ✅ Week preservation/merging
- ✅ Injury recovery workout replacement
- ✅ Cross-training library access

**TrainingPlanAIService handles all plan generation:**
- ✅ Initial plan generation
- ✅ Plan structure regeneration (updates)
- ✅ AI coaching analysis

**Result:** No more hardcoded defaults sneaking into plans! 🎉






