/**
 * Strava API Integration Service
 * Handles OAuth authentication and activity syncing
 */

import STRAVA_CONFIG from '../config/strava';
import { auth } from '../firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';
import logger from '../utils/logger';

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
   * Uses Firebase Function to keep client secret secure
   * @param {string} code - Authorization code from Strava callback
   * @returns {Promise<object>} Token response with access_token, refresh_token, athlete data
   */
  async exchangeToken(code) {
    try {
      const functions = getFunctions();
      const exchangeStravaToken = httpsCallable(functions, 'exchangeStravaToken');
      
      const result = await exchangeStravaToken({
        code: code,
        clientId: STRAVA_CONFIG.clientId,
      });

      if (!result.data.success) {
        logger.error('❌ Strava token exchange error:', result.data.error);
        throw new Error(`Strava token exchange failed: ${result.data.error}`);
      }

      return result.data.data;
    } catch (error) {
      logger.error('❌ Strava token exchange error:', error);
      throw new Error(`Strava token exchange failed: ${error.message}`);
    }
  }

  /**
   * Refresh an expired access token
   * Uses Firebase Function to keep client secret secure
   * @param {string} refreshToken - Refresh token from previous authorization
   * @returns {Promise<object>} New token response
   */
  async refreshAccessToken(refreshToken) {
    try {
      const functions = getFunctions();
      const refreshStravaToken = httpsCallable(functions, 'refreshStravaToken');
      
      const result = await refreshStravaToken({
        refreshToken: refreshToken,
        clientId: STRAVA_CONFIG.clientId,
      });

      if (!result.data.success) {
        logger.error('❌ Strava token refresh error:', result.data.error);
        throw new Error(`Failed to refresh Strava access token: ${result.data.error}`);
      }

      return result.data.data;
    } catch (error) {
      logger.error('❌ Strava token refresh error:', error);
      throw new Error(`Failed to refresh Strava access token: ${error.message}`);
    }
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
      logger.log(`📅 Filtering activities after: ${after.toLocaleDateString()} (${afterTimestamp})`);
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
   * Get activity streams (time-series data)
   * @param {string} accessToken - Valid Strava access token
   * @param {number} activityId - Strava activity ID
   * @param {string[]} keys - Stream types to fetch (e.g., ['time', 'altitude', 'heartrate'])
   * @returns {Promise<object>} Stream data
   */
  async getActivityStreams(accessToken, activityId, keys = ['time', 'distance', 'altitude', 'heartrate', 'cadence', 'watts', 'temp', 'moving', 'grade_smooth']) {
    const keysParam = keys.join(',');
    const response = await fetch(
      `${STRAVA_CONFIG.apiBaseUrl}/activities/${activityId}/streams?keys=${keysParam}&key_by_type=true`,
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
      // Streams might not be available for all activities (e.g., manual entries)
      if (response.status === 404) {
        logger.log('⚠️ No stream data available for this activity');
        return null;
      }
      throw new Error(`Failed to fetch activity streams: ${response.statusText}`);
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
   * @param {object} stravaActivity - Strava activity object (from getActivity for detailed data)
   * @param {object} streams - Optional activity streams data
   * @returns {object} RunEQ-compatible workout completion data
   */
  convertToRunEQCompletion(stravaActivity, streams = null) {
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

    // Process laps/splits if available
    // Prefer splits_standard (miles) for US runners, fallback to splits_metric (km)
    let laps = null;
    if (stravaActivity.splits_standard && stravaActivity.splits_standard.length > 0) {
      // Use mile-based splits (standard for US)
      laps = stravaActivity.splits_standard.map((split, index) => ({
        lap: index + 1,
        distance: (split.distance / 1609.34).toFixed(2) + ' mi', // Strava gives splits in meters
        distanceMiles: (split.distance / 1609.34).toFixed(2),
        time: this.formatTime(split.moving_time),
        pace: split.average_speed ? this.calculatePaceFromSpeed(split.average_speed) : null,
        elevationGain: split.elevation_difference ? Math.round(split.elevation_difference * 3.28084) : null, // meters to feet
        avgHeartRate: split.average_heartrate || null
      }));
    } else if (stravaActivity.splits_metric && stravaActivity.splits_metric.length > 0) {
      // Fallback to KM-based splits
      laps = stravaActivity.splits_metric.map((split, index) => ({
        lap: index + 1,
        distance: (split.distance / 1000).toFixed(2) + ' km', // Strava gives splits in km
        distanceMiles: (split.distance / 1609.34).toFixed(2),
        time: this.formatTime(split.moving_time),
        pace: split.average_speed ? this.calculatePaceFromSpeed(split.average_speed) : null,
        elevationGain: split.elevation_difference ? Math.round(split.elevation_difference * 3.28084) : null, // meters to feet
        avgHeartRate: split.average_heartrate || null
      }));
    }

    // Build completion data
    const completionData = {
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

    // Add detailed data if available
    if (laps) {
      completionData.laps = laps;
    }

    // Add suffer score (Strava's training effect equivalent)
    if (stravaActivity.suffer_score) {
      completionData.sufferScore = stravaActivity.suffer_score;
    }

    // Add device/sensor data if available
    if (stravaActivity.device_name) {
      completionData.device = stravaActivity.device_name;
    }

    // Add calories if available
    if (stravaActivity.calories) {
      completionData.calories = stravaActivity.calories;
    }

    // Add stream data if provided (for elevation profile, HR zones, etc.)
    if (streams) {
      completionData.streams = this.processStreams(streams);
    }

    return completionData;
  }

  /**
   * Process activity streams into useful format
   * @param {object} streams - Raw stream data from Strava
   * @returns {object} Processed stream data
   */
  processStreams(streams) {
    const processed = {};

    // Store altitude profile (for elevation chart)
    if (streams.altitude) {
      processed.elevation = streams.altitude.data;
    }

    // Store heart rate data (for HR zone analysis)
    if (streams.heartrate) {
      processed.heartRate = streams.heartrate.data;
    }

    // Store distance markers (for syncing with time)
    if (streams.distance) {
      processed.distance = streams.distance.data;
    }

    // Store time array
    if (streams.time) {
      processed.time = streams.time.data;
    }

    return processed;
  }

  /**
   * Format seconds into MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate pace from speed (m/s)
   * @param {number} speed - Speed in meters per second
   * @returns {string} Pace in min/mile
   */
  calculatePaceFromSpeed(speed) {
    if (!speed || speed === 0) return null;
    const paceSeconds = 1609.34 / speed; // seconds per mile
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceSecondsPart = Math.round(paceSeconds % 60);
    return `${paceMinutes}:${paceSecondsPart.toString().padStart(2, '0')}/mi`;
  }
}

export default new StravaService();
