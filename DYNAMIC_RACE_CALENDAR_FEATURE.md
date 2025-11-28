# Dynamic Race Calendar Feature - Design Document

## 🎯 Overview

Allow users to add multiple B-races throughout their training cycle, with the AI automatically adjusting the plan to integrate races intelligently. This solves the common use case of monthly races building toward a primary A-race (e.g., Medellín Marathon series).

## 🐛 Problem: Runna's B-Race Bug

**User Report:** After adding a B-race, Runna assigned 5 weeks straight of the same long run distance. This indicates:
- Workout replacement happened, but progression logic wasn't updated
- Plan generator got "stuck" at a distance after race
- No post-race progression adjustment

**Our Solution:** Smart progression tracking that accounts for race weeks and maintains proper long run progression.

---

## 🏗️ Architecture

### 1. Race Calendar Data Structure

```javascript
raceCalendar: {
  aRace: {
    name: "Medellín Marathon",
    date: "2026-09-15",
    distance: "Marathon",
    goalTime: "4:30:00",
    priority: "A"
  },
  bRaces: [
    {
      id: "race-1",
      name: "March 15K",
      date: "2026-03-15",
      distance: "15K",
      effortLevel: "tempo", // "all-out" | "tempo" | "easy"
      taperDays: 2,
      recoveryDays: 2,
      replacesWorkout: null, // Set when integrated
      integrated: false
    },
    {
      id: "race-2",
      name: "April 11K",
      date: "2026-04-12",
      distance: "11K",
      effortLevel: "all-out",
      taperDays: 3,
      recoveryDays: 3,
      replacesWorkout: null,
      integrated: false
    }
  ]
}
```

### 2. Workout Replacement Logic

**Key Principle:** Races replace workouts, not add to them. The plan maintains total volume and progression.

**Matching Algorithm:**
```javascript
function findBestWorkoutToReplace(race, weekPlan) {
  const raceDistance = convertToMiles(race.distance); // 15K = 9.3 miles
  
  // Priority 1: Exact match on long run day
  if (weekPlan.longRun && Math.abs(weekPlan.longRun.distance - raceDistance) < 2) {
    return { type: 'longRun', workout: weekPlan.longRun };
  }
  
  // Priority 2: Long run within 20% distance
  if (weekPlan.longRun && raceDistance >= weekPlan.longRun.distance * 0.8) {
    return { type: 'longRun', workout: weekPlan.longRun };
  }
  
  // Priority 3: Quality workout (tempo/interval) if race is tempo effort
  if (race.effortLevel === 'tempo' && weekPlan.qualityWorkout) {
    return { type: 'quality', workout: weekPlan.qualityWorkout };
  }
  
  // Priority 4: Any workout on race day
  const raceDayWorkout = weekPlan.workouts.find(w => w.day === race.day);
  if (raceDayWorkout) {
    return { type: 'any', workout: raceDayWorkout };
  }
  
  // Fallback: Longest workout of the week
  return { type: 'longest', workout: weekPlan.workouts.sort((a, b) => b.distance - a.distance)[0] };
}
```

### 3. Progression Tracking (Avoids Runna Bug)

**Critical:** After a race week, the plan must continue proper progression.

```javascript
class ProgressionTracker {
  constructor(initialLongRun, targetLongRun, totalWeeks) {
    this.initialLongRun = initialLongRun; // 5 miles
    this.targetLongRun = targetLongRun; // 20 miles
    this.totalWeeks = totalWeeks; // 20 weeks
    this.raceWeeks = []; // Track which weeks have races
    this.longRunProgression = this.calculateProgression();
  }
  
  calculateProgression() {
    // Linear progression with recovery weeks
    const progression = [];
    let current = this.initialLongRun;
    const increment = (this.targetLongRun - this.initialLongRun) / (this.totalWeeks * 0.75); // 75% build, 25% taper
    
    for (let week = 1; week <= this.totalWeeks; week++) {
      if (week % 4 === 0) {
        // Recovery week: reduce 20%
        progression.push(current * 0.8);
      } else if (this.raceWeeks.includes(week)) {
        // Race week: use race distance, don't progress
        progression.push(null); // Will be set by race distance
      } else {
        // Normal progression
        current = Math.min(current + increment, this.targetLongRun);
        progression.push(current);
      }
    }
    
    return progression;
  }
  
  adjustAfterRace(raceWeek, raceDistance) {
    // After a race, continue progression from where we should be
    const weeksAfterRace = this.totalWeeks - raceWeek;
    const remainingProgression = this.targetLongRun - raceDistance;
    const adjustedIncrement = remainingProgression / (weeksAfterRace * 0.75);
    
    // Update progression for weeks after race
    for (let week = raceWeek + 1; week <= this.totalWeeks; week++) {
      if (week % 4 !== 0 && !this.raceWeeks.includes(week)) {
        const previousWeek = this.longRunProgression[week - 2] || raceDistance;
        this.longRunProgression[week - 1] = Math.min(
          previousWeek + adjustedIncrement,
          this.targetLongRun
        );
      }
    }
  }
}
```

**Key Fix for Runna Bug:**
- Track progression independently of individual workouts
- After race week, recalculate remaining progression
- Never "freeze" at a distance - always progress forward

---

## 🎨 UI Components

### 1. Race Calendar Manager

**File:** `src/components/RaceCalendarManager.js`

```jsx
function RaceCalendarManager({ raceCalendar, onUpdate, trainingPlan }) {
  const [showAddRace, setShowAddRace] = useState(false);
  
  return (
    <div className="race-calendar-manager">
      <h3>Your Race Calendar</h3>
      
      {/* A-Race Display */}
      <div className="a-race-card">
        <span className="priority-badge">A-Race</span>
        <h4>{raceCalendar.aRace.name}</h4>
        <p>{formatDate(raceCalendar.aRace.date)} - Peak here</p>
      </div>
      
      {/* B-Races List */}
      <div className="b-races-section">
        <h4>B-Races (Building Up)</h4>
        <button onClick={() => setShowAddRace(true)}>+ Add Race</button>
        
        {raceCalendar.bRaces.map(race => (
          <RaceCard 
            key={race.id}
            race={race}
            onEdit={handleEditRace}
            onDelete={handleDeleteRace}
            onIntegrate={handleIntegrateRace}
            trainingPlan={trainingPlan}
          />
        ))}
      </div>
      
      {/* Add Race Modal */}
      {showAddRace && (
        <AddRaceModal
          onClose={() => setShowAddRace(false)}
          onSave={handleAddRace}
          trainingPlan={trainingPlan}
        />
      )}
    </div>
  );
}
```

### 2. Race Card Component

**File:** `src/components/RaceCard.js`

```jsx
function RaceCard({ race, onEdit, onDelete, onIntegrate, trainingPlan }) {
  const matchedWorkout = findMatchingWorkout(race, trainingPlan);
  const integrationStatus = race.integrated ? 'integrated' : 'pending';
  
  return (
    <div className={`race-card ${integrationStatus}`}>
      <div className="race-header">
        <h5>{race.name}</h5>
        <span className="distance-badge">{race.distance}</span>
      </div>
      
      <div className="race-details">
        <p>Date: {formatDate(race.date)}</p>
        <p>Effort: {race.effortLevel}</p>
        {matchedWorkout && (
          <p className="match-info">
            Will replace: {matchedWorkout.type} ({matchedWorkout.distance} miles)
          </p>
        )}
      </div>
      
      <div className="race-actions">
        <button onClick={() => onEdit(race)}>Edit</button>
        <button onClick={() => onIntegrate(race)}>
          {race.integrated ? 'Re-integrate' : 'Integrate into Plan'}
        </button>
        <button onClick={() => onDelete(race.id)}>Delete</button>
      </div>
    </div>
  );
}
```

### 3. Add Race Modal

**File:** `src/components/AddRaceModal.js`

```jsx
function AddRaceModal({ onClose, onSave, trainingPlan }) {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    distance: '15K',
    effortLevel: 'tempo',
    taperDays: 2,
    recoveryDays: 2
  });
  
  const previewMatch = useMemo(() => {
    if (!formData.date) return null;
    return findMatchingWorkout(formData, trainingPlan);
  }, [formData, trainingPlan]);
  
  return (
    <Modal onClose={onClose}>
      <h3>Add B-Race</h3>
      
      <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
        <input
          type="text"
          placeholder="Race Name (e.g., March 15K)"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
        
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
          required
        />
        
        <select
          value={formData.distance}
          onChange={(e) => setFormData({...formData, distance: e.target.value})}
        >
          <option value="5K">5K</option>
          <option value="10K">10K</option>
          <option value="11K">11K</option>
          <option value="15K">15K</option>
          <option value="Half">Half Marathon</option>
          <option value="Marathon">Marathon</option>
        </select>
        
        <div className="effort-level-selector">
          <label>Effort Level:</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="all-out"
                checked={formData.effortLevel === 'all-out'}
                onChange={(e) => setFormData({...formData, effortLevel: e.target.value})}
              />
              All-Out (Race it!)
            </label>
            <label>
              <input
                type="radio"
                value="tempo"
                checked={formData.effortLevel === 'tempo'}
                onChange={(e) => setFormData({...formData, effortLevel: e.target.value})}
              />
              Tempo Effort (Workout pace)
            </label>
            <label>
              <input
                type="radio"
                value="easy"
                checked={formData.effortLevel === 'easy'}
                onChange={(e) => setFormData({...formData, effortLevel: e.target.value})}
              />
              Easy Long Run (Conversational)
            </label>
          </div>
        </div>
        
        {formData.effortLevel === 'all-out' && (
          <div className="taper-recovery-selector">
            <label>Taper: {formData.taperDays} days</label>
            <input
              type="range"
              min="2"
              max="7"
              value={formData.taperDays}
              onChange={(e) => setFormData({...formData, taperDays: parseInt(e.target.value)})}
            />
            
            <label>Recovery: {formData.recoveryDays} days</label>
            <input
              type="range"
              min="1"
              max="5"
              value={formData.recoveryDays}
              onChange={(e) => setFormData({...formData, recoveryDays: parseInt(e.target.value)})}
            />
          </div>
        )}
        
        {previewMatch && (
          <div className="preview-match">
            <p>💡 This race will replace:</p>
            <p><strong>{previewMatch.type}</strong> - {previewMatch.distance} miles</p>
            <p>Week {previewMatch.week}, {previewMatch.day}</p>
          </div>
        )}
        
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Add Race</button>
        </div>
      </form>
    </Modal>
  );
}
```

---

## 🤖 AI Integration

### 1. Enhanced AI Prompt

**Update:** `src/services/TrainingPlanAIService.js`

```javascript
buildRegularRunnerPlanStructurePrompt(profile, coachingAnalysis) {
  // ... existing prompt building ...
  
  // Add race calendar context
  if (profile.raceCalendar && profile.raceCalendar.bRaces.length > 0) {
    prompt += `\n**RACE CALENDAR - B-RACES:**\n`;
    prompt += `You are building toward: ${profile.raceCalendar.aRace.name} (${profile.raceCalendar.aRace.date})\n\n`;
    prompt += `**B-Races (integrated into plan):**\n`;
    
    profile.raceCalendar.bRaces
      .filter(race => race.integrated)
      .forEach(race => {
        prompt += `- **Week ${race.week}:** ${race.name} (${race.distance}) - ${race.effortLevel} effort\n`;
        prompt += `  * Replaces: ${race.replacesWorkout.type} (${race.replacesWorkout.distance} miles)\n`;
        prompt += `  * Taper: ${race.taperDays} days before\n`;
        prompt += `  * Recovery: ${race.recoveryDays} days after\n`;
      });
    
    prompt += `\n**CRITICAL - PROGRESSION AFTER RACES:**\n`;
    prompt += `- After each B-race, continue long run progression normally\n`;
    prompt += `- DO NOT freeze at the same distance for multiple weeks\n`;
    prompt += `- Race weeks may have lower volume, but next week resumes progression\n`;
    prompt += `- Example: Week 6 has 15K race (9.3 miles), Week 7 should progress to 10-11 miles, not stay at 9.3\n`;
  }
  
  // ... rest of prompt ...
}
```

### 2. Race Week Adjustment Logic

**File:** `src/services/RaceWeekAdjuster.js`

```javascript
class RaceWeekAdjuster {
  adjustWeekForRace(weekPlan, race, effortLevel) {
    const adjustedWeek = { ...weekPlan };
    
    // Replace the matched workout with race
    const raceWorkout = {
      type: 'race',
      day: race.day,
      distance: convertToMiles(race.distance),
      name: race.name,
      effortLevel: effortLevel,
      isRace: true
    };
    
    adjustedWeek.workouts = adjustedWeek.workouts.map(workout => {
      if (workout.id === race.replacesWorkout.id) {
        return raceWorkout;
      }
      return workout;
    });
    
    // Apply taper (reduce volume in days before race)
    if (race.taperDays > 0) {
      adjustedWeek.workouts = adjustedWeek.workouts.map(workout => {
        const daysBeforeRace = getDaysBefore(workout.day, race.day);
        if (daysBeforeRace > 0 && daysBeforeRace <= race.taperDays) {
          // Reduce volume by 30-50% depending on days before
          const reduction = 0.3 + (0.2 * (race.taperDays - daysBeforeRace) / race.taperDays);
          return {
            ...workout,
            distance: workout.distance * (1 - reduction),
            notes: `Taper: Reduced volume for ${race.name}`
          };
        }
        return workout;
      });
    }
    
    // Adjust total weekly volume
    adjustedWeek.totalMileage = adjustedWeek.workouts
      .filter(w => w.type !== 'rest')
      .reduce((sum, w) => sum + (w.distance || 0), 0);
    
    return adjustedWeek;
  }
  
  adjustRecoveryWeek(weekPlan, race, recoveryDays) {
    // Week after race: reduce intensity, maintain easy volume
    const adjustedWeek = { ...weekPlan };
    
    adjustedWeek.workouts = adjustedWeek.workouts.map(workout => {
      const daysAfterRace = getDaysAfter(workout.day, race.day);
      if (daysAfterRace > 0 && daysAfterRace <= recoveryDays) {
        // Convert quality workouts to easy runs
        if (workout.type === 'tempo' || workout.type === 'interval' || workout.type === 'hill') {
          return {
            ...workout,
            type: 'easy',
            name: 'Easy Recovery Run',
            notes: `Recovery from ${race.name}`
          };
        }
        // Reduce long run distance if it's too soon
        if (workout.type === 'longRun' && daysAfterRace <= 3) {
          return {
            ...workout,
            distance: workout.distance * 0.7,
            notes: `Recovery long run after ${race.name}`
          };
        }
      }
      return workout;
    });
    
    return adjustedWeek;
  }
}
```

---

## 🔄 Integration Workflow

### Step 1: User Adds Race
1. User opens Race Calendar Manager
2. Clicks "Add Race"
3. Fills in race details (name, date, distance, effort level)
4. System previews which workout will be replaced
5. User confirms

### Step 2: Race Integration
1. System finds matching workout in plan
2. Marks race as "integrated"
3. Stores which workout it replaces
4. Triggers plan adjustment

### Step 3: Plan Adjustment
1. **Race Week:** Adjusts volume for taper
2. **Recovery Week:** Adjusts intensity and volume
3. **Progression:** Updates long run progression to continue after race
4. **AI Regeneration (Optional):** If complex, regenerate affected weeks with AI

### Step 4: Dashboard Display
1. Race weeks show race workout instead of normal workout
2. Visual indicator (🏁 badge) on race days
3. Taper/recovery days show reduced volume
4. Progression continues normally after race

---

## 🐛 Bug Prevention (Runna's Issue)

### Problem: Frozen Progression
**Runna Bug:** 5 weeks of same long run distance after race

### Our Solution:

1. **Independent Progression Tracking**
   - Progression calculated separately from individual workouts
   - Race weeks don't break progression chain
   - After race, resume from expected progression point

2. **Post-Race Progression Adjustment**
   ```javascript
   function adjustProgressionAfterRace(raceWeek, raceDistance, currentProgression) {
     // Calculate where we should be after race
     const expectedLongRun = currentProgression[raceWeek - 1];
     const raceDistanceMiles = convertToMiles(raceDistance);
     
     // If race is shorter than expected, we're "behind"
     // If race is longer, we're "ahead"
     const adjustment = raceDistanceMiles - expectedLongRun;
     
     // Spread adjustment over next 3-4 weeks
     for (let i = raceWeek; i < raceWeek + 4 && i < currentProgression.length; i++) {
       currentProgression[i] += (adjustment / 4);
     }
   }
   ```

3. **Validation Checks**
   ```javascript
   function validateProgression(plan) {
     const longRuns = plan.weeks
       .map(week => week.workouts.find(w => w.type === 'longRun'))
       .filter(Boolean)
       .map(w => w.distance);
     
     // Check for frozen progression (same distance 3+ weeks)
     for (let i = 0; i < longRuns.length - 2; i++) {
       if (longRuns[i] === longRuns[i+1] && longRuns[i+1] === longRuns[i+2]) {
         console.warn('⚠️ Frozen progression detected - fixing...');
         fixFrozenProgression(plan, i);
       }
     }
   }
   ```

---

## 📊 Data Flow

```
User Adds Race
    ↓
RaceCalendarManager.onSave()
    ↓
RaceIntegrationService.integrateRace(race, trainingPlan)
    ↓
findBestWorkoutToReplace(race, weekPlan)
    ↓
RaceWeekAdjuster.adjustWeekForRace(weekPlan, race)
    ↓
ProgressionTracker.adjustAfterRace(raceWeek, raceDistance)
    ↓
TrainingPlanService.updatePlan(trainingPlan)
    ↓
Dashboard.refresh() - Shows updated plan
```

---

## 🎯 Success Metrics

1. **User Experience:**
   - Races integrate seamlessly (no manual workout deletion needed)
   - Progression continues normally after races
   - No frozen distances (Runna bug avoided)

2. **Technical:**
   - Race matching accuracy > 90%
   - Progression validation passes 100% of tests
   - Plan adjustment completes in < 2 seconds

3. **Business Value:**
   - Differentiates from Runna (fixes their bug)
   - Appeals to serious runners with race calendars
   - Increases plan completion (races provide motivation)

---

## 🚀 Implementation Phases

### Phase 1: MVP (Week 1-2)
- Race Calendar UI (add/remove races)
- Basic workout matching (long run priority)
- Simple week adjustment (replace workout, reduce volume)
- Progression tracking (avoid frozen distances)

### Phase 2: Enhanced (Week 3-4)
- Effort levels (all-out, tempo, easy)
- Taper/recovery logic
- AI integration (regenerate affected weeks)
- Dashboard visualization

### Phase 3: Advanced (Week 5-6)
- Multiple races per week handling
- Race series progression (building toward A-race)
- Post-race analysis integration
- Race performance tracking

---

## 🔮 Future Enhancements

1. **Auto-Detection:** Import races from Strava/race websites
2. **Race Recommendations:** Suggest optimal B-races based on A-race
3. **Performance Tracking:** Track race times and adjust plan accordingly
4. **Race Series Templates:** Pre-built calendars for common race series (Medellín, etc.)

---

## 📝 Next Steps

1. Review this design document
2. Create feature branch: `feature/dynamic-race-calendar`
3. Implement Phase 1 (MVP)
4. Test with real race calendar (Medellín series)
5. Iterate based on user feedback




