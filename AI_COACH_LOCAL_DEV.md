# AI Coach Feature - Local Development Guide

## Overview
The AI Coach feature analyzes completed workouts using Claude AI to provide personalized coaching insights. This feature is currently **LOCAL DEVELOPMENT ONLY** and should not be deployed to production as-is.

## What It Does
- Analyzes lap-by-lap workout data (pace, elevation, heart rate)
- Provides terrain-aware coaching (elevation ascent AND descent analysis)
- Explains why paces changed during the workout
- Gives actionable next-step advice for recovery and training
- Uses a conversational coaching voice (150-175 words)

## Key Differentiator: The "Anti-Runna"
Unlike Runna.ai's generic AI feedback, our coaching:
- ✅ **Terrain storytelling**: "Mile 2 at 11:15 looks fast, but you were riding that 180-foot descent"
- ✅ **Eccentric loading awareness**: Analyzes how descents impact quad recovery
- ✅ **Lap-by-lap narrative**: Specific mile references tied to terrain changes
- ✅ **Concise & actionable**: 150-175 words (not 200+ word essays)
- ✅ **Stand-up bike context**: Understands Cyclete/ElliptiGO are weight-bearing, no-impact

## How to Use (Local Testing)

### Prerequisites
1. You have a completed workout with lap-by-lap data synced from Strava
2. You have an Anthropic API key (https://console.anthropic.com/)

### Steps
1. **Start the dev server**:
   ```bash
   npm start
   ```

2. **Navigate to a completed workout**:
   - Go to Dashboard
   - Click on a completed workout that has lap splits

3. **Click "Get Coaching" button**:
   - Button appears below the Strava link (only if workout has lap data)
   - Enter your Anthropic API key when prompted
   - Wait for analysis (usually 2-5 seconds)

4. **View the coaching insights**:
   - Analysis appears in a blue-highlighted card below the button
   - Refresh the page to try again with different context

## Cost
- ~$0.01-0.03 per analysis
- Your $25 API credit = 800-2500 analyses

## Important Security Notes

### Why This Is LOCAL DEV ONLY
1. **API Key Exposure**: The Anthropic SDK is running in the browser with `dangerouslyAllowBrowser: true`
2. **No Backend**: GitHub Pages is static hosting - there's nowhere to hide the API key
3. **Prompt Injection Risk**: User could inspect network traffic and see/modify prompts

### For Production Deployment (Future)
You'll need ONE of these options:

**Option 1: Firebase Cloud Functions** (Recommended for current stack)
- Move AICoachService logic to a Cloud Function
- Store API key as Firebase environment variable
- Frontend calls Cloud Function instead of Claude API directly
- Estimated setup time: 1-2 hours

**Option 2: Netlify/Vercel Functions**
- Migrate from GitHub Pages to Netlify or Vercel
- Use their serverless functions for API calls
- Store API key as environment variable
- Estimated setup time: 2-3 hours (includes migration)

**Option 3: Separate Backend**
- Deploy Node.js API on Railway, Render, or similar
- Frontend calls your API, which calls Claude API
- Store API key in backend environment variables
- Estimated setup time: 3-4 hours

## Code Structure

### Frontend Service
**File**: `src/services/AICoachService.js`
- Calls Anthropic Claude API directly (browser-based)
- Builds coaching prompt with workout data + context
- Returns 150-175 word analysis

### UI Integration
**File**: `src/components/WorkoutDetail.js`
- Shows "Get Coaching" button on completed workouts
- Prompts for API key (local dev)
- Displays analysis in highlighted card

### Prompt Design
The prompt includes:
- Workout type (run vs stand-up bike)
- Lap-by-lap pace, elevation gain/loss, heart rate
- Prescribed workout context (what was planned)
- Training plan context (week number, goal race)
- Injury/fatigue notes (optional, for future expansion)

## Example Output
```
Great execution on this 4.5-mile run with significant elevation work. That 87 feet
of total gain tells an important story - Mile 2 at 11:15 pace looks fast, but you
were riding that descent. The quads absorbed that eccentric load, which is why Mile
3 backing off to 11:45 was smart.

Your heart rate staying controlled (average 152 bpm) shows you're adapting well to
terrain changes. The later splits getting progressively harder makes sense given
those descents early on.

Next workout: Keep Tuesday's run flat to let those quads recover from the eccentric
work. By Thursday you'll be ready for another hilly route. Consider hydration
strategy for these warmer conditions - that consistent heart rate elevation suggests
heat stress playing a small role.
```

## Testing Checklist
- [ ] Test with a run workout (with elevation changes)
- [ ] Test with a stand-up bike workout
- [ ] Test with a flat run (no elevation)
- [ ] Test with workout that has only 1-2 laps
- [ ] Test with very hilly workout (200+ ft gain)
- [ ] Verify it mentions eccentric loading on descents
- [ ] Verify it references specific lap numbers
- [ ] Verify word count is 150-175 words
- [ ] Verify no real coach names are used

## Future Enhancements
1. **Automatic analysis**: Trigger on Strava sync (requires backend)
2. **Analysis history**: Store past analyses in Firebase
3. **Custom coaching style**: User preference for different coaching voices
4. **Bike vs run prompts**: Separate prompts for different workout types
5. **Injury tracking integration**: Use injury history to inform recovery advice
6. **Cost controls**: Usage limits per user/month

## Troubleshooting

### "No workout data available for analysis"
- Workout must have lap splits (synced from Strava, not manual entry)
- Check that `completionData.laps` exists in console

### "Error calling Claude API"
- Verify API key is correct
- Check network tab for specific error
- Ensure you have API credits remaining

### Button doesn't appear
- Workout must be marked as completed
- Workout must have lap data (`completionData.laps.length > 0`)

### Analysis is too generic
- This usually means lap data is missing elevation info
- Check that Strava activity had GPS elevation data

## Files Modified
- `src/services/AICoachService.js` (NEW)
- `src/components/WorkoutDetail.js` (MODIFIED - added coaching button and display)
- `package.json` (MODIFIED - added @anthropic-ai/sdk dependency)

## Removal Instructions
If you want to remove this feature before production:
1. Delete `src/services/AICoachService.js`
2. Remove the import and all coaching-related code from `WorkoutDetail.js` (lines with `coachingAnalysis`, `loadingCoaching`, `handleGetCoaching`)
3. Run `npm uninstall @anthropic-ai/sdk`
4. Delete this file (`AI_COACH_LOCAL_DEV.md`)
