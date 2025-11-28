# Firebase Functions Setup for Secure AI API Calls

## Overview
The Anthropic API key is now secured in Firebase Functions (server-side) instead of being exposed in client-side code.

## Setup Steps

### 1. Set the API Key Secret
```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```
When prompted, paste your Anthropic API key.

### 2. Deploy the Function
```bash
firebase deploy --only functions:callAnthropicAPI
```

Or deploy all functions:
```bash
firebase deploy --only functions
```

### 3. Verify Deployment
After deployment, check the Firebase Console:
- Go to Functions section
- Verify `callAnthropicAPI` is deployed and running

## How It Works

1. **Frontend** (`TrainingPlanAIService.js`) calls the Firebase Function instead of Anthropic directly
2. **Firebase Function** (`functions/index.js`) receives the request, verifies authentication, and makes the secure API call
3. **API Key** stays on the server - never exposed to the client

## Testing

After deployment, test by:
1. Generating a new training plan
2. Updating an existing plan
3. Creating an injury recovery plan

All should work the same, but now the API key is secure!

## Troubleshooting

**Error: "Anthropic API key not configured"**
- Make sure you set the secret: `firebase functions:secrets:set ANTHROPIC_API_KEY`
- Redeploy the function after setting the secret

**Error: "Unauthorized: User must be authenticated"**
- User must be logged in to use AI features
- This is by design for security






