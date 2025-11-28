# Staging Branch Strategy

## 🎯 Recommended Setup

### Branch Structure:
```
main branch     → Production (GitHub Pages) - Manual deploy only
staging branch  → Staging (Vercel) - Auto-deploy on push
feature branches → Preview (Vercel) - Auto-deploy for testing
```

## 📋 Setup Steps

### Step 1: Create Staging Branch

```bash
# Create and push staging branch
git checkout -b staging
git push -u origin staging
```

### Step 2: Configure Vercel

1. Go to Vercel Dashboard → Project → Settings → Git
2. Connect repository: `herrenbrad/run-plus-plans`
3. **Production Branch:** Leave empty or set to `main` (but don't enable Production deployments)
4. **Preview:** Enable for all branches
5. **Branch Filter:** Set to deploy from `staging` branch for staging environment

Actually, better approach:

### Alternative: Use Vercel Branch Configuration

1. **Settings → Git:**
   - Connect repo
   - **Production Branch:** `main` (but disable Production deployments)
   - **Preview Deployments:** Enable for all branches

2. **Settings → Environment Variables:**
   - All staging vars are set for **Preview** environment
   - This means: ANY branch push → Preview deployment → Uses staging Firebase

3. **Settings → Git → Branch Protection:**
   - Only deploy `staging` branch automatically
   - Other branches require manual trigger

## 🔄 Workflow

### For New Features:

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... code changes ...

# 3. Push feature branch
git push origin feature/new-feature
# → Vercel auto-deploys to Preview (staging Firebase)
# → Get preview URL for testing

# 4. Test on preview URL
# Share with beta tester

# 5. Merge to staging branch
git checkout staging
git merge feature/new-feature
git push origin staging
# → Vercel auto-deploys staging branch (staging Firebase)
# → Test on staging URL

# 6. Once approved, merge to main
git checkout main
git merge staging
git push origin main
# → NO auto-deploy (Vercel Production disabled)
# → Manual deploy to production:
npm run deploy
# → Deploys to GitHub Pages (production Firebase)
```

### For Hotfixes:

```bash
# 1. Fix on main
git checkout main
# ... fix ...
git commit -m "Fix: description"
git push

# 2. Also merge to staging
git checkout staging
git merge main
git push

# 3. Deploy production manually
npm run deploy
```

## 🎯 Better Approach: Separate Staging Branch

Actually, the cleanest setup:

1. **Create `staging` branch** (separate from main)
2. **Vercel Settings:**
   - Production Branch: `main` (but Production deployments DISABLED)
   - Preview: Enabled for all branches
   - Branch-specific deployments: Configure `staging` branch to use staging environment

3. **Workflow:**
   - Feature branches → Preview deployments (staging Firebase)
   - `staging` branch → Staging deployment (staging Firebase) 
   - `main` branch → Manual production deploy only (production Firebase)

This gives you:
- ✅ Complete separation (staging vs production)
- ✅ Automatic staging deployments
- ✅ Manual production control
- ✅ Preview URLs for every PR

