# Add Vercel Environment Variables

## Your Staging Firebase Config Values

Use these values when adding environment variables to Vercel:

```
REACT_APP_ENV=staging
REACT_APP_FIREBASE_PROJECT_ID=run-plus-plans-staging
REACT_APP_FIREBASE_API_KEY=AIzaSyA7qLCTDnHm1Sv7EQ8QqhqnjFifr7Hib-E
REACT_APP_FIREBASE_AUTH_DOMAIN=run-plus-plans-staging.firebaseapp.com
REACT_APP_FIREBASE_STORAGE_BUCKET=run-plus-plans-staging.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=299109684352
REACT_APP_FIREBASE_APP_ID=1:299109684352:web:c716014ebec40bcc538265
REACT_APP_FIREBASE_MEASUREMENT_ID=G-SD0K41EX9C
```

## Steps to Add to Vercel

1. **Link the project** (if not already done):
   ```bash
   vercel link
   ```
   - When prompted: "Set up and deploy?" → **No**
   - Project name: `run-plus-plans` (or press Enter)

2. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Click on your `run-plus-plans` project

3. **Add Environment Variables:**
   - Go to **Settings** → **Environment Variables**
   - For EACH variable above:
     - Click **Add New**
     - Paste the variable name (e.g., `REACT_APP_ENV`)
     - Paste the value (e.g., `staging`)
     - **IMPORTANT:** Select **Preview** environment only (NOT Production)
     - Click **Save**

4. **Verify:**
   - You should see 8 environment variables
   - All should be set for **Preview** environment
   - None should be set for **Production** environment

## Alternative: Use Vercel CLI

If you prefer CLI, run this after linking:

```bash
vercel env add REACT_APP_ENV preview
# When prompted, enter: staging

vercel env add REACT_APP_FIREBASE_PROJECT_ID preview
# When prompted, enter: run-plus-plans-staging

vercel env add REACT_APP_FIREBASE_API_KEY preview
# When prompted, enter: AIzaSyA7qLCTDnHm1Sv7EQ8QqhqnjFifr7Hib-E

vercel env add REACT_APP_FIREBASE_AUTH_DOMAIN preview
# When prompted, enter: run-plus-plans-staging.firebaseapp.com

vercel env add REACT_APP_FIREBASE_STORAGE_BUCKET preview
# When prompted, enter: run-plus-plans-staging.firebasestorage.app

vercel env add REACT_APP_FIREBASE_MESSAGING_SENDER_ID preview
# When prompted, enter: 299109684352

vercel env add REACT_APP_FIREBASE_APP_ID preview
# When prompted, enter: 1:299109684352:web:c716014ebec40bcc538265

vercel env add REACT_APP_FIREBASE_MEASUREMENT_ID preview
# When prompted, enter: G-SD0K41EX9C
```

