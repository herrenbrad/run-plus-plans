# Null Weeks in Firestore - Root Cause Analysis

## The Problem
Training plan `weeks` array entries are becoming `null` in Firestore, causing the Dashboard to fall back to generated workouts with static distances (e.g., 6-mile long runs).

## Root Causes Identified

### 1. **Circular Reference Detection in `cleanUndefinedValues`** ⚠️ PRIMARY SUSPECT
**Location:** `src/services/FirestoreService.js:20-21`

```javascript
if (visited.has(obj)) {
    return null; // Replace circular reference with null
}
```

**What's happening:**
- The `cleanUndefinedValues` function processes the plan before saving to Firestore
- It uses a `WeakSet` to track visited objects and prevent infinite recursion
- **If a week object has a circular reference** (e.g., references itself, parent plan, or another week), it gets converted to `null`

**Why this could happen:**
- If workout objects reference their parent week
- If week objects reference the parent plan
- If the plan structure has nested references that create cycles

### 2. **Firestore Document Size Limit** (1MB)
**Potential issue:** If a training plan exceeds Firestore's 1MB document size limit, the save operation might:
- Fail silently
- Truncate data
- Result in null entries

**How to check:** Log the size of the plan object before saving:
```javascript
const planSize = JSON.stringify(trainingPlan).length;
console.log(`Plan size: ${planSize} bytes (${(planSize / 1024 / 1024).toFixed(2)} MB)`);
```

### 3. **Merge Operation Overwriting Data**
**Location:** `src/services/FirestoreService.js:86-92`

```javascript
await setDoc(userRef, {
  trainingPlan: {
    ...cleanedPlan,
    savedAt: serverTimestamp()
  },
  updatedAt: serverTimestamp()
}, { merge: true });
```

**Potential issue:** If the plan structure changed between saves, `merge: true` might:
- Overwrite existing weeks with null if the structure doesn't match
- Fail to properly merge nested arrays

### 4. **Data Corruption from Previous Saves**
If a previous save operation had issues (e.g., partial save, error during save), the Firestore document could be in a corrupted state with null entries that persist.

## How to Diagnose

### Step 1: Check for Circular References
Add logging before saving:
```javascript
// In FirestoreService.saveTrainingPlan, before cleanUndefinedValues:
const hasCircularRefs = (obj, visited = new WeakSet()) => {
  if (obj === null || typeof obj !== 'object') return false;
  if (visited.has(obj)) return true; // Circular reference found!
  visited.add(obj);
  if (Array.isArray(obj)) {
    return obj.some(item => hasCircularRefs(item, visited));
  }
  return Object.values(obj).some(value => hasCircularRefs(value, visited));
};

if (hasCircularRefs(trainingPlan)) {
  logger.error('⚠️ WARNING: Plan has circular references! This will cause weeks to become null.');
}
```

### Step 2: Check Plan Size
```javascript
const planSize = JSON.stringify(trainingPlan).length;
logger.log(`📊 Plan size: ${planSize} bytes (${(planSize / 1024 / 1024).toFixed(2)} MB)`);
if (planSize > 900000) { // Close to 1MB limit
  logger.warn('⚠️ Plan is approaching Firestore 1MB limit!');
}
```

### Step 3: Check for Null Weeks Before Save
```javascript
const nullWeeks = trainingPlan.weeks?.filter(w => w === null || w === undefined).length;
if (nullWeeks > 0) {
  logger.error(`❌ CRITICAL: Plan has ${nullWeeks} null weeks BEFORE saving!`);
}
```

### Step 4: Check After Clean
```javascript
const cleanedPlan = cleanUndefinedValues(trainingPlan);
const nullWeeksAfter = cleanedPlan.weeks?.filter(w => w === null || w === undefined).length;
if (nullWeeksAfter > nullWeeks) {
  logger.error(`❌ CRITICAL: cleanUndefinedValues converted ${nullWeeksAfter - nullWeeks} weeks to null!`);
}
```

## Recommended Fixes

### Fix 1: Improve Circular Reference Handling
Instead of converting circular references to `null`, we should:
1. Detect them
2. Log a warning
3. Break the cycle by removing the circular reference (not the entire object)

### Fix 2: Add Validation Before Save
Add strict validation to prevent saving plans with null weeks:
```javascript
// In FirestoreService.saveTrainingPlan
const nullWeeks = cleanedPlan.weeks?.filter(w => w === null || w === undefined).length;
if (nullWeeks > 0) {
  logger.error(`❌ Cannot save plan with ${nullWeeks} null weeks!`);
  throw new Error(`Plan structure is invalid: ${nullWeeks} weeks are null`);
}
```

### Fix 3: Use `updateDoc` Instead of `setDoc` with Merge
For updating plans, use `updateDoc` with a specific path instead of `setDoc` with merge:
```javascript
await updateDoc(userRef, {
  'trainingPlan.weeks': cleanedPlan.weeks,
  'trainingPlan.updatedAt': serverTimestamp()
});
```

### Fix 4: Add Plan Size Monitoring
Log plan size and warn if approaching limits.

## Immediate Action Items

1. **Add diagnostic logging** to identify when/why weeks become null
2. **Add validation** to prevent saving plans with null weeks
3. **Check existing Firestore documents** for corrupted data
4. **Consider a migration script** to fix existing null weeks in Firestore

## Long-term Solution

1. **Refactor plan structure** to eliminate potential circular references
2. **Implement plan versioning** to track structure changes
3. **Add data integrity checks** on read operations
4. **Consider splitting large plans** into subcollections if size is an issue

