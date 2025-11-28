# Email Notification Setup for New User Approvals

## Overview
You'll receive email notifications when new users sign up and need approval.

## Setup Steps

### 1. Set Email Secrets

You need to set 3 secrets in Firebase:

**Your Gmail address (the one sending emails):**
```bash
firebase functions:secrets:set EMAIL_USER
```
When prompted, enter your Gmail address (e.g., `yourname@gmail.com`)

**Gmail App Password (NOT your regular password):**
```bash
firebase functions:secrets:set EMAIL_PASS
```
When prompted, enter your Gmail App Password (see Step 2 below for how to get this)

**Admin Email (where you want to receive notifications):**
```bash
firebase functions:secrets:set ADMIN_EMAIL
```
When prompted, enter the email where you want to receive notifications (e.g., `herrenbrad@gmail.com`)

### 2. Get Gmail App Password

Since you're using Gmail, you need to create an App Password (not your regular Gmail password):

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** (left sidebar)
3. Under "How you sign in to Google", click **2-Step Verification** (must be enabled)
4. Scroll down and click **App passwords**
5. Select **Mail** and **Other (Custom name)**
6. Enter "Run+ Plans Notifications" as the name
7. Click **Generate**
8. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)
9. Use this password (without spaces) when setting the `EMAIL_PASS` secret

### 3. Deploy the Function

After setting all 3 secrets, deploy the function:

```bash
firebase deploy --only functions:sendNewUserNotification
```

Or deploy all functions:

```bash
firebase deploy --only functions
```

### 4. Test It

1. Create a test account (or have someone sign up)
2. You should receive an email notification within seconds
3. The email will include:
   - User's name and email
   - A direct link to approve them
   - A link to view in Firebase Console

## Troubleshooting

**No emails received:**
- Check Firebase Functions logs: `firebase functions:log`
- Verify all 3 secrets are set: Check in Firebase Console → Functions → Configuration
- Make sure you're using a Gmail App Password, not your regular password
- Check spam folder

**Error: "Invalid login"**
- You're using your regular Gmail password instead of an App Password
- Go back to Step 2 and create an App Password

**Function not triggering:**
- Make sure the function is deployed: `firebase functions:list`
- Check that new users are being created with `createdAt` timestamp
- Check Firestore rules allow the function to read user documents

## Email Content

The email includes:
- User's display name and email
- User ID
- Approval status
- Sign-up timestamp
- Direct link to approve page
- Link to Firebase Console

## Security Notes

- Email credentials are stored as Firebase Secrets (encrypted)
- Only the function can access these secrets
- The function only triggers on NEW user creation (checks for `createdAt`)
- All email sending is logged in Firestore (`adminNotifications` collection)


c


