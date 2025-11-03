# RunEQ Training App

A comprehensive running training application with personalized workout plans and equipment-specific training options.

## 🎯 Project Status: OPERATIONAL ✅

**Last Updated:** October 10, 2025
**Status:** App fully functional with high-quality training plans and workout variety

## 🚀 Quick Start

```bash
cd C:\RunPlusPlans\run-plus-plans
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📋 Recent Updates

### October 10, 2025 - UI Polish & Workout Display Improvements ✅

#### **Problem 1: Missing Distance Information on Dashboard**
Users couldn't see workout distances at a glance - had to click into each workout to find out how far they'd be running.

**Solution:**
- Added **intelligent distance extraction** from multiple data sources
- Dashboard cards now show distance badges: 📏 for miles, 🔁 for reps, ⏱️ for duration
- Priority-based extraction: workout.distance → regex from name → repetitions → duration → type defaults

**Files Modified:**
- `Dashboard.js:270-310` - `getWorkoutDistance()` helper function
- `Dashboard.js:1083-1097` - Distance badge display in workout cards

#### **Problem 2: One-Way Workout Conversion**
"Something Else" modal allowed changing runs to bike rides, but not bike rides to runs. User scenario: "What if I have a flat tire?"

**Solution:**
- Added **bidirectional conversion** with intelligent 3:1 bike-to-run mile ratio
- `getRunningAlternatives()` provides 4 running alternatives when bike workout is scheduled
- Symmetric functionality: run → bike AND bike → run

**Files Modified:**
- `SomethingElseModal.js:72-93` - Conditional workout type detection
- `SomethingElseModal.js:539-571` - Running alternatives generation

#### **Problem 3: Interval Structure Showing Ranges**
Interval workouts displayed vague ranges like "3-5 x 1200m" in the structure instead of specific counts like "4 x 1200m".

**Solution:**
- Fixed **structure display** to use calculated specific reps
- Added regex replacement to swap ranges with specific counts from `workoutLib.repetitions`
- Structure now correctly reflects progressive rep counts throughout training plan

**Files Modified:**
- `WorkoutDetail.js:186-205` - Range-to-specific replacement logic

#### **Problem 4: Wrong Pace Priority**
Target Pace card showed threshold pace (8:45/mile) instead of interval pace (7:59/mi) for VO2 interval workouts.

**Solution:**
- Fixed **pace extraction priority** to check interval pace first for interval workouts
- Workout-type-specific pace selection ensures correct pace displays

**Files Modified:**
- `WorkoutDetail.js:199-208` - Workout-type-specific pace priority

#### **Problem 5: Confusing Track Interval Paces**
Track interval paces showed only per-interval time (e.g., "6:32/1200m") causing "mile pace panic" - users thought they needed to run 6:32 miles!

**Solution:**
- Added **automatic per-mile pace conversion** for all track intervals
- Now shows both: "6:32/1200m = 8:46/mi" so runners know the actual effort level
- Converts 200m, 400m, 800m, 1200m times to equivalent mile pace

**Files Modified:**
- `interval-workout-library.js:317-336` - `convertToMilePace()` helper function
- `interval-workout-library.js:341-368` - Updated `injectPacesIntoName()` with conversions

**Impact:** WorkoutDetail page now displays complete, accurate workout information with no user confusion! 🎯

---

### October 10, 2025 - Workout Variety & Progression Improvements ✅

#### **Problem 1: Repetitive Workouts**
Users were seeing the same workouts repeatedly (e.g., "Cruise Intervals" and "1000m Repeats" appearing multiple times in a plan).

**Solution:**
- Added intelligent **workout history tracking** system
- Tracks last 2-5 workouts for each type (intervals, tempo, hills)
- Filters out recently-used workouts when generating new plans
- Ensures variety - won't see the same workout until 2+ others have been used

**Files Modified:**
- `training-plan-generator.js:324-330` - History initialization
- `training-plan-generator.js:713-755` - `selectWorkoutAvoidingRepetition()` method

#### **Problem 2: Vague Rep Counts**
Interval workouts showed ranges like "4-8 x 800m" instead of specific prescriptions like "Run 5x800m".

**Solution:**
- Created **progressive rep count calculation**
- Converts ranges to specific numbers based on week progression
- Early weeks = lower reps, later weeks = higher reps
- Peaks at 75% through plan (proper periodization)
- Example: "4-8 x 800m" → Week 2: "4 x 800m" → Week 6: "6 x 800m" → Week 9: "8 x 800m"

**Files Modified:**
- `training-plan-generator.js:761-782` - `calculateSpecificReps()` method
- `interval-workout-library.js:264-315` - Accept `specificReps` parameter

**Impact:** Training plans now have real variety and specific, progressive prescriptions!

---

### October 9, 2025 - RunEQ Mile System & Navigation Fixes ✅

#### **RunEQ Mile Conversion System**
- Changed from conversion factors (2.5x, 3x) to **RunEQ mile prescription**
- Updated all workout libraries to reference companion **Garmin Data Field**
- Users ride until Garmin shows prescribed RunEQ miles (accounts for individual intensity)
- Changed "spin" terminology to "ride" (Cyclete/Elliptigo are real rides, not spin class!)

**Files Modified:**
- `standup-bike-workout-library.js:158-172` - RunEQ prescription logic
- `tempo-workout-library.js:303-318` - RunEQ options
- `hill-workout-library.js:39-44, 127-132` - RunEQ options
- `interval-workout-library.js:415-434` - RunEQ options

#### **Browser Refresh Navigation Bug**
Fixed issue where refreshing browser would kick users back to onboarding screen.

**Solution:**
- Added conditional routing based on localStorage state
- Root path (`/`) now redirects to Dashboard if plan exists
- Onboarding path redirects to Dashboard if plan already exists

**Files Modified:**
- `App.js:75-124` - Conditional routing logic

#### **Week Navigation Improvements**
Fixed issue where refreshing page would reset to Week 1, and added quick week jumping.

**Solution:**
- Week selection now persisted to localStorage
- Added dropdown for instant week jumping (no more clicking through 10 weeks!)
- Week state initializes from localStorage on app load

**Files Modified:**
- `Dashboard.js:196-212` - Week persistence logic
- `Dashboard.js:818-838` - Week dropdown UI

---

### September 16, 2025 - Migration & Core Fixes ✅

#### **Migration from Broken RunEQApp**
- **Problem:** Previous work created broken RealWorld services and fake demo functionality
- **Solution:** Complete migration of working components to clean RunPlusPlans directory
- **Result:** Fully functional app without any external service dependencies

#### **Key Issues Resolved**

**1. RealWorld Service Cleanup** ✅
- **Issue:** App was calling non-existent `RealWorldTrainingService`
- **Fix:** Completely removed all RealWorld references and imports
- **Files affected:** `OnboardingFlow.js`, `Dashboard.js`, `SomethingElseModal.js`

**2. Missing getRandomWorkout Methods** ✅
- **Issue:** Workout libraries missing essential `getRandomWorkout()` method
- **Fix:** Added method to all workout libraries:
  - `TempoWorkoutLibrary`
  - `IntervalWorkoutLibrary`
  - `HillWorkoutLibrary`
  - `LongRunWorkoutLibrary`

**3. Workout Category Name Mismatches** ✅
- **Issue:** Components calling workout categories that didn't exist
- **Examples:**
  - `LONGER_INTERVALS` → `LONG_INTERVALS`
  - `SHORT_HILLS` → `short_power`
  - `LONG_HILLS` → `long_strength`
  - `VARIED_HILLS` → `hill_circuits`
  - `PROGRESSIVE_LONG` → `PROGRESSIVE_RUNS`
  - `VARIED_PACE` → `MIXED_PACE_LONG`
- **Fix:** Updated all references to match actual library category names

**4. Import Path Corrections** ✅
- **Issue:** Components importing from wrong paths (`../services/` instead of `../lib/`)
- **Fix:** Updated all import statements to use correct `../lib/` paths

**5. Browser Compatibility** ✅
- **Issue:** Node.js-specific code (`process.argv`) breaking in browser
- **Fix:** Removed all Node.js test code from library files

---

## 🏗️ Architecture

### Working Components
- **LandingPage**: Initial entry point with app introduction ✅
- **OnboardingFlow**: Complete user onboarding with all form steps ✅
- **TrainingPlanPreview**: Shows personalized plan preview ✅
- **Dashboard**: Main training interface with week-by-week workouts ✅
- **WorkoutDetail**: Detailed workout view with paces and structure ✅
- **SomethingElseModal**: Alternative workout suggestions ✅

### Core Libraries (src/lib/)
All libraries are working and browser-compatible:

- **`tempo-workout-library.js`** - Lactate threshold training workouts
- **`interval-workout-library.js`** - Speed and VO2 max interval training (with progressive reps!)
- **`hill-workout-library.js`** - Hill-specific power and strength training
- **`long-run-workout-library.js`** - Endurance and race-specific long runs
- **`brick-workout-library.js`** - Combined run+bike workouts
- **`standup-bike-workout-library.js`** - Equipment-specific bike training (RunEQ miles!)
- **`pace-calculator.js`** - VDOT-based training pace calculations
- **`training-plan-generator.js`** - Core plan generation with workout variety tracking

### Services (src/services/)
- **`TrainingPlanService.js`** - Main service orchestrating plan creation ✅
- **`brickWorkoutService.js`** - Specialized brick workout generation ✅

---

## 🎮 User Features

### Equipment Support
- **Cyclete (Stand-up bike)** integration with RunEQ mile conversion
- **Elliptigo** support with RunEQ mile tracking
- **Companion Garmin Data Field** - Real-time RunEQ conversion based on rider intensity
- **Mixed training** options (running + equipment)
- **Equipment-specific** workout alternatives

### Personalization
- **Climate adaptation** - pace adjustments for weather conditions
- **Experience level** customization (beginner, intermediate, advanced)
- **Training philosophy** alignment (practical periodization, high volume, etc.)
- **Schedule flexibility** - works with user's available training days
- **Custom hard session days** - user specifies which days for quality workouts
- **Preferred bike days** - integrate Cyclete/Elliptigo on specific days

### Workout Variety
- **16+ different workout types** vs repetitive basic formats
- **Research-based** workouts from McMillan, Hal Higdon, Ben Parkes, Runner's World
- **Intelligent variety** - no repeated workouts until 2+ others have been used
- **Progressive difficulty** - interval reps build from low to high throughout plan
- **"Something Else" feature** - alternative workouts for any day based on conditions/preferences

### Navigation & UX
- **Week persistence** - stays on your current week when refreshing
- **Quick week jumping** - dropdown to instantly navigate to any week
- **Smart routing** - never gets kicked back to onboarding after creating plan
- **localStorage persistence** - plans and progress saved across sessions

---

## 🧪 Testing

### Manual Testing Completed ✅
- Full onboarding flow from start to plan preview
- Training plan generation with workout variety tracking
- Specific rep count progression across weeks
- Dashboard rendering with proper workout data
- Week navigation and persistence
- Browser refresh maintains state
- RunEQ mile prescription system
- No RealWorld service errors

### Integration Status ✅
- All workout libraries properly integrated
- Category names synchronized across components
- Import paths corrected and working
- Workout history tracking functional
- Progressive rep counts working

---

## 🔮 Future Enhancements

### High Priority 🔥
1. **"Something Else" Modal Improvements**
   - Add more contextual alternatives (weather-based, time-based, etc.)
   - Improve UI/UX for alternative workout selection
   - Better explanations for why each alternative is suggested
   - **Status:** Scheduled for next session

2. **Actual Race Results Integration**
   - Allow users to log completed race times
   - Recalculate training paces based on actual performance
   - Adjust future weeks based on demonstrated fitness

3. **Workout Completion Tracking**
   - Mark workouts as "completed" or "skipped"
   - Track compliance and training consistency
   - Show visual progress indicators

4. **Adaptive Plan Adjustments**
   - Adjust future weeks based on completed workouts
   - Handle missed weeks or injury breaks
   - "Catch up" mode if user falls behind

### Medium Priority 🎯
5. **Mobile Responsiveness**
   - Optimize UI for mobile devices
   - Touch-friendly workout cards
   - Mobile-first navigation

6. **Export/Share Features**
   - Export plan to PDF
   - Share plan via email
   - Print-friendly workout cards

7. **Workout Swap Feature**
   - Allow swapping workouts between days
   - Maintain training load and periodization
   - Intelligent suggestions for equivalent workouts

8. **Training Load Metrics**
   - Calculate weekly training stress score (TSS)
   - Show acute:chronic workload ratio (ACWR)
   - Injury risk indicators

### Nice to Have 💡
9. **Weather Integration**
   - Fetch local weather forecasts
   - Auto-suggest indoor alternatives for bad weather
   - Treadmill/indoor track conversions

10. **Social Features**
    - Share workouts with training partners
    - Group training plans
    - Accountability features

11. **Advanced Analytics**
    - Pace progression graphs
    - Weekly mileage charts
    - Training phase visualizations

12. **Multi-Plan Management**
    - Save multiple plans (5K, 10K, Half, Marathon)
    - Switch between plans
    - Plan comparison view

13. **Garmin Connect Integration**
    - Sync completed workouts from Garmin
    - Auto-mark workouts as completed
    - Compare prescribed vs actual paces

---

## 🚨 Emergency Recovery Info

If the app breaks again:

1. **Check category names** - Ensure components use correct workout library category names
2. **Verify imports** - All workout libraries should import from `../lib/` not `../services/`
3. **RealWorld references** - If any RealWorld errors appear, grep for and remove all references
4. **Missing methods** - All workout libraries need `getRandomWorkout(category)` method
5. **Workout history** - Check that `workoutHistory` is initialized in `generateWeekPlan()`
6. **Rep count calculation** - Verify `specificReps` is being passed through to interval library

### Backup Location
- Working version: `C:\RunPlusPlans\run-plus-plans\`
- Broken version: `C:\RunEQApp\` (DO NOT USE - contains old broken code)

---

## 📝 Development Notes

### Code Quality
- **ESLint warnings** present but not blocking (unused variables, missing default cases)
- **No compilation errors** - app builds and runs successfully
- **Browser compatible** - all Node.js specific code removed

### Performance
- App loads quickly at localhost:3000
- Workout generation is fast (< 1 second)
- No network dependencies for core functionality
- Workout variety tracking adds negligible overhead

### localStorage Keys
- `runeq_userProfile` - User profile data from onboarding
- `runeq_trainingPlan` - Full training plan object
- `runeq_currentWeek` - Current week selection
- `runeq_modifiedWorkouts` - User-modified workouts (if any)

---

**🏃‍♂️ Happy Training!** The app is now fully functional with intelligent workout variety, progressive interval prescriptions, and seamless navigation. Create your personalized running training plan today!
