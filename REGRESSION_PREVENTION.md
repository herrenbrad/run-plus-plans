# Regression Prevention Strategy

This document outlines how we prevent regressions in critical areas like date calculations, workout parsing, and plan generation.

## 🎯 Critical Areas to Protect

1. **Date Calculations**
   - Start date adjustments (when today is a rest day)
   - Week 1 date ranges
   - Total weeks calculation
   - Race date consistency

2. **Workout Parsing**
   - Day name normalization (Tue → Tuesday)
   - Workout type detection
   - WORKOUT_ID extraction
   - Distance extraction

3. **Hard Days / Rest Days**
   - Wednesday/Friday must have hard workouts
   - Monday/Saturday must be rest (if specified)
   - No hard workouts on rest days

4. **RunEQ Miles**
   - Must preserve "RunEQ miles" in bike workouts
   - Must NOT convert to actual bike miles (12, 8, etc.)
   - Must extract RunEQ distance correctly

5. **Long Run Distance**
   - Must show distance (miles), not duration (minutes)
   - Must extract distance from descriptions
   - Must set distance property on workout object

6. **Progressive Pacing**
   - Must use recent race time for current fitness
   - Must blend from current to goal over weeks
   - Must NOT use goal paces from Week 1

## 🛡️ Protection Mechanisms

### 1. Unit Tests (`src/services/__tests__/TrainingPlanAIService.regression.test.js`)

Run these tests before deploying:
```bash
npm test -- TrainingPlanAIService.regression
```

**What they test:**
- Date calculations
- Workout parsing regex
- Day name normalization
- RunEQ miles extraction
- Hard days/rest days logic
- Long run distance extraction

### 2. Runtime Validations (`src/services/TrainingPlanAIService.validators.js`)

These validators run automatically after plan generation and log errors to console.

**Validations:**
- `validateWorkoutsParsed()` - Ensures workouts were parsed (not 0)
- `validateHardDays()` - Ensures hard days have hard workouts
- `validateRestDays()` - Ensures rest days are actually rest
- `validateRunEQMiles()` - Ensures RunEQ miles are preserved
- `validateLongRunDistance()` - Ensures long runs show distance
- `validateWeek1StartDate()` - Ensures Week 1 starts on correct date
- `validateTotalWeeks()` - Ensures total weeks matches calculation

**Usage:**
The validations run automatically in `generateTrainingPlan()`. Check the console for:
- ✅ "All training plan validations passed"
- ❌ "Training plan validation failed" (with specific errors)

### 3. Manual Checklist (Before Deploying)

Before deploying changes that touch plan generation:

- [ ] Run regression tests: `npm test -- TrainingPlanAIService.regression`
- [ ] Test onboarding with:
  - [ ] Monday as rest day (should adjust to Tuesday)
  - [ ] Wednesday/Friday as hard days (should have hard workouts)
  - [ ] Saturday as rest day (should be rest, not hard workout)
  - [ ] Cyclete days (should show "RunEQ miles", not actual miles)
  - [ ] Long runs (should show distance, not duration)
- [ ] Check console logs for validation errors
- [ ] Verify Week 1 date range is correct
- [ ] Verify total weeks matches race date calculation

## 🔍 How to Debug Regressions

### If workouts show as 0:

1. Check console for "📅 Week X - 0 workouts"
2. Check if workout regex is matching AI output format
3. Check if `currentWeek` is null when parsing workouts
4. Add debug logging in `parseAIPlanToStructure()`

### If hard days are wrong:

1. Check console for "❌ HARD DAYS VALIDATION FAILED"
2. Verify `qualityDays` is passed correctly to AI prompt
3. Check if AI is following the prompt instructions
4. Verify workout type detection logic

### If RunEQ miles are wrong:

1. Check console for "❌ RUNEQ MILES VALIDATION FAILED"
2. Verify AI prompt includes RunEQ instructions
3. Check if transformation is preserving RunEQ in description
4. Verify `fallbackType === 'bike'` detection is working

### If long runs show duration:

1. Check console for "❌ LONG RUN DISTANCE VALIDATION FAILED"
2. Verify distance extraction regex is matching
3. Check if `workout.distance` is being set
4. Verify Dashboard is using `distance` not `duration`

## 📝 Adding New Validations

When you fix a regression, add a validation to prevent it from happening again:

1. Add test case in `TrainingPlanAIService.regression.test.js`
2. Add validation function in `TrainingPlanAIService.validators.js`
3. Call validation in `generateTrainingPlan()`
4. Document the regression in this file

## 🚨 Red Flags

Watch out for these patterns that often cause regressions:

1. **Using `new Date()` instead of `profile.startDate`**
   - ❌ `const today = new Date()`
   - ✅ `const startDate = profile.startDate ? new Date(profile.startDate) : new Date()`

2. **Using `today` in prompts instead of `startDate`**
   - ❌ `Week 1 starts TODAY`
   - ✅ `Week 1 starts on ${startDateFormatted}`

3. **Not normalizing day names**
   - ❌ `day: workoutMatch[1]` (could be "Tue")
   - ✅ `day: fullDayName` (converted to "Tuesday")

4. **Converting RunEQ to actual miles**
   - ❌ `12-Mile Cyclete Ride`
   - ✅ `Ride 3 RunEQ miles on your Cyclete`

5. **Using duration for long runs**
   - ❌ `Long Run 75-120 minutes`
   - ✅ `Long Run 10 miles`

6. **Using goal paces from Week 1**
   - ❌ `calculateFromGoal(raceTime)` for Week 1
   - ✅ `calculateFromGoal(recentRaceTime)` then blend

## 🔄 Continuous Monitoring

1. **Check console logs** after each plan generation
2. **Run tests** before committing changes
3. **Test manually** after major changes
4. **Review validation errors** in production logs

## 📚 Related Files

- `src/services/TrainingPlanAIService.js` - Main service (has validation calls)
- `src/services/TrainingPlanAIService.validators.js` - Validation functions
- `src/services/__tests__/TrainingPlanAIService.regression.test.js` - Unit tests
- `src/components/OnboardingFlow.js` - Start date adjustment logic
- `src/components/Dashboard.js` - Workout display logic




