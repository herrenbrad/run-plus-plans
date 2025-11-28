/**
 * Strava Sync Service
 * Handles automatic syncing of Strava activities to RunEQ workouts
 */

import StravaService from './StravaService';
import FirestoreService from './FirestoreService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import logger from '../utils/logger';

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
    logger.log('🔄 Starting Strava sync...', { userId, currentWeek });

    if (!userProfile.stravaConnected) {
      logger.log('⚠️ Strava not connected - skipping sync');
      return { success: false, error: 'Strava not connected' };
    }

    try {
      // Check if token is expired and refresh if needed
      let accessToken = userProfile.stravaAccessToken;
      const expiresAt = userProfile.stravaTokenExpiresAt;

      if (StravaService.isTokenExpired(expiresAt)) {
        logger.log('🔄 Access token expired - refreshing...');
        const newTokens = await StravaService.refreshAccessToken(userProfile.stravaRefreshToken);

        // Update tokens in Firebase
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          stravaAccessToken: newTokens.access_token,
          stravaRefreshToken: newTokens.refresh_token,
          stravaTokenExpiresAt: newTokens.expires_at,
        });

        accessToken = newTokens.access_token;
        logger.log('✅ Token refreshed successfully');
      }

      // Calculate training plan start date (only fetch activities from this date forward)
      const planStartDate = trainingPlan?.planOverview?.startDate
        ? new Date(trainingPlan.planOverview.startDate + 'T00:00:00')
        : null;

      if (!planStartDate) {
        logger.log('⚠️ No plan start date found - fetching all recent activities');
      }

      // Fetch activities only from training plan start date
      const activities = await StravaService.getActivities(accessToken, 1, 50, planStartDate);
      logger.log(`📥 Fetched ${activities.length} Strava activities ${planStartDate ? `since ${planStartDate.toLocaleDateString()}` : ''}`);

      // Get workouts from training plan
      // Handle case where weeks array might be empty (Dashboard generates workouts on the fly)
      logger.log('🔍 Debug sync:', {
        currentWeek,
        totalWeeks: trainingPlan.weeks?.length,
        weeksArrayExists: !!trainingPlan.weeks,
        weekIndex: currentWeek - 1,
        weekDataExists: !!trainingPlan.weeks?.[currentWeek - 1],
        weekData: trainingPlan.weeks?.[currentWeek - 1] ? {
          weekNumber: trainingPlan.weeks[currentWeek - 1].weekNumber,
          hasWorkouts: !!trainingPlan.weeks[currentWeek - 1].workouts,
          workoutCount: trainingPlan.weeks[currentWeek - 1].workouts?.length
        } : null
      });

      let allWorkouts = [];

      // If weeks array exists and has data, use it
      if (trainingPlan.weeks && trainingPlan.weeks.length > 0) {
        // Also get previous 2 weeks for matching (in case they logged workout late)
        const weeksToCheck = [currentWeek];
        if (currentWeek > 1) weeksToCheck.push(currentWeek - 1);
        if (currentWeek > 2) weeksToCheck.push(currentWeek - 2);

        weeksToCheck.forEach(weekNum => {
          const weekData = trainingPlan.weeks[weekNum - 1];
          if (weekData && weekData.workouts) {
            weekData.workouts.forEach(workout => {
              // workoutIndex is always 0 for primary planned workouts
              // (index 1+ is for "Something Else" additional workouts added by user)
              allWorkouts.push({
                ...workout,
                weekNumber: weekNum,
                workoutIndex: 0
              });
            });
          }
        });
      } else {
        // Weeks array is empty - Dashboard generates workouts on the fly
        // Generate minimal workout structure for current week based on plan start date
        logger.log('⚠️ Weeks array is empty - generating minimal workout structure for matching');
        
        if (!planStartDate) {
          logger.log('⚠️ Cannot generate workouts - no plan start date');
          return { success: false, error: 'Training plan structure not available' };
        }

        // Generate workouts for current week based on start date
        // Calculate which day of week the plan starts
        const startDayOfWeek = planStartDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Calculate date for each day of current week
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysSinceStart = (currentWeek - 1) * 7;
        const weekStartDate = new Date(planStartDate.getTime() + (daysSinceStart * msPerDay));
        
        // Generate workouts for each day of the week
        const preferredBikeDays = userProfile.preferredBikeDays || [];
        
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const workoutDate = new Date(weekStartDate.getTime() + (dayOffset * msPerDay));
          const dayName = dayNames[workoutDate.getDay()];
          const isBikeDay = preferredBikeDays.includes(dayName);
          
          // Create minimal workout structure for matching
          allWorkouts.push({
            day: dayName,
            type: isBikeDay ? 'bike' : (dayOffset === 0 || dayOffset === 6 ? 'rest' : 'easy'),
            date: workoutDate.toISOString().split('T')[0], // YYYY-MM-DD format
            weekNumber: currentWeek,
            workoutIndex: 0,
            equipmentSpecific: isBikeDay,
            workout: {
              name: isBikeDay ? 'Bike Workout' : 'Easy Run',
              description: isBikeDay ? 'Cyclete workout' : 'Easy run'
            }
          });
        }
        
        logger.log(`✅ Generated ${allWorkouts.length} workouts for week ${currentWeek} based on plan start date`);
      }

      if (allWorkouts.length === 0) {
        logger.log('⚠️ No workouts available for matching - sync will complete with 0 matches');
        // Don't return error - just proceed with 0 workouts, sync will complete successfully with 0 matches
      }

      logger.log(`🔍 Checking ${allWorkouts.length} workouts for matching`);

      // Match activities to workouts
      const matches = [];
      const completedWorkouts = await this.getCompletedWorkouts(userId);

      for (const activity of activities) {
        // Log ALL activity types to debug
        logger.log(`📋 Activity: "${activity.name}" - Type: "${activity.type}" - Date: ${activity.start_date_local}`);

        // Only sync rides and runs
        const supportedTypes = ['Ride', 'VirtualRide', 'EBikeRide', 'Run', 'VirtualRun'];
        if (!supportedTypes.includes(activity.type)) {
          logger.log(`  ⏭️ Skipping - unsupported type: ${activity.type}`);
          continue;
        }

        // Find matching workout
        const matchedWorkout = this.findMatchingWorkout(activity, allWorkouts, completedWorkouts);

        if (matchedWorkout) {
          logger.log(`✅ Matched Strava activity ${activity.id} to workout:`, {
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

      logger.log(`🎯 Found ${matches.length} matching workouts`);

      // Auto-complete matched workouts
      let completedCount = 0;
      for (const match of matches) {
        const completed = await this.completeWorkout(
          userId,
          match.workout,
          match.activity,
          accessToken  // Pass access token so we can fetch detailed data
        );
        if (completed) completedCount++;
      }

      logger.log(`✅ Strava sync complete: ${completedCount}/${matches.length} workouts auto-completed`);

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

    logger.log('🔍 Matching activity:', {
      name: activity.name,
      type: activity.type,
      date: activity.start_date_local,
      activityDate: activityDate.toLocaleDateString(),
      distance: activityDistanceMiles.toFixed(2) + ' mi'
    });

    // Determine if activity is a bike or run
    const rideTypes = ['Ride', 'VirtualRide', 'EBikeRide'];
    const runTypes = ['Run', 'VirtualRun'];
    const isBikeActivity = rideTypes.includes(activity.type);
    const isRunActivity = runTypes.includes(activity.type);

    for (const workout of workouts) {
      // Skip if already completed - check with workoutIndex
      const workoutKey = `${workout.weekNumber}-${workout.day}-${workout.workoutIndex || 0}`;

      logger.log(`  🔑 Generated workout key: ${workoutKey}`, {
        weekNumber: workout.weekNumber,
        day: workout.day,
        workoutIndex: workout.workoutIndex,
        hasWorkoutIndex: workout.hasOwnProperty('workoutIndex')
      });
      logger.log(`  📋 Completed workouts keys:`, completedWorkouts.map(cw => cw.key));

      if (completedWorkouts.some(cw => cw.key === workoutKey)) {
        logger.log(`  ⏭️ Skipping ${workout.day} - already completed`);
        continue;
      }

      // Match activity type to workout type
      const isBikeWorkout = workout.type === 'bike' || workout.equipmentSpecific;
      const isRunWorkout = ['tempo', 'intervals', 'hills', 'longRun', 'easy'].includes(workout.type);

      // Parse workout date as local time (not UTC) to avoid timezone shifts
      const workoutDate = new Date(workout.date + ' 00:00:00');
      logger.log(`  📅 Checking ${workout.day}:`, {
        workoutDate: workoutDate.toLocaleDateString(),
        rawDate: workout.date,
        workoutType: workout.type,
        isBikeWorkout,
        isRunWorkout,
        activityIsBike: isBikeActivity,
        activityIsRun: isRunActivity
      });

      // Check date match first (same day required)
      const dateMatches = (
        activityDate.getFullYear() === workoutDate.getFullYear() &&
        activityDate.getMonth() === workoutDate.getMonth() &&
        activityDate.getDate() === workoutDate.getDate()
      );

      if (!dateMatches) {
        logger.log(`    ❌ Date mismatch`);
        continue;
      }

      // Type matching: Allow exact matches first, then allow cross-type matches for "life adaptations"
      // This allows users to do a run when bike is scheduled (or vice versa) - flexibility for real life
      const exactTypeMatch = (isBikeActivity && isBikeWorkout) || (isRunActivity && isRunWorkout);
      const crossTypeMatch = (isBikeActivity && isRunWorkout) || (isRunActivity && isBikeWorkout);
      
      if (!exactTypeMatch && !crossTypeMatch) {
        logger.log(`    ❌ Type mismatch: ${activity.type} activity doesn't match ${workout.type} workout`);
        continue;
      }

      if (crossTypeMatch) {
        logger.log(`    ⚠️ Life adaptation detected: ${activity.type} activity matched to ${workout.type} workout`);
      }

      // Found a match!
      logger.log(`    ✅ MATCH FOUND!`);
      return workout;
    }

    logger.log('  ❌ No match found for this activity');
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

      if (!userDoc.exists()) {
        logger.log('📦 getCompletedWorkouts: User doc does not exist');
        return [];
      }

      const data = userDoc.data();
      const completedWorkouts = data.completedWorkouts || {};

      logger.log('📦 getCompletedWorkouts: Raw data from Firebase:', completedWorkouts);
      logger.log('📦 getCompletedWorkouts: Number of completed workouts:', Object.keys(completedWorkouts).length);

      const result = Object.keys(completedWorkouts).map(key => ({
        key,
        data: completedWorkouts[key]
      }));

      logger.log('📦 getCompletedWorkouts: Returning array:', result);
      return result;
    } catch (error) {
      console.error('Error fetching completed workouts:', error);
      return [];
    }
  }

  /**
   * Mark workout as complete with Strava data
   * @param {string} userId - Firebase user ID
   * @param {object} workout - RunEQ workout
   * @param {object} stravaActivity - Strava activity data (summary from list)
   * @param {string} accessToken - Strava access token for fetching detailed data
   * @returns {Promise<boolean>} Success status
   */
  async completeWorkout(userId, workout, stravaActivity, accessToken) {
    try {
      logger.log(`📥 Fetching detailed activity data for ${stravaActivity.id}...`);

      // Fetch detailed activity data (includes laps, splits, suffer score, etc.)
      const detailedActivity = await StravaService.getActivity(accessToken, stravaActivity.id);
      logger.log(`  ✅ Got detailed activity data`);

      // Fetch activity streams (elevation, heart rate over time, etc.)
      let streams = null;
      try {
        streams = await StravaService.getActivityStreams(accessToken, stravaActivity.id);
        if (streams) {
          logger.log(`  ✅ Got activity streams (elevation profile, HR data, etc.)`);
        }
      } catch (error) {
        logger.log(`  ⚠️ Could not fetch streams (not critical):`, error.message);
      }

      // Convert to RunEQ completion format with all the detailed data
      const completionData = StravaService.convertToRunEQCompletion(detailedActivity, streams);

      // Check if this is a "life adaptation" (cross-type match)
      const rideTypes = ['Ride', 'VirtualRide', 'EBikeRide'];
      const runTypes = ['Run', 'VirtualRun'];
      const isBikeActivity = rideTypes.includes(stravaActivity.type);
      const isRunActivity = runTypes.includes(stravaActivity.type);
      const isBikeWorkout = workout.type === 'bike' || workout.equipmentSpecific;
      const isRunWorkout = ['tempo', 'intervals', 'hills', 'longRun', 'easy'].includes(workout.type);
      const isLifeAdaptation = (isBikeActivity && isRunWorkout) || (isRunActivity && isBikeWorkout);

      // Add note for life adaptations
      let notes = completionData.notes || `Synced from Strava: ${stravaActivity.name}`;
      if (isLifeAdaptation) {
        const scheduledType = isBikeWorkout ? 'bike' : 'run';
        const actualType = isBikeActivity ? 'bike' : 'run';
        notes = `Life adaptation: Did ${actualType} instead of scheduled ${scheduledType}. ${notes}`;
      }

      // Match the key format used by Dashboard: weekNumber-day-workoutIndex
      const workoutKey = `${workout.weekNumber}-${workout.day}-${workout.workoutIndex || 0}`;

      const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');

      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        [`completedWorkouts.${workoutKey}`]: {
          completedAt: new Date().toISOString(),
          completed: true,
          ...completionData,
          notes: notes, // Override notes with life adaptation info if applicable
          autoCompletedFromStrava: true,
          isLifeAdaptation: isLifeAdaptation, // Flag for UI to display differently
        }
      });

      logger.log(`✅ Auto-completed workout: ${workoutKey}`);
      if (completionData.laps) {
        logger.log(`  📊 Stored ${completionData.laps.length} lap splits`);
      }
      if (completionData.streams) {
        logger.log(`  📈 Stored elevation and HR profile data`);
      }

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
