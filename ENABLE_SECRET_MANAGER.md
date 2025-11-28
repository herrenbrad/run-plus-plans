# Enabling Secret Manager API for Firebase

## The Issue
Even with Blaze billing enabled, the Secret Manager API needs to be explicitly enabled in Google Cloud Console.

## Quick Fix Steps

### Option 1: Enable via Google Cloud Console (Recommended)

1. **Open the API Library:**
   - Go to: https://console.cloud.google.com/apis/library/secretmanager.googleapis.com?project=run-plus-plans
   - Or navigate: Google Cloud Console → APIs & Services → Library → Search "Secret Manager API"

2. **Enable the API:**
   - Click "Enable" button
   - Wait 1-2 minutes for it to activate

3. **Retry the Secret Setup:**
   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```

### Option 2: Wait for Propagation

If you just enabled billing:
- Sometimes it takes 5-15 minutes for billing to fully propagate
- Try again in 10 minutes

### Option 3: Verify Billing is Active

1. Go to: https://console.cloud.google.com/billing?project=run-plus-plans
2. Verify your billing account is linked and active
3. Check that the project shows "Blaze Plan" status

## After Enabling

Once the Secret Manager API is enabled, you should be able to:

```bash
# Set the secret
firebase functions:secrets:set ANTHROPIC_API_KEY

# Deploy the function
firebase deploy --only functions:callAnthropicAPI
```

## Troubleshooting

**Still getting 403?**
- Make sure you're logged into the correct Google account in Firebase CLI: `firebase login`
- Verify project: `firebase use run-plus-plans`
- Check billing account is linked: https://console.cloud.google.com/billing?project=run-plus-plans





