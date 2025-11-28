# Staging/Dev Environment Setup

## 🎯 Goal
Create a separate staging environment at `dev.app.runplusplans.com` to test changes before deploying to production.

## 🏗️ Architecture

```
Production:  app.runplusplans.com  → main branch → gh-pages branch
Staging:     dev.app.runplusplans.com → dev branch → gh-pages-dev branch
```

## 📋 Setup Steps

### Option 1: GitHub Pages with Dev Branch (Recommended)

**Pros:**
- ✅ Free
- ✅ Same infrastructure as production
- ✅ Easy to set up
- ✅ Can test with real Firebase (just use different project or same project)

**Cons:**
- ⚠️ Requires DNS setup for subdomain
- ⚠️ Manual deployment (or GitHub Actions)

### Step 1: Create Dev Branch

```bash
# Create and switch to dev branch
git checkout -b dev
git push -u origin dev
```

### Step 2: Create Staging Deployment Script

Add to `package.json`:
```json
{
  "scripts": {
    "deploy": "gh-pages -d build",
    "deploy:staging": "gh-pages -d build -b gh-pages-dev -r origin"
  }
}
```

### Step 3: Create Staging CNAME

Create `public/CNAME.dev`:
```
dev.app.runplusplans.com
```

### Step 4: Update Deployment Script

Create `scripts/deploy-staging.js`:
```javascript
const { execSync } = require('child_process');
const fs = require('fs');

// Copy staging CNAME
fs.copyFileSync('public/CNAME.dev', 'public/CNAME');

// Build
execSync('npm run build:prod', { stdio: 'inherit' });

// Deploy to gh-pages-dev branch
execSync('gh-pages -d build -b gh-pages-dev', { stdio: 'inherit' });

// Restore production CNAME
fs.copyFileSync('public/CNAME', 'public/CNAME.dev');
fs.writeFileSync('public/CNAME', 'app.runplusplans.com');
```

### Step 5: Configure DNS

**In GoDaddy (or your DNS provider):**
Add CNAME record:
```
Type: CNAME
Name: dev.app
Value: YOUR_USERNAME.github.io
TTL: 3600
```

### Step 6: Configure GitHub Pages

1. Go to repository → **Settings** → **Pages**
2. Under "Source", you'll see the main branch deployment
3. For staging, you'll need to manually deploy to `gh-pages-dev` branch
4. Or use GitHub Actions (see below)

---

## 🚀 Option 2: Vercel/Netlify (Easier, Better DX)

**Pros:**
- ✅ Automatic preview deployments for every PR
- ✅ Instant deployments
- ✅ Better developer experience
- ✅ Free tier
- ✅ Automatic HTTPS

**Cons:**
- ⚠️ Different platform than production (but that's actually good for testing)

### Vercel Setup (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Link project:**
   ```bash
   vercel link
   ```

4. **Deploy staging:**
   ```bash
   vercel --prod=false
   ```

5. **Add custom domain:**
   - Go to Vercel dashboard
   - Project → Settings → Domains
   - Add: `dev.app.runplusplans.com`
   - Follow DNS instructions

6. **Add to package.json:**
   ```json
   {
     "scripts": {
       "deploy": "gh-pages -d build",
       "deploy:staging": "vercel --prod=false"
     }
   }
   ```

**Benefits:**
- Every PR gets a preview URL automatically
- Staging deploys instantly
- Can test multiple versions simultaneously

---

## 🔄 Workflow

### Development Workflow

1. **Work on feature branch:**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git commit -m "Add new feature"
   git push
   ```

2. **Test locally:**
   ```bash
   npm start
   ```

3. **Deploy to staging:**
   ```bash
   npm run deploy:staging
   # Or: vercel --prod=false
   ```

4. **Test on staging:**
   - Visit `dev.app.runplusplans.com`
   - Test with real Firebase (use same project or separate staging project)
   - Share with beta testers

5. **Merge to main:**
   ```bash
   git checkout main
   git merge feature/new-feature
   git push
   ```

6. **Deploy to production:**
   ```bash
   npm run deploy
   ```

---

## 🧪 Testing Strategy

### Staging Environment Should:
- ✅ Use same Firebase project (or separate staging project)
- ✅ Use same Strava app (or separate staging app)
- ✅ Have same data structure
- ✅ Be accessible to beta testers

### Before Production Deploy:
- [ ] Test on staging for 24-48 hours
- [ ] Get beta tester approval
- [ ] Check all critical paths
- [ ] Verify no console errors
- [ ] Test on mobile devices

---

## 📝 Quick Start (Vercel - Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project (first time)
vercel link

# 4. Deploy staging
vercel --prod=false

# 5. Add custom domain in Vercel dashboard
# dev.app.runplusplans.com

# 6. Add to package.json
# "deploy:staging": "vercel --prod=false"
```

---

## 🎯 Recommended Approach

**Use Vercel for staging** because:
1. ✅ Automatic preview deployments
2. ✅ Instant feedback
3. ✅ Better for beta testing (can share preview URLs)
4. ✅ Free tier is generous
5. ✅ Easy rollback

**Keep GitHub Pages for production** because:
1. ✅ Already set up
2. ✅ Custom domain configured
3. ✅ Works well for static hosting

---

## 🔐 Environment Variables

For staging, you can:
- Use same Firebase project (recommended for now)
- Use same Strava app (recommended for now)
- Later: Create separate staging Firebase project

No code changes needed - just different deployment target.

