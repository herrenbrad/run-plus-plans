# Strava Integration Documentation

## Overview

Run+ Plans integrates with Strava to automatically sync your completed workouts. When you complete a run or bike ride and log it in Strava, the app will automatically match it to your scheduled workouts and mark them as complete with detailed statistics.

## Features

- **Automatic Sync**: Activities from Strava are automatically synced when you open the dashboard
- **Manual Sync**: Force a sync at any time with the "Sync Now" button
- **Activity Matching**: Matches Strava activities to scheduled workouts based on:
  - Date (must be the same calendar day)
  - Activity type (Run matches run workouts, Ride matches bike workouts)
- **Rich Data**: Synced workouts include:
  - Distance (miles)
  - Duration (minutes)
  - Pace (for runs, min/mile)
  - Average heart rate
  - Max heart rate
  - Cadence
  - Elevation gain (feet)
  - Link to Strava activity

## Setup

### 1. Strava API Credentials

Create a Strava API application at https://www.strava.com/settings/api

Required settings:
- **Application Name**: Run+ Plans
- **Website**: https://runplusplans.com
- **Authorization Callback Domain**: runplusplans.com

### 2. Configuration

Update `src/config/strava.js` with your credentials:

```javascript
const STRAVA_CONFIG = {
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'https://runplusplans.com/auth/strava/callback',
  authorizationUrl: 'https://www.strava.com/oauth/authorize',
  tokenUrl: 'https://www.strava.com/oauth/token',
  apiBaseUrl: 'https://www.strava.com/api/v3',
  scope: 'activity:read_all',
};
```

### 3. Environment Variables

For security, store credentials in environment variables:

```bash
REACT_APP_STRAVA_CLIENT_ID=your_client_id
REACT_APP_STRAVA_CLIENT_SECRET=your_client_secret
```

Then update `strava.js` to use them:

```javascript
clientId: process.env.REACT_APP_STRAVA_CLIENT_ID,
clientSecret: process.env.REACT_APP_STRAVA_CLIENT_SECRET,
```

## User Flow

### Connecting Strava

1. User clicks "Connect Strava" button on Dashboard
2. Redirects to Strava OAuth authorization page
3. User grants permissions
4. Strava redirects back to `/auth/strava/callback`
5. Callback page exchanges authorization code for access token
6. Tokens saved to Firebase user document
7. User redirected back to Dashboard

### Automatic Sync

When the Dashboard loads:
1. Checks if Strava is connected
2. Checks if last sync was more than 1 hour ago
3. If yes, automatically syncs recent activities (last 30 days)
4. Matches activities to workouts
5. Auto-completes matched workouts

### Manual Sync

User can force a sync at any time:
1. Click "Sync Now" button
2. Fetches last 50 activities from Strava
3. Matches to workouts from current week and previous 2 weeks
4. Auto-completes any matches

## Architecture

### Key Files

#### Services

- **`src/services/StravaService.js`**: Core Strava API integration
  - OAuth token exchange and refresh
  - Fetch activities from Strava API
  - Convert Strava data to RunEQ format

- **`src/services/StravaSyncService.js`**: Workout matching and syncing logic
  - Match Strava activities to scheduled workouts
  - Auto-complete matched workouts
  - Handle completion tracking

- **`src/services/FirestoreService.js`**: Firebase data persistence
  - Save/load user profiles
  - Save/load training plans
  - Store completion data

#### Components

- **`src/components/StravaCallback.js`**: OAuth callback handler
  - Receives authorization code from Strava
  - Exchanges code for tokens
  - Saves tokens to Firebase

- **`src/components/Dashboard.js`**: Main UI with sync controls
  - "Connect Strava" button
  - "Sync Now" button
  - Auto-sync on page load
  - Display completion status

#### Configuration

- **`src/config/strava.js`**: Strava API credentials and endpoints

### Data Flow

```
┌─────────────┐
│   Strava    │
│     API     │
└──────┬──────┘
       │
       │ 1. Fetch Activities
       ▼
┌─────────────────┐
│ StravaService   │
│                 │
│ - OAuth         │
│ - API calls     │
│ - Data convert  │
└────────┬────────┘
         │
         │ 2. Pass Activities
         ▼
┌──────────────────────┐
│ StravaSyncService    │
│                      │
│ - Match workouts     │
│ - Check completions  │
│ - Auto-complete      │
└──────────┬───────────┘
           │
           │ 3. Save Completions
           ▼
┌──────────────────┐
│   Firestore      │
│                  │
│ users/           │
│   {uid}/         │
│     completedWorkouts: {
│       "1-Wednesday": {...}
│     }             │
└──────────────────┘
```

### Data Structures

#### Firebase User Document

```javascript
{
  // Strava connection
  stravaConnected: true,
  stravaAccessToken: "...",
  stravaRefreshToken: "...",
  stravaTokenExpiresAt: 1731456789,
  stravaAthleteId: "12345",
  stravaAthleteName: "John Doe",
  stravaConnectedAt: "2025-11-12T00:00:00Z",
  stravaLastSync: "2025-11-12T16:30:00Z",

  // Completed workouts
  completedWorkouts: {
    "1-Wednesday": {
      completedAt: "2025-11-12T16:26:32Z",
      distance: "4.00",
      duration: 28,
      pace: "7:02/mi",
      avgHeartRate: 165,
      maxHeartRate: 182,
      cadence: 168,
      elevationGain: 45,
      notes: "Synced from Strava: Afternoon Run",
      stravaActivityId: 12856271234,
      stravaActivityUrl: "https://www.strava.com/activities/12856271234",
      autoCompletedFromStrava: true
    }
  }
}
```

#### Workout Key Format

Workouts are keyed by: `{weekNumber}-{dayName}`

Examples:
- `"1-Wednesday"` - Week 1, Wednesday
- `"2-Friday"` - Week 2, Friday
- `"15-Sunday"` - Week 15, Sunday

### Activity Matching Algorithm

Located in: `StravaSyncService.findMatchingWorkout()`

#### Matching Rules

1. **Activity Type Match**
   - Strava "Run" or "VirtualRun" → Run workout types: `tempo`, `intervals`, `hills`, `longRun`, `easy`
   - Strava "Ride", "VirtualRide", "EBikeRide" → Bike workout type: `bike` or `equipmentSpecific: true`

2. **Date Match**
   - Activity date and workout date must be the same calendar day
   - Compares year, month, and date
   - Time of day doesn't matter

3. **Not Already Completed**
   - Skips workouts already in `completedWorkouts` object

#### Matching Process

```javascript
for each Strava activity:
  1. Check if activity type is supported (Run or Ride)
  2. For each scheduled workout:
     a. Check if workout already completed → skip
     b. Check if activity type matches workout type → skip if no match
     c. Check if dates match (same calendar day) → skip if no match
     d. MATCH FOUND → return workout
```

## Debugging

### Debug Logging

The codebase includes extensive debug logging for troubleshooting sync issues:

#### StravaSyncService Logs

```javascript
// Sync start
console.log('🔄 Starting Strava sync...', { userId, currentWeek });

// Activities fetched
console.log(`📥 Fetched ${activities.length} Strava activities`);

// Each activity
console.log(`📋 Activity: "${activity.name}" - Type: "${activity.type}" - Date: ${activity.start_date_local}`);

// Matching process
console.log('🔍 Matching activity:', {
  name: activity.name,
  type: activity.type,
  activityDate: activityDate.toLocaleDateString(),
  distance: activityDistanceMiles.toFixed(2) + ' mi'
});

// Each workout checked
console.log(`  📅 Checking ${workout.day}:`, {
  workoutDate: workoutDate.toLocaleDateString(),
  workoutType: workout.type,
  isBikeWorkout,
  isRunWorkout
});

// Skip reasons
console.log(`  ⏭️ Skipping ${workout.day} - already completed`);
console.log(`    ❌ Type mismatch: run activity but not run workout`);
console.log(`    ❌ Date mismatch`);

// Match found
console.log(`    ✅ MATCH FOUND!`);

// Completed workouts
console.log('📦 getCompletedWorkouts: Raw data from Firebase:', completedWorkouts);
console.log('📦 getCompletedWorkouts: Number of completed workouts:', Object.keys(completedWorkouts).length);

// Auto-completion
console.log(`✅ Auto-completed workout: ${workoutKey}`);
```

### Debug Buttons

The Dashboard includes debug buttons (visible when Strava is connected):

1. **🧹 Reset v59** - Clears last sync timestamp from localStorage
2. **🔄 Sync Now v55** - Forces manual sync
3. **🗑️ Clear v58** - Clears all completed workouts from Firebase

These buttons include version numbers to verify which code version is loaded.

### Common Issues

#### Issue: "Skipping Strava sync - synced recently"

**Cause**: Auto-sync prevents syncing more than once per hour

**Solution**:
1. Click "🧹 Reset v59" to clear timestamp
2. Click "🔄 Sync Now v55" to force sync

#### Issue: "0 matched workouts" even though activities exist

**Possible causes**:
1. **Date mismatch**: Workout dates showing wrong year (e.g., 2001 instead of 2025)
   - Fixed in commit: Added `year: 'numeric'` to date formatting
2. **Type mismatch**: Activity type doesn't match workout type
   - Run activity won't match bike workout
   - Bike activity won't match run workout
3. **Already completed**: Workout marked as completed in Firebase
   - Use "🗑️ Clear v58" button to reset completions

#### Issue: "Skipping Wednesday - already completed" but UI shows not completed

**Cause**: Stale data in `getCompletedWorkouts()` cache

**Solution**:
1. Check Firebase console for actual data
2. Use Debug button to inspect `completedWorkouts` object
3. Clear browser cache and reload
4. Use "🗑️ Clear v58" button to reset

#### Issue: Buttons not clickable or clicks not registering

**Possible causes**:
1. Multiple dev servers running simultaneously
   - Solution: Kill all node processes: `taskkill /F /IM node.exe`
   - Start fresh: `npm start`
2. Old code cached in browser
   - Solution: Hard refresh (Ctrl+Shift+R)
3. Button disabled due to `stravaSyncing` state
   - Check console for `stravaSyncing: true`

### Testing Workflow

1. **Connect Strava**
   - Click "Connect Strava"
   - Grant permissions
   - Verify redirect back to dashboard
   - Verify "✓ Strava Connected" appears

2. **Verify Auto-Sync**
   - Reload dashboard
   - Check console for "🔄 Auto-syncing Strava activities..."
   - Verify "📥 Fetched X Strava activities"

3. **Test Manual Sync**
   - Click "🧹 Reset v59"
   - Click "🔄 Sync Now v55"
   - Check console logs for matching process
   - Verify matched workouts show as completed

4. **Verify Completion Data**
   - Click completed workout card
   - Verify Strava data displayed:
     - Distance, duration, pace
     - Heart rate, cadence
     - Elevation gain
     - Link to Strava activity

## Known Issues & Limitations

### Current Issues (as of 2025-11-12)

1. **Phantom Completion Bug**
   - Symptom: Logs show "Skipping Wednesday - already completed" but Firebase shows `completedWorkouts: {}`
   - Status: Under investigation
   - Workaround: Use "🗑️ Clear v58" button

2. **Date Parsing Bug (FIXED)**
   - Symptom: Workout dates defaulting to year 2001
   - Cause: `toLocaleDateString()` not including year
   - Fix: Added `year: 'numeric'` to date format options
   - Commit: Fixed in TrainingPlanService.js:284

### Limitations

1. **Matching Scope**
   - Only matches activities from current week and previous 2 weeks
   - Older activities are ignored

2. **Activity Types**
   - Only supports: Run, VirtualRun, Ride, VirtualRide, EBikeRide
   - Other activities (swim, hike, etc.) are skipped

3. **Single Match Per Activity**
   - Each activity can only match one workout
   - Multiple workouts on same day not supported

4. **No Distance Tolerance**
   - Originally had ±20% distance tolerance
   - Removed to match any activity on scheduled day
   - May cause incorrect matches if multiple activities on same day

5. **Token Refresh**
   - Tokens expire after 6 hours
   - Automatically refreshed on next sync
   - Long gaps between syncs may cause auth errors

## Future Improvements

### Short Term

1. **Fix Phantom Completion Bug**
   - Add debug logging to `getCompletedWorkouts()`
   - Investigate Firebase caching
   - Ensure fresh data on each sync

2. **Better Error Messages**
   - User-friendly error alerts
   - Specific guidance for common issues
   - Link to troubleshooting docs

3. **Sync Status Indicator**
   - Show last sync time
   - Show sync in progress
   - Show sync errors

### Medium Term

1. **Manual Activity Selection**
   - UI to manually match activities to workouts
   - Override auto-matching
   - Match historical activities

2. **Multiple Workouts Per Day**
   - Support brick workouts (bike + run)
   - Support double-day training
   - Smart matching based on order

3. **Distance Tolerance Option**
   - User setting for match strictness
   - Options: Exact date only, Date + distance tolerance
   - Configurable tolerance percentage

### Long Term

1. **Webhook Integration**
   - Real-time sync when activity uploaded to Strava
   - No need for manual sync or hourly auto-sync
   - Instant workout completion

2. **Two-Way Sync**
   - Push workout prescriptions to Strava
   - Sync workout descriptions
   - Sync training plan to Strava calendar

3. **More Activity Types**
   - Swimming, hiking, strength training
   - Cross-training activities
   - Custom activity type mapping

4. **Advanced Analytics**
   - Compare prescribed vs actual workout data
   - Track adherence over time
   - Training load metrics

## API Reference

### StravaService

#### `getAuthorizationUrl()`
Returns the Strava OAuth authorization URL to redirect user to.

**Returns**: `string` - Authorization URL

**Example**:
```javascript
const authUrl = StravaService.getAuthorizationUrl();
window.location.href = authUrl;
```

#### `exchangeToken(code)`
Exchanges authorization code for access token.

**Parameters**:
- `code` (string) - Authorization code from Strava callback

**Returns**: `Promise<object>` - Token response with `access_token`, `refresh_token`, `expires_at`, `athlete`

**Example**:
```javascript
const tokens = await StravaService.exchangeToken(code);
// tokens = {
//   access_token: "...",
//   refresh_token: "...",
//   expires_at: 1731456789,
//   athlete: { id: 12345, ... }
// }
```

#### `refreshAccessToken(refreshToken)`
Refreshes an expired access token.

**Parameters**:
- `refreshToken` (string) - Refresh token from previous authorization

**Returns**: `Promise<object>` - New token response

**Example**:
```javascript
const newTokens = await StravaService.refreshAccessToken(refreshToken);
```

#### `getActivities(accessToken, page, perPage)`
Fetches athlete's recent activities.

**Parameters**:
- `accessToken` (string) - Valid Strava access token
- `page` (number) - Page number (default: 1)
- `perPage` (number) - Activities per page (default: 30, max: 200)

**Returns**: `Promise<Array>` - Array of activity objects

**Example**:
```javascript
const activities = await StravaService.getActivities(accessToken, 1, 50);
```

#### `isTokenExpired(expiresAt)`
Checks if access token is expired.

**Parameters**:
- `expiresAt` (number) - Unix timestamp when token expires

**Returns**: `boolean` - True if token expires in less than 1 hour

**Example**:
```javascript
if (StravaService.isTokenExpired(expiresAt)) {
  // Refresh token
}
```

#### `convertToRunEQCompletion(stravaActivity)`
Converts Strava activity data to RunEQ workout completion format.

**Parameters**:
- `stravaActivity` (object) - Strava activity object

**Returns**: `object` - RunEQ completion data

**Example**:
```javascript
const completion = StravaService.convertToRunEQCompletion(activity);
// completion = {
//   distance: "4.00",
//   duration: 28,
//   pace: "7:02/mi",
//   avgHeartRate: 165,
//   ...
// }
```

### StravaSyncService

#### `syncActivities(userId, userProfile, trainingPlan, currentWeek)`
Main sync function - fetches activities and matches to workouts.

**Parameters**:
- `userId` (string) - Firebase user ID
- `userProfile` (object) - User profile with Strava tokens
- `trainingPlan` (object) - User's training plan
- `currentWeek` (number) - Current week number

**Returns**: `Promise<object>` - Sync results

**Example**:
```javascript
const result = await StravaSyncService.syncActivities(
  userId,
  userProfile,
  trainingPlan,
  currentWeek
);
// result = {
//   success: true,
//   activitiesFetched: 50,
//   matchesFound: 3,
//   workoutsCompleted: 3
// }
```

#### `findMatchingWorkout(activity, workouts, completedWorkouts)`
Finds matching workout for a Strava activity.

**Parameters**:
- `activity` (object) - Strava activity
- `workouts` (Array) - Array of RunEQ workouts
- `completedWorkouts` (Array) - Already completed workouts

**Returns**: `object|null` - Matched workout or null

**Example**:
```javascript
const match = StravaSyncService.findMatchingWorkout(
  activity,
  allWorkouts,
  completedWorkouts
);
```

#### `getCompletedWorkouts(userId)`
Retrieves list of completed workouts from Firebase.

**Parameters**:
- `userId` (string) - Firebase user ID

**Returns**: `Promise<Array>` - Array of completed workout objects

**Example**:
```javascript
const completed = await StravaSyncService.getCompletedWorkouts(userId);
// completed = [
//   { key: "1-Wednesday", data: {...} },
//   { key: "2-Friday", data: {...} }
// ]
```

#### `completeWorkout(userId, workout, stravaActivity)`
Marks workout as complete with Strava data.

**Parameters**:
- `userId` (string) - Firebase user ID
- `workout` (object) - RunEQ workout
- `stravaActivity` (object) - Strava activity data

**Returns**: `Promise<boolean>` - Success status

**Example**:
```javascript
const success = await StravaSyncService.completeWorkout(
  userId,
  workout,
  stravaActivity
);
```

## Security Considerations

### Token Storage

Strava access tokens are stored in Firebase Firestore in the user document:

```javascript
{
  stravaAccessToken: "...",        // Sensitive
  stravaRefreshToken: "...",       // Sensitive
  stravaTokenExpiresAt: 1731456789,
  stravaAthleteId: "12345",
}
```

**Security measures**:
1. Firebase Security Rules restrict access to authenticated users
2. Users can only read/write their own document
3. Tokens never exposed to client-side code
4. HTTPS enforced for all API calls

### Recommended Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### API Rate Limits

Strava API has rate limits:
- 200 requests per 15 minutes
- 2,000 requests per day

**Mitigation**:
- Auto-sync limited to once per hour
- Fetch only 50 activities per sync
- Token refresh only when expired

## Deployment

### Production Checklist

1. ✅ Update `strava.js` with production credentials
2. ✅ Set `redirectUri` to production domain
3. ✅ Update Strava app settings with production callback URL
4. ✅ Set environment variables for sensitive data
5. ✅ Test OAuth flow on production domain
6. ✅ Verify Firebase security rules
7. ✅ Test sync with real Strava activities
8. ✅ Monitor error logs

### Environment-Specific Configuration

Use different configs for dev and prod:

```javascript
const STRAVA_CONFIG = {
  clientId: process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_STRAVA_CLIENT_ID_PROD
    : process.env.REACT_APP_STRAVA_CLIENT_ID_DEV,
  redirectUri: process.env.NODE_ENV === 'production'
    ? 'https://runplusplans.com/auth/strava/callback'
    : 'http://localhost:3000/auth/strava/callback',
};
```

## Support

### Troubleshooting Steps

1. Check console logs for error messages
2. Verify Strava connection status
3. Try manual sync with "Sync Now" button
4. Clear sync timestamp with "Reset" button
5. Clear completions with "Clear" button
6. Hard refresh browser (Ctrl+Shift+R)
7. Check Firebase console for data

### Getting Help

- GitHub Issues: https://github.com/your-repo/issues
- Email: support@runplusplans.com
- Strava API Docs: https://developers.strava.com/

## Credits

Built with:
- [Strava API](https://developers.strava.com/)
- [React](https://react.dev/)
- [Firebase](https://firebase.google.com/)
- [React Router](https://reactrouter.com/)

## License

[Your license here]
