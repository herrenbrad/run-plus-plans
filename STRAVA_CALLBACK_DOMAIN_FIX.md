# Strava Callback Domain Fix

## 🚨 Current Issue

**Error:** "Strava token exchange failed: Authorization Error"

**Root Cause:** Callback domain mismatch between Strava app settings and your actual app domain.

---

## 🔍 The Problem

Your Strava app is configured with:
- **Authorization Callback Domain:** `runplusplans.com` (root domain)

But your app is actually at:
- **App URL:** `app.runplusplans.com` (subdomain)

When the OAuth flow redirects, it tries to go to:
- `https://app.runplusplans.com/auth/strava/callback`

But Strava only allows:
- `https://runplusplans.com/auth/strava/callback`

**Result:** Authorization error because the redirect URI doesn't match.

---

## ✅ Solution

### Option 1: Update Strava App Callback Domain (Recommended)

1. **Go to Strava App Settings:**
   - https://www.strava.com/settings/api
   - Click on your "Run+ Plans" app

2. **Update Authorization Callback Domain:**
   - Change from: `runplusplans.com`
   - Change to: `app.runplusplans.com`
   - **Save changes**

3. **Test the connection again**

### Option 2: Use Root Domain (If You Want Marketing Site to Handle OAuth)

If you want the callback to go through the root domain instead:

1. **Keep Strava callback domain as:** `runplusplans.com`
2. **Update the redirect URI in code** to hardcode the root domain:
   ```javascript
   redirectUri: 'https://runplusplans.com/auth/strava/callback',
   ```
3. **Set up routing** on the marketing site to handle `/auth/strava/callback` and redirect to the app

**Note:** Option 1 is simpler and recommended.

---

## 📋 Quick Fix Checklist

- [ ] Go to https://www.strava.com/settings/api
- [ ] Edit your "Run+ Plans" app
- [ ] Change "Authorization Callback Domain" to: `app.runplusplans.com`
- [ ] Save changes
- [ ] Try connecting Strava again
- [ ] Should work now! ✅

---

## 🔍 Verify It's Fixed

After updating the callback domain:

1. Click "Connect Strava" on your dashboard
2. Authorize on Strava
3. Should redirect to: `https://app.runplusplans.com/auth/strava/callback`
4. Should see "Strava Connected!" message
5. Should redirect back to dashboard

If you still get an error, check:
- Browser console for the exact error message
- Network tab to see what redirect URI is being sent
- Strava app settings to confirm callback domain is saved

---

**The fix:** Update Strava callback domain to `app.runplusplans.com` to match where your app actually lives!



