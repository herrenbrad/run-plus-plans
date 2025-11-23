# TrainingPlanService Audit - What's Left?

**Date:** November 22, 2025  
**Question:** Now that we've migrated injury recovery and plan adjustments to AI coaching, what's left for TrainingPlanService?

---

## 🔍 Current Usage

TrainingPlanService is still used in:
1. **ManagePlanModal.js** - Calls `regeneratePlanFromCurrentWeek()`
2. **InjuryRecoveryModal.js** - Calls `regeneratePlanWithInjury()`

---

## ⚠️ THE PROBLEM: Hardcoded Defaults

TrainingPlanService still uses **TrainingPlanGenerator** (rule-based) which has defaults:

### Found Defaults in TrainingPlanService:
- Line 96: `runningStatus: formData.runningStatus || 'active'` ❌
- Line 97: `hasGarmin: formData.hasGarmin !== false` ❌ (defaults to true)
- Line 99: `currentWeeklyMileage: parseInt(formData.currentWeeklyMileage) || null` ❌
- Line 101: `currentLongRunDistance: parseInt(formData.currentLongRunDistance) || null` ❌
- Line 193: `runningStatus: formData.runningStatus || 'active'` ❌
- Line 198: `trainingPhilosophy: formData.trainingPhilosophy || 'Zone-Based Training'` ❌
- Line 234: `const totalWeeks = actualWeeks || template.weeks` ❌
- Line 682: `const totalWeeks = this.planTemplates[formData.raceDistance]?.weeks || 12` ❌
- Line 754: `const phase = this.getPhase(weekNumber, this.planTemplates[formData.raceDistance]?.weeks || 12)` ❌
- Line 755: `let brickType = 'aerobic'; // default` ❌
- Line 778: `equipment: formData.standUpBikeType || 'cyclete'` ❌
- Line 793: `description: \`${runDistance} mile run + ${bikeDistance} mile ${formData.standUpBikeType || 'bike'}\`` ❌
- Line 810: `description: \`Moderate effort ${formData.standUpBikeType || 'bike'} ride\`` ❌
- Line 868: `const totalWeeks = this.planTemplates[raceDistance]?.weeks || 12` ❌

**These defaults are the "nonsense" that sneaks into plan tests!**

---

## 📋 What TrainingPlanService Still Does

### 1. `regeneratePlanFromCurrentWeek()` (ManagePlanModal)
**What it does:**
- Preserves completed weeks
- Calls `generatePlanFromOnboarding()` 
- Which calls `TrainingPlanGenerator.generateTrainingPlan()` (rule-based with defaults)
- Merges completed weeks + new weeks

**Problem:** Uses rule-based generator with hardcoded defaults

### 2. `regeneratePlanWithInjury()` (InjuryRecoveryModal)
**What it does:**
- Preserves completed weeks
- Replaces running workouts with cross-training workouts
- Uses cross-training libraries (aqua running, elliptical, etc.)
- Creates return-to-running week

**Status:** ✅ This is actually fine - it's just replacing workouts, not generating new plan structure

### 3. `generatePlanFromOnboarding()` (Legacy)
**What it does:**
- Converts onboarding data to generator options
- Calls `TrainingPlanGenerator.generateTrainingPlan()` (rule-based)
- Adds dates and reorders workouts

**Status:** ⚠️ Legacy method, still called by `regeneratePlanFromCurrentWeek()`

---

## 🎯 What's Actually Needed

### Still Needed:
1. **Cross-training library access** - Injury recovery needs these libraries
2. **Workout replacement logic** - Injury recovery needs to replace workouts
3. **Week preservation logic** - Both methods need to preserve completed weeks

### NOT Needed (but still used):
1. **Rule-based plan generation** - `TrainingPlanGenerator` with defaults
2. **Legacy plan structure** - The old way of generating plans

---

## 💡 Solution Options

### Option 1: Keep TrainingPlanService for Technical Work Only
- Keep it for: Cross-training libraries, workout replacement, week preservation
- Remove: All plan generation logic
- Have AI regenerate the plan structure, then TrainingPlanService just does technical manipulation

### Option 2: Fully Migrate to AI
- Have AI regenerate the entire plan structure (like initial plan generation)
- TrainingPlanService becomes a pure utility for:
  - Cross-training libraries
  - Workout replacement
  - Week merging/preservation

### Option 3: Hybrid Approach (Recommended)
- **Plan structure regeneration** → Use AI (eliminates defaults)
- **Technical manipulation** → Keep TrainingPlanService:
  - Preserving completed weeks
  - Replacing workouts with cross-training
  - Merging week arrays

---

## 🔧 Recommended Refactor

1. **Create `regeneratePlanStructureWithAI()`** in TrainingPlanAIService
   - Takes current week, new settings, existing plan
   - AI generates new plan structure from current week forward
   - Returns new weeks (no defaults!)

2. **Keep TrainingPlanService for:**
   - `preserveCompletedWeeks()` - Utility function
   - `replaceWorkoutsWithCrossTraining()` - Injury recovery specific
   - Cross-training library access

3. **Update ManagePlanModal:**
   - Call AI to regenerate plan structure
   - Call TrainingPlanService utility to merge weeks
   - Add AI coaching on top

---

## 📊 Summary

**What's Left:**
- ✅ Cross-training libraries (needed for injury recovery)
- ✅ Workout replacement logic (needed for injury recovery)
- ✅ Week preservation/merging (needed for both)
- ❌ Rule-based plan generation (has defaults - should be removed)
- ❌ Legacy plan structure generation (should use AI instead)

**The Answer:** TrainingPlanService should become a **utility service** for technical plan manipulation, not plan generation. The plan generation should all use AI to eliminate defaults.


