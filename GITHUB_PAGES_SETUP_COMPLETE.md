# GitHub Pages Setup - Complete ✅

## ✅ Code Changes Completed

### 1. Marketing Site Links Updated
**File:** `C:\Users\bradh\runplusplans-website\index.html`
- ✅ Navigation "Login" → `https://app.runplusplans.com/auth`
- ✅ Hero "Login" → `https://app.runplusplans.com/auth`
- ✅ Hero "Get Started" → `https://app.runplusplans.com/auth?mode=signup`

### 2. Training App Updated
**Files Modified:**
- ✅ `src/App.js` - Added `/auth` route, updated root route to redirect
- ✅ `src/components/Auth.js` - Added signup mode detection from query param
- ✅ `public/CNAME` - Changed to `app.runplusplans.com`
- ✅ `package.json` - Updated homepage to `https://app.runplusplans.com`

**Root Route Logic:**
- If logged in + has plan → `/dashboard`
- If logged in + no plan → `/onboarding`
- If not logged in → `/auth`

---

## 🚧 Next Steps (Manual Setup)

### Step 1: Deploy Marketing Site to GitHub Pages

1. **Create GitHub repository for marketing site:**
   ```bash
   cd C:\Users\bradh\runplusplans-website
   git init
   git add .
   git commit -m "Initial commit: Marketing site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/runplusplans-marketing.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to repository → **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` / `/ (root)`
   - Click **Save**

3. **Add custom domain:**
   - In **Settings** → **Pages** → **Custom domain**
   - Enter: `runplusplans.com`
   - This will create a `CNAME` file automatically
   - Check **Enforce HTTPS** (after DNS propagates)

---

### Step 2: Update Training App Deployment

1. **Commit changes:**
   ```bash
   cd C:\run-plus-plans
   git add src/App.js public/CNAME package.json src/components/Auth.js
   git commit -m "Move app to app.runplusplans.com subdomain"
   git push
   ```

2. **Update GitHub Pages settings:**
   - Go to your training app repository → **Settings** → **Pages**
   - Custom domain: `app.runplusplans.com`
   - Check **Enforce HTTPS**

3. **Redeploy:**
   ```bash
   npm run deploy
   ```

---

### Step 3: Configure DNS

**In your domain registrar (e.g., Namecheap, GoDaddy):**

**For Marketing Site (root domain - runplusplans.com):**
Add A records (GitHub Pages provides these):
```
Type: A
Name: @
Value: 185.199.108.153

Type: A
Name: @
Value: 185.199.109.153

Type: A
Name: @
Value: 185.199.110.153

Type: A
Name: @
Value: 185.199.111.153
```

**For App (subdomain - app.runplusplans.com):**
Add CNAME record:
```
Type: CNAME
Name: app
Value: YOUR_USERNAME.github.io
TTL: Automatic (or 3600)
```

**Note:** Replace `YOUR_USERNAME` with your GitHub username.

**DNS Propagation:**
- Can take 24-48 hours (usually faster)
- Check status: [dnschecker.org](https://dnschecker.org)
- Test: `nslookup app.runplusplans.com` or `dig app.runplusplans.com`

---

## 📋 Testing Checklist

After DNS propagates:

- [ ] Marketing site loads at `runplusplans.com`
- [ ] "Login" button redirects to `app.runplusplans.com/auth`
- [ ] "Get Started" button redirects to `app.runplusplans.com/auth?mode=signup`
- [ ] Training app loads at `app.runplusplans.com`
- [ ] Auth page shows signup form when `?mode=signup` is in URL
- [ ] Auth flow works (login/signup)
- [ ] After login, redirects to dashboard (if has plan) or onboarding
- [ ] After signup, redirects to onboarding
- [ ] Root route (`/`) redirects correctly based on auth state

---

## 🎯 Final Architecture

```
runplusplans.com
├── Marketing Site (GitHub Pages)
│   ├── Landing page
│   ├── Features
│   ├── RunEQ section
│   ├── Beta signup
│   └── "Login" / "Get Started" buttons → app.runplusplans.com
│
app.runplusplans.com
├── Training App (GitHub Pages)
│   ├── /auth (login/signup)
│   ├── /onboarding
│   ├── /dashboard
│   ├── /workout/:day
│   └── All app routes
```

---

## 📝 Files Changed

**Marketing Site:**
- ✅ `C:\Users\bradh\runplusplans-website\index.html` - Links updated

**Training App:**
- ✅ `src/App.js` - Added `/auth` route, updated root route
- ✅ `src/components/Auth.js` - Added signup mode detection
- ✅ `public/CNAME` - Changed to `app.runplusplans.com`
- ✅ `package.json` - Updated homepage

---

## 🚀 Quick Deploy Commands

**Marketing Site:**
```bash
cd C:\Users\bradh\runplusplans-website
git add .
git commit -m "Update links to app subdomain"
git push
# GitHub Pages will auto-deploy
```

**Training App:**
```bash
cd C:\run-plus-plans
git add .
git commit -m "Move to app subdomain"
git push
npm run deploy
```

---

## 💡 Notes

- **LandingPage component:** Still exists in code but is no longer used. Can be removed later if desired.
- **Auth sharing:** Marketing site and app are on separate domains, so they don't share cookies/auth. Users will need to log in when clicking from marketing site.
- **HTTPS:** Both sites will have HTTPS automatically via GitHub Pages (after DNS propagates and you enable it).

---

All code changes are complete! Just need to:
1. Set up GitHub Pages for marketing site
2. Update DNS records
3. Redeploy training app

Ready to go! 🚀




