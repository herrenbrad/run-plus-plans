# Injury Information Collection - Onboarding Design

## 🔬 Research-Oriented AI Approach (User Question)

**User Question:** Should the AI prompt for injured runners use a research-oriented persona (like "sports physiologist") to force it to do research before assigning anything?

**Answer: YES** - We should add research-oriented, safety-first instructions while maintaining the accessible coach voice.

**Strategy:** Keep the coach persona (accessible, conversational) but add explicit research/consideration requirements:
- "You are a USATF-certified running coach with **advanced knowledge of sports physiology and injury rehabilitation**"
- "Before recommending any equipment, you MUST consider biomechanical implications..."
- "Research what movements each equipment requires..."
- "When in doubt, choose the SAFEST option..."

**Benefits:**
- Forces AI to think through biomechanics before recommending
- Maintains accessible coach voice (not too academic)
- Adds scientific rigor without losing conversational tone
- Legal protection (coach with knowledge, not claiming to be medical professional)

## 🎯 Critical Problem

**Current State:**
- Onboarding asks: "Can you run right now?" → "Cross-training only"
- But does NOT ask: **What injury do you have?**
- AI coach gets: `runningStatus: 'crossTrainingOnly'` + equipment list
- **Problem:** Different injuries require different cross-training approaches
- **Risk:** Could recommend equipment that aggravates the injury

## 🚨 Injury-Specific Considerations

### Equipment Suitability by Injury Type

**IT Band Syndrome:**
- ✅ Pool (best - zero impact, no hip flexion)
- ✅ Stationary Bike (if seat height correct)
- ⚠️ Elliptical (hip flexion can aggravate)
- ❌ Rowing (hip flexion + rotation)
- ❌ Stand-up bike (hip flexion)

**Plantar Fasciitis:**
- ✅ Pool (best - zero impact)
- ✅ Elliptical (low impact, no foot strike)
- ✅ Stationary Bike (if no foot pain)
- ⚠️ Rowing (foot position can aggravate)
- ❌ Stand-up bike (foot loading)

**Shin Splints:**
- ✅ Pool (best - zero impact)
- ✅ Elliptical (low impact)
- ✅ Stationary Bike
- ✅ Rowing
- ⚠️ Stand-up bike (if impact is issue)

**Knee Issues (Patellofemoral, Meniscus, etc.):**
- ✅ Pool (best - zero impact)
- ✅ Stationary Bike (if no pain)
- ⚠️ Elliptical (knee flexion can aggravate)
- ❌ Rowing (knee compression)
- ❌ Stand-up bike (knee loading)

**Lower Back Pain:**
- ✅ Pool (best - zero impact, decompression)
- ✅ Elliptical (if posture correct)
- ⚠️ Stationary Bike (if posture correct)
- ❌ Rowing (compression + rotation)
- ⚠️ Stand-up bike (posture dependent)

**Achilles Tendonitis:**
- ✅ Pool (best - zero impact)
- ✅ Stationary Bike (if no pain)
- ⚠️ Elliptical (calf loading)
- ⚠️ Rowing (calf engagement)
- ❌ Stand-up bike (calf loading)

**Stress Fracture:**
- ✅ Pool (best - zero impact)
- ✅ Stationary Bike (if no pain)
- ⚠️ Elliptical (low impact, but still impact)
- ❌ Rowing (vibration)
- ❌ Stand-up bike (impact)

## 📋 Design Options

### Option A: Checkboxes with Common Injuries (RECOMMENDED)

**Pros:**
- Easy to use
- Covers 80% of cases
- Can select multiple (some runners have multiple issues)
- Structured data for AI

**Cons:**
- Might miss edge cases
- Need "Other" option

**UI:**
```
What injury are you recovering from? (Select all that apply)

☐ IT Band Syndrome
☐ Plantar Fasciitis
☐ Shin Splints
☐ Knee Issues (Patellofemoral, Meniscus, etc.)
☐ Lower Back Pain
☐ Achilles Tendonitis
☐ Stress Fracture
☐ Other (specify below)
```

**If "Other" selected:**
- Show text field: "Please describe your injury:"
- Character limit: 100 characters
- Optional but recommended

### Option B: Multi-Select Dropdown

**Pros:**
- Cleaner UI
- Can handle many options
- Easy to add new injuries

**Cons:**
- Less discoverable
- Harder to see all options at once
- Not as mobile-friendly

### Option C: Free Form Text Only

**Pros:**
- Most flexible
- Captures everything

**Cons:**
- ❌ **TOO RISKY** - Users might ask for medical advice
- Hard to parse for AI
- Inconsistent data
- Could get: "I have a weird pain in my leg, what should I do?"

### Option D: Hybrid (Checkboxes + Optional Details)

**Best of both worlds:**
- Checkboxes for common injuries
- Optional text field for additional context
- AI gets structured + context

## 🎨 Recommended Implementation: Option A (Checkboxes + Optional Details)

### UI Flow

**Step 1: Equipment Selection** (already done)
- User selects equipment

**Step 2: Running Status**
- "Can you run right now?"
- If "Cross-training only" or "Transitioning back" → Show injury question

**Step 3: Injury Information** (NEW - Conditional)
- Only show if `runningStatus === 'crossTrainingOnly' || runningStatus === 'transitioning'`
- Question: "What injury are you recovering from?"
- Subtext: "This helps us recommend the safest cross-training equipment and avoid aggravating your injury."

**Checkboxes:**
```
☐ IT Band Syndrome
☐ Plantar Fasciitis  
☐ Shin Splints
☐ Knee Issues (Patellofemoral, Meniscus, etc.)
☐ Lower Back Pain
☐ Achilles Tendonitis
☐ Stress Fracture
☐ Hip Issues
☐ Ankle Issues
☐ Other (please specify)
```

**If "Other" selected:**
- Show text input: "Please describe:"
- Placeholder: "e.g., Runner's knee, patellar tendinitis, etc."
- Max 100 characters
- Optional but recommended

**Safety Disclaimer:**
```
⚠️ Important: This is not medical advice. Always consult with a healthcare provider 
for injury diagnosis and treatment. We use this information to recommend appropriate 
cross-training equipment only.
```

### Data Structure

```javascript
{
  injuries: {
    itBand: boolean,
    plantarFasciitis: boolean,
    shinSplints: boolean,
    kneeIssues: boolean,
    lowerBackPain: boolean,
    achillesTendonitis: boolean,
    stressFracture: boolean,
    hipIssues: boolean,
    ankleIssues: boolean,
    other: boolean
  },
  injuryDescription: string | null, // If "other" selected
  injurySeverity: 'acute' | 'chronic' | 'preventive' | null // Optional
}
```

## 🤖 AI Prompt Updates

### Current Prompt (Missing Injury Info):
```
INJURY RECOVERY SITUATION:
- Runner: ${firstName}
- Weeks Off Running: ${weeksOffRunning} weeks
- Available Equipment: ${equipmentList}
```

### Updated Prompt (With Injury Info):
```
You are a USATF-certified running coach with advanced knowledge of sports physiology and injury rehabilitation. 
When working with injured runners, you MUST:

1. **RESEARCH FIRST:** Before recommending any equipment or workout, consider the biomechanical and physiological 
   implications of the specific injury. Think through:
   - What movements/muscles does this equipment engage?
   - Could this movement pattern aggravate the injury?
   - What does sports medicine research say about this injury + equipment combination?
   - What are the contraindications?

2. **CONSULT YOUR KNOWLEDGE:** Draw upon established principles of:
   - Sports physiology (how different activities affect the body)
   - Biomechanics (movement patterns and joint loading)
   - Injury rehabilitation protocols (what activities are safe/unsafe)
   - Exercise science research (evidence-based recommendations)

3. **SAFETY-FIRST APPROACH:** When in doubt, choose the SAFEST option. It's better to be overly conservative 
   than to risk aggravating an injury.

INJURY RECOVERY SITUATION:
- Runner: ${firstName}
- Weeks Off Running: ${weeksOffRunning} weeks
- Injury Type(s): ${injuryTypes.join(', ')}
${injuryDescription ? `- Additional Details: ${injuryDescription}` : ''}
- Available Equipment: ${equipmentList}

CRITICAL SAFETY REQUIREMENTS:
- DO NOT recommend equipment that could aggravate the injury
- Before recommending equipment, consider: What movements does it require? Could this aggravate the injury?
- Prioritize equipment based on injury type and biomechanical considerations:
  * IT Band: Pool is BEST (zero impact, no hip flexion). Stationary Bike OK if seat height correct. 
    AVOID Elliptical and Rowing (hip flexion and rotation can aggravate IT band).
  * Plantar Fasciitis: Pool is BEST (zero impact). Elliptical OK (low impact, no foot strike). 
    AVOID activities with repetitive foot loading.
  * Knee Issues: Pool is BEST (zero impact, decompression). Stationary Bike OK if no pain. 
    AVOID Rowing (knee compression) and Elliptical if painful (knee flexion).
  * Lower Back: Pool is BEST (zero impact, decompression). Elliptical OK if posture correct. 
    AVOID Rowing (compression + rotation).
  * Achilles: Pool is BEST (zero impact). Stationary Bike OK if no pain. 
    AVOID calf-loading activities (elliptical, stand-up bike).
  * Stress Fracture: Pool ONLY. Zero impact required. DO NOT use any other equipment until cleared by healthcare provider.
- If user has equipment that's contraindicated, explain WHY (biomechanical reasoning) and suggest safer alternatives
- Emphasize: "If any activity causes pain, stop immediately and consult your healthcare provider"
- Always include: "This is not medical advice. Consult your healthcare provider for injury diagnosis and treatment."
```

### For Onboarding (Initial Plan Generation):

**In `buildCoachingAnalysisPrompt`:**
```javascript
if (profile.runningStatus === 'crossTrainingOnly' || profile.runningStatus === 'transitioning') {
  prompt += `\n**INJURY RECOVERY STATUS:**\n`;
  prompt += `- Running Status: ${profile.runningStatus}\n`;
  
  if (profile.injuries) {
    const injuryTypes = [];
    if (profile.injuries.itBand) injuryTypes.push('IT Band Syndrome');
    if (profile.injuries.plantarFasciitis) injuryTypes.push('Plantar Fasciitis');
    if (profile.injuries.shinSplints) injuryTypes.push('Shin Splints');
    if (profile.injuries.kneeIssues) injuryTypes.push('Knee Issues');
    if (profile.injuries.lowerBackPain) injuryTypes.push('Lower Back Pain');
    if (profile.injuries.achillesTendonitis) injuryTypes.push('Achilles Tendonitis');
    if (profile.injuries.stressFracture) injuryTypes.push('Stress Fracture');
    if (profile.injuries.hipIssues) injuryTypes.push('Hip Issues');
    if (profile.injuries.ankleIssues) injuryTypes.push('Ankle Issues');
    
    if (injuryTypes.length > 0) {
      prompt += `- Injury Type(s): ${injuryTypes.join(', ')}\n`;
    }
    
    if (profile.injuryDescription) {
      prompt += `- Additional Details: ${profile.injuryDescription}\n`;
    }
  }
  
  prompt += `\n**CRITICAL SAFETY PROTOCOL:**\n`;
  prompt += `Before recommending any equipment or workout, you MUST:\n`;
  prompt += `1. Consider the biomechanical implications of the injury\n`;
  prompt += `2. Research what movements each equipment type requires\n`;
  prompt += `3. Determine if those movements could aggravate the injury\n`;
  prompt += `4. Prioritize the SAFEST equipment options\n`;
  prompt += `5. If contraindicated equipment is selected, explain WHY and recommend alternatives\n`;
  prompt += `6. Always include: "This is not medical advice. Consult your healthcare provider."\n\n`;
  
  prompt += `**CRITICAL:** Generate a FULL cross-training plan using the selected equipment. `;
  prompt += `DO NOT include any running workouts. `;
  prompt += `Match workout intensity to training phase (base → build → peak → taper). `;
  prompt += `If selected equipment could aggravate the injury, prioritize safer alternatives.\n`;
}
```

**In `buildPlanStructurePrompt`:**
```javascript
// Add injury-specific equipment recommendations with research-oriented approach
if (profile.runningStatus === 'crossTrainingOnly' && profile.injuries) {
  prompt += `\n**INJURY-SPECIFIC EQUIPMENT GUIDANCE (RESEARCH-BASED):**\n`;
  prompt += `Before assigning workouts, consider the biomechanical and physiological implications:\n\n`;
  
  // IT Band
  if (profile.injuries.itBand) {
    prompt += `- IT Band Syndrome:\n`;
    prompt += `  * Biomechanics: IT band irritation is caused by hip flexion and internal rotation.\n`;
    prompt += `  * Research shows: Pool running (zero impact, no hip flexion) is safest.\n`;
    prompt += `  * Stationary bike OK if seat height prevents hip flexion.\n`;
    prompt += `  * AVOID: Elliptical (hip flexion) and Rowing (hip flexion + rotation).\n`;
    prompt += `  * If user selected contraindicated equipment, explain why and use pool instead.\n\n`;
  }
  
  // Plantar Fasciitis
  if (profile.injuries.plantarFasciitis) {
    prompt += `- Plantar Fasciitis:\n`;
    prompt += `  * Biomechanics: Inflammation of plantar fascia from repetitive foot loading.\n`;
    prompt += `  * Research shows: Pool running (zero impact) is safest.\n`;
    prompt += `  * Elliptical OK (low impact, no foot strike).\n`;
    prompt += `  * AVOID: Activities with repetitive foot loading or impact.\n`;
    prompt += `  * If user selected contraindicated equipment, explain why and use pool instead.\n\n`;
  }
  
  // Stress Fracture
  if (profile.injuries.stressFracture) {
    prompt += `- Stress Fracture:\n`;
    prompt += `  * Biomechanics: Bone micro-fracture requiring zero impact for healing.\n`;
    prompt += `  * Research shows: Pool running ONLY. Any impact can worsen fracture.\n`;
    prompt += `  * DO NOT use any other equipment until cleared by healthcare provider.\n`;
    prompt += `  * If user selected other equipment, use pool ONLY and explain why.\n\n`;
  }
  
  // ... etc for each injury type with biomechanical reasoning
  
  prompt += `**CRITICAL:** Always explain the WHY behind equipment recommendations. `;
  prompt += `Reference biomechanical principles, not just "it's safer." `;
  prompt += `Include: "This is not medical advice. Consult your healthcare provider."\n`;
}
```

## 🛡️ Safety Features

### 1. Equipment Validation
```javascript
function getRecommendedEquipment(injuries, availableEquipment) {
  const recommended = [];
  const contraindicated = [];
  
  // IT Band
  if (injuries.itBand) {
    recommended.push('pool');
    if (availableEquipment.stationaryBike) recommended.push('stationaryBike');
    contraindicated.push('elliptical', 'rowing');
  }
  
  // Stress Fracture
  if (injuries.stressFracture) {
    recommended.push('pool');
    contraindicated.push('elliptical', 'stationaryBike', 'rowing', 'swimming');
  }
  
  // ... etc
  
  return { recommended, contraindicated };
}
```

### 2. Warning Messages
If user selects equipment that's contraindicated:
```
⚠️ Warning: [Equipment] may aggravate [Injury Type]. 
We recommend [Safer Equipment] instead. 
If you proceed, stop immediately if you experience any pain.
```

### 3. Medical Disclaimer
Always show:
```
⚠️ Important: This is not medical advice. Always consult with a healthcare provider 
for injury diagnosis and treatment. We use this information to recommend appropriate 
cross-training equipment only.
```

## 📊 Implementation Checklist

### Phase 1: Data Collection
- [ ] Add injury checkboxes to onboarding
- [ ] Add "Other" text field (conditional)
- [ ] Add injury data to formData
- [ ] Add injury data to userProfile
- [ ] Add safety disclaimer

### Phase 2: AI Integration
- [ ] Update `buildCoachingAnalysisPrompt` to include injury info
- [ ] Update `buildPlanStructurePrompt` to include injury-specific guidance
- [ ] Add equipment validation logic
- [ ] Add contraindication warnings

### Phase 3: Safety Features
- [ ] Equipment validation function
- [ ] Warning messages for contraindicated equipment
- [ ] Medical disclaimer in UI
- [ ] Test all injury + equipment combinations

## 🎯 Benefits

1. **Safety First:** Prevents recommending equipment that could worsen injuries
2. **Better Plans:** AI can tailor workouts to injury-specific needs
3. **User Trust:** Shows we care about their recovery
4. **Competitive Advantage:** Most apps don't consider injury-specific needs
5. **Legal Protection:** Medical disclaimer protects us

## ⚠️ Risks & Mitigation

**Risk:** Users might ask for medical advice
**Mitigation:** Clear disclaimer, structured checkboxes (not free text), focus on equipment recommendations only

**Risk:** AI might give medical advice
**Mitigation:** Explicit prompt instructions: "DO NOT provide medical advice. Focus on equipment recommendations only."

**Risk:** Missing injury types
**Mitigation:** Include "Other" option, allow multiple selections

**Risk:** Equipment recommendations might be wrong
**Mitigation:** Conservative approach (when in doubt, recommend pool), always include disclaimer

---

**Status:** Design Complete - Ready for Implementation
**Priority:** HIGH - Safety critical feature
**Estimated Time:** 3-4 hours for full implementation

