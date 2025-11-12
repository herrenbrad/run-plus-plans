/**
 * Strava Sync Service
 * Handles automatic syncing of Strava activities to RunEQ workouts
 */

import StravaService from './StravaService';
import FirestoreService from './FirestoreService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

class StravaSyncService {
  /**
   * Sync recent Strava activities and match to RunEQ workouts
   * @param {string} userId - Firebase user ID
   * @param {object} userProfile - User profile with Strava tokens
   * @param {object} trainingPlan - User's training plan
   * @param {number} currentWeek - Current week number
   * @returns {Promise<object>} Sync results
   */
  async syncActivities(userId, userProfile, trainingPlan, currentWeek) {
    console.log('🔄 Starting Strava sync...', { userId, currentWeek });

    if (!userProfile.stravaConnected) {
      console.log('⚠️ Strava not connected - skipping sync');
      return { success: false, error: 'Strava not connected' };
    }

    try {
      // Check if token is expired and refresh if needed
      let accessToken = userProfile.stravaAccessToken;
      const expiresAt = userProfile.stravaTokenExpiresAt;

      if (StravaService.isTokenExpired(expiresAt)) {
        console.log('🔄 Access token expired - refreshing...');
        const newTokens = await StravaService.refreshAccessToken(userProfile.stravaRefreshToken);

        // Update tokens in Firebase
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          stravaAccessToken: newTokens.access_token,
          stravaRefreshToken: newTokens.refresh_token,
          stravaTokenExpiresAt: newTokens.expires_at,
        });

        accessToken = newTokens.access_token;
        console.log('✅ Token refreshed successfully');
      }

      // Fetch recent activities (last 30 days)
      const activities = await StravaService.getActivities(accessToken, 1, 50);
      console.log(`📥 Fetched ${activities.length} Strava activities`);

      // Get current week's workouts
      const currentWeekData = trainingPlan.weeks[currentWeek - 1];
      if (!currentWeekData || !currentWeekData.workouts) {
        console.log('⚠️ No workouts found for current week');
        return { success: false, error: 'No workouts in current week' };
      }

      // Also get previous 2 weeks for matching (in case they logged workout late)
      const weeksToCheck = [currentWeek];
      if (currentWeek > 1) weeksToCheck.push(currentWeek - 1);
      if (currentWeek > 2) weeksToCheck.push(currentWeek - 2);

      let allWorkouts = [];
      weeksToCheck.forEach(weekNum => {
        const weekData = trainingPlan.weeks[weekNum - 1];
        if (weekData && weekData.workouts) {
          weekData.workouts.forEach(workout => {
            allWorkouts.push({
              ...workout,
              weekNumber: weekNum
            });
          });
        }
      });

      console.log(`🔍 Checking ${allWorkouts.length} workouts across ${weeksToCheck.length} weeks`);

      // Match activities to workouts
      const matches = [];
      const completedWorkouts = await this.getCompletedWorkouts(userId);

      for (const activity of activities) {
        // Only sync rides and runs
        const supportedTypes = ['Ride', 'VirtualRide', 'EBikeRide', 'Run', 'VirtualRun'];
        if (!supportedTypes.includes(activity.type)) {
          continue;
        }

        // Find matching workout
        const matchedWorkout = this.findMatchingWorkout(activity, allWorkouts, completedWorkouts);

        if (matchedWorkout) {
          console.log(`✅ Matched Strava activity ${activity.id} to workout:`, {
            day: matchedWorkout.day,
            week: matchedWorkout.weekNumber,
            workout: matchedWorkout.workout?.name,
            type: activity.type
          });

          matches.push({
            activity,
            workout: matchedWorkout
          });
        }
      }

      console.log(`🎯 Found ${matches.length} matching workouts`);

      // Auto-complete matched workouts
      let completedCount = 0;
      for (const match of matches) {
        const completed = await this.completeWorkout(
          userId,
          match.workout,
          match.activity
        );
        if (completed) completedCount++;
      }

      console.log(`✅ Strava sync complete: ${completedCount}/${matches.length} workouts auto-completed`);

      return {
        success: true,
        activitiesFetched: activities.length,
        matchesFound: matches.length,
        workoutsCompleted: completedCount
      };

    } catch (error) {
      console.error('❌ Strava sync error:', error);

      if (error.message === 'STRAVA_TOKEN_EXPIRED') {
        return { success: false, error: 'Token expired - please reconnect Strava' };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Find matching workout for a Strava activity
   * @param {object} activity - Strava activity
   * @param {Array} workouts - Array of RunEQ workouts
   * @param {Array} completedWorkouts - Already completed workouts
   * @returns {object|null} Matched workout or null
   */
  findMatchingWorkout(activity, workouts, completedWorkouts) {
    const activityDate = new Date(activity.start_date_local);
    const activityDistanceMiles = activity.distance / 1609.34;

    // Determine if activity is a bike or run
    const rideTypes = ['Ride', 'VirtualRide', 'EBikeRide'];
    const runTypes = ['Run', 'VirtualRun'];
    const isBikeActivity = rideTypes.includes(activity.type);
    const isRunActivity = runTypes.includes(activity.type);

    for (const workout of workouts) {
      // Skip if already completed
      const workoutKey = `${workout.weekNumber}-${workout.day}`;
      if (completedWorkouts.some(cw => cw.key === workoutKey)) {
        continue;
      }

      // Match activity type to workout type
      const isBikeWorkout = workout.type === 'bike' || workout.equipmentSpecific;
      const isRunWorkout = ['tempo', 'intervals', 'hills', 'longRun', 'easy'].includes(workout.type);

      // Skip if types don't match
      if (isBikeActivity && !isBikeWorkout) continue;
      if (isRunActivity && !isRunWorkout) continue;

      // Check date match (same day)
      const workoutDate = new Date(workout.date);
      if (
        activityDate.getFullYear() !== workoutDate.getFullYear() ||
        activityDate.getMonth() !== workoutDate.getMonth() ||
        activityDate.getDate() !== workoutDate.getDate()
      ) {
        continue;
      }

      // Found a match!
      // No distance check - if you did the workout on the right day, that's what counts
      return workout;
    }

    return null;
  }

  /**
   * Get list of already completed workouts
   * @param {string} userId - Firebase user ID
   * @returns {Promise<Array>} Array of completed workout keys
   */
  async getCompletedWorkouts(userId) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) return [];

      const data = userDoc.data();
      const completedWorkouts = data.completedWorkouts || {};

      return Object.keys(completedWorkouts).map(key => ({
        key,
        data: completedWorkouts[key]
      }));
    } catch (error) {
      console.error('Error fetching completed workouts:', error);
      return [];
    }
  }

  /**
   * Mark workout as complete with Strava data
   * @param {string} userId - Firebase user ID
   * @param {object} workout - RunEQ workout
   * @param {object} stravaActivity - Strava activity data
   * @returns {Promise<boolean>} Success status
   */
  async completeWorkout(userId, workout, stravaActivity) {
    try {
      const completionData = StravaService.convertToRunEQCompletion(stravaActivity);

      const workoutKey = `${workout.weekNumber}-${workout.day}`;

      const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');

      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        [`completedWorkouts.${workoutKey}`]: {
          completedAt: new Date().toISOString(),
          ...completionData,
          autoCompletedFromStrava: true,
        }
      });

      console.log(`✅ Auto-completed workout: ${workoutKey}`);
      return true;
    } catch (error) {
      console.error(`❌ Error completing workout:`, error);
      return false;
    }
  }

  /**
   * Get sync status for display
   * @param {object} userProfile - User profile
   * @returns {object} Sync status info
   */
  getSyncStatus(userProfile) {
    if (!userProfile.stravaConnected) {
      return {
        connected: false,
        status: 'not_connected',
        message: 'Connect Strava to enable automatic workout tracking'
      };
    }

    const lastSync = userProfile.stravaLastSync;
    if (!lastSync) {
      return {
        connected: true,
        status: 'never_synced',
        message: 'Connected - sync will happen automatically'
      };
    }

    const lastSyncDate = new Date(lastSync);
    const now = new Date();
    const hoursSinceSync = (now - lastSyncDate) / (1000 * 60 * 60);

    if (hoursSinceSync < 1) {
      return {
        connected: true,
        status: 'recent',
        message: 'Synced recently',
        lastSync: lastSyncDate
      };
    }

    return {
      connected: true,
      status: 'ready',
      message: `Last synced ${Math.round(hoursSinceSync)} hours ago`,
      lastSync: lastSyncDate
    };
  }
}

export default new StravaSyncService();
