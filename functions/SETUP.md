# Email Notification Setup Guide

This guide will help you configure email notifications for new user sign-ups.

## Prerequisites

- Gmail account (or other email service)
- Firebase CLI installed
- Admin access to your Firebase project

## Step 1: Install Dependencies

```bash
cd functions
npm install
```

## Step 2: Configure Gmail App Password (Recommended)

If you're using Gmail, you need to create an App Password:

1. Go to your Google Account: https://myaccount.google.com/
2. Enable 2-Factor Authentication if not already enabled
3. Go to Security > App Passwords: https://myaccount.google.com/apppasswords
4. Select "Mail" and "Other (Custom name)"
5. Name it "Run+ Plans Notifications"
6. Copy the generated 16-character password

## Step 3: Set Environment Variables

### Option A: Using Firebase CLI (Recommended for Production)

```bash
# Set your Gmail credentials
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.pass="your-app-password-here"

# Set admin email (where notifications will be sent)
firebase functions:config:set email.admin="your-admin-email@example.com"

# View current config
firebase functions:config:get
```

### Option B: Using .env file (For Local Testing)

Create `functions/.env`:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password-here
ADMIN_EMAIL=your-admin-email@example.com
```

**⚠️ IMPORTANT:** Add `functions/.env` to `.gitignore` to avoid committing credentials!

## Step 4: Test Locally (Optional)

```bash
# Run functions emulator
cd functions
npm run serve

# In another terminal, test your function
firebase functions:shell
```

## Step 5: Deploy Functions

```bash
# From project root
firebase deploy --only functions

# Or just deploy hosting + functions together
firebase deploy
```

## Step 6: Test It!

1. Create a new user account on your app
2. Check your admin email inbox
3. You should receive an email with:
   - User's name and email
   - User ID
   - Link to Firebase Console
   - Approval status

## Troubleshooting

### Email not sending?

1. **Check Firebase Functions logs:**
   ```bash
   firebase functions:log
   ```

2. **Verify environment variables are set:**
   ```bash
   firebase functions:config:get
   ```

3. **Check Firestore `adminNotifications` collection:**
   - Even if email fails, notifications are stored here
   - Look for `emailSent: false` with error messages

### Gmail blocking sign-ins?

- Make sure 2FA is enabled
- Use App Password (not your regular Gmail password)
- Check "Less secure app access" is NOT enabled (use App Password instead)

### Using a different email provider?

Edit `functions/index.js` and change the transporter configuration:

```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});
```

## Backup Notification System

Even if email fails, all notifications are stored in Firestore:

**Collection:** `adminNotifications`

Fields:
- `type`: "new_user_signup"
- `userId`: User's Firebase Auth ID
- `userEmail`: User's email address
- `displayName`: User's name
- `approvalStatus`: Current approval status
- `createdAt`: When user signed up
- `notifiedAt`: When notification was created
- `emailSent`: Boolean (true if email sent successfully)
- `error`: Error message (if email failed)

You can set up a Firebase Console alert or regularly check this collection.

## Cost Considerations

Firebase Cloud Functions pricing:
- First 2 million invocations/month: FREE
- First 400,000 GB-seconds compute time: FREE

For a small app with occasional sign-ups, you'll stay within the free tier.

## Security Notes

✅ **DO:**
- Use environment variables for credentials
- Use App Passwords (never your main password)
- Add `.env` files to `.gitignore`
- Enable 2FA on your Gmail account

❌ **DON'T:**
- Commit credentials to Git
- Share your App Password
- Use "Less secure app access"
- Hardcode passwords in code

## Support

If you need help:
1. Check Firebase Functions logs
2. Review Firestore `adminNotifications` collection
3. Test with Firebase emulator locally
4. Check Gmail security settings

## Alternative: Third-Party Email Services

For production, consider using dedicated email services:

- **SendGrid** - 100 emails/day free
- **Mailgun** - First 5,000 emails free
- **AWS SES** - 62,000 emails/month free (with EC2)
- **Postmark** - 100 emails/month free

These often have better deliverability than Gmail SMTP.
