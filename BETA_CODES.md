# Beta Access Codes

## Current Active Codes

These codes are in `src/components/Auth.js` (lines 11-16):

- `ELLIPTIGO2025` - For ElliptiGO Facebook group
- `CYCLETE2025` - For Cyclete users
- `RUNPLUS2025` - General beta access
- `BETA2025` - Emergency/backup code

## How to Add New Codes

1. **Open** `src/components/Auth.js`
2. **Find** the `VALID_BETA_CODES` array (around line 11)
3. **Add** your new code to the array:
   ```javascript
   const VALID_BETA_CODES = [
     'ELLIPTIGO2025',
     'CYCLETE2025',
     'RUNPLUS2025',
     'BETA2025',
     'YOURNEWCODE2025'  // <-- Add here
   ];
   ```
4. **Save** the file
5. **Deploy**:
   ```bash
   cd run-plus-plans
   git add .
   git commit -m "Add new beta access code"
   git push
   npm run deploy
   ```

## How to Share Codes

**In your Facebook group post:**
```
🎉 Beta Access is LIVE!

Visit: https://runplusplans.com
Use code: ELLIPTIGO2025

Limited to beta testers only!
```

## Notes

- Codes are **case-insensitive** (users can enter lowercase)
- Codes are stored in the code itself (simple and secure)
- No database needed - just edit the file and redeploy
- Takes ~2 minutes to go live after deploying
