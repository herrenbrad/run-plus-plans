# User Approval System - Setup Guide

The beta code system has been replaced with a simpler user approval system!

## How It Works

1. **Anyone can sign up** (no beta code needed)
2. **New accounts are "pending"** - they can't access the app yet
3. **You get notified** when someone signs up
4. **You approve or deny** via the admin page
5. **They get access** once approved

## Setup Steps

### Step 1: Update Admin Email in Code

You need to add your email as an admin in 2 files:

**File 1: `src/components/AdminApproval.js` (line 16)**

Replace:
```javascript
const ADMIN_EMAILS = ['your-email@example.com'];
```

With your actual email:
```javascript
const ADMIN_EMAILS = ['youremail@gmail.com'];
```

**File 2: Already updated in `FIRESTORE_RULES.md`**

You'll add your email when you update Firestore rules (Step 2).

---

### Step 2: Update Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **run-plus-plans**
3. Click **Firestore Database** (left sidebar)
4. Click **Rules** tab (top)
5. **Replace ALL existing rules** with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profiles - approval system
    match /users/{userId} {
      // Users can read and write their own profile
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Admin emails can read all users (for approval page)
      // REPLACE WITH YOUR EMAIL:
      allow read: if request.auth != null && request.auth.token.email in ['youremail@gmail.com'];

      // Admin emails can update approval status
      allow update: if request.auth != null &&
                      request.auth.token.email in ['youremail@gmail.com'] &&
                      request.resource.data.diff(resource.data).affectedKeys()
                        .hasOnly(['approvalStatus', 'approvedAt', 'approvedBy', 'deniedAt', 'deniedBy']);
    }
  }
}
```

6. **CRITICAL:** Replace `youremail@gmail.com` with your actual email (appears in 2 places)
7. Click **Publish**

---

### Step 3: Deploy to Firebase

```bash
cd run-plus-plans
npm run build
firebase deploy
```

---

### Step 4: Test the System

**Test as a New User:**

1. Go to https://runplusplans.com
2. Click "Sign Up"
3. Create a test account (use a different email)
4. After signup, you should see: "Account Pending Approval"

**Test as Admin:**

1. Open a new incognito window
2. Go to https://runplusplans.com
3. Login with YOUR admin email
4. Visit: https://runplusplans.com/admin/approvals
5. You should see the pending test account
6. Click "Approve"
7. The test account should now have access!

---

## Using the Admin Page

### Accessing Admin Page

**Direct URL:**
https://runplusplans.com/admin/approvals

**Important:**
- Only works if you're logged in with an admin email
- Bookmark this URL for quick access

### Approving Users

1. Go to admin page
2. See list of pending users (name, email, signup date)
3. Click "✅ Approve" to grant access
4. User can now use the app!

### Denying Users

1. Click "❌ Deny" instead
2. User will remain blocked
3. They'll need to create a new account

---

## Getting Notified of New Signups

### Option 1: Manual Check
- Just visit `/admin/approvals` periodically
- Click "🔄 Refresh" to reload

### Option 2: Email Notifications (Optional)

Currently, you'll need to manually check the admin page. To set up automatic email notifications:

**Using Firebase Extensions (Easiest):**

1. Go to Firebase Console → Extensions
2. Install "Trigger Email" extension
3. Configure it to send you an email when a new document is added to `users` collection with `approvalStatus: 'pending'`

**Cost:** Free tier includes 200 emails/day

**Alternative:** You could add a webhook service like Zapier to watch Firestore and send emails.

---

## FAQ

**Q: What happens to old beta codes?**
A: They're no longer needed. The beta code system has been completely removed.

**Q: Can I have multiple admins?**
A: Yes! In both files (AdminApproval.js and Firestore rules), change the email array:
```javascript
['admin1@gmail.com', 'admin2@gmail.com', 'admin3@gmail.com']
```

**Q: What if I accidentally deny someone?**
A: They'll need to create a new account with a different email. Or you can manually change their `approvalStatus` to `approved` in Firestore.

**Q: Can I auto-approve certain email domains?**
A: Yes, but requires custom code. For now, manual approval is safer for beta.

---

## Troubleshooting

**"Access Denied" on admin page:**
- Make sure you're logged in with the admin email
- Check that you updated BOTH files with your admin email
- Check that Firestore rules are published

**Pending users not showing up:**
- Click "🔄 Refresh" button
- Check browser console for errors
- Verify Firestore rules allow admin reads

**Can't approve users:**
- Check Firestore rules allow admin updates
- Make sure admin email matches exactly (case-sensitive)

---

## Next Steps

1. Update admin email in code files
2. Update and publish Firestore rules
3. Deploy to Firebase
4. Test with a dummy account
5. Share signup link with beta testers!
6. Check admin page regularly for new signups

**Your approval page:** https://runplusplans.com/admin/approvals

Bookmark it! 🔖
