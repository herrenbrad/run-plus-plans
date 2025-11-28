# Marketing Site Integration Plan

## 🎯 Goal

Separate marketing site (landing page) from the training app, with seamless navigation between them.

**Current State:**
- `runplusplans.com` → Training app (React SPA)
- Marketing site exists separately (location TBD)

**Target State:**
- `runplusplans.com` → Marketing site (landing page)
- `app.runplusplans.com` → Training app (or `/app` path)
- Marketing site has "Log In" / "Sign Up" buttons → redirects to app

---

## 🏗️ Architecture Options

### Option A: Subdomain Approach (Recommended)

**Structure:**
- `runplusplans.com` → Marketing site (static HTML/CSS/JS or React)
- `app.runplusplans.com` → Training app (React SPA)

**Pros:**
- ✅ Clean separation of concerns
- ✅ Independent deployments
- ✅ Better SEO (marketing site can be static/SSR)
- ✅ Easier to scale (marketing site can be CDN-hosted)
- ✅ Clear user experience (marketing vs. app)

**Cons:**
- ⚠️ Requires subdomain DNS setup
- ⚠️ Need to handle CORS/cookies if sharing auth

**Implementation:**
1. Marketing site: Static site (HTML/CSS/JS) or separate React app
2. Training app: Current React app, deployed to `app.runplusplans.com`
3. Firebase Hosting: Multi-site configuration

---

### Option B: Path-Based Approach

**Structure:**
- `runplusplans.com` → Marketing site (root)
- `runplusplans.com/app/*` → Training app (all app routes)

**Pros:**
- ✅ Single domain (simpler DNS)
- ✅ Shared cookies/auth automatically
- ✅ No CORS issues

**Cons:**
- ⚠️ More complex routing logic
- ⚠️ Marketing site needs to be part of React app or separate build
- ⚠️ Harder to optimize marketing site for SEO

**Implementation:**
1. Marketing site: Separate build, deployed to root
2. Training app: Deployed to `/app` path
3. Firebase Hosting: Rewrite rules to route correctly

---

### Option C: Hybrid (Marketing Site as React Component)

**Structure:**
- `runplusplans.com` → Marketing site (React component in same app)
- `runplusplans.com/app/*` → Training app routes

**Pros:**
- ✅ Single codebase
- ✅ Shared components/assets
- ✅ Easy navigation

**Cons:**
- ⚠️ Marketing site bundled with app (larger bundle)
- ⚠️ Less flexible for marketing team
- ⚠️ Harder to optimize marketing site separately

---

## 🎯 Recommended: Option A (Subdomain)

**Why:**
- Best separation of concerns
- Marketing site can be optimized independently
- Training app stays focused
- Industry standard (most SaaS apps do this)

---

## 📋 Implementation Steps

### Step 1: Marketing Site Setup

**If marketing site is static HTML/CSS/JS:**
1. Create `marketing/` directory in repo (or separate repo)
2. Build marketing site with "Log In" and "Sign Up" buttons
3. Buttons link to `https://app.runplusplans.com/auth` (or `/login`)

**If marketing site is React:**
1. Create separate React app in `marketing/` directory
2. Build with same Firebase config for auth
3. "Log In" button → `window.location.href = 'https://app.runplusplans.com/auth'`
4. "Sign Up" button → `window.location.href = 'https://app.runplusplans.com/auth?mode=signup'`

### Step 2: Firebase Hosting Configuration

**Update `firebase.json` for multi-site hosting:**

```json
{
  "hosting": [
    {
      "target": "marketing",
      "public": "marketing/build",
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
      ]
    }
  ]
}
```

**Firebase Hosting Sites:**
1. Go to Firebase Console → Hosting
2. Create two sites:
   - `runplusplans` (marketing site)
   - `app-runplusplans` (training app)
3. Configure custom domains:
   - `runplusplans.com` → `runplusplans` site
   - `app.runplusplans.com` → `app-runplusplans` site

### Step 3: Update Training App Routes

**Modify `src/App.js` to handle auth redirects:**

```javascript
// Add route for auth page (if not exists)
<Route
  path="/auth"
  element={<Auth />}
/>

// Update root route to redirect to app if logged in
<Route
  path="/"
  element={
    user ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />
  }
/>
```

**Remove current LandingPage from app:**
- Marketing site becomes the landing page
- App routes start at `/onboarding` or `/dashboard`

### Step 4: Marketing Site Buttons

**Marketing site HTML/React:**

```html
<!-- Log In Button -->
<a href="https://app.runplusplans.com/auth" class="btn btn-primary">
  Log In
</a>

<!-- Sign Up Button -->
<a href="https://app.runplusplans.com/auth?mode=signup" class="btn btn-success">
  Get Started
</a>
```

**Or if using React:**

```jsx
<button onClick={() => window.location.href = 'https://app.runplusplans.com/auth'}>
  Log In
</button>

<button onClick={() => window.location.href = 'https://app.runplusplans.com/auth?mode=signup'}>
  Get Started
</button>
```

### Step 5: Auth Flow Updates

**Update `src/components/Auth.js` to handle redirect after login:**

```javascript
// After successful login
const handleLogin = async () => {
  // ... login logic ...
  
  // Redirect to dashboard (or onboarding if no plan)
  if (userProfile && trainingPlan) {
    navigate('/dashboard');
  } else {
    navigate('/onboarding');
  }
};
```

### Step 6: DNS Configuration

**Add subdomain DNS record:**
- Type: `CNAME`
- Name: `app`
- Value: `app-runplusplans.web.app` (or Firebase hosting URL)

**Or use A record if Firebase provides IP:**
- Type: `A`
- Name: `app`
- Value: [Firebase IP address]

---

## 🔄 Alternative: Path-Based (If Subdomain Not Possible)

### Step 1: Marketing Site as Root

**Deploy marketing site to root:**
- `runplusplans.com/` → Marketing site
- `runplusplans.com/app/*` → Training app

**Firebase Hosting Rewrite Rules:**

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

**Update React Router:**

```javascript
// Wrap app routes in /app prefix
<Routes>
  <Route path="/app/*" element={<AppRoutes />} />
  <Route path="/*" element={<MarketingSite />} />
</Routes>
```

### Step 2: Marketing Site Buttons

```html
<a href="/app/auth">Log In</a>
<a href="/app/auth?mode=signup">Get Started</a>
```

---

## 📁 Directory Structure (Option A - Subdomain)

```
run-plus-plans/
├── marketing/              # Marketing site (separate)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── MarketingLanding.js
│   │   └── index.js
│   └── package.json
├── src/                    # Training app (current)
│   ├── components/
│   │   ├── Auth.js
│   │   ├── Dashboard.js
│   │   └── ...
│   └── App.js
├── firebase.json           # Multi-site config
└── package.json
```

---

## 🚀 Deployment Workflow

### Marketing Site:
```bash
cd marketing
npm run build
firebase deploy --only hosting:marketing
```

### Training App:
```bash
npm run build
firebase deploy --only hosting:app
```

### Both:
```bash
npm run build
cd marketing && npm run build && cd ..
firebase deploy --only hosting
```

---

## 🔐 Auth Sharing (If Needed)

**If marketing site needs to check auth status:**

**Option 1: Redirect to app (simplest)**
- Marketing site doesn't check auth
- "Log In" button always redirects to app
- App handles auth check

**Option 2: Shared Firebase Auth**
- Both sites use same Firebase project
- Marketing site can check `auth.currentUser`
- If logged in, redirect to `app.runplusplans.com/dashboard`

```javascript
// In marketing site
import { auth } from '../firebase/config';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = 'https://app.runplusplans.com/dashboard';
    }
  });
  return unsubscribe;
}, []);
```

---

## 📝 Next Steps

1. **Locate marketing site directory** (you mentioned you can point me to it)
2. **Choose architecture** (Option A recommended)
3. **Set up Firebase multi-site hosting**
4. **Update DNS for subdomain** (if Option A)
5. **Update marketing site buttons** to link to app
6. **Test auth flow** end-to-end
7. **Deploy both sites**

---

## ❓ Questions to Answer

1. **Where is the marketing site located?** (directory path)
2. **What technology is the marketing site?** (HTML/CSS/JS, React, Next.js, etc.)
3. **Do you have access to DNS settings?** (for subdomain setup)
4. **Should marketing site check auth status?** (or just redirect to app)
5. **Do you want separate repos?** (marketing site in separate repo vs. monorepo)

---

## 🎨 Marketing Site Requirements

**Must Have:**
- ✅ "Log In" button → `app.runplusplans.com/auth`
- ✅ "Sign Up" / "Get Started" button → `app.runplusplans.com/auth?mode=signup`
- ✅ Hero section with value proposition
- ✅ Features section (highlighting "Anti-Runna" advantages)
- ✅ Pricing (if applicable)
- ✅ Footer with links

**Nice to Have:**
- ✅ Blog section
- ✅ Testimonials
- ✅ Demo video
- ✅ FAQ section

---

## 🔍 SEO Considerations

**Marketing Site (runplusplans.com):**
- Static HTML or SSR (Next.js) for better SEO
- Meta tags, Open Graph, structured data
- Blog for content marketing
- Fast loading (CDN-hosted)

**Training App (app.runplusplans.com):**
- Can be SPA (React) - less SEO critical
- Focus on performance
- Auth-protected routes

---

## 📊 Example User Flow

1. User visits `runplusplans.com`
2. Sees marketing site with features, pricing, etc.
3. Clicks "Get Started" button
4. Redirected to `app.runplusplans.com/auth?mode=signup`
5. Signs up / logs in
6. Redirected to `app.runplusplans.com/onboarding` or `/dashboard`
7. Uses training app

---

## 🛠️ Tools Needed

- Firebase Hosting (multi-site)
- DNS access (for subdomain)
- Build tools (if marketing site needs building)
- CI/CD (optional, for automated deployments)

---

Let me know where your marketing site is located and I can help set this up!




