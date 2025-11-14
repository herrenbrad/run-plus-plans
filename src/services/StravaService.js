/**
 * Strava API Integration Service
 * Handles OAuth authentication and activity syncing
 */

import STRAVA_CONFIG from '../config/strava';
import { auth } from '../firebase/config';

class StravaService {
  /**
   * Generate Strava OAuth authorization URL
   * @returns {string} Authorization URL to redirect user to
   */
  getAuthorizationUrl() {
    const params = new URLSearchParams({
      client_id: STRAVA_CONFIG.clientId,
      redirect_uri: STRAVA_CONFIG.redirectUri,
      response_type: 'code',
      approval_prompt: 'auto', // Only prompt if not already authorized
      scope: STRAVA_CONFIG.scope,
    });

    return `${STRAVA_CONFIG.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from Strava callback
   * @returns {Promise<object>} Token response with access_token, refresh_token, athlete data
   */
  async exchangeToken(code) {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CONFIG.clientId,
        client_secret: STRAVA_CONFIG.clientSecret,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Strava token exchange failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Refresh an expired access token
   * @param {string} refreshToken - Refresh token from previous authorization
   * @returns {Promise<object>} New token response
   */
  async refreshAccessToken(refreshToken) {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CONFIG.clientId,
        client_secret: STRAVA_CONFIG.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Strava access token');
    }

    return response.json();
  }

  /**
   * Get athlete's recent activities from Strava
   * @param {string} accessToken - Valid Strava access token
   * @param {number} page - Page number (default 1)
   * @param {number} perPage - Activities per page (default 30, max 200)
   * @param {Date} after - Only fetch activities after this date (optional)
   * @returns {Promise<Array>} Array of activity objects
   */
  async getActivities(accessToken, page = 1, perPage = 30, after = null) {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    // Add 'after' parameter if provided (Unix timestamp in seconds)
    if (after) {
      const afterTimestamp = Math.floor(after.getTime() / 1000);
      params.append('after', afterTimestamp.toString());
      console.log(`📅 Filtering activities after: ${after.toLocaleDateString()} (${afterTimestamp})`);
    }

    const response = await fetch(
      `${STRAVA_CONFIG.apiBaseUrl}/athlete/activities?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('STRAVA_TOKEN_EXPIRED');
      }
      throw new Error(`Failed to fetch Strava activities: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get detailed activity by ID
   * @param {string} accessToken - Valid Strava access token
   * @param {number} activityId - Strava activity ID
   * @returns {Promise<object>} Detailed activity object
   */
  async getActivity(accessToken, activityId) {
    const response = await fetch(
      `${STRAVA_CONFIG.apiBaseUrl}/activities/${activityId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('STRAVA_TOKEN_EXPIRED');
      }
      throw new Error(`Failed to fetch Strava activity: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get authenticated athlete profile
   * @param {string} accessToken - Valid Strava access token
   * @returns {Promise<object>} Athlete profile data
   */
  async getAthlete(accessToken) {
    const response = await fetch(`${STRAVA_CONFIG.apiBaseUrl}/athlete`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('STRAVA_TOKEN_EXPIRED');
      }
      throw new Error(`Failed to fetch Strava athlete: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check if access token is expired
   * @param {number} expiresAt - Unix timestamp when token expires
   * @returns {boolean} True if token is expired
   */
  isTokenExpired(expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    // Consider expired if less than 1 hour remaining
    return expiresAt - now < 3600;
  }

  /**
   * Match Strava activity to RunEQ workout
   * @param {object} stravaActivity - Strava activity object
   * @param {object} runeqWorkout - RunEQ workout object
   * @returns {boolean} True if activity matches workout
   */
  matchActivity(stravaActivity, runeqWorkout) {
    // Match based on:
    // 1. Activity date matches workout date
    // 2. Activity type is Ride/VirtualRide/EBikeRide
    // 3. Distance is close to prescribed distance (±20%)

    const activityDate = new Date(stravaActivity.start_date_local);
    const workoutDate = new Date(runeqWorkout.date);

    // Check if same day
    if (
      activityDate.getFullYear() !== workoutDate.getFullYear() ||
      activityDate.getMonth() !== workoutDate.getMonth() ||
      activityDate.getDate() !== workoutDate.getDate()
    ) {
      return false;
    }

    // Check if it's a ride activity
    const rideTypes = ['Ride', 'VirtualRide', 'EBikeRide'];
    if (!rideTypes.includes(stravaActivity.type)) {
      return false;
    }

    // Check distance match (convert Strava meters to miles)
    if (runeqWorkout.distance) {
      const stravaDistanceMiles = stravaActivity.distance / 1609.34;
      const prescribedDistance = runeqWorkout.distance;
      const distanceDiff = Math.abs(stravaDistanceMiles - prescribedDistance);
      const tolerance = prescribedDistance * 0.2; // 20% tolerance

      if (distanceDiff > tolerance) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert Strava activity to RunEQ workout completion data
   * @param {object} stravaActivity - Strava activity object
   * @returns {object} RunEQ-compatible workout completion data
   */
  convertToRunEQCompletion(stravaActivity) {
    // Convert Strava meters to miles
    const distanceMiles = stravaActivity.distance / 1609.34;

    // Convert seconds to minutes
    const durationMinutes = Math.round(stravaActivity.moving_time / 60);

    // Calculate pace (min/mile) for runs
    let pace = null;
    const runTypes = ['Run', 'VirtualRun'];
    if (runTypes.includes(stravaActivity.type) && distanceMiles > 0) {
      const paceSeconds = stravaActivity.moving_time / distanceMiles;
      const paceMinutes = Math.floor(paceSeconds / 60);
      const paceSecondsPart = Math.round(paceSeconds % 60);
      pace = `${paceMinutes}:${paceSecondsPart.toString().padStart(2, '0')}/mi`;
    }

    return {
      distance: distanceMiles.toFixed(2),
      duration: durationMinutes,
      pace: pace,
      notes: `Synced from Strava: ${stravaActivity.name}`,
      avgHeartRate: stravaActivity.average_heartrate || null,
      maxHeartRate: stravaActivity.max_heartrate || null,
      cadence: stravaActivity.average_cadence || null,
      elevationGain: stravaActivity.total_elevation_gain ? Math.round(stravaActivity.total_elevation_gain * 3.28084) : null, // Convert meters to feet
      stravaActivityId: stravaActivity.id,
      stravaActivityUrl: `https://www.strava.com/activities/${stravaActivity.id}`,
    };
  }
}

export default new StravaService();
