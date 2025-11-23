/**
 * Strava API Configuration
 * https://developers.strava.com/
 * 
 * SECURITY NOTE: Client secret should NEVER be in frontend code.
 * Token exchange should be moved to Firebase Functions.
 */

const STRAVA_CONFIG = {
  clientId: process.env.REACT_APP_STRAVA_CLIENT_ID || '185232',
  // WARNING: Client secret should be moved to backend (Firebase Functions)
  // For now, this is a fallback but token exchange should happen server-side
  clientSecret: process.env.REACT_APP_STRAVA_CLIENT_SECRET || '',
  redirectUri: `${window.location.origin}/auth/strava/callback`,

  // OAuth authorization URL
  authorizationUrl: 'https://www.strava.com/oauth/authorize',

  // API endpoints
  apiBaseUrl: 'https://www.strava.com/api/v3',

  // Scopes we're requesting
  // activity:read - read user activities
  // activity:read_all - read all activities including private
  scope: 'activity:read_all',
};

// Validate required configuration
if (!STRAVA_CONFIG.clientId) {
  console.error('⚠️ REACT_APP_STRAVA_CLIENT_ID is not set. Strava integration will not work.');
}

export default STRAVA_CONFIG;
