# Run+ Training App Roadmap

## Current State (November 2025)

### What's Working
- **SimpleOnboardingFlow**: Clean single-page onboarding with AI plan generation
- **AI Coach Analysis**: Pre-plan coaching assessment with VDOT-based fitness evaluation
- **Terrain Selection**: Flat/Rolling/Hilly dropdown affects AI coaching recommendations
- **Workout Libraries**: Hill, Interval, Tempo, Long Run workout selection
- **VDOT Equivalency**: Race time predictions grounded in real pace data (no hallucinations)

### Verification Status (Nov 22, 2025)
- [x] Core app functionality after AI coach integration ✅
- [x] Post-workout coaching analysis still works ✅ (AICoachService in WorkoutDetail)
- [x] Strava integration still syncs properly ✅ (StravaSyncService in Dashboard)
- [x] Dashboard displays AI-generated plans correctly ✅
- [x] PlanWelcomeScreen shows aiCoachingAnalysis ✅

**Architecture Flow Confirmed:**
1. `SimpleOnboardingFlow` → calls `TrainingPlanAIService.generateTrainingPlan()`
2. Plan includes `aiCoachingAnalysis` field with coach's markdown analysis
3. `App.js` → `handleOnboardingComplete()` → saves to Firestore
4. `PlanWelcomeScreen` → displays `trainingPlan.aiCoachingAnalysis`
5. `Dashboard` → displays weekly plan, workouts
6. `WorkoutDetail` → post-workout "Get Coaching" button → `AICoachService.analyzeWorkout()`
7. `StravaSyncService` → auto-matches Strava activities to planned workouts

---

## Immediate Priorities

### 1. Core App Stability Check
Verify these features still work end-to-end:
- Generate a new plan via SimpleOnboardingFlow
- View plan on Dashboard
- Complete a workout and trigger post-workout coach
- Sync a Strava activity and confirm data populates

### 2. Onboarding Consolidation
**Problem**: We have two onboarding flows:
- `SimpleOnboardingFlow.js` - Current slim version
- `OnboardingFlow.js.backup` - Old detailed version with more fields

**Goal**: Keep the clean UX of SimpleOnboardingFlow while preserving useful fields from the old flow.

#### Field Comparison

| Field | Simple | Old | Keep? | Notes |
|-------|--------|-----|-------|-------|
| raceDistance | ✅ | ✅ | ✅ | Core |
| goalTime | ✅ | ✅ | ✅ | Core |
| raceDate | ✅ | ✅ | ✅ | Core |
| raceElevationProfile | ✅ | ✅ | ✅ | Core - terrain selection |
| recentRaceDistance | ✅ | - | ✅ | VDOT fitness assessment |
| recentRaceTime | ✅ | - | ✅ | VDOT fitness assessment |
| currentWeeklyMileage | ✅ | ✅ | ✅ | Core |
| currentLongRunDistance | ✅ | ✅ | ✅ | Core |
| experienceLevel | ✅ | ✅ | ✅ | Core |
| availableDays | ✅ | ✅ | ✅ | Core |
| longRunDay | ✅ | ✅ | ✅ | Core |
| qualityDays | ✅ | ✅ (hardSessionDays) | ✅ | Core |
| standUpBikeType | ✅ | ✅ | ✅ | Core |
| preferredBikeDays | ✅ | ✅ | ✅ | Core |
| hasGarmin | ✅ | ✅ | ✅ | Core |
| goal | - | ✅ | ❌ | Removed - implied by raceDistance |
| runsPerWeek | - | ✅ | ❌ | Calculated from availableDays |
| hardSessionsPerWeek | - | ✅ | ❌ | Calculated from qualityDays |
| startDate | - | ✅ | ❓ | Could add - defaults to "today" |
| missedWorkoutPreference | - | ✅ | ❓ | Future: adaptive planning |
| runningStatus | - | ✅ | ❓ | Future: injury recovery mode |
| location | - | ✅ | ❓ | Future: altitude/weather |
| climate | - | ✅ | ❓ | Future: heat training |
| trainingPhilosophy | - | ✅ | ❓ | Future: "Train for YOUR race" |

#### Verdict
SimpleOnboardingFlow is **more complete** than the old flow in key areas:
- ✅ Has recent race input for VDOT fitness assessment
- ✅ Cleaner single-page UX vs multi-step wizard
- ✅ Prevents back-to-back quality days (smarter validation)

Fields to consider adding later (not now):
- `startDate` - Let users pick when to start (vs defaulting to today)
- `trainingPhilosophy` - The "Train for YOUR race" feature
- `runningStatus` - For injury/bike-only phases

---

## Future Vision: "Train for YOUR Race"

### Phase 1: Enhanced Course Profiles
**Current**: Simple terrain dropdown (flat/rolling/hilly)

**Future**:
- TCX/GPX file upload for actual course data
- Auto-extract: total elevation, climb segments, high/low points
- AI receives actual course profile, not just "hilly"

**Example - Medellín Marathon**:
```
Course: 26.492 mi, 1,400ft up, 1,522ft down
Altitude: 4,790 - 5,232 ft
Key Segment: Miles 14-18 is a 4-mile climb to high point (Sabaneta)
Descent: Miles 18-26 back to finish
```

### Phase 2: Training Philosophy vs Race Profile Separation
**Current**: Terrain selection = Race terrain AND training approach

**Future**: Two separate inputs:
1. **Race Profile**: What your goal race looks like (flat, hilly, altitude)
2. **Training Philosophy**: How you want to train (general fitness, race-specific, hybrid)

**Use Case**:
- Race: Vegas Half (Feb 2026) - FLAT, sea level
- Philosophy: "Rolling" - because next race is Medellín Marathon (Sep 2026) which is HILLY
- Result: Train with hills now even though Vegas is flat, to build for future

### Phase 3: Multi-Race Season Planning (Macro-Periodization)
**Current**: Single race focus

**Future**: Define race calendar with A/B/C priorities:
```
A Race: Medellín Marathon (Sep 2026) - Hilly, altitude, PEAK HERE
B Race: Vegas Half (Feb 2026) - Flat, sea level, fitness check
C Races: Local 10Ks - tune-up races, no taper
```

AI builds connected training blocks:
- **Vegas Cycle**: Speed focus, flat tempo work
- **Recovery Block**: Easy transition period
- **Medellín Cycle**: Progressive hill integration, altitude-specific long runs

### Phase 4: Location-Aware Training
**Current**: No awareness of where athlete lives/trains

**Future**:
- Know athlete lives in Medellín (5,000 ft altitude)
- Adjust pace expectations for altitude
- Recognize "home course advantage" when racing locally
- Factor in daily training terrain (user runs on course regularly)

**Example Insight**: "You train at 5,000 ft daily. For Vegas (sea level), expect 3-5 minute boost from altitude drop alone."

### Phase 5: Course-Specific Workouts
**Current**: Generic hill workouts from library

**Future**:
- "Miles 14-18 Simulation": 10 mi easy → 4 mi at goal pace on 1.5% grade → cruise home
- "Sabaneta Repeats": Practice the exact climb you'll race
- "Downhill Quad Prep": Train the miles 18-26 descent

---

## Technical Considerations

### Course File Parsing
Need to build:
- TCX parser (already read one successfully)
- GPX parser
- Elevation profile analyzer
- Segment detection (find the "hard parts")

### Altitude Adjustment
Standard adjustment: ~2% per 1,000 ft above sea level
- 5,000 ft training → ~10% pace adjustment
- Need to apply to both training paces AND race predictions

### Data Storage
New fields for user profile:
- `trainingLocation`: { lat, lng, altitude }
- `raceCalendar`: [{ race, date, priority, courseProfile }]
- `trainingPhilosophy`: 'race-specific' | 'general' | 'hybrid'
- `courseFiles`: [{ raceId, fileType, elevationData }]

---

## Parking Lot (Ideas for Later)

- Custom race distance input (not just 5K/10K/Half/Marathon)
- Strava route analysis for training terrain detection
- Weather integration for workout recommendations
- Recovery/injury adjustment protocols
- Social features (training partners, group challenges)
- Garmin/Apple Watch direct sync

---

## Session Notes

### Medellín Marathon Analysis (Nov 22, 2025)
Course file: `C:\Users\bradh\Downloads\Maraton de Medellin Oficial.tcx`

Key findings:
- 26.492 miles, 1,400ft ascent, 1,522ft descent
- Altitude range: 4,790 - 5,232 ft
- High point: Mile 17.95 (Sabaneta turnaround)
- User lives in Laureles (miles 1-2, near start/finish)
- Miles 14-18 is the race-defining 4-mile climb
- "Sneaky" grade - looks flat at ground level but steady 1-2% climb

**Strategic Insight**: User trains on course daily at altitude. Has massive home-course advantage for Medellín. Vegas (flat, sea level) will feel easy by comparison.
