# Test Scripts for Plan Generation

## Quick Start

### 1. Fill in the Profile Template

Edit `test-profile-template.json` with your test data:
- Remove the `_comment` field
- Fill in all the required fields
- Save it (e.g., as `my-test-profile.json`)

### 2. Use Dev Mode (Recommended)

1. Start your dev server: `npm start`
2. Log in with `herrenbrad@gmail.com`
3. Navigate to `/dev`
4. Click "Load Template" or paste your profile JSON
5. Click "Generate Plan"
6. View results instantly!

### 3. Use Test Script (Alternative)

The test script (`test-plan-generation.js`) is a template that needs to be adapted to your build setup. It currently shows instructions for how to use it.

**Note:** The script requires ES module support. You may need to:
- Use `ts-node` if you have TypeScript
- Convert to CommonJS
- Or just use Dev Mode instead (easier!)

## Files

- `test-profile-template.json` - Template for your test profile
- `expected-results-template.json` - Optional: Define expected outcomes for comparison
- `test-plan-generation.js` - Test script (needs setup)
- `README.md` - This file

## Profile Fields Explained

See `test-profile-template.json` for all fields with comments.

Key fields:
- `raceDistance`: "5K", "10K", "Half Marathon", "Marathon"
- `raceTime`: Goal time (e.g., "2:00:00")
- `raceDate`: Race date (YYYY-MM-DD)
- `startDate`: Training start date (YYYY-MM-DD)
- `currentWeeklyMileage`: Current weekly mileage (number)
- `currentLongRun`: Current long run distance (number)
- `availableDays`: Array of days you can run (e.g., ["Monday", "Wednesday", "Friday", "Saturday"])
- `restDays`: Array of rest days (e.g., ["Tuesday", "Thursday", "Sunday"])
- `qualityDays`: Array of hard workout days (e.g., ["Wednesday", "Friday"])
- `standUpBikeType`: "cyclete", "elliptigo", or null
- `preferredBikeDays`: Array of bike days (e.g., ["Monday"])

## Expected Results (Optional)

If you want to compare generated plans against expected outcomes, fill in `expected-results-template.json`:

- Define expected mileages for key weeks
- Define which days should have hard workouts
- Define which days should be rest
- Define expected phases

The comparison will highlight differences.

## Tips

1. **Start with Dev Mode** - It's the easiest way to test
2. **Save your profile** - Once you have a working profile, save it for reuse
3. **Test incrementally** - Make one change at a time
4. **Check validation results** - Dev Mode shows validation errors
5. **Use browser console** - Check for detailed logs

## Troubleshooting

**Dev Mode shows "Access Denied":**
- Make sure you're logged in with `herrenbrad@gmail.com`
- Check Firebase Auth is working

**Plan generation fails:**
- Check browser console for errors
- Verify profile JSON is valid
- Check that all required fields are present

**Validation errors:**
- These are warnings, not failures
- Fix the issues one by one
- Some may be expected (e.g., if testing edge cases)



