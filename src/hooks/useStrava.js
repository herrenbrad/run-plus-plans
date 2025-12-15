/**
 * useStrava.js
 *
 * This new, modern React hook replaces the old `useStravaSync.js`.
 * It provides a clean, simple API for UI components to interact with the Strava service.
 * It handles all asynchronicity, state management (loading, errors), and provides
 * a seamless user experience with no page reloads.
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import stravaService from '../services/stravaService';
import logger from '../utils/logger';
import { useToast } from '../components/Toast';

export const useStrava = (userProfile) => {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  /**
   * Effect to handle the OAuth redirect from Strava.
   * When the user is redirected back, this checks for the auth code in the URL,
   * exchanges it for a token, and updates the user's profile in Firestore.
   */
  useEffect(() => {
    const handleStravaRedirect = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const scope = params.get('scope');

      if (code && scope?.includes('activity:read_all')) {
        setIsConnecting(true);
        try {
          // Exchange the code for tokens and get athlete data
          const { access_token, refresh_token, expires_at, athlete } = await stravaService.exchangeToken(code);

          // Update the user's document in Firestore
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            stravaConnected: true,
            stravaAccessToken: access_token,
            stravaRefreshToken: refresh_token,
            stravaTokenExpiresAt: expires_at,
            stravaAthleteId: athlete.id,
          });

          logger.log('✅ Strava connected and user profile updated.');
          toast.success('Strava connected successfully!');
        } catch (error) {
          logger.error('❌ Failed to connect Strava:', error);
          toast.error(`Connection failed: ${error.message}`);
        } finally {
          setIsConnecting(false);
          // Clean the URL by removing the query parameters
          navigate(location.pathname, { replace: true });
        }
      }
    };

    handleStravaRedirect();
    // We only want this to run once when the component mounts and location changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, navigate, toast]);

  /**
   * Initiates the Strava connection process by redirecting the user to the auth URL.
   */
  const connectStrava = useCallback(() => {
    setIsConnecting(true);
    try {
      const authUrl = stravaService.getAuthorizationUrl();
      logger.log('Redirecting to Strava for authorization...');
      window.location.href = authUrl;
    } catch (error) {
      logger.error('❌ Could not generate Strava auth URL:', error);
      toast.error('Could not start connection process.');
      setIsConnecting(false);
    }
  }, [toast]);

  /**
   * Disconnects the user's Strava account from their profile.
   */
  const disconnectStrava = useCallback(async () => {
    if (!window.confirm('Are you sure you want to disconnect Strava? This will not delete any data.')) {
      return;
    }
    setIsDisconnecting(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        stravaConnected: false,
        stravaAccessToken: null,
        stravaRefreshToken: null,
        stravaTokenExpiresAt: null,
        stravaAthleteId: null,
      });
      logger.log('✅ Strava disconnected.');
      toast.success('Strava disconnected.');
    } catch (error) {
      logger.error('❌ Failed to disconnect Strava:', error);
      toast.error(`Disconnect failed: ${error.message}`);
    } finally {
      setIsDisconnecting(false);
    }
  }, [toast]);

  /**
   * Triggers a manual sync of Strava activities.
   * @param {object} trainingPlan The user's full training plan.
   * @returns {Promise<object|null>} The updated completedWorkouts object or null if no change.
   */
  const syncActivities = useCallback(async (trainingPlan) => {
    if (!userProfile) {
        toast.error("User profile not loaded yet.");
        return null;
    }
    setIsSyncing(true);
    try {
      const result = await stravaService.syncActivities(auth.currentUser.uid, userProfile, trainingPlan);
      toast.success(`Sync complete! ${result.workoutsCompleted} workouts were automatically updated.`);
      
      // Instead of reloading, we fetch the updated user doc and return the new completions.
      // The UI component can then use this to update its state.
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updatedUserDoc = await getDoc(userRef);
      return updatedUserDoc.data()?.completedWorkouts || null;

    } catch (error) {
      logger.error('❌ Sync failed:', error);
      toast.error(`Sync failed: ${error.message}`);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [userProfile, toast]);

  return {
    isConnecting,
    isSyncing,
    isDisconnecting,
    connectStrava,
    disconnectStrava,
    syncActivities,
  };
};

export default useStrava;
