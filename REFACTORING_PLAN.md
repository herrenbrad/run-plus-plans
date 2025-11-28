# Refactoring Plan - December 2024 Sprint

## Problem Statement
Large monolithic files (3000-4000 lines) are causing regressions and slowing development. We need to break them down into focused, testable modules before adding more features.

## Current State - Largest Files
1. **Dashboard.js** - ~3500 lines
2. **TrainingPlanAIService.js** - ~2900 lines  
3. **WorkoutDetail.js** - ~2785 lines
4. **OnboardingFlow.js** - ~2400 lines

## Refactoring Strategy: Incremental & Safe

### Phase 1: TrainingPlanAIService.js (HIGHEST PRIORITY - Causes Most Regressions)
**Target: Break into 6 focused modules**

#### Modules to Extract:
1. **`services/ai/PromptBuilder.js`** (~400 lines)
   - `buildCoachingAnalysisPrompt()`
   - `buildPlanStructurePrompt()`
   - `buildRegularRunnerCoachingPrompt()`
   - `buildInjuredRunnerCoachingPrompt()`
   - **Interface:** `buildPrompt(profile, type) => string`

2. **`services/ai/PlanParser.js`** (~500 lines)
   - `parseAIPlanToStructure()`
   - All regex matching logic
   - Week/workout extraction
   - **Interface:** `parsePlan(aiText, profile) => structuredPlan`

3. **`services/ai/WorkoutEnricher.js`** (~400 lines)
   - `enrichPlanWithWorkouts()`
   - Library matching logic
   - Distance extraction
   - **Interface:** `enrichWorkouts(parsedPlan) => enrichedPlan`

4. **`services/ai/PlanTransformer.js`** (~600 lines)
   - `transformToDashboardFormat()`
   - Phase calculations
   - Date formatting
   - **Interface:** `transform(enrichedPlan, profile) => dashboardPlan`

5. **`services/ai/PlanFixer.js`** (~200 lines)
   - `fixHardDaysViolations()`
   - `generateDefaultHardWorkout()`
   - Post-processing fixes
   - **Interface:** `fixViolations(plan, profile) => fixedPlan`

6. **`services/ai/PhaseCalculator.js`** (~150 lines)
   - `getPhasePlan()`
   - `getPhaseForWeek()`
   - Date calculations
   - **Interface:** `calculatePhases(totalWeeks) => phasePlan`

#### Migration Strategy:
- Keep `TrainingPlanAIService.js` as a thin orchestrator
- Import modules, delegate to them
- Test each module independently
- Can be done incrementally (one module at a time)

---

### Phase 2: Dashboard.js (HIGH PRIORITY - User-Facing)
**Target: Break into 8-10 focused components**

#### Components to Extract:
1. **`components/dashboard/DashboardHeader.js`** (~150 lines)
   - Week selector
   - Navigation buttons
   - Phase display

2. **`components/dashboard/WeekView.js`** (~200 lines)
   - Week date range display
   - Phase badge
   - Mileage summary

3. **`components/dashboard/WorkoutCard.js`** (~300 lines)
   - Individual workout display
   - Distance badges
   - Completion status
   - Click handlers

4. **`components/dashboard/WorkoutList.js`** (~150 lines)
   - Renders array of WorkoutCards
   - Handles empty states

5. **`components/dashboard/StravaConnectButton.js`** (~100 lines)
   - Strava connection UI
   - Status display

6. **`hooks/useWorkoutGeneration.js`** (~400 lines)
   - `generateWeekWorkouts()` logic
   - `generateCycleteWorkout()` logic
   - Workout library lookups

7. **`hooks/useStravaSync.js`** (~300 lines)
   - Strava sync logic
   - Activity matching
   - Completion handling

8. **`hooks/useWorkoutCompletion.js`** (~200 lines)
   - Workout completion logic
   - Firestore updates
   - State management

9. **`utils/workoutHelpers.js`** (~200 lines)
   - `getWorkoutDistance()`
   - `getWorkoutTypeColor()`
   - `isLongRun()`
   - Pure utility functions

#### Migration Strategy:
- Extract one component at a time
- Test in isolation
- Keep Dashboard as orchestrator initially
- Gradually move logic to hooks

---

### Phase 3: WorkoutDetail.js (MEDIUM PRIORITY - Complex but Less Critical)
**Target: Break into 6-8 focused components**

#### Components to Extract:
1. **`components/workout/WorkoutHeader.js`** (~200 lines)
   - Workout title
   - Equipment badges
   - Date display

2. **`components/workout/WorkoutStructure.js`** (~300 lines)
   - Structure display
   - Pace information
   - Duration calculations

3. **`components/workout/WorkoutActions.js`** (~400 lines)
   - Log workout button
   - Life adaptations button
   - Something else modal

4. **`components/workout/CoachingAnalysis.js`** (~300 lines)
   - AI coaching display
   - Loading states
   - Error handling

5. **`hooks/useWorkoutData.js`** (~400 lines)
   - Workout data fetching
   - Library lookups
   - Data transformation

6. **`hooks/useWorkoutCompletion.js`** (~300 lines)
   - Completion form logic
   - Firestore updates
   - Strava integration

7. **`utils/workoutTransformers.js`** (~200 lines)
   - `transformWorkoutData()`
   - `fetchFromLibrary()`
   - Data normalization

---

### Phase 4: OnboardingFlow.js (LOWER PRIORITY - Less Frequently Changed)
**Target: Break into step components**

#### Components to Extract:
1. **`components/onboarding/Step1RaceInfo.js`**
2. **`components/onboarding/Step2Fitness.js`**
3. **`components/onboarding/Step3Schedule.js`**
4. **`components/onboarding/Step4Equipment.js`**
5. **`components/onboarding/Step5Injury.js`**
6. **`hooks/useOnboardingState.js`**
7. **`hooks/usePlanGeneration.js`**

---

## Execution Plan

### Week 1 (This Week): TrainingPlanAIService.js
**Goal:** Extract 2-3 modules, prove the pattern works

**Day 1-2:** Extract `PhaseCalculator.js` (easiest, least dependencies)
- Move phase calculation logic
- Update imports
- Test thoroughly

**Day 3-4:** Extract `PlanFixer.js` (already isolated)
- Move hard days fixer
- Move default workout generator
- Test

**Day 5:** Extract `PromptBuilder.js` (more complex)
- Start with one prompt builder function
- Test, then move others

### Week 2: Complete TrainingPlanAIService.js
- Extract remaining modules
- Update all imports
- Full integration testing

### Week 3: Dashboard.js (Start)
- Extract 2-3 components
- Extract 1-2 hooks
- Test incrementally

### Week 4: Dashboard.js (Complete) + WorkoutDetail.js (Start)
- Finish Dashboard refactoring
- Start WorkoutDetail.js extraction

---

## Testing Strategy

### For Each Module:
1. **Unit Tests** - Test the module in isolation
2. **Integration Tests** - Test module interactions
3. **Manual Testing** - Full user flow testing
4. **Regression Tests** - Ensure nothing broke

### Test Files to Create:
- `services/ai/__tests__/PromptBuilder.test.js`
- `services/ai/__tests__/PlanParser.test.js`
- `services/ai/__tests__/WorkoutEnricher.test.js`
- `services/ai/__tests__/PlanTransformer.test.js`
- `components/dashboard/__tests__/WorkoutCard.test.js`
- etc.

---

## Success Criteria

### Phase 1 Complete When:
- ✅ TrainingPlanAIService.js < 500 lines (orchestrator only)
- ✅ All modules < 600 lines each
- ✅ All tests passing
- ✅ No regressions in plan generation
- ✅ Can add new prompt types without touching other modules

### Phase 2 Complete When:
- ✅ Dashboard.js < 500 lines (orchestrator only)
- ✅ All components < 400 lines each
- ✅ All hooks < 300 lines each
- ✅ No regressions in dashboard functionality

---

## Risk Mitigation

1. **Incremental Migration** - One module at a time, test thoroughly
2. **Keep Old Code** - Don't delete until new code is proven
3. **Feature Freeze** - Pause new features during refactoring (or do in parallel carefully)
4. **Rollback Plan** - Git branches, easy to revert
5. **Documentation** - Document interfaces as we go

---

## Benefits After Refactoring

1. **Faster Development** - Find code faster, make changes with confidence
2. **Fewer Regressions** - Isolated changes, easier to test
3. **Easier Onboarding** - New developers can understand smaller files
4. **Better Testing** - Can test modules independently
5. **Parallel Work** - Multiple developers can work on different modules

---

## Notes

- **Don't Perfectionist** - Good enough is fine, we can refine later
- **Focus on High-Value** - TrainingPlanAIService first (causes most issues)
- **Test as You Go** - Don't wait until the end
- **Document Interfaces** - Makes future changes easier
