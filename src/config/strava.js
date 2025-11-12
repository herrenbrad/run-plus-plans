/**
 * Strava API Configuration
 * https://developers.strava.com/
 */

const STRAVA_CONFIG = {
  clientId: '185232',
  clientSecret: '12593efdb60e3ffa5f7cf67949e5dcdf060ae25e',
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

export default STRAVA_CONFIG;
