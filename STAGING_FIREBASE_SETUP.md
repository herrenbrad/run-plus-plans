# Staging Firebase Project Setup Guide

## Step 1: Create Staging Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Project name: `run-plus-plans-staging`
4. Disable Google Analytics (or enable if you want separate analytics)
5. Click **"Create project"**

## Step 2: Add Web App to Staging Project

1. In your new staging project, click the **Web icon** (`</>`)
2. App nickname: `Run+ Plans Staging`
3. **Don't** check "Also set up Firebase Hosting" (we're using Vercel)
4. Click **"Register app"**
5. Copy the Firebase config object

## Step 3: Get Firebase Config Values

From the Firebase config object, extract:

```javascript
{
  apiKey: "AIza...",                    // → REACT_APP_FIREBASE_API_KEY
  authDomain: "run-plus-plans-staging.firebaseapp.com",  // → REACT_APP_FIREBASE_AUTH_DOMAIN
  projectId: "run-plus-plans-staging",  // → REACT_APP_FIREBASE_PROJECT_ID
  storageBucket: "run-plus-plans-staging.firebasestorage.app", // → REACT_APP_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789",        // → REACT_APP_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789:web:abc123",      // → REACT_APP_FIREBASE_APP_ID
  measurementId: "G-XXXXXXXXXX"          // → REACT_APP_FIREBASE_MEASUREMENT_ID (if Analytics enabled)
}
```

## Step 4: Configure Firebase Services

### Enable Authentication
1. Go to **Authentication** → **Get started**
2. Enable **Email/Password** provider (same as production)
3. Configure authorized domains:
   - `dev.app.runplusplans.com`
   - `localhost` (for local testing)

### Enable Firestore
1. Go to **Firestore Database** → **Create database**
2. Start in **test mode** (we'll set up security rules next)
3. Choose location (same as production, e.g., `us-central1`)

### Set Up Security Rules
1. Go to **Firestore Database** → **Rules**
2. Copy your production rules (from production Firebase project)
3. Paste into staging project
4. Click **"Publish"**

### Enable Cloud Functions (if needed)
1. Go to **Functions**
2. If you have functions, deploy them to staging project:
   ```bash
   firebase use run-plus-plans-staging
   firebase deploy --only functions
   ```

## Step 5: Configure Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable (for **Preview** and **Production** environments):

```
REACT_APP_ENV=staging
REACT_APP_FIREBASE_PROJECT_ID=run-plus-plans-staging
REACT_APP_FIREBASE_API_KEY=YOUR_STAGING_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN=run-plus-plans-staging.firebaseapp.com
REACT_APP_FIREBASE_STORAGE_BUCKET=run-plus-plans-staging.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_STAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID=YOUR_STAGING_APP_ID
REACT_APP_FIREBASE_MEASUREMENT_ID=YOUR_STAGING_MEASUREMENT_ID
```

**Important:** Set these for **Preview** environment (staging) only, NOT production.

## Step 6: Test Staging Environment

1. Deploy to Vercel: `npm run deploy:staging`
2. Visit staging URL
3. Try signing up with a test account
4. Verify data goes to staging Firebase (check Firestore console)

## Step 7: Set Up Strava App for Staging (Optional)

If you want separate Strava app for staging:

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application:
   - Name: `Run+ Plans Staging`
   - Website: `https://dev.app.runplusplans.com`
   - Authorization Callback Domain: `dev.app.runplusplans.com`
3. Add environment variables to Vercel:
   ```
   REACT_APP_STRAVA_CLIENT_ID=YOUR_STAGING_CLIENT_ID
   REACT_APP_STRAVA_CLIENT_SECRET=YOUR_STAGING_CLIENT_SECRET
   ```

## ✅ Checklist

- [ ] Staging Firebase project created
- [ ] Web app added to staging project
- [ ] Authentication enabled
- [ ] Firestore database created
- [ ] Security rules copied from production
- [ ] Vercel environment variables configured
- [ ] Test signup works on staging
- [ ] Data appears in staging Firestore
- [ ] Strava app created for staging (optional)

