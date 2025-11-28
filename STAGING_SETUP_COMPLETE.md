# Staging Environment Setup - Complete Guide

## ✅ What We've Set Up

1. ✅ Vercel CLI installed
2. ✅ Firebase config updated to support environment variables
3. ✅ `vercel.json` configuration file created
4. ✅ `package.json` updated with `deploy:staging` script
5. ✅ Environment variable templates created

## 🚀 Next Steps (Do These Now)

### Step 1: Create Staging Firebase Project

**Follow the guide in `STAGING_FIREBASE_SETUP.md`** to:
1. Create a new Firebase project called `run-plus-plans-staging`
2. Enable Authentication, Firestore, and Functions
3. Copy security rules from production
4. Get your Firebase config values

**Time: ~10 minutes**

### Step 2: Link Vercel to Your Project

```bash
# In your project directory
cd c:\run-plus-plans
vercel login
vercel link
```

When prompted:
- **Set up and deploy?** → **No** (we'll configure first)
- **Which scope?** → Your GitHub username
- **Link to existing project?** → **No**
- **Project name?** → `run-plus-plans` (or press Enter)
- **Directory?** → `./` (press Enter)

### Step 3: Configure Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `run-plus-plans` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables (select **Preview** environment only):

```
REACT_APP_ENV=staging
REACT_APP_FIREBASE_PROJECT_ID=run-plus-plans-staging
REACT_APP_FIREBASE_API_KEY=<from Firebase console>
REACT_APP_FIREBASE_AUTH_DOMAIN=run-plus-plans-staging.firebaseapp.com
REACT_APP_FIREBASE_STORAGE_BUCKET=run-plus-plans-staging.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<from Firebase console>
REACT_APP_FIREBASE_APP_ID=<from Firebase console>
REACT_APP_FIREBASE_MEASUREMENT_ID=<from Firebase console>
```

**Important:** 
- Only add to **Preview** environment (not Production)
- Production will use GitHub Pages with production Firebase

### Step 4: Deploy to Staging

```bash
npm run deploy:staging
```

This will:
1. Build your app with staging environment variables
2. Deploy to Vercel preview
3. Give you a URL like `run-plus-plans-xyz.vercel.app`

### Step 5: Add Custom Domain (Optional)

1. In Vercel Dashboard → **Settings** → **Domains**
2. Add domain: `dev.app.runplusplans.com`
3. Follow DNS instructions (add CNAME record in GoDaddy)

**DNS Configuration:**
```
Type: CNAME
Name: dev.app
Value: cname.vercel-dns.com
TTL: 3600
```

### Step 6: Test Staging

1. Visit your staging URL
2. Sign up with a test account
3. Verify data appears in **staging** Firebase (not production!)
4. Test onboarding flow
5. Test plan generation

## 🔄 Workflow Going Forward

### For New Features:

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and test locally
npm start

# 3. Deploy to staging
npm run deploy:staging

# 4. Test on staging URL
# Share with beta tester

# 5. Once approved, merge to main
git checkout main
git merge feature/new-feature
git push

# 6. Deploy to production
npm run deploy
```

### For Hotfixes:

```bash
# 1. Fix on main branch
git checkout main
# Make fix
git commit -m "Fix: description"
git push

# 2. Deploy to staging first
npm run deploy:staging
# Test

# 3. Deploy to production
npm run deploy
```

## 🧪 Testing Checklist

Before deploying to production, test on staging:

- [ ] Sign up flow works
- [ ] Onboarding completes successfully
- [ ] Training plan generates correctly
- [ ] Dashboard displays correctly
- [ ] Workout details load
- [ ] Strava connection works (if using staging Strava app)
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Data appears in **staging** Firebase (not production!)

## 🔐 Environment Separation

**Production (app.runplusplans.com):**
- Uses production Firebase: `run-plus-plans`
- Deployed via GitHub Pages
- Real user data

**Staging (dev.app.runplusplans.com):**
- Uses staging Firebase: `run-plus-plans-staging`
- Deployed via Vercel
- Test data only

## 📝 Notes

- Staging and production are completely isolated
- You can test breaking changes without affecting real users
- Beta testers can test on staging before production
- Each PR can get its own preview URL automatically

## 🆘 Troubleshooting

**Vercel build fails:**
- Check environment variables are set correctly
- Check `vercel.json` configuration
- Check build logs in Vercel dashboard

**Staging uses production Firebase:**
- Verify environment variables are set for **Preview** environment
- Check `REACT_APP_ENV=staging` is set
- Rebuild: `npm run deploy:staging`

**Domain not working:**
- Wait for DNS propagation (can take up to 48 hours)
- Check DNS records in GoDaddy
- Verify CNAME points to `cname.vercel-dns.com`

