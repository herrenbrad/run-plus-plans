# Strava API Production Migration Guide

## 🎯 Goal
Migrate Strava API integration from development to production so beta testers can connect their Strava accounts.

---

## 📋 Step-by-Step Migration

### Step 1: Create Production Strava App

1. **Go to Strava API Settings:**
   - Visit: https://www.strava.com/settings/api
   - Click **"Create App"** or **"Create New Application"**

2. **Fill in Production App Details:**
   ```
   Application Name: Run+ Plans (Production)
   Category: Training
   Website: https://app.runplusplans.com
   Application Description: Smart training plans with automatic Strava sync
   Authorization Callback Domain: app.runplusplans.com
   ```

3. **Save and Get Credentials:**
   - Copy your **Client ID** (you'll need this)
   - Copy your **Client Secret** (you'll need this - keep it secret!)

---

### Step 2: Update Strava Config for Production

**Current Issue:** The config uses `window.location.origin` which is good, but has a dev fallback client ID.

**Update `src/config/strava.js`:**

```javascript
const STRAVA_CONFIG = {
  // Production client ID (replace with your actual production client ID)
  clientId: process.env.REACT_APP_STRAVA_CLIENT_ID || 'YOUR_PRODUCTION_CLIENT_ID',
  
  // Client secret (should be moved to Firebase Functions for security)
  // For now, using in frontend - NOT IDEAL but works
  clientSecret: process.env.REACT_APP_STRAVA_CLIENT_SECRET || 'YOUR_PRODUCTION_CLIENT_SECRET',
  
  // This automatically uses the correct domain (app.runplusplans.com in prod)
  redirectUri: `${window.location.origin}/auth/strava/callback`,

  // OAuth authorization URL
  authorizationUrl: 'https://www.strava.com/oauth/authorize',

  // API endpoints
  apiBaseUrl: 'https://www.strava.com/api/v3',

  // Scopes we're requesting
  scope: 'activity:read_all',
};
```

**⚠️ SECURITY WARNING:** 
- Client secret in frontend code is **NOT SECURE** (anyone can see it)
- For production, you should move token exchange to Firebase Functions
- For now, this works but is a security risk

---

### Step 3: Update Strava App Settings

1. **Go back to your Strava app settings:**
   - https://www.strava.com/settings/api
   - Find your production app

2. **Update Callback URL:**
   - **Authorization Callback Domain:** `app.runplusplans.com`
   - This must match exactly (no `https://`, no trailing slash)

3. **Save changes**

---

### Step 4: Test the Integration

1. **Deploy the updated config:**
   ```bash
   npm run deploy
   ```

2. **Test OAuth Flow:**
   - Go to `https://app.runplusplans.com`
   - Log in
   - Click "Connect Strava" on Dashboard
   - Should redirect to Strava authorization
   - After authorizing, should redirect back to app
   - Should see "Strava Connected!" message

3. **Test Sync:**
   - Complete a run in Strava
   - Go to Dashboard
   - Click "Sync Now" or wait for auto-sync
   - Workout should auto-complete with Strava data

---

## 🔒 Better Security Option (Future)

**Move token exchange to Firebase Functions:**

1. Create a Firebase Function to handle token exchange
2. Store client secret as Firebase secret
3. Frontend sends authorization code to function
4. Function exchanges code for tokens (server-side)
5. Function returns tokens to frontend

**Benefits:**
- Client secret never exposed to frontend
- More secure
- Better for production

**Current approach works but is less secure.**

---

## 🐛 Troubleshooting

### Issue: "Redirect URI mismatch"
**Solution:**
- Check Strava app settings - callback domain must be exactly `app.runplusplans.com`
- Check `redirectUri` in code - should use `window.location.origin`

### Issue: "Invalid client_id"
**Solution:**
- Verify you're using production client ID (not dev)
- Check for typos in client ID

### Issue: "Invalid client_secret"
**Solution:**
- Verify client secret is correct
- Make sure no extra spaces or characters

### Issue: OAuth works but sync fails
**Solution:**
- Check token refresh logic
- Verify tokens are being saved to Firebase
- Check browser console for API errors

---

## 📝 Quick Checklist

- [ ] Created production Strava app
- [ ] Updated `src/config/strava.js` with production client ID
- [ ] Updated `src/config/strava.js` with production client secret
- [ ] Updated Strava app callback domain to `app.runplusplans.com`
- [ ] Tested OAuth flow on production
- [ ] Tested sync functionality
- [ ] Deployed to production

---

## 🚀 Deployment

After updating the config:

```bash
# Build and deploy
npm run deploy
```

**Note:** Since GitHub Pages doesn't support environment variables easily, you'll need to hardcode the production credentials in the config file. This is not ideal but works for now.

---

## ⚠️ Important Notes

1. **Client Secret Exposure:** The client secret will be visible in the JavaScript bundle. This is a security risk but Strava allows it for now. Consider moving to Firebase Functions for better security.

2. **Rate Limits:** Strava has rate limits (200 requests/15 min, 2000/day). The sync service already handles this with auto-sync throttling.

3. **Token Refresh:** Tokens expire after 6 hours. The service automatically refreshes them when needed.

---

**Ready to migrate?** Update the config file with your production credentials and deploy!



