# Unified Cross-Training Onboarding - Design Document

## 🎯 Goal
Expand onboarding to support full cross-training plans for injured runners using ANY equipment type (not just stand-up bikes), while highlighting Cyclete/ElliptiGO for partnership opportunities.

## 📋 Current State

### Existing Infrastructure ✅
- `crossTrainingEquipment` object in formData (pool, elliptical, stationaryBike, swimming, rowing)
- UI for equipment selection (line ~1647 in OnboardingFlow.js)
- AI service uses equipment data (TrainingPlanAIService.js lines 1190-1201)
- InjuryRecoveryModal supports all equipment types
- All equipment libraries exist and are functional

### Current Flow ❌
- Stand-up bikes asked separately
- Running status only asked if stand-up bike selected
- Other equipment doesn't trigger injury recovery options
- Can't create full cross-training plans for non-bike equipment

## 🎨 New Flow Design

### Step 1: Equipment Selection (Unified)
**Question:** "What cross-training equipment do you have access to?"

**Visual Design:**
- Cyclete and ElliptiGO at TOP with visual emphasis (partnership highlight)
- Multi-select checkboxes
- Equipment cards with emoji, name, description

**Equipment List (in order):**
1. **Cyclete** 🚴 - *Featured at Top*
   - Badge: "Stand-Up Bike" (educational badge)
   - Description: "Teardrop motion, excellent for distance training"
   
2. **ElliptiGO** 🚴 - *Featured at Top*
   - Badge: "Stand-Up Bike" (educational badge)
   - Description: "Elliptical motion, great for full-body workouts"

3. **Pool / Aqua Running** 🏊
   - Description: "Deep water running with flotation belt"

4. **Rowing Machine** 🚣
   - Description: "Concept2 or similar rowing erg"

5. **Elliptical Machine** 🏃
   - Description: "Low-impact cardio machine"

6. **Stationary Bike** 🚴
   - Description: "Spin bike, Peloton, or indoor trainer"

7. **Swimming Pool** 🏊
   - Description: "Lap swimming (technique required)"

8. **None** (optional - running only)
   - Description: "Pure running training"

**Data Structure:**
```javascript
{
  standUpBikeType: 'cyclete' | 'elliptigo' | null,  // Keep for RunEQ
  crossTrainingEquipment: {
    pool: boolean,
    elliptical: boolean,
    stationaryBike: boolean,
    swimming: boolean,
    rowing: boolean
  },
  primaryCrossTrainingEquipment: 'pool' | 'rowing' | ... | null  // If multiple selected
}
```

### Step 2: Running Status (Conditional)
**Question:** "Can you run right now?"

**Show if:** ANY equipment selected (stand-up bike OR other equipment)

**Options:**
1. **Yes - I can run** (active)
   - Icon: 🏃
   - Description: "Mix running with cross-training"
   - Plan: Normal running plan with cross-training days

2. **No - Cross-training only for now** (crossTrainingOnly)
   - Icon: 🚴 (or equipment-specific icon)
   - Description: "Injured or transitioning - cross-training workouts only until ready to run"
   - Plan: Full cross-training plan using selected equipment

3. **Transitioning back** (transitioning)
   - Icon: 🔄
   - Description: "Returning from injury - gradually add running to cross-training base"
   - Plan: Start with cross-training, gradually reintroduce running over 4 weeks

**Data Structure:**
```javascript
{
  runningStatus: 'active' | 'crossTrainingOnly' | 'transitioning'
}
```

### Step 3: Primary Equipment Selection (Conditional)
**Question:** "Which is your primary cross-training equipment?"

**Show if:** Multiple equipment types selected

**Options:**
- Show only the selected equipment
- User selects one as primary
- Used for plan generation priority

**Data Structure:**
```javascript
{
  primaryCrossTrainingEquipment: 'cyclete' | 'elliptigo' | 'pool' | 'rowing' | 'elliptical' | 'stationaryBike' | 'swimming' | null
}
```

### Step 4: Preferred Cross-Training Days (Conditional)
**Question:** "Which days do you prefer for cross-training?"

**Show if:** 
- Equipment selected AND
- `runningStatus !== 'crossTrainingOnly'` (active or transitioning)

**Logic:**
- If only stand-up bike → "Which days for [Cyclete/ElliptiGO] rides?"
- If multiple equipment → "Which days do you prefer for cross-training?"
- Only show days that are in `availableDays`

## 🔄 Data Migration

### Backward Compatibility
**Note:** Only 3 active users - minimal migration needed. No automatic migration required.
- Existing users will continue to work with current data structure
- New onboarding flow will use unified structure

## 🤖 AI Plan Generation Updates

### TrainingPlanAIService Changes

1. **Equipment Detection:**
```javascript
// Check for ANY cross-training equipment
const hasStandUpBike = profile.standUpBikeType !== null;
const hasOtherEquipment = Object.values(profile.crossTrainingEquipment || {}).some(Boolean);
const hasAnyEquipment = hasStandUpBike || hasOtherEquipment;

// Determine primary equipment for injury recovery
const primaryEquipment = profile.standUpBikeType 
  ? (profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO')
  : getPrimaryEquipment(profile.crossTrainingEquipment);
```

2. **Running Status Handling:**
```javascript
if (profile.runningStatus === 'crossTrainingOnly') {
  // Generate full cross-training plan
  // Use selected equipment libraries
  // No running workouts
} else if (profile.runningStatus === 'transitioning') {
  // Start with cross-training, gradually add running
  // Week 1-2: 100% cross-training
  // Week 3: 25% running, 75% cross-training
  // Week 4: 50% running, 50% cross-training
  // Week 5+: Normal mix
} else {
  // Normal plan with cross-training days
}
```

3. **Prompt Updates:**
- Add equipment context to coaching analysis
- Include injury recovery guidance for all equipment types
- Reference specific equipment in workout descriptions

## 📊 Plan Generation Logic

### For `crossTrainingOnly` Status:

**Equipment Priority:**
1. Stand-up bike (if selected) - highest priority
2. Pool / Aqua Running - most running-specific
3. Rowing Machine - full-body, power-based
4. Elliptical - low-impact, accessible
5. Stationary Bike - common, easy
6. Swimming - requires technique

**Workout Distribution:**
- If single equipment: Use that equipment's library exclusively
- If multiple equipment: Rotate through them for variety
- Match workout intensity to training phase (base → build → peak → taper)

**Example Plan Structure:**
```
Week 1 (Base Phase):
  Mon: Rest
  Tue: Pool Running - Easy Aerobic (45 min)
  Wed: Pool Running - Tempo Intervals (50 min)
  Thu: Rest
  Fri: Pool Running - Easy Recovery (30 min)
  Sat: Rest
  Sun: Pool Running - Long Endurance (60 min)

Week 2 (Base Phase):
  Mon: Rest
  Tue: Rowing - Steady State (40 min)
  Wed: Pool Running - Tempo (45 min)
  Thu: Rest
  Fri: Elliptical - Easy Recovery (35 min)
  Sat: Rest
  Sun: Pool Running - Long Endurance (65 min)
```

### For `transitioning` Status:

**Week-by-Week Running Reintroduction:**
- Week 1-2: 100% cross-training
- Week 3: 25% running (1-2 easy runs), 75% cross-training
- Week 4: 50% running (2-3 runs), 50% cross-training
- Week 5+: Normal mix based on plan phase

## 🎨 UI/UX Considerations

### Partnership Highlighting
- **Visual Treatment for Cyclete/ElliptiGO:**
  - Positioned at top of list (partnership opportunity)
  - "Stand-Up Bike" badge for education (no logos without permission)
  - Slightly larger cards or visual emphasis
  - Subtle border highlight

### Equipment Cards
- Emoji for visual recognition
- Clear name and description
- Selected state: Green border, checkmark
- Hover state: Slight scale/glow

### Running Status Cards
- Large, clear icons
- Descriptive text
- Visual feedback on selection
- Contextual help text based on equipment selected

## 🧪 Testing Scenarios

1. **User selects only Cyclete:**
   - Should show stand-up bike specific messaging
   - Should ask running status
   - Should work as current flow

2. **User selects only Pool:**
   - Should show pool-specific messaging
   - Should ask running status
   - Should generate pool-only plan if injured

3. **User selects multiple equipment:**
   - Should show generic cross-training messaging
   - Should ask for primary preference (optional)
   - Should rotate through equipment in plan

4. **User selects "None":**
   - Should skip running status question
   - Should generate running-only plan

5. **User selects equipment + "active" status:**
   - Should generate normal plan with cross-training days
   - Should use selected equipment for cross-training workouts

6. **User selects equipment + "crossTrainingOnly" status:**
   - Should generate full cross-training plan
   - Should use selected equipment exclusively
   - Should NOT include any running workouts

## 📝 Implementation Checklist

### Phase 1: UI Updates
- [ ] Replace stand-up bike question with unified equipment selection
- [ ] Add Cyclete/ElliptiGO at top with partnership highlighting
- [ ] Update running status question to show for ANY equipment
- [ ] Update preferred days question to handle all equipment types
- [ ] Add visual design for partnership highlighting

### Phase 2: Data Structure
- [ ] Update formData structure
- [ ] Add migration logic for existing users
- [ ] Update user profile schema
- [ ] Add `primaryCrossTrainingEquipment` field

### Phase 3: Plan Generation
- [ ] Update AI prompts for all equipment types
- [ ] Update `regeneratePlanWithInjury` to handle all equipment
- [ ] Add equipment rotation logic for multiple equipment
- [ ] Update transitioning logic for all equipment types

### Phase 4: Testing
- [ ] Test all equipment combinations
- [ ] Test all running status options
- [ ] Test backward compatibility
- [ ] Test plan generation for each scenario

## 🚀 Benefits

1. **Partnership Opportunity:** Cyclete/ElliptiGO prominently featured
2. **Market Expansion:** Support injured runners with ANY equipment
3. **Competitive Advantage:** Only app with full cross-training plans
4. **User Flexibility:** Support multiple equipment types
5. **Injury Recovery:** Comprehensive solution for all injury scenarios

## ⚠️ Considerations

1. **Equipment Priority:** Need clear logic for multiple equipment
2. **Workout Variety:** Ensure plans don't get repetitive with single equipment
3. **User Education:** May need to explain equipment-specific benefits
4. **Plan Complexity:** More equipment = more complex plan generation
5. **Backward Compatibility:** Must support existing users seamlessly

---

**Status:** Ready for Implementation
**Priority:** HIGH - Partnership opportunity + competitive advantage
**Estimated Time:** 4-6 hours for full implementation

