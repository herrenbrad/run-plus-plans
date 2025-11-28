import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import StravaSyncService from '../services/StravaSyncService';
import logger from '../utils/logger';
import { useToast } from '../components/Toast';

/**
 * Custom hook for managing Strava sync functionality
 * Handles manual sync, disconnect, and sync status
 */
export const useStravaSync = ({ userProfile, trainingPlan, currentWeek }) => {
  const toast = useToast();
  const [stravaSyncing, setStravaSyncing] = useState(false);

  /**
   * Manually sync Strava activities with scheduled workouts
   */
  const handleManualStravaSync = async () => {
    logger.log('🔘 BUTTON CLICKED - handleManualStravaSync called');
    if (!userProfile?.stravaConnected || !auth.currentUser || !trainingPlan) {
      logger.log('❌ Cannot sync - missing requirements:', {
        stravaConnected: userProfile?.stravaConnected,
        hasUser: !!auth.currentUser,
        hasTrainingPlan: !!trainingPlan
      });
      return;
    }

    setStravaSyncing(true);
    logger.log('🔄 Manual Strava sync triggered...');

    try {
      const result = await StravaSyncService.syncActivities(
        auth.currentUser.uid,
        userProfile,
        trainingPlan,
        currentWeek
      );

      if (result.success) {
        logger.log('✅ Strava sync successful:', result);

        // Update last sync time
        localStorage.setItem('runeq_stravaLastSync', new Date().toISOString());

        // Refresh the page to show updated completions
        if (result.workoutsCompleted > 0) {
          logger.log(`🔄 ${result.workoutsCompleted} workouts auto-completed - refreshing...`);
          window.location.reload();
        } else {
          toast.success(`Sync complete! Found ${result.activitiesFetched} activities, ${result.matchesFound} matched workouts.`);
          setStravaSyncing(false);
        }
      } else {
        console.warn('⚠️ Strava sync failed:', result.error);
        toast.error(`Sync failed: ${result.error}`);
        setStravaSyncing(false);
      }
    } catch (error) {
      console.error('❌ Strava sync error:', error);
      toast.error(`Sync error: ${error.message}`);
      setStravaSyncing(false);
    }
  };

  /**
   * Disconnect Strava account
   */
  const handleDisconnectStrava = async () => {
    if (!auth.currentUser) return;

    if (!window.confirm('Are you sure you want to disconnect Strava? You can reconnect anytime.')) {
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        stravaConnected: false,
        stravaAccessToken: null,
        stravaRefreshToken: null,
        stravaTokenExpiresAt: null,
        stravaAthleteId: null,
        stravaAthleteName: null,
      });

      logger.log('✅ Strava disconnected');
      toast.success('Strava disconnected successfully');
      
      // Reload to refresh UI
      window.location.reload();
    } catch (error) {
      console.error('❌ Error disconnecting Strava:', error);
      toast.error(`Failed to disconnect: ${error.message}`);
    }
  };

  return {
    stravaSyncing,
    handleManualStravaSync,
    handleDisconnectStrava
  };
};

export default useStravaSync;

