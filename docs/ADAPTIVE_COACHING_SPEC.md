# Adaptive AI Coaching System

## Overview

A holistic, adaptive coaching system that analyzes workout performance and recommends pace adjustments based on actual training data. Unlike competitors (e.g., Runna) that only look at speed work, this system analyzes ALL workout types to provide intelligent, personalized coaching.

---

## Current State

### What Exists
- **Strava Sync**: Captures workout data (distance, pace, HR, elevation, laps)
- **Workout Insights**: Per-workout AI analysis via "Get Coaching" button
- **Pace Calculator**: `blendPaces()` and `smoothProgressionCurve()` exist but are NOT wired up
- **Static Paces**: Currently, same paces used for all 18 weeks (bug)

### The Problem
- Week 1 long run: 5 miles @ 11:07-12:12/mi
- Week 14 long run: 12 miles @ 11:07-12:12/mi (same pace!)
- Mileage progresses, but paces don't

---

## Proposed Solution: Three-Tier Coaching

### Tier 1: Workout Level (Exists)
```
┌─────────────────────────────────────────────────────────────┐
│  WORKOUT INSIGHTS                                           │
│  Trigger: User clicks "Get Coaching" after workout          │
│  Data: Single workout from Strava                           │
│  Output: Personalized analysis of that workout              │
└─────────────────────────────────────────────────────────────┘
```

**Example Output:**
> "Nice work on that tempo run! You hit 9:45/mi against a 10:00 target.
> Your HR stayed in zone 3 which shows good aerobic efficiency..."

### Tier 2: Week Level (NEW)
```
┌─────────────────────────────────────────────────────────────┐
│  WEEK INSIGHTS                                              │
│  Trigger: End of training week (long run day)               │
│  Data: All completed workouts for the week                  │
│  Output: Week summary + pace adjustment recommendation      │
└─────────────────────────────────────────────────────────────┘
```

**Example Output:**
```
📊 Week 3 Summary

Completed: 4/5 workouts (80%)
├── Easy runs: averaged 11:20/mi (target: 11:30-12:00) ✓
├── Tempo run: 9:45/mi (target: 10:00) - 15 sec faster ✓
├── Long run: 11:35/mi (target: 11:45) ✓
└── Total mileage: 22.3 mi (target: 24 mi) - 93%

💡 Coach's Assessment:
You're consistently running 15-20 seconds faster than prescribed
across all workout types while staying in proper HR zones. This
suggests your current fitness exceeds the pace targets.

🎯 Recommendation:
Update training paces from VDOT 46 → VDOT 47
• Easy: 11:30-12:00 → 11:15-11:45
• Tempo: 10:00 → 9:45
• Interval: 9:15 → 9:00

[Accept New Paces]  [Keep Current]  [Remind Me Next Week]
```

### Tier 3: Plan Level (Background)
```
┌─────────────────────────────────────────────────────────────┐
│  PLAN ADAPTATION                                            │
│  Trigger: User accepts pace change recommendation           │
│  Action: Regenerate remaining weeks with new VDOT/paces     │
│  Storage: Track adjustment history in user profile          │
└─────────────────────────────────────────────────────────────┘
```

---

## Holistic Analysis: Our Competitive Advantage

### What Runna Does (Speed Work Only)
- Looks at tempo runs and intervals
- ~2-3 data points per week
- Binary: hit target or didn't

### What We Do (Holistic)
| Data Point | What It Tells Us |
|------------|------------------|
| **Easy run pace** | Are they running too fast? (common mistake, leads to burnout) |
| **Easy run HR** | Effort level independent of pace |
| **Long run pace drift** | Fatigue resistance, aerobic fitness |
| **Long run HR creep** | Cardiac drift over distance |
| **Speed work splits** | VO2max, lactate threshold |
| **Elevation-adjusted pace** | True effort on hilly terrain |
| **Day-after recovery** | How do Monday's numbers look after Sunday's long run? |
| **Completion rate** | Consistency, life factors |
| **Cross-training** | Stand-up bike maintaining fitness without impact |

### Example Insight Only We Can Provide
> "Your tempo was great at 9:45, but your easy runs are at 10:30 when
> they should be 11:30. You're running easy days too hard, which is why
> your Thursday intervals felt flat. Slow down on easy days to recover
> better."

Runna would just see: "Tempo ✓, Intervals ✗" with no idea why.

---

## Possible Recommendations

| Scenario | Recommendation |
|----------|----------------|
| Crushing all workouts, HR in zone | Bump VDOT up 1-2 points |
| Hitting targets exactly | Stay at current paces |
| Struggling with speed work | Keep current paces, focus on consistency |
| Easy runs too fast, speed work suffering | Slow down easy days (no pace change) |
| Missing workouts | Address consistency before pace changes |
| Great speed work, struggling long runs | Aerobic base needs work, keep paces |
| Low completion but hitting paces | Life stress? Consider reduced volume |

---

## Technical Implementation

### Phase 1: Fix Static Paces (Quick Win)
Wire up existing `blendPaces()` in TrainingPlanService:

```javascript
// In generatePlanStructure()
const currentPaces = this.calculatePaces(userProfile);  // From recent race
const goalPaces = this.calculateGoalPaces(userProfile); // From goal time

// In generateWeek()
const weekPaces = this.paceCalculator.blendPaces(
    currentPaces,
    goalPaces,
    weekNumber,
    totalWeeks
);
```

### Phase 2: Week Insights UI
1. Detect end of training week (long run completed)
2. Show "Week Insights" section on workout detail page
3. Aggregate all completed workouts for the week
4. Call AI service with full week context
5. Display summary + recommendation

### Phase 3: Pace Adjustment Flow
1. AI returns structured recommendation (not just text)
2. Render action buttons if pace change recommended
3. On "Accept":
   - Update user profile with new VDOT
   - Regenerate remaining weeks
   - Store adjustment in history
4. On "Keep Current": Log decision, don't nag again this week
5. On "Remind Me": Resurface next week

### Phase 4: Data Model Updates

```javascript
// In user profile (Firestore)
{
  // Existing
  currentVDOT: 46,

  // New
  paceAdjustmentHistory: [
    {
      week: 3,
      date: "2025-12-22",
      previousVDOT: 46,
      newVDOT: 47,
      reason: "Consistently 15-20 sec faster than targets",
      userAccepted: true
    }
  ],

  weeklyPerformanceSummaries: [
    {
      week: 3,
      completionRate: 0.8,
      avgEasyPaceDelta: -15,  // seconds vs target (negative = faster)
      avgTempoPaceDelta: -20,
      longRunPaceDelta: -10,
      avgHRZone: 2.3,
      recommendation: "increase_pace",
      userDecision: "accepted"
    }
  ]
}
```

---

## AI Prompt Structure for Week Insights

```
You are an expert running coach analyzing a week of training.

ATHLETE CONTEXT:
- Current VDOT: {vdot}
- Goal race: {raceDistance} in {goalTime}
- Week {weekNumber} of {totalWeeks}
- Training phase: {phase}

THIS WEEK'S WORKOUTS:
{For each completed workout:}
- {day}: {workoutType}
  - Prescribed: {targetPace}, {targetDistance}
  - Actual: {actualPace}, {actualDistance}
  - HR: avg {avgHR}, max {maxHR}
  - Notes: {any anomalies}

PREVIOUS WEEKS TREND:
- Week {n-1}: {summary}
- Week {n-2}: {summary}

ANALYZE:
1. Overall completion and consistency
2. Pace performance vs targets (all workout types)
3. Heart rate patterns
4. Any concerning patterns (easy runs too fast, etc.)
5. Recovery indicators

RECOMMEND ONE OF:
- INCREASE_PACE: Athlete ready for faster targets
- MAINTAIN_PACE: On track, no change needed
- DECREASE_PACE: Struggling, need to back off
- NO_CHANGE_BUT_ADJUST_EFFORT: Paces fine, but effort distribution wrong

Provide recommendation with specific reasoning.
```

---

## Open Questions

1. **Frequency**: Every week, or every 2 weeks?
2. **Minimum data**: How many completed workouts before making recommendations?
3. **Override**: Can user manually adjust paces outside of recommendations?
4. **Recovery weeks**: Should we skip recommendations during planned recovery weeks?
5. **API costs**: Caching strategies for AI calls?

---

## Success Metrics

- User engagement with Week Insights
- % of pace recommendations accepted
- Improvement in race predictions vs actual results
- Retention compared to static plan users
- NPS/satisfaction scores

---

## Timeline

| Phase | Scope | Effort |
|-------|-------|--------|
| 1 | Wire up blendPaces (fix static paces) | Small |
| 2 | Week Insights UI + basic aggregation | Medium |
| 3 | AI week analysis + recommendations | Medium |
| 4 | Accept/decline flow + plan regeneration | Medium |
| 5 | History tracking + trend analysis | Small |

---

*Created: December 19, 2025*
*Status: Planning/Specification*
