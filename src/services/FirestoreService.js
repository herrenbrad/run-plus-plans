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

      await setDoc(userRef, {
        trainingPlan: {
          ...cleanedPlan,
          savedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Training plan saved to Firestore');
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving training plan:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's complete data (profile + training plan)
   */
  async getUserData(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        console.log('✅ User data loaded from Firestore');
        return {
          success: true,
          data: docSnap.data()
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
      const userRef = doc(db, 'users', userId);
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
