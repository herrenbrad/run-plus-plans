# Marketing Site Integration - Implementation Guide

## 🎯 Current State

- **Marketing Site:** `C:\Users\bradh\runplusplans-website` (static HTML/CSS/JS)
- **Training App:** `C:\run-plus-plans` (React SPA)
- **Current Links:** Marketing site points to `https://runplusplans.com` (lines 32, 51)

## 🏗️ Target Architecture

**Option A: Subdomain (Recommended)**
- `runplusplans.com` → Marketing site
- `app.runplusplans.com` → Training app

**Option B: Path-Based**
- `runplusplans.com/` → Marketing site
- `runplusplans.com/app/*` → Training app

---

## 📋 Step-by-Step Implementation

### Step 1: Update Marketing Site Links

**File:** `C:\Users\bradh\runplusplans-website\index.html`

**Change line 32 (Navigation Login):**
```html
<!-- BEFORE -->
<li class="nav-item"><a href="https://runplusplans.com" class="nav-link">Login</a></li>

<!-- AFTER (Subdomain) -->
<li class="nav-item"><a href="https://app.runplusplans.com/auth" class="nav-link">Login</a></li>

<!-- OR (Path-based) -->
<li class="nav-item"><a href="/app/auth" class="nav-link">Login</a></li>
```

**Change line 51 (Hero Login Button):**
```html
<!-- BEFORE -->
<a href="https://runplusplans.com" class="btn btn-secondary">Login →</a>

<!-- AFTER (Subdomain) -->
<a href="https://app.runplusplans.com/auth" class="btn btn-secondary">Login →</a>

<!-- OR (Path-based) -->
<a href="/app/auth" class="btn btn-secondary">Login →</a>
```

**Add "Get Started" button (if not exists):**
```html
<a href="https://app.runplusplans.com/auth?mode=signup" class="btn btn-primary">Get Started</a>
```

---

### Step 2: Set Up Firebase Multi-Site Hosting

**File:** `C:\run-plus-plans\firebase.json`

**Update to support multi-site:**

```json
{
  "functions": {
    "source": "functions",
    "codebase": "default",
    "ignore": [
      "node_modules",
      ".git",
      "firebase-debug.log",
      "firebase-debug.*.log"
    ]
  },
  "hosting": [
    {
      "target": "marketing",
      "public": "../runplusplans-website",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "/index.html",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "no-cache, no-store, must-revalidate"
            }
          ]
        },
        {
          "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        },
        {
          "source": "**/*.@(js|css)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "public, max-age=31536000, immutable"
            }
          ]
        }
      ]
    },
    {
      "target": "app",
      "public": "build",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "/index.html",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "no-cache, no-store, must-revalidate"
            }
          ]
        },
        {
          "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        },
        {
          "source": "**/*.@(js|css)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "public, max-age=31536000, immutable"
            }
          ]
        }
      ]
    }
  ]
}
```

**Note:** The marketing site path `"../runplusplans-website"` assumes the marketing site is in the parent directory. Adjust if different.

---

### Step 3: Configure Firebase Hosting Sites

**In Firebase Console:**

1. Go to **Firebase Console** → **Hosting**
2. Click **Add another site**
3. Create two sites:
   - **Site 1:** `runplusplans` (marketing site)
   - **Site 2:** `app-runplusplans` (training app)

4. **Get site IDs:**
   - Marketing: `runplusplans`
   - App: `app-runplusplans`

5. **Update `.firebaserc` file:**

```json
{
  "projects": {
    "default": "your-project-id"
  },
  "targets": {
    "your-project-id": {
      "hosting": {
        "marketing": [
          "runplusplans"
        ],
        "app": [
          "app-runplusplans"
        ]
      }
    }
  }
}
```

---

### Step 4: Update Training App Routes

**File:** `C:\run-plus-plans\src\App.js`

**Add auth route (if not exists):**

```javascript
<Route
  path="/auth"
  element={<Auth />}
/>
```

**Update root route to redirect logged-in users:**

```javascript
<Route
  path="/"
  element={
    user ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />
  }
/>
```

**Remove LandingPage import and route** (marketing site is now the landing page):

```javascript
// Remove this import:
// import LandingPage from './components/LandingPage';

// Remove this route:
// <Route
//   path="/"
//   element={
//     trainingPlan ?
//       <Navigate to="/welcome" replace /> :
//       <LandingPage />
//   }
// />
```

---

### Step 5: Update Auth Component

**File:** `C:\run-plus-plans\src\components\Auth.js`

**Ensure it handles signup mode from query param:**

```javascript
// Check for mode query param
const searchParams = new URLSearchParams(window.location.search);
const mode = searchParams.get('mode'); // 'signup' or null

// Show signup form if mode=signup
const [isSignUp, setIsSignUp] = useState(mode === 'signup');
```

---

### Step 6: DNS Configuration (Subdomain Option)

**In your domain registrar (e.g., Namecheap, GoDaddy):**

**Add CNAME record for subdomain:**
```
Type: CNAME
Name: app
Value: app-runplusplans.web.app
TTL: Automatic (or 3600)
```

**Or if Firebase provides A records:**
```
Type: A
Name: app
Value: [Firebase IP address]
```

**DNS Propagation:**
- Can take 24-48 hours (usually faster)
- Check status: [dnschecker.org](https://dnschecker.org)
- Test: `nslookup app.runplusplans.com`

---

### Step 7: Build Scripts

**Create deployment scripts:**

**File:** `C:\run-plus-plans\package.json`

**Add scripts:**

```json
{
  "scripts": {
    "build": "react-scripts build",
    "build:prod": "set GENERATE_SOURCEMAP=false && react-scripts build",
    "deploy:marketing": "firebase deploy --only hosting:marketing",
    "deploy:app": "npm run build:prod && firebase deploy --only hosting:app",
    "deploy:all": "npm run build:prod && firebase deploy --only hosting"
  }
}
```

---

### Step 8: Deployment

**Deploy Marketing Site:**
```bash
cd C:\run-plus-plans
firebase deploy --only hosting:marketing
```

**Deploy Training App:**
```bash
cd C:\run-plus-plans
npm run build:prod
firebase deploy --only hosting:app
```

**Deploy Both:**
```bash
cd C:\run-plus-plans
npm run build:prod
firebase deploy --only hosting
```

---

## 🔄 Alternative: Path-Based Approach

If subdomain is not possible, use path-based routing:

### Step 1: Update Marketing Site Links

**Change to relative paths:**
```html
<a href="/app/auth" class="nav-link">Login</a>
<a href="/app/auth?mode=signup" class="btn btn-primary">Get Started</a>
```

### Step 2: Update Firebase Hosting

**Single site with rewrites:**

```json
{
  "hosting": {
    "public": "build",
    "rewrites": [
      {
        "source": "/app/**",
        "destination": "/app/index.html"
      },
      {
        "source": "**",
        "destination": "/marketing/index.html"
      }
    ]
  }
}
```

**Deploy marketing site to `/marketing` folder:**
- Copy marketing site files to `public/marketing/` in training app
- Or use separate build process

### Step 3: Update React Router

**Wrap app routes in `/app` prefix:**

```javascript
<Routes>
  <Route path="/app/*" element={<AppRoutes />} />
  <Route path="/*" element={<MarketingSite />} />
</Routes>
```

---

## ✅ Testing Checklist

- [ ] Marketing site loads at `runplusplans.com`
- [ ] "Login" button redirects to `app.runplusplans.com/auth`
- [ ] "Get Started" button redirects to `app.runplusplans.com/auth?mode=signup`
- [ ] Training app loads at `app.runplusplans.com`
- [ ] Auth flow works (login/signup)
- [ ] After login, redirects to dashboard
- [ ] After signup, redirects to onboarding
- [ ] Mobile responsive (both sites)
- [ ] All links work correctly

---

## 🐛 Troubleshooting

### Marketing site not loading:
- Check Firebase hosting configuration
- Verify site ID matches `.firebaserc`
- Check DNS settings

### App subdomain not working:
- Verify DNS CNAME record
- Check Firebase hosting site configuration
- Wait for DNS propagation (can take 24-48 hours)

### Links not working:
- Check that marketing site links point to correct URL
- Verify auth route exists in training app
- Check browser console for errors

### Auth redirect issues:
- Verify Auth component handles query params
- Check Firebase auth configuration
- Test auth flow manually

---

## 📝 Next Steps

1. **Update marketing site links** (Step 1)
2. **Set up Firebase multi-site hosting** (Steps 2-3)
3. **Update training app routes** (Step 4)
4. **Configure DNS** (Step 6)
5. **Deploy both sites** (Step 8)
6. **Test end-to-end** (Testing Checklist)

---

## 🎯 Quick Start Commands

```bash
# 1. Update marketing site links
# (Edit C:\Users\bradh\runplusplans-website\index.html)

# 2. Update firebase.json
# (Edit C:\run-plus-plans\firebase.json)

# 3. Create Firebase hosting sites
# (In Firebase Console)

# 4. Update .firebaserc
# (Edit C:\run-plus-plans\.firebaserc)

# 5. Build and deploy
cd C:\run-plus-plans
npm run build:prod
firebase deploy --only hosting
```

---

Ready to implement? Let me know which option you prefer (subdomain or path-based) and I can help update the files!




