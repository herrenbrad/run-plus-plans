# Firestore Security Rules

## Required Rules for Beta Code System

Go to Firebase Console → Firestore Database → Rules

Add these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Beta codes - read-only for validation during signup
    match /betaCodes/{code} {
      // Allow anyone to READ codes (to check if valid/unused)
      allow read: if true;

      // Only allow WRITE if authenticated (for marking as used)
      // This happens after account creation
      allow write: if request.auth != null;
    }

    // User data - only owner can read/write
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Why These Rules?

**betaCodes:**
- `allow read: if true` - Anyone can check if a code is valid (needed during signup BEFORE account exists)
- `allow write: if request.auth != null` - Only authenticated users can mark codes as used (prevents abuse)

**users:**
- Standard user data protection - only you can access your own data

## How to Update Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** (left sidebar)
4. Click **Rules** tab (top)
5. **Replace** existing rules with the rules above
6. Click **Publish**

⚠️ **Important:** Make sure you update these rules BEFORE deploying the beta code system!
