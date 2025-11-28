# Marketing Site Integration - GitHub Pages Setup

## 🎯 Current State

- **Training App:** Deployed to GitHub Pages at `runplusplans.com` (using `gh-pages` package)
- **Marketing Site:** Static HTML/CSS/JS at `C:\Users\bradh\runplusplans-website`
- **Goal:** Marketing site at root, app at subdomain

---

## 🏗️ Architecture Options

### Option A: Subdomain (Recommended)

**Structure:**
- `runplusplans.com` → Marketing site (GitHub Pages from separate repo)
- `app.runplusplans.com` → Training app (GitHub Pages from current repo)

**Pros:**
- ✅ Clean separation
- ✅ Independent deployments
- ✅ Better SEO for marketing site
- ✅ No code changes needed (just DNS)

**Cons:**
- ⚠️ Requires subdomain DNS setup
- ⚠️ Need separate GitHub repo for marketing site

---

### Option B: Path-Based (Same Repo)

**Structure:**
- `runplusplans.com/` → Marketing site (root)
- `runplusplans.com/app/*` → Training app

**Pros:**
- ✅ Single domain (no DNS changes)
- ✅ Shared cookies/auth automatically
- ✅ Single repo

**Cons:**
- ⚠️ More complex routing
- ⚠️ Need to integrate marketing site into React app

---

## 🚀 Recommended: Option A (Subdomain)

### Step 1: Set Up Marketing Site on GitHub Pages

**Option 1A: Separate Repository (Recommended)**

1. **Create new GitHub repository:**
   - Name: `runplusplans-marketing` (or `runplusplans-website`)
   - Public repository
   - Don't initialize with README

2. **Push marketing site to GitHub:**
   ```bash
   cd C:\Users\bradh\runplusplans-website
   git init
   git add .
   git commit -m "Initial commit: Marketing site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/runplusplans-marketing.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to repository → **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` / `/ (root)`
   - Click **Save**

4. **Add custom domain:**
   - In **Settings** → **Pages** → **Custom domain**
   - Enter: `runplusplans.com`
   - Check **Enforce HTTPS** (after DNS propagates)

5. **Create CNAME file in repo:**
   ```bash
   echo runplusplans.com > CNAME
   git add CNAME
   git commit -m "Add CNAME for custom domain"
   git push
   ```

**Option 1B: Use Existing Marketing Site Repo**

If you already have the marketing site in a GitHub repo:
- Just enable GitHub Pages in that repo
- Set custom domain to `runplusplans.com`

---

### Step 2: Move Training App to Subdomain

**Update CNAME for app subdomain:**

1. **Update `public/CNAME` file:**
   ```bash
   # Change from:
   runplusplans.com
   
   # To:
   app.runplusplans.com
   ```

2. **Update `package.json` homepage:**
   ```json
   {
     "homepage": "https://app.runplusplans.com"
   }
   ```

3. **Commit and push:**
   ```bash
   git add public/CNAME package.json
   git commit -m "Move app to app.runplusplans.com subdomain"
   git push
   ```

4. **Update GitHub Pages settings:**
   - Go to your training app repository → **Settings** → **Pages**
   - Custom domain: `app.runplusplans.com`
   - Check **Enforce HTTPS**

5. **Redeploy:**
   ```bash
   npm run deploy
   ```

---

### Step 3: Configure DNS

**In your domain registrar (e.g., Namecheap, GoDaddy):**

**For Marketing Site (root domain):**
- GitHub Pages provides A records (check repository Settings → Pages)
- Add A records pointing to GitHub Pages IPs:
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

**For App (subdomain):**
- Add CNAME record:
  ```
  Type: CNAME
  Name: app
  Value: YOUR_USERNAME.github.io
  TTL: Automatic (or 3600)
  ```

**Or if using custom domain for app:**
- Add CNAME:
  ```
  Type: CNAME
  Name: app
  Value: YOUR_USERNAME.github.io
  ```

**DNS Propagation:**
- Can take 24-48 hours (usually faster)
- Check status: [dnschecker.org](https://dnschecker.org)
- Test: `nslookup app.runplusplans.com`

---

### Step 4: Update Marketing Site Links

**File:** `C:\Users\bradh\runplusplans-website\index.html`

**Already updated!** ✅
- Navigation "Login" → `https://app.runplusplans.com/auth`
- Hero "Login" → `https://app.runplusplans.com/auth`
- Hero "Get Started" → `https://app.runplusplans.com/auth?mode=signup`

**Commit and push to marketing site repo:**
```bash
cd C:\Users\bradh\runplusplans-website
git add index.html
git commit -m "Update links to point to app subdomain"
git push
```

---

### Step 5: Update Training App Routes

**File:** `src/App.js`

**Add `/auth` route (if not exists):**
```javascript
<Route
  path="/auth"
  element={<Auth />}
/>
```

**Update root route:**
```javascript
<Route
  path="/"
  element={
    user ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />
  }
/>
```

**Remove LandingPage** (marketing site is now the landing page):
- Remove `import LandingPage from './components/LandingPage';`
- Remove LandingPage route

---

### Step 6: Test

- [ ] Marketing site loads at `runplusplans.com`
- [ ] "Login" button redirects to `app.runplusplans.com/auth`
- [ ] "Get Started" button redirects to `app.runplusplans.com/auth?mode=signup`
- [ ] Training app loads at `app.runplusplans.com`
- [ ] Auth flow works (login/signup)
- [ ] After login, redirects to dashboard
- [ ] After signup, redirects to onboarding

---

## 🔄 Alternative: Option B (Path-Based)

If you prefer to keep everything on one domain:

### Step 1: Integrate Marketing Site into React App

**Copy marketing site files:**
```bash
# Copy marketing site to public directory
cp -r C:\Users\bradh\runplusplans-website\* public/marketing/
```

**Update React Router:**
```javascript
// Add marketing site route
<Route
  path="/"
  element={<MarketingLanding />}
/>

// Wrap app routes in /app prefix
<Route
  path="/app/*"
  element={<AppRoutes />}
/>
```

**Update marketing site links:**
```html
<a href="/app/auth">Login</a>
<a href="/app/auth?mode=signup">Get Started</a>
```

**Update package.json homepage:**
```json
{
  "homepage": "https://runplusplans.com"
}
```

**Deploy:**
```bash
npm run deploy
```

**Pros:**
- ✅ Single domain
- ✅ No DNS changes
- ✅ Shared auth/cookies

**Cons:**
- ⚠️ Marketing site bundled with app (larger bundle)
- ⚠️ More complex routing
- ⚠️ Less flexible for marketing updates

---

## 📋 Quick Start (Option A - Subdomain)

### 1. Create Marketing Site Repo
```bash
cd C:\Users\bradh\runplusplans-website
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/runplusplans-marketing.git
git push -u origin main
```

### 2. Enable GitHub Pages
- Repository → Settings → Pages
- Source: main branch
- Custom domain: `runplusplans.com`

### 3. Move App to Subdomain
```bash
cd C:\run-plus-plans
# Update public/CNAME to: app.runplusplans.com
# Update package.json homepage to: https://app.runplusplans.com
git add public/CNAME package.json
git commit -m "Move to app subdomain"
npm run deploy
```

### 4. Configure DNS
- Add A records for root domain (GitHub Pages IPs)
- Add CNAME for `app` subdomain

### 5. Test
- Wait for DNS propagation
- Test both sites

---

## 🎯 Summary

**Recommended Approach:**
1. ✅ Marketing site → Separate GitHub repo → `runplusplans.com`
2. ✅ Training app → Current repo → `app.runplusplans.com`
3. ✅ Marketing site links already updated ✅
4. ✅ Auth component already handles signup mode ✅
5. ⚠️ Need to: Move app to subdomain, set up DNS

**Files Already Updated:**
- ✅ `C:\Users\bradh\runplusplans-website\index.html` - Links updated
- ✅ `src/components/Auth.js` - Signup mode detection

**Files That Need Updates:**
- ⚠️ `public/CNAME` - Change to `app.runplusplans.com`
- ⚠️ `package.json` - Update homepage
- ⚠️ `src/App.js` - Add `/auth` route, update root route

---

Ready to proceed? The code changes are mostly done - just need to set up the GitHub Pages deployment and DNS!




