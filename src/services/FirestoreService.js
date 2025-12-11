import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Helper function to remove undefined values from objects
 * Firestore doesn't accept undefined - convert to null or remove
 * Handles circular references to prevent infinite recursion
 */
function cleanUndefinedValues(obj, visited = new WeakSet()) {
  if (obj === null || obj === undefined) {
    return null;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (visited.has(obj)) {
    return null; // Replace circular reference with null
  }

  // Mark as visited
  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedValues(item, visited));
  }

  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value, visited);
      }
      // Skip undefined values - don't include them in the object
    }
    return cleaned;
  }

  return obj;
}

/**
 * Fix common AI typos in text (e.g., "miless" -> "miles")
 * @param {string} text - Raw text that may contain typos
 * @returns {string} Cleaned text with typos fixed
 */
function fixCommonTypos(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/miless/gi, 'miles')
    .replace(/milees/gi, 'miles')
    .replace(/milles/gi, 'miles')
    .replace(/milse/gi, 'miles');
}

/**
 * Recursively fix typos in an object (for plan data)
 * @param {any} obj - Object to clean
 * @returns {any} Object with typos fixed in all string fields
 */
function fixTyposInObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return fixCommonTypos(obj);
  if (Array.isArray(obj)) return obj.map(fixTyposInObject);
  if (typeof obj === 'object') {
    const fixed = {};
    for (const [key, value] of Object.entries(obj)) {
      fixed[key] = fixTyposInObject(value);
    }
    return fixed;
  }
  return obj;
}

/**
 * Firestore Service
 * Handles all database operations for user data and training plans
 */
class FirestoreService {
  /**
   * Save user profile during onboarding
   */
  async saveUserProfile(userId, profileData) {
    try {
      const userRef = doc(db, 'users', userId);

      // Clean undefined values before saving
      const cleanedProfile = cleanUndefinedValues(profileData);

      await setDoc(userRef, {
        profile: {
          ...cleanedProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      }, { merge: true });

      console.log('✅ User profile saved to Firestore');
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save training plan
   */
  async saveTrainingPlan(userId, trainingPlan) {
    try {
      const userRef = doc(db, 'users', userId);

      // Clean undefined values before saving - Firestore doesn't accept undefined
      const cleanedPlan = cleanUndefinedValues(trainingPlan);

      // CRITICAL: Validate plan structure before saving
      if (!cleanedPlan.weeks || !Array.isArray(cleanedPlan.weeks)) {
        console.error('❌ CRITICAL: Plan has no weeks array! Cannot save.');
        return { success: false, error: 'Plan structure is invalid - missing weeks array' };
      }

      // Count null/undefined weeks
      const nullWeeks = cleanedPlan.weeks.filter(w => w === null || w === undefined || !w.workouts || w.workouts.length === 0);
      const nullWeekCount = nullWeeks.length;
      const totalWeeks = cleanedPlan.weeks.length;

      if (nullWeekCount > 0) {
        console.error(`❌ CRITICAL: Plan has ${nullWeekCount} null/invalid weeks out of ${totalWeeks}! Cannot save corrupted plan.`);
        console.error('   Null week indices:', cleanedPlan.weeks.map((w, i) => w === null || w === undefined || !w.workouts || w.workouts.length === 0 ? i + 1 : null).filter(Boolean));
        return { 
          success: false, 
          error: `Plan structure is corrupted: ${nullWeekCount} weeks are null or have no workouts. Please regenerate your plan.` 
        };
      }

      // Check plan size (Firestore 1MB limit)
      const planSize = JSON.stringify(cleanedPlan).length;
      if (planSize > 900000) { // 900KB warning threshold
        console.warn(`⚠️ Plan size is ${(planSize / 1024 / 1024).toFixed(2)} MB - approaching Firestore 1MB limit`);
      }

      await setDoc(userRef, {
        trainingPlan: {
          ...cleanedPlan,
          savedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log(`✅ Training plan saved to Firestore (${totalWeeks} weeks, ${(planSize / 1024).toFixed(1)} KB)`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving training plan:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's complete data (profile + training plan)
   * Automatically fixes common AI typos (e.g., "miless" -> "miles") on load
   */
  async getUserData(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        console.log('✅ User data loaded from Firestore');
        const rawData = docSnap.data();

        // MIGRATION: Convert runsPerWeek to workoutsPerWeek (backward compatibility)
        if (rawData.profile) {
          if (rawData.profile.runsPerWeek !== undefined && rawData.profile.workoutsPerWeek === undefined) {
            console.log('🔧 Migrating runsPerWeek → workoutsPerWeek');
            rawData.profile.workoutsPerWeek = rawData.profile.runsPerWeek;
            // Don't delete runsPerWeek yet - keep for transition period
          }
          // Prefer workoutsPerWeek if both exist (newer data)
          if (rawData.profile.workoutsPerWeek !== undefined && rawData.profile.runsPerWeek !== undefined) {
            // workoutsPerWeek takes precedence, but keep runsPerWeek for now
          }
        }

        // Auto-fix typos in training plan data on load
        // This ensures existing plans with typos get cleaned up without re-onboarding
        if (rawData.trainingPlan) {
          const originalJson = JSON.stringify(rawData.trainingPlan);
          rawData.trainingPlan = fixTyposInObject(rawData.trainingPlan);
          const fixedJson = JSON.stringify(rawData.trainingPlan);

          // If typos were fixed, save the corrected plan back to Firestore
          if (originalJson !== fixedJson) {
            console.log('🔧 Fixed typos in training plan, saving corrected version...');
            this.saveTrainingPlan(userId, rawData.trainingPlan).catch(err => {
              console.warn('⚠️ Could not save typo-fixed plan:', err.message);
            });
          }
        }

        return {
          success: true,
          data: rawData
        };
      } else {
        console.log('ℹ️ No user data found (new user)');
        return {
          success: true,
          data: null
        };
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update workout completion status
   */
  async markWorkoutComplete(userId, weekNumber, day, completed = true, distance = null, notes = null) {
    try {
      const userData = await this.getUserData(userId);

      if (!userData.success || !userData.data?.trainingPlan) {
        throw new Error('No training plan found');
      }

      // Update the workout in the plan
      const trainingPlan = userData.data.trainingPlan;
      const week = trainingPlan.weeks.find(w => w.week === weekNumber);

      if (week) {
        const workout = week.workouts.find(w => w.day === day);
        if (workout) {
          workout.completed = completed;
          workout.completedAt = completed ? new Date().toISOString() : null;

          // Store distance and notes when completing workout
          if (completed) {
            if (distance !== null) {
              workout.actualDistance = distance;
            }
            if (notes !== null) {
              workout.notes = notes;
            }
          } else {
            // Clear distance and notes when marking incomplete
            delete workout.actualDistance;
            delete workout.notes;
          }
        }
      }

      await this.saveTrainingPlan(userId, trainingPlan);

      console.log(`✅ Workout marked as ${completed ? 'complete' : 'incomplete'}${distance ? ` (${distance} miles)` : ''}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating workout:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save modified workout (when user changes workout via "Something Else")
   */
  async saveModifiedWorkout(userId, weekNumber, day, modifiedWorkout) {
    try {
      const userRef = doc(db, 'users', userId);

      // Store in a separate collection for modified workouts
      await updateDoc(userRef, {
        [`modifiedWorkouts.${weekNumber}-${day}`]: {
          ...modifiedWorkout,
          modifiedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      console.log('✅ Modified workout saved');
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving modified workout:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all modified workouts
   */
  async getModifiedWorkouts(userId) {
    try {
      const userData = await this.getUserData(userId);

      if (userData.success && userData.data?.modifiedWorkouts) {
        return {
          success: true,
          data: userData.data.modifiedWorkouts
        };
      }

      return { success: true, data: {} };
    } catch (error) {
      console.error('❌ Error loading modified workouts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove a modified workout (revert to original)
   * @param {string} userId - Firebase user ID
   * @param {number} weekNumber - Week number
   * @param {string} day - Day name
   * @param {number} workoutIndex - Optional workout index (for two-a-days)
   */
  async removeModifiedWorkout(userId, weekNumber, day, workoutIndex = 0) {
    try {
      const userRef = doc(db, 'users', userId);
      const workoutKey = workoutIndex === 0 
        ? `${weekNumber}-${day}` 
        : `${weekNumber}-${day}-${workoutIndex}`;

      // Use FieldValue.delete() to remove the field
      const { deleteField } = await import('firebase/firestore');
      
      await updateDoc(userRef, {
        [`modifiedWorkouts.${workoutKey}`]: deleteField(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Modified workout removed');
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing modified workout:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all user data (for testing/reset)
   * Actually deletes the user document and all associated data
   */
  async clearUserData(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Delete the entire user document
      // Note: Firestore delete() removes the document completely
      await deleteDoc(userRef);

      console.log('✅ User data cleared (document deleted)');
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new FirestoreService();
