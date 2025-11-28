# Marketing Site Integration - Status Update

## ✅ Completed

### 1. Marketing Site Links Updated
**File:** `C:\Users\bradh\runplusplans-website\index.html`

- ✅ Navigation "Login" link → `https://app.runplusplans.com/auth`
- ✅ Hero "Login" button → `https://app.runplusplans.com/auth`
- ✅ Hero "Join Beta Waitlist" → Changed to "Get Started" → `https://app.runplusplans.com/auth?mode=signup`

### 2. Auth Component Updated
**File:** `src/components/Auth.js`

- ✅ Added `useEffect` to check for `?mode=signup` query param
- ✅ Automatically shows signup form when coming from marketing site "Get Started" button

### 3. Configuration Files Created
- ✅ `firebase.json.multi-site` - Example multi-site hosting config
- ✅ `.firebaserc.multi-site` - Example Firebase targets config

---

## 🚧 Next Steps (Manual)

### Step 1: Set Up Firebase Hosting Sites

1. Go to **Firebase Console** → **Hosting**
2. Click **"Add another site"** (or "Add site")
3. Create two sites:
   - **Site 1:** `runplusplans` (for marketing site)
   - **Site 2:** `app-runplusplans` (for training app)

### Step 2: Update Firebase Config Files

**Replace current `firebase.json` with multi-site version:**

```bash
# Backup current config
cp firebase.json firebase.json.backup

# Use multi-site config
cp firebase.json.multi-site firebase.json
```

**Update `.firebaserc`:**

```bash
# Backup current config
cp .firebaserc .firebaserc.backup

# Use multi-site config
cp .firebaserc.multi-site .firebaserc
```

**Note:** Adjust the marketing site path in `firebase.json` if needed:
- Current: `"public": "../runplusplans-website"`
- If marketing site is elsewhere, update this path

### Step 3: Configure DNS (Subdomain)

**In your domain registrar (e.g., Namecheap, GoDaddy):**

**Add CNAME record:**
```
Type: CNAME
Name: app
Value: app-runplusplans.web.app
TTL: Automatic (or 3600)
```

**Or if Firebase provides A records:**
- Check Firebase Console → Hosting → Site settings for IP addresses
- Add A records pointing to those IPs

**DNS Propagation:**
- Can take 24-48 hours (usually faster)
- Check status: [dnschecker.org](https://dnschecker.org)
- Test: `nslookup app.runplusplans.com` or `dig app.runplusplans.com`

### Step 4: Deploy Both Sites

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

### Step 5: Test

- [ ] Marketing site loads at `runplusplans.com`
- [ ] "Login" button redirects to `app.runplusplans.com/auth`
- [ ] "Get Started" button redirects to `app.runplusplans.com/auth?mode=signup`
- [ ] Training app loads at `app.runplusplans.com`
- [ ] Auth flow works (login/signup)
- [ ] After login, redirects to dashboard
- [ ] After signup, redirects to onboarding

---

## 📋 Files Modified

1. ✅ `C:\Users\bradh\runplusplans-website\index.html` - Updated links
2. ✅ `src/components/Auth.js` - Added signup mode detection
3. ✅ `firebase.json.multi-site` - Created (example config)
4. ✅ `.firebaserc.multi-site` - Created (example config)

---

## 📋 Files That Need Manual Updates

1. ⚠️ `firebase.json` - Replace with multi-site version
2. ⚠️ `.firebaserc` - Replace with multi-site version
3. ⚠️ DNS settings - Add CNAME record for `app` subdomain

---

## 🔄 Alternative: Path-Based (If Subdomain Not Possible)

If you can't set up a subdomain, we can use path-based routing instead:

- `runplusplans.com/` → Marketing site
- `runplusplans.com/app/*` → Training app

**Changes needed:**
1. Update marketing site links to `/app/auth` (relative paths)
2. Update Firebase hosting to use rewrites
3. Update React Router to handle `/app/*` prefix

Let me know if you want to go this route instead!

---

## 🎯 Current State

**Marketing Site:**
- ✅ Links updated to point to `app.runplusplans.com`
- ✅ "Get Started" button includes `?mode=signup` param
- ⚠️ Not yet deployed to Firebase (needs Step 4)

**Training App:**
- ✅ Auth component handles signup mode
- ✅ Ready for multi-site deployment
- ⚠️ Not yet configured for subdomain (needs Steps 1-3)

---

## 💡 Quick Reference

**Marketing Site Location:** `C:\Users\bradh\runplusplans-website`

**Training App Location:** `C:\run-plus-plans`

**Marketing Site URLs:**
- Login: `https://app.runplusplans.com/auth`
- Sign Up: `https://app.runplusplans.com/auth?mode=signup`

**Firebase Sites (to be created):**
- Marketing: `runplusplans`
- App: `app-runplusplans`

---

Ready to proceed with the manual steps? Let me know if you need help with any of them!




