# Google Play Store Release Steps

## Current Status: Step 1 - Creating Signing Keystore

### Step 1: Create Signing Keystore (IN PROGRESS)

**Run this command in Command Prompt or PowerShell:**

```cmd
cd "c:\run-plus-plans\android"
"C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore runplusplans-release-key.keystore -alias runplusplans -keyalg RSA -keysize 2048 -validity 10000
```

**When prompted, provide:**
- **Keystore password**: Choose a strong password (at least 6 characters) - **SAVE THIS!** You'll need it for every app update
- **Confirm password**: Re-enter the same password
- **First and last name**: Your name or company name
- **Organizational unit**: "Development" or press Enter
- **Organization**: "Run+ Plans" or your company name
- **City**: Your city
- **State**: Your state
- **Country code**: Two-letter code (e.g., US, UK, CA)
- Confirm with "yes"

**Result:** Creates `c:\run-plus-plans\android\runplusplans-release-key.keystore`

---

### Step 2: Configure Gradle for Signing

Create file: `c:\run-plus-plans\android\keystore.properties`

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEYSTORE_PASSWORD
keyAlias=runplusplans
storeFile=runplusplans-release-key.keystore
```

⚠️ **IMPORTANT**: Add `keystore.properties` to `.gitignore` to keep passwords secure!

Then edit `c:\run-plus-plans\android\app\build.gradle` to add signing config (Claude will do this).

---

### Step 3: Build Production React App

```bash
cd "c:\run-plus-plans"
npm run build
npx cap sync
```

---

### Step 4: Build Signed AAB

```bash
cd "c:\run-plus-plans\android"
./gradlew bundleRelease
```

**Output location:** `c:\run-plus-plans\android\app\build\outputs\bundle\release\app-release.aab`

---

### Step 5: Upload to Google Play Console

1. Go to https://play.google.com/console
2. Select "Run+ Plans" app
3. Go to "Release" → "Production" → "Create new release"
4. Upload `app-release.aab`
5. Add release notes (e.g., "Initial release - Personalized training plans with 113+ workout variations")

---

### Step 6: Add Screenshots

Upload your selected screenshots (7-8 total):
1. Week overview with calorie tracking (19 Miles, RunEQ breakdown)
2. In-plan flexibility (Choose Adventure + Life Adaptations)
3. Workout variety (3 tempo workout options)
4. Climate Smart adjustments
5. Injured runner support
6. Hard session scheduling
7. Equipment selection (Cyclete/ElliptiGO)

---

### Step 7: Complete Store Listing

**Short description** (80 chars max):
"Personalized training plans with 113+ workout variations for runners & cyclists"

**Full description** (4000 chars max):
- Highlight Climate Smart feature (differentiator vs Runna)
- Mention injured runner support
- Explain in-plan flexibility
- Note RunEQ bike equivalency
- List equipment support (Cyclete, ElliptiGO)

---

### Step 8: Submit for Review

Click "Review release" → "Start rollout to Production"

Google typically reviews within 1-3 days.

---

## Important Notes

- **Keystore Security**: NEVER lose your keystore file or password! You cannot update your app without it.
- **Backup**: Keep a secure backup of `runplusplans-release-key.keystore` and the password
- **Git Ignore**: Add `keystore.properties` to `.gitignore` before committing
- **Beta Testing**: After approval, post recruitment message in Cyclete Facebook group
- **Future Updates**: Use same keystore for all future app updates

---

## Quick Reference

**Google Play Console:** https://play.google.com/console
**App Bundle Location:** `android/app/build/outputs/bundle/release/app-release.aab`
**Keystore Location:** `android/runplusplans-release-key.keystore`
**Bundle ID:** `com.runplusplans.app`

---

## Next Session Tasks

When you return, start with Step 1 (create keystore) and Claude will guide you through the rest!
