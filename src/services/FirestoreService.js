import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

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

      await setDoc(userRef, {
        profile: {
          ...profileData,
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

      await setDoc(userRef, {
        trainingPlan: {
          ...trainingPlan,
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
  async markWorkoutComplete(userId, weekNumber, day, completed = true) {
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
        }
      }

      await this.saveTrainingPlan(userId, trainingPlan);

      console.log(`✅ Workout marked as ${completed ? 'complete' : 'incomplete'}`);
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
   */
  async clearUserData(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        clearedAt: serverTimestamp()
      });

      console.log('✅ User data cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new FirestoreService();
