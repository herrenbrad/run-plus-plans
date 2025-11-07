# Firestore Security Rules

## Required Rules for Approval System

Go to Firebase Console → Firestore Database → Rules

Add these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profiles - approval system
    match /users/{userId} {
      // Users can read and write their own profile
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Admin emails can read all users (for approval page)
      // TODO: Replace with your actual admin email
      allow read: if request.auth != null && request.auth.token.email in ['herrenbrad@gmail.com'];

      // Admin emails can update approval status
      allow update: if request.auth != null &&
                      request.auth.token.email in ['herrenbrad@gmail.com'] &&
                      request.resource.data.diff(resource.data).affectedKeys()
                        .hasOnly(['approvalStatus', 'approvedAt', 'approvedBy', 'deniedAt', 'deniedBy']);
    }
  }
}
```

## Why These Rules?

**users collection:**
- Users can read/write their own profile data
- Admin can read all user profiles (needed for approval page)
- Admin can only update approval-related fields (can't modify user data)
- The `affectedKeys().hasOnly()` ensures admins can only change approval status

## How to Update Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** (left sidebar)
4. Click **Rules** tab (top)
5. **Replace** existing rules with the rules above
6. **IMPORTANT:** Replace `'your-email@example.com'` with your actual admin email (in 2 places)
7. Click **Publish**

⚠️ **Critical:** Make sure to replace the admin email BEFORE publishing!

## Adding More Admins

To add more admin emails, use an array:

```javascript
request.auth.token.email in ['admin1@example.com', 'admin2@example.com', 'admin3@example.com']
```
