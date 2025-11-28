# Production Deployment Checklist

## ✅ Pre-Deployment Verification

### Code Quality
- [x] **No ESLint errors** - All linting issues resolved
- [x] **No hardcoded localhost URLs** - All URLs are relative or environment-aware
- [x] **Subdomain configuration** - `app.runplusplans.com` configured in `CNAME` and `package.json`
- [x] **Routing updated** - Auth route (`/auth`) properly configured
- [x] **Injury handling fixed** - AI prompts now properly mention injuries
- [x] **Cross-training equipment** - All selected equipment will be used

### Build Configuration
- [x] **Homepage set** - `package.json` has `"homepage": "https://app.runplusplans.com"`
- [x] **CNAME file** - `public/CNAME` contains `app.runplusplans.com`
- [x] **Build script** - `npm run build:prod` configured (disables source maps)
- [x] **Deploy script** - `npm run deploy` uses `gh-pages`

## 🚀 Deployment Steps

### Step 1: Final Local Test
```bash
# Build locally to catch any build errors
npm run build:prod

# Test the build locally (optional)
npx serve -s build
```

### Step 2: Commit All Changes
```bash
git add .
git commit -m "Fix: Injury mentions, cross-training equipment, subdomain routing"
git push origin main
```

### Step 3: Deploy to GitHub Pages
```bash
npm run deploy
```

This will:
1. Run `predeploy` (builds with `build:prod`)
2. Deploy `build/` folder to `gh-pages` branch
3. GitHub Pages will serve from `app.runplusplans.com`

### Step 4: Verify GitHub Pages Settings
1. Go to your repo → **Settings** → **Pages**
2. Verify:
   - **Source**: `gh-pages` branch
   - **Custom domain**: `app.runplusplans.com`
   - **Enforce HTTPS**: ✅ Checked

### Step 5: Verify DNS (if not already done)
- Ensure `app.runplusplans.com` CNAME points to your GitHub Pages URL
- Wait for DNS propagation (can take up to 24 hours, usually 5-15 minutes)

## 🔍 Post-Deployment Verification

### Test These Features:
1. **Authentication**
   - [ ] Sign up new user
   - [ ] Login existing user
   - [ ] Logout works

2. **Onboarding Flow**
   - [ ] Profile creation
   - [ ] Injury selection (verify AI mentions injuries)
   - [ ] Cross-training equipment selection

3. **AI Plan Generation**
   - [ ] Plan generates successfully
   - [ ] Injuries are mentioned in coaching analysis
   - [ ] All selected cross-training equipment is used
   - [ ] Week parsing works correctly

4. **Routing**
   - [ ] Root `/` redirects properly
   - [ ] `/auth` route works
   - [ ] `/dashboard` loads correctly
   - [ ] All internal navigation works

5. **Firebase Integration**
   - [ ] Data saves to Firestore
   - [ ] Real-time updates work
   - [ ] Authentication persists

## ⚠️ Common Issues & Solutions

### Issue: "404 on refresh"
**Solution**: GitHub Pages needs a `404.html` that redirects to `index.html`. React Router handles this.

### Issue: "API calls failing"
**Solution**: 
- Verify Firebase config is correct
- Check Firebase Functions are deployed (if using)
- Verify Anthropic API key is set in Firebase Functions secrets

### Issue: "Styles not loading"
**Solution**: 
- Check `homepage` in `package.json` matches your domain
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for 404 errors

### Issue: "Subdomain not working"
**Solution**:
- Verify `CNAME` file is in `public/` folder
- Check DNS CNAME record points to GitHub Pages
- Wait for DNS propagation

## 📊 What Changed Since Last Deployment

### Fixed Issues:
1. **ESLint errors** - Fixed `availableEquipment` scope issue
2. **Injury mentions** - AI now properly mentions user injuries in coaching analysis
3. **Cross-training equipment** - AI now uses ALL selected equipment, not just primary
4. **Subdomain routing** - App configured for `app.runplusplans.com`
5. **Auth routing** - Added `/auth` route for marketing site integration

### New Features:
- Marketing site integration (links point to `app.runplusplans.com/auth`)
- Improved injury recovery prompts
- Better equipment rotation in cross-training plans

## 🎯 Expected Behavior

After deployment, you should see:
- ✅ App loads at `app.runplusplans.com`
- ✅ No console errors
- ✅ AI mentions injuries when user has them selected
- ✅ Cross-training plans use all selected equipment
- ✅ All routes work correctly
- ✅ Firebase integration works

## 📝 Notes

- **Build time**: ~2-3 minutes
- **Deployment time**: ~1-2 minutes
- **DNS propagation**: 5-15 minutes (can be up to 24 hours)
- **Cache**: Users may need to hard refresh (Ctrl+Shift+R) to see changes

---

**Ready to deploy?** Run `npm run deploy` and follow the verification steps above!



