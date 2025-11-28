/**
 * Strava API Configuration
 * https://developers.strava.com/
 * 
 * SECURITY NOTE: Client secret should NEVER be in frontend code.
 * Token exchange should be moved to Firebase Functions.
 * 
 * PRODUCTION SETUP:
 * 1. Create production app at https://www.strava.com/settings/api
 * 2. Set callback domain to: app.runplusplans.com
 * 3. Replace PRODUCTION_CLIENT_ID and PRODUCTION_CLIENT_SECRET below
 */

const STRAVA_CONFIG = {
  // Production Strava app credentials
  clientId: process.env.REACT_APP_STRAVA_CLIENT_ID || '185232',
  // WARNING: Client secret should be moved to backend (Firebase Functions)
  // For now, this is a fallback but token exchange should happen server-side
  clientSecret: process.env.REACT_APP_STRAVA_CLIENT_SECRET || 'aed72676e2668376279fc7f39f97b4545a5cff94',
  // Automatically uses correct domain: app.runplusplans.com in production
  // CRITICAL: Strava app callback domain must match this (app.runplusplans.com)
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
