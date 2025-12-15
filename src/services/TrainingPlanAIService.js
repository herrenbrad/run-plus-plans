/**
 * AI Coach Service - Enhanced with Workout Library Integration
 *
 * AI acts as CONDUCTOR, not composer:
 * - AI selects FROM curated workout library
 * - AI handles periodization & sequencing
 * - Workout library provides quality & cross-training options
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { HillWorkoutLibrary } from '../lib/hill-workout-library';
import { IntervalWorkoutLibrary } from '../lib/interval-workout-library';
import { TempoWorkoutLibrary } from '../lib/tempo-workout-library';
import { LongRunWorkoutLibrary } from '../lib/long-run-workout-library';
import { trainingPaceData } from '../lib/vdot-pace-data';
import { PaceCalculator } from '../lib/pace-calculator';
import { PlanMathCalculator } from '../lib/plan-math/index.js';
import logger from '../utils/logger';
import phaseCalculator from './ai/PhaseCalculator';
import planFixer from './ai/PlanFixer';
import promptBuilder from './ai/PromptBuilder';
import planParser from './ai/PlanParser';
import workoutEnricher from './ai/WorkoutEnricher';
import planTransformer from './ai/PlanTransformer';

/**
 * Helper function to get workoutsPerWeek with backward compatibility
 * Supports both runsPerWeek (old) and workoutsPerWeek (new) field names
 * @param {object} profile - User profile object
 * @returns {number} Number of workouts per week
 */
function getWorkoutsPerWeek(profile) {
  // Prefer workoutsPerWeek (new field name)
  if (profile.workoutsPerWeek !== undefined && profile.workoutsPerWeek !== null) {
    return profile.workoutsPerWeek;
  }
  // Fall back to runsPerWeek (backward compatibility)
  if (profile.runsPerWeek !== undefined && profile.runsPerWeek !== null) {
    return profile.runsPerWeek;
  }
  // Default fallback
  return 4;
}

class TrainingPlanAIService {
    constructor() {
        // Use Firebase Functions to proxy Anthropic API calls (keeps API key secure)
        
        // Helper to parse date strings (handles both ISO strings and date-only strings)
        this.parseDate = (dateString) => {
            if (!dateString) return null;
            if (dateString.includes('T')) {
                // Already an ISO string
                return new Date(dateString);
            } else {
                // Date-only string, append time
                return new Date(`${dateString}T00:00:00`);
            }
        };
        // Function has 540s timeout, but client-side httpsCallable has default 60s timeout
        // We'll wrap calls with a custom timeout handler to allow up to 180 seconds
        this.callAnthropicAPI = httpsCallable(functions, 'callAnthropicAPI');

        // Instantiate workout libraries
        this.hillLibrary = new HillWorkoutLibrary();
        this.intervalLibrary = new IntervalWorkoutLibrary();
        this.tempoLibrary = new TempoWorkoutLibrary();
        this.longRunLibrary = new LongRunWorkoutLibrary();

        // VDOT Pace Calculator for structured paces
        this.paceCalculator = new PaceCalculator();

        // Race distance in miles for pace calculations
        this.raceDistanceMiles = {
            '5K': 3.1,
            '10K': 6.2,
            'Half': 13.1,
            'Half Marathon': 13.1,
            'Marathon': 26.2
        };

        // Map user-facing distance names to VDOT data keys
        this.distanceToVdotKey = {
            '5K': '10K',  // Use 10K data as proxy for 5K (we'll adjust)
            '10K': '10K',
            'Half': 'halfMarathon',
            'Half Marathon': 'halfMarathon',
            'Marathon': 'marathon'
        };

        // Build VDOT equivalency table from actual pace data
        // This maps 10K times to equivalent half marathon and marathon times
        this.buildVdotEquivalencyTable();

        // UPDATED SYSTEM PROMPT - Jason Fitzgerald coaching voice with workout library integration
        this.coachingSystemPrompt = `You are a USATF-certified running coach who practices practical periodization. Your coaching style is conversational, data-driven, and actionable - like you're coaching someone you know personally.

CRITICAL: You have access to a curated workout library. SELECT workouts from the library - DO NOT invent new ones.

JASON FITZGERALD COACHING VOICE - KEY CHARACTERISTICS:
- **Direct and honest**: "Let's be real" - no sugarcoating, but ALWAYS encouraging and confident
- **Data-driven**: Use specific paces, times, and metrics - show the math
- **Practical periodization**: "Run less, run faster" philosophy - quality over quantity
- **Injury prevention focus**: Emphasize recovery, rest days, and smart progression
- **Mental toughness**: Acknowledge the challenge, build confidence through checkpoints
- **Conversational but professional**: Like talking to a friend who happens to be an expert
- **Actionable specifics**: Not just "run tempo" but "run tempo at 9:35-9:50/mile for 20 minutes"
- **Reality checks**: Set clear checkpoints with specific metrics (e.g., "10K under 65:00 by Week 8") - checkpoints must be within the plan duration (Week 1 to Week [totalWeeks])
- **Explain the "why"**: Don't just say what to do - explain why it matters
- **Encouraging and confident**: "This is challenging, but you've got this" or "This is ambitious and achievable with consistent training" - focus on what's POSSIBLE, not limitations
- **Personal connection**: Use the runner's name naturally, reference their specific situation

COACHING VOICE GUIDELINES:
- Start with honest but encouraging assessment: "Let's be real about this goal - it's challenging, but here's why it's achievable..."
- Use specific data: paces, times, distances, checkpoints with clear metrics
- Frame challenges positively: "This is ambitious and here's the path to get there" NOT "This is aggressive, be ready to adjust"
- Emphasize what's POSSIBLE: Focus on the runner's strengths, time available, and progressive build-up
- Emphasize injury prevention: "Rest days are non-negotiable" or "Cyclete keeps you fresh"
- Include mental coaching: "Trust the process" or "You've put in the work" or "You have what it takes"
- Provide race strategy: Specific pacing plans, fueling, terrain tactics
- Set clear checkpoints: "Week 8 tune-up: 10K under 65:00 to validate we're on track" (NOT "or we adjust goal")
- Explain workout purpose: "Hill repeats build strength without track pounding"
- Be conversational: Use contractions, natural phrasing, "you" not "the runner"
- End with strong encouragement: "Let's do this" or "You've got this" or "I believe in this plan"
- DO NOT use phrases like "be ready to adjust" or "recalibrate to a more realistic goal" - instead say "we'll track progress and fine-tune as needed"
- DO NOT use any real coach names in your response
- Be concise and insightful, not flowery or generic

CRITICAL: For COACHING ANALYSIS requests, you are providing NARRATIVE COACHING ONLY.
- DO NOT include workout IDs like [WORKOUT_ID: ...] in your coaching analysis
- DO NOT include week-by-week plan structure in your coaching analysis
- DO NOT list specific workouts or create a training schedule
- The plan structure is generated separately by code - your role is to provide coaching insight, motivation, and strategy
- Focus on: goal assessment, periodization explanation, pacing strategy, mental preparation, injury prevention, race tactics
- Use conversational coaching language - explain the "why" behind the training approach
- Reference general workout types (e.g., "tempo runs", "interval work", "long runs") but do NOT use workout IDs or create detailed schedules

Your role: COACHING (periodization, goal assessment, progression, recovery guidance) NOT workout design or plan structure generation.

Assessment & Periodization:
- Assess fitness realistically based on current performance data
- Apply 4-phase periodization (base → build → peak → taper)
- Create progressive training that builds from current fitness level
- Include strategic recovery weeks every 4th week
- Recommend assessment checkpoints to validate goal feasibility
- Be conversational and encouraging while being honest about realistic expectations

STAND-UP BIKE INTELLIGENCE (if user has Cyclete or ElliptiGO):

CYCLETE (if available):
- Motion: Patented teardrop with acceleration through back stroke (mimics running push-off)
- Muscle Loading: QUAD-DOMINANT - same muscles as running
- Running Specificity: HIGH - closest cross-training to actual running
- Best For: Replacing easy runs, maintaining running fitness, leg turnover
- AVOID scheduling after: Hill repeats, speed work, quad-heavy days (compounds fatigue)
- Schedule after: Tempo runs, glute-focused strength, upper body days

ELLIPTIGO (if available):
- Motion: Elliptical (smooth, constant speed)
- Muscle Loading: GLUTE + FULL-BODY (hip extension emphasis)
- Running Specificity: MODERATE - different muscle pattern than running
- Best For: Active recovery, cross-training variety, full-body conditioning
- EXCELLENT after: Hill repeats, speed work (works different muscles = recovery)
- Burns 33% more calories than cycling

SEQUENCING RULES:
- After quad-heavy running (hills, speed) → prefer ElliptiGO (glutes, recovery)
- To replace an easy run → prefer Cyclete (running-specific)
- User has both? Alternate based on previous day's muscle loading
- Never schedule Cyclete day after hill repeats (quad overload)`;
    }

    /**
     * Calculate structured phase blocks for a given plan length
     */
    // Phase calculation delegated to PhaseCalculator module
    getPhasePlan(totalWeeks) {
        return phaseCalculator.getPhasePlan(totalWeeks);
    }

    getPhaseForWeek(weekNumber, totalWeeks) {
        return phaseCalculator.getPhaseForWeek(weekNumber, totalWeeks);
    }

    /**
     * Build VDOT equivalency table from the actual pace data
     * Creates a lookup table mapping race times across distances
     */
    buildVdotEquivalencyTable() {
        // We'll use the threshold pace as a proxy for VDOT level
        // Runners at the same VDOT have the same threshold pace
        this.vdotTable = [];

        // Extract data points from each distance and cross-reference by threshold pace
        const tenKData = trainingPaceData['10K'] || [];
        const halfData = trainingPaceData['halfMarathon'] || [];
        const marathonData = trainingPaceData['marathon'] || [];

        // Build lookup by finding entries with similar threshold paces
        tenKData.forEach(tenK => {
            const thresholdPace = tenK.paces.threshold.pace;

            // Find matching half marathon entry (within ~5 seconds threshold pace)
            const matchingHalf = halfData.find(h => {
                const diff = Math.abs(
                    this.timeToSeconds(h.paces.threshold.pace) -
                    this.timeToSeconds(thresholdPace)
                );
                return diff < 10; // Within 10 seconds
            });

            // Find matching marathon entry
            const matchingMarathon = marathonData.find(m => {
                const diff = Math.abs(
                    this.timeToSeconds(m.paces.threshold.pace) -
                    this.timeToSeconds(thresholdPace)
                );
                return diff < 10;
            });

            if (matchingHalf || matchingMarathon) {
                this.vdotTable.push({
                    tenK: tenK.goalTime,
                    tenKSeconds: this.timeToSeconds(tenK.goalTime),
                    half: matchingHalf?.goalTime || null,
                    halfSeconds: matchingHalf ? this.timeToSeconds(matchingHalf.goalTime) : null,
                    marathon: matchingMarathon?.goalTime || null,
                    marathonSeconds: matchingMarathon ? this.timeToSeconds(matchingMarathon.goalTime) : null,
                    thresholdPace: thresholdPace
                });
            }
        });

        console.log('Built VDOT equivalency table with', this.vdotTable.length, 'entries');
    }

    /**
     * Parse time string (H:MM:SS or MM:SS) to total seconds
     */
    timeToSeconds(timeString) {
        if (!timeString) return 0;
        const parts = timeString.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }

    /**
     * Convert seconds to pace string (MM:SS)
     */
    secondsToPace(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Convert seconds to time string (H:MM:SS or MM:SS)
     */
    secondsToTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.round(seconds % 60);
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Calculate pace per mile from race time and distance
     */
    calculatePacePerMile(raceTime, raceDistance) {
        const distanceMiles = this.raceDistanceMiles[raceDistance];
        if (!distanceMiles) return null;

        const totalSeconds = this.timeToSeconds(raceTime);
        if (totalSeconds === 0) return null;

        const paceSeconds = totalSeconds / distanceMiles;
        return this.secondsToPace(paceSeconds);
    }

    /**
     * Predict equivalent race times from a recent race performance
     * Uses the VDOT equivalency table built from actual pace data
     */
    predictRaceTimes(recentRaceTime, recentRaceDistance) {
        const recentSeconds = this.timeToSeconds(recentRaceTime);
        if (!recentSeconds) return null;

        // Normalize distance name
        const normalizedDistance = recentRaceDistance === 'Half Marathon' ? 'Half' : recentRaceDistance;

        // First, find or interpolate the equivalent 10K time
        let equivalent10KSeconds;

        if (normalizedDistance === '10K') {
            equivalent10KSeconds = recentSeconds;
        } else if (normalizedDistance === 'Half') {
            // Find closest VDOT entry by half marathon time and get 10K equivalent
            equivalent10KSeconds = this.interpolateFrom10K(recentSeconds, 'halfSeconds', 'tenKSeconds');
        } else if (normalizedDistance === 'Marathon') {
            equivalent10KSeconds = this.interpolateFrom10K(recentSeconds, 'marathonSeconds', 'tenKSeconds');
        } else if (normalizedDistance === '5K') {
            // 5K is roughly 47% of 10K time based on VDOT
            equivalent10KSeconds = recentSeconds / 0.47;
        } else {
            return null;
        }

        if (!equivalent10KSeconds) return null;

        // Now predict all race times from the equivalent 10K
        const predictions = {
            '5K': this.secondsToTime(equivalent10KSeconds * 0.47),
            '10K': this.secondsToTime(equivalent10KSeconds)
        };

        // Interpolate half marathon and marathon from VDOT table
        const halfSeconds = this.interpolateFrom10K(equivalent10KSeconds, 'tenKSeconds', 'halfSeconds');
        const marathonSeconds = this.interpolateFrom10K(equivalent10KSeconds, 'tenKSeconds', 'marathonSeconds');

        predictions['Half'] = halfSeconds ? this.secondsToTime(halfSeconds) : this.secondsToTime(equivalent10KSeconds * 2.1);
        predictions['Half Marathon'] = predictions['Half'];
        predictions['Marathon'] = marathonSeconds ? this.secondsToTime(marathonSeconds) : this.secondsToTime(equivalent10KSeconds * 4.6);

        return predictions;
    }

    /**
     * Interpolate between VDOT table entries
     * @param inputSeconds - The input race time in seconds
     * @param inputKey - The key in vdotTable to match against (e.g., 'tenKSeconds', 'halfSeconds')
     * @param outputKey - The key to interpolate (e.g., 'halfSeconds', 'tenKSeconds')
     */
    interpolateFrom10K(inputSeconds, inputKey, outputKey) {
        if (!this.vdotTable || this.vdotTable.length === 0) return null;

        // Filter entries that have both the input and output values
        const validEntries = this.vdotTable.filter(e => e[inputKey] && e[outputKey]);
        if (validEntries.length === 0) return null;

        // Sort by input key
        validEntries.sort((a, b) => a[inputKey] - b[inputKey]);

        // Find surrounding entries for interpolation
        let lower = null;
        let upper = null;

        for (let i = 0; i < validEntries.length; i++) {
            if (validEntries[i][inputKey] <= inputSeconds) {
                lower = validEntries[i];
            }
            if (validEntries[i][inputKey] >= inputSeconds && !upper) {
                upper = validEntries[i];
                break;
            }
        }

        // Handle edge cases
        if (!lower && !upper) return null;
        if (!lower) return upper[outputKey];
        if (!upper) return lower[outputKey];
        if (lower === upper) return lower[outputKey];

        // Linear interpolation
        const ratio = (inputSeconds - lower[inputKey]) / (upper[inputKey] - lower[inputKey]);
        const interpolatedSeconds = lower[outputKey] + ratio * (upper[outputKey] - lower[outputKey]);

        return interpolatedSeconds;
    }

    /**
     * Build fitness assessment context from recent race data
     * Returns formatted string with pace and race predictions
     */
    buildFitnessAssessmentContext(profile) {
        if (!profile.recentRaceTime || !profile.recentRaceDistance) {
            return null;
        }

        const recentPace = this.calculatePacePerMile(profile.recentRaceTime, profile.recentRaceDistance);
        const predictions = this.predictRaceTimes(profile.recentRaceTime, profile.recentRaceDistance);

        if (!recentPace || !predictions) return null;

        let context = `\n**CALCULATED FITNESS DATA (from recent ${profile.recentRaceDistance}):**\n`;
        context += `- Recent ${profile.recentRaceDistance} Pace: ${recentPace}/mile\n`;
        context += `- **PROJECTED Race Times (if they ran these distances TODAY based on their ${profile.recentRaceDistance} performance):**\n`;
        context += `  - 5K: ${predictions['5K']} (projected from ${profile.recentRaceDistance} time)\n`;
        context += `  - 10K: ${predictions['10K']} (projected from ${profile.recentRaceDistance} time)\n`;
        context += `  - Half Marathon: ${predictions['Half']} (projected from ${profile.recentRaceDistance} time - this is what they'd run if they did a half marathon TODAY)\n`;
        context += `  - Marathon: ${predictions['Marathon']} (projected from ${profile.recentRaceDistance} time)\n`;

        // Compare with goal if it's the same distance type
        const goalDistance = profile.raceDistance;
        const goalTime = profile.raceTime;

        if (goalTime && goalDistance) {
            // Extract just the time part if format is "Distance-Time"
            const goalTimePart = goalTime.includes('-') ? goalTime.split('-')[1] : goalTime;
            const goalSeconds = this.timeToSeconds(goalTimePart);
            const predictedGoalTime = predictions[goalDistance] || predictions['Half'];
            const predictedSeconds = this.timeToSeconds(predictedGoalTime);

            if (goalSeconds && predictedSeconds) {
                const diffSeconds = goalSeconds - predictedSeconds;
                const diffMinutes = Math.abs(Math.round(diffSeconds / 60));

                context += `\n**CURRENT vs GOAL ANALYSIS:**\n`;
                context += `- **Current fitness projection:** If they ran a ${goalDistance} TODAY (based on their ${profile.recentRaceDistance} time), they would run approximately ${predictedGoalTime}\n`;
                context += `- **Goal ${goalDistance}:** ${goalTimePart}\n`;
                context += `- **Gap to close:** ${diffMinutes} minutes ${diffSeconds < 0 ? 'faster' : 'slower'}\n`;
                context += `\n**IMPORTANT:** When describing current fitness, make it clear this is a PROJECTION from their ${profile.recentRaceDistance} time, not a past ${goalDistance} result. Say something like "If you ran a ${goalDistance} today based on your ${profile.recentRaceDistance} performance, you'd likely run around ${predictedGoalTime}" or "Your current fitness (based on your ${profile.recentRaceDistance} time) projects to a ${predictedGoalTime} ${goalDistance} if you ran it today."\n`;

                if (diffSeconds > 300) { // Goal is more than 5 minutes slower than predicted
                    context += `\nThis runner is ALREADY faster than their goal. They could target a more ambitious time, `;
                    context += `or use this as a comfortable training cycle. Consider suggesting they reassess after a tune-up race.\n`;
                } else if (diffSeconds < -1800) { // Goal is more than 30 minutes faster than predicted
                    context += `\nThis is a VERY aggressive goal (${diffMinutes} min improvement needed). `;
                    context += `With dedicated training this improvement IS possible over a full training cycle, but be realistic: `;
                    context += `typical improvement is 1-3 minutes per month of focused training. `;
                    context += `Build the plan progressively and use checkpoints to assess if the goal needs adjustment.\n`;
                } else if (diffSeconds < -300) { // Goal is 5-30 minutes faster than predicted
                    context += `\nThis is an ambitious but potentially achievable goal with focused training. `;
                    context += `The runner needs to improve by ~${diffMinutes} minutes from current fitness. `;
                    context += `Build progressive training and include checkpoint assessments to track improvement.\n`;
                } else {
                    context += `\nThis goal aligns well with current fitness - very achievable with consistent training.\n`;
                }
            }
        }

        return context;
    }

    // Workout library context building delegated to PromptBuilder module
    buildWorkoutLibraryContext() {
        return promptBuilder.buildWorkoutLibraryContext();
    }

    /**
     * Generate training plan with workout library integration
     * SPLIT INTO TWO CALLS to avoid timeout:
     * 1. Coaching analysis + paces (faster)
     * 2. Week-by-week plan structure (concise)
     */
    async generateTrainingPlan(userProfile) {
        try {
            // CRITICAL: Normalize profile field names for consistency
            // Map hardSessionDays to qualityDays if it exists
            let normalizedProfile = {
                ...userProfile,
                qualityDays: userProfile.qualityDays || userProfile.hardSessionDays || []
            };

            // CRITICAL BUG FIX: Blank Data Onboarding Flow
            // If user leaves "Recent Race Time" blank, calculate safe baseline (15% slower than goal)
            // This prevents the system from assuming they're already fit enough to hit their goal
            if (!normalizedProfile.recentRaceTime && normalizedProfile.raceTime && normalizedProfile.raceDistance) {
                logger.log('⚠️ No recent race time provided - calculating safe baseline (15% slower than goal)');
                
                // Extract just the time part if format is "Distance-Time"
                const goalTimePart = normalizedProfile.raceTime.includes('-') 
                    ? normalizedProfile.raceTime.split('-')[1] 
                    : normalizedProfile.raceTime;
                
                // Calculate 15% slower than goal time
                const safeTime = this.paceCalculator.addBufferToTime(goalTimePart, 1.15);
                
                // Set estimated fitness values
                normalizedProfile.recentRaceTime = safeTime;
                normalizedProfile.recentRaceDistance = normalizedProfile.raceDistance; // Assume same distance
                normalizedProfile.isEstimatedFitness = true; // Flag this for the Prompt
                
                logger.log(`  ✅ Safe baseline calculated: ${goalTimePart} → ${safeTime} (15% slower)`);
                logger.log(`  ✅ Using ${normalizedProfile.raceDistance} as baseline distance`);
            }
            
            // STEP 1: Get coaching analysis and key paces (shorter, faster call)
            const coachingPrompt = this.buildCoachingAnalysisPrompt(normalizedProfile);
            const coachingResult = await this.callWithTimeout(
                this.callAnthropicAPI({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 2000, // Shorter response for coaching analysis
                    system: this.coachingSystemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: coachingPrompt
                        }
                    ]
                }),
                180000 // 180 seconds timeout
            );

            if (!coachingResult.data.success) {
                throw new Error(coachingResult.data.error || 'Failed to generate coaching analysis');
            }

            const coachingText = coachingResult.data.content[0].text;
            logger.log('✅ Step 1 complete: Coaching analysis generated');

            // STEP 2: Get week-by-week plan structure (concise format)
            // CRITICAL: Include coaching analysis so Step 2 can reference race strategy and pacing
            const workoutContext = promptBuilder.buildWorkoutLibraryContext();
            // CRITICAL: buildPlanStructurePrompt returns { prompt, planMath }
            // planMath contains deterministic week-by-week mileages we MUST enforce
            const { prompt: planPrompt, planMath } = this.buildPlanStructurePrompt(normalizedProfile, coachingText);
            const fullPlanPrompt = `${workoutContext}\n\n---\n\n**COACHING ANALYSIS FROM STEP 1 (for reference):**\n${coachingText}\n\n---\n\n${planPrompt}`;

            const planResult = await this.callWithTimeout(
                this.callAnthropicAPI({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 10000, // Needs to be high enough for 20+ week plans
                    system: this.coachingSystemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: fullPlanPrompt
                        }
                    ]
                }),
                180000 // 180 seconds timeout
            );

            if (!planResult.data.success) {
                throw new Error(planResult.data.error || 'Failed to generate plan structure');
            }

            const planText = planResult.data.content[0].text;
            logger.log('✅ Step 2 complete: Plan structure generated');

            // Combine coaching analysis with plan structure
            const combinedText = `${coachingText}\n\n---\n\n${planText}`;

            // Parse AI response (extracts workout IDs)
            const structuredPlan = planParser.parseAIPlanToStructure(combinedText, normalizedProfile);

            // TASK 1: SAFETY BACKFILL - Auto-fill missing days (AI sometimes truncates at Friday)
            // Ensure every week has exactly 7 days (Monday through Sunday)
            if (structuredPlan.weeks && Array.isArray(structuredPlan.weeks)) {
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                
                structuredPlan.weeks.forEach(week => {
                    if (!week.workouts || !Array.isArray(week.workouts)) {
                        week.workouts = [];
                    }
                    
                    const existingDays = week.workouts.map(w => w.day);
                    
                    // Check for missing days and add Rest days
                    days.forEach(day => {
                        if (!existingDays.includes(day)) {
                            logger.warn(`⚠️ Week ${week.weekNumber || week.week}: Missing ${day} - auto-filling as Rest day`);
                            week.workouts.push({
                                day: day,
                                type: 'rest',
                                name: 'Rest Day',
                                description: 'Rest day (Auto-generated - AI truncated week)',
                                workout: { 
                                    name: 'Rest', 
                                    description: 'Rest day (Auto-generated)' 
                                },
                                distance: 0
                            });
                        }
                    });
                    
                    // Sort workouts by day order
                    week.workouts.sort((a, b) => {
                        const dayIndex = (day) => days.indexOf(day);
                        return dayIndex(a.day) - dayIndex(b.day);
                    });
                });
            }

            // CRITICAL: Override AI-generated mileages with deterministic plan-math values
            // AI cannot be trusted to follow instructions - it generates random/hallucinated mileages
            // Our plan-math calculator uses physiologically-sound formulas
            if (planMath && planMath.weeks && structuredPlan.weeks) {
                logger.log('🔧 ENFORCING DETERMINISTIC MILEAGES (overriding AI output)');
                structuredPlan.weeks.forEach((week, idx) => {
                    const mathWeek = planMath.weeks.find(w => w.weekNumber === week.weekNumber);
                    if (mathWeek) {
                        const oldMileage = week.totalMileage;
                        week.totalMileage = mathWeek.weeklyMileage;
                        week.longRunTarget = mathWeek.longRun;
                        week.phase = mathWeek.phase;
                        // Store math targets for downstream use
                        week._planMathTargets = {
                            weeklyMileage: mathWeek.weeklyMileage,
                            longRun: mathWeek.longRun,
                            tempoDistance: mathWeek.tempoDistance,
                            intervalDistance: mathWeek.intervalDistance,
                            hillDistance: mathWeek.hillDistance
                        };
                        if (oldMileage !== week.totalMileage) {
                            logger.log(`  Week ${week.weekNumber}: AI said ${oldMileage}mi → CORRECTED to ${week.totalMileage}mi (long run: ${mathWeek.longRun}mi)`);
                        }
                    }
                });
                // Store plan-math targets on the plan for reference
                structuredPlan._planMathTargets = planMath.targets;
            }

            // Hydrate workout IDs with full workout details from library
            const enrichedPlan = workoutEnricher.enrichPlanWithWorkouts(structuredPlan);

            // CRITICAL: Fix mileage mismatches BEFORE transformation (adjusts workout distances)
            planFixer.fixMileageMismatches(enrichedPlan, normalizedProfile);
            
            // CRITICAL: Fix missing long runs BEFORE transformation (ensures every week has a long run)
            planFixer.fixMissingLongRuns(enrichedPlan, normalizedProfile);

            // Transform to Dashboard format
            const dashboardPlan = planTransformer.transformToDashboardFormat(enrichedPlan, normalizedProfile);
            
            // CRITICAL: Auto-fix hard days violations (pragmatic fix to prevent regressions)
            planFixer.fixHardDaysViolations(dashboardPlan, normalizedProfile);
            
            // CRITICAL: Run validations to catch regressions
            try {
                const { validateTrainingPlan } = await import('./TrainingPlanAIService.validators.js');
                const validationResult = validateTrainingPlan(dashboardPlan, normalizedProfile);
                if (!validationResult.valid) {
                    console.error('⚠️ Training plan validation failed - but continuing anyway:', validationResult.errors);
                    // Don't throw - log the errors but allow the plan to be used
                    // This helps catch regressions in development without breaking production
                }
            } catch (error) {
                // Validators might not be available in all environments - don't break production
                console.warn('⚠️ Could not run validations:', error.message);
            }

            return {
                success: true,
                plan: dashboardPlan,
                rawResponse: combinedText,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    model: 'claude-sonnet-4-5',
                    userProfile
                }
            };

        } catch (error) {
            console.error('AI Coach Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate coaching analysis only (Step 1 of plan generation)
     * Useful for testing and debugging without regenerating entire plan
     */
    async generateCoachingAnalysis(userProfile) {
        try {
            // Normalize profile field names
            const normalizedProfile = {
                ...userProfile,
                qualityDays: userProfile.qualityDays || userProfile.hardSessionDays || []
            };
            
            // Build and call coaching analysis prompt
            const coachingPrompt = this.buildCoachingAnalysisPrompt(normalizedProfile);
            const coachingResult = await this.callWithTimeout(
                this.callAnthropicAPI({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 2000,
                    system: this.coachingSystemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: coachingPrompt
                        }
                    ]
                }),
                180000 // 180 seconds timeout
            );

            if (!coachingResult.data.success) {
                throw new Error(coachingResult.data.error || 'Failed to generate coaching analysis');
            }

            const coachingText = coachingResult.data.content[0].text;
            logger.log('✅ Coaching analysis generated');

            return {
                success: true,
                analysis: coachingText
            };
        } catch (error) {
            console.error('AI Coach Error (Coaching Analysis):', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Wrapper to add custom timeout to Firebase Function calls
     * Firebase Functions v2 client has default 60s timeout, but we need 180s
     */
    async callWithTimeout(promise, timeoutMs) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout: Function call exceeded 180 seconds')), timeoutMs);
        });
        return Promise.race([promise, timeoutPromise]);
    }

    /**
     * Build prompt for coaching analysis only (Step 1)
     * Focuses on assessment, paces, and strategy - NO week-by-week plan
     */
    /**
     * Determine if this is an injured runner requiring specialized coaching
     */
    isInjuredRunner(profile) {
        return profile.runningStatus === 'crossTrainingOnly' || 
               (profile.injuries && Object.values(profile.injuries).some(v => v === true)) ||
               profile.injuryDescription;
    }

    buildCoachingAnalysisPrompt(profile) {
        const units = profile.units || 'imperial';
        const distanceUnit = units === 'metric' ? 'kilometers' : 'miles';
        const fullName = profile.name || profile.displayName;
        const firstName = fullName ? fullName.split(' ')[0] : null;

        let prompt = `**COACHING ANALYSIS REQUEST**\n\n`;
        if (firstName) {
            prompt += `Runner: ${firstName}\n\n`;
            prompt += `**CRITICAL: Use the runner's actual name "${firstName}" throughout your response. DO NOT use example names like "Sarah" or any other placeholder names. The runner's name is ${firstName}.**\n\n`;
        }

        // TRANSPARENCY + AGENCY: Add fitness disclaimer if fitness was estimated
        if (profile.isEstimatedFitness) {
            prompt += `**🚨 CRITICAL INSTRUCTION - MISSING DATA DISCLAIMER 🚨**\n`;
            prompt += `**YOU MUST START YOUR RESPONSE WITH THIS EXACT DISCLAIMER:**\n\n`;
            prompt += `"⚠️ **NOTE:** You didn't enter a recent race time, so I've estimated your current fitness to be safe (approx 15% slower than your goal). **If this feels too easy or too hard:** Click the **"Enter Recent Race Time"** button above to update your Current Fitness, and I'll instantly regenerate your plan."\n\n`;
            prompt += `**IMPORTANT:** Include this disclaimer at the VERY START of your coaching analysis, before any other content. Use the exact wording provided above.\n\n`;
        }

        // Route to specialized prompt builder based on runner status
        if (this.isInjuredRunner(profile)) {
            prompt += this.buildInjuredRunnerCoachingPrompt(profile);
        } else {
            prompt += this.buildRegularRunnerCoachingPrompt(profile);
        }

        return prompt;
    }

    /**
     * Build coaching prompt for INJURED runners (cross-training only)
     */
    /**
     * Build coaching prompt for INJURED runners (cross-training only)
     * Specialized prompt with injury recovery focus and sports physiologist persona
     */
    buildInjuredRunnerCoachingPrompt(profile) {
        // Validate required fields
        if (!profile.raceDistance || !profile.raceTime || !profile.raceDate) {
            throw new Error('Missing required fields for injured runner coaching prompt');
        }

        const units = profile.units || 'imperial';
        const distanceUnit = units === 'metric' ? 'kilometers' : 'miles';
        const fullName = profile.name || profile.displayName;
        const firstName = fullName ? fullName.split(' ')[0] : null;
        const today = new Date();
        const startDateCoaching = profile.startDate ? this.parseDate(profile.startDate) : today;
        const startDateFormattedCoaching = startDateCoaching.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const startDayOfWeekCoaching = startDateCoaching.getDay();
        const startDayNameCoaching = dayNames[startDayOfWeekCoaching];
        const raceDateObj = this.parseDate(profile.raceDate);
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const totalWeeks = Math.ceil((raceDateObj.getTime() - startDateCoaching.getTime()) / msPerWeek);
        const raceDateFormatted = raceDateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const daysBetween = Math.ceil((raceDateObj.getTime() - startDateCoaching.getTime()) / (24 * 60 * 60 * 1000));
        const monthsBetween = Math.round(daysBetween / 30.44);

        // Extract injury information
        const selectedInjuries = [];
        if (profile.injuries) {
            const injuryNames = {
                itBand: 'IT Band Syndrome',
                plantarFasciitis: 'Plantar Fasciitis',
                shinSplints: 'Shin Splints',
                kneeIssues: 'Knee Issues',
                lowerBackPain: 'Lower Back Pain',
                achillesTendonitis: 'Achilles Tendonitis',
                stressFracture: 'Stress Fracture',
                hipIssues: 'Hip Issues',
                ankleIssues: 'Ankle Issues'
            };
            Object.entries(profile.injuries).forEach(([key, selected]) => {
                if (selected && key !== 'other' && injuryNames[key]) {
                    selectedInjuries.push(injuryNames[key]);
                }
            });
            if (profile.injuries.other && profile.injuryDescription) {
                selectedInjuries.push(`Other: ${profile.injuryDescription}`);
            }
        }

        // Get available equipment
        const availableEquipment = [];
        if (profile.standUpBikeType) {
            const bikeName = profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
            availableEquipment.push(bikeName);
        }
        if (profile.crossTrainingEquipment) {
            if (profile.crossTrainingEquipment.pool) availableEquipment.push('pool/aqua running');
            if (profile.crossTrainingEquipment.rowing) availableEquipment.push('rowing machine');
            if (profile.crossTrainingEquipment.elliptical) availableEquipment.push('elliptical');
            if (profile.crossTrainingEquipment.stationaryBike) availableEquipment.push('stationary bike');
            if (profile.crossTrainingEquipment.swimming) availableEquipment.push('swimming');
            if (profile.crossTrainingEquipment.walking) availableEquipment.push('walking');
        }

        console.log('🚨 BUILDING INJURED RUNNER PROMPT - Injuries:', selectedInjuries, 'Equipment:', availableEquipment);

        let prompt = `The training plan starts on ${startDateFormattedCoaching} (${startDayNameCoaching}). Please create a training plan for me:\n\n`;
        prompt += `**IMPORTANT: All distances should be in ${distanceUnit}. The user is using ${units} units.**\n\n`;
        
        prompt += `**🚨🚨🚨 CRITICAL - PLAN DURATION AND RACE DATE 🚨🚨🚨**\n`;
        prompt += `**CALCULATION:** From ${startDateFormattedCoaching} to ${raceDateFormatted} = ${daysBetween} days = EXACTLY ${totalWeeks} weeks (${monthsBetween} months)\n`;
        prompt += `- **START DATE:** ${startDateFormattedCoaching} (${profile.startDate})\n`;
        prompt += `- **RACE DATE:** ${raceDateFormatted} (${profile.raceDate})\n`;
        prompt += `- **EXACT DURATION:** ${daysBetween} days = EXACTLY ${totalWeeks} weeks\n`;
        prompt += `- **🚨🚨🚨 YOU MUST SAY:** "${totalWeeks} weeks" when describing the plan duration. DO NOT say "a year", "10 months", "30 weeks", or any other duration.\n`;
        prompt += `- **🚨🚨🚨 CHECKPOINTS:** All checkpoints MUST be between Week 1 and Week ${totalWeeks} ONLY.\n`;
        prompt += `  * For a ${totalWeeks}-week plan, example checkpoints: Week ${Math.max(4, Math.floor(totalWeeks * 0.3))}, Week ${Math.floor(totalWeeks * 0.6)}, Week ${Math.floor(totalWeeks * 0.85)}\n`;
        prompt += `  * DO NOT create checkpoints at Week 8, 16, 24, 30, etc. if the plan is only ${totalWeeks} weeks long.\n`;
        prompt += `  * The plan ends at Week ${totalWeeks}, so ALL checkpoints must be BEFORE Week ${totalWeeks}.\n\n`;

        if (firstName) {
            prompt += `**PERSONALIZATION: The runner's name is ${firstName}. Use their ACTUAL name "${firstName}" naturally 2-3 times throughout your coaching analysis. DO NOT use example names like "Sarah" or any placeholder names.**\n\n`;
        }

        prompt += `**Goal Race:**\n`;
        prompt += `- Distance: ${profile.raceDistance}\n`;
        prompt += `- Goal Time: ${profile.raceTime}\n`;
        prompt += `- Race Date: ${profile.raceDate}\n`;
        if (profile.raceElevationProfile) {
            const terrainDescriptions = {
                'flat': 'Flat course (minimal elevation change)',
                'rolling': 'Rolling hills (moderate elevation changes)',
                'hilly': 'Hilly course (significant elevation gain)'
            };
            prompt += `- Course Terrain: ${terrainDescriptions[profile.raceElevationProfile] || profile.raceElevationProfile}\n`;
        }
        prompt += `\n`;

        // INJURY SECTION - CRITICAL AND PROMINENT
        if (selectedInjuries.length > 0) {
            prompt += `**🚨🚨🚨 CRITICAL - INJURY RECOVERY SITUATION 🚨🚨🚨**\n`;
            prompt += `**THE RUNNER IS CURRENTLY INJURED AND CANNOT RUN. THIS IS AN INJURY RECOVERY PLAN.**\n\n`;
            prompt += `**INJURIES:** ${selectedInjuries.join(', ')}\n\n`;
            prompt += `**AVAILABLE CROSS-TRAINING EQUIPMENT:** ${availableEquipment.length > 0 ? availableEquipment.join(', ') : 'None specified - use walking only'}\n\n`;
            
            prompt += `**🚨🚨🚨 ABSOLUTE REQUIREMENT - YOU MUST ADDRESS THESE INJURIES IN YOUR COACHING ANALYSIS 🚨🚨🚨**\n`;
            prompt += `**YOUR FIRST SENTENCE MUST ACKNOWLEDGE THE INJURIES. FOR EXAMPLE:**\n`;
            prompt += `"${firstName || 'Runner'}, I see you're recovering from ${selectedInjuries.join(' and ')}. As a sports physiologist, let me explain how we'll handle this injury recovery plan..."\n\n`;
            
            prompt += `**THEN YOU MUST (as a sports physiologist):**\n`;
            prompt += `1. **EXPLAIN BIOMECHANICAL REASONING:** For ${selectedInjuries.join(' and ')}, explain:\n`;
            prompt += `   - Which cross-training equipment is SAFEST for this injury and WHY (movement patterns, joint loading, muscle engagement)\n`;
            prompt += `   - Which equipment could AGGRAVATE this injury and WHY (biomechanical contraindications)\n`;
            prompt += `   - Reference sports medicine principles (e.g., "Shin splints benefit from zero-impact activities like pool running because it eliminates ground reaction forces that stress the tibia...")\n`;
            prompt += `2. **EQUIPMENT RECOMMENDATIONS:** Explicitly state which of the available equipment (${availableEquipment.join(', ')}) is best for ${selectedInjuries.join(' and ')} and why\n`;
            prompt += `3. **EQUIPMENT ROTATION:** You MUST rotate through ALL available equipment types throughout the plan. Do NOT only use one type. Variety prevents overuse and provides comprehensive fitness.\n`;
            prompt += `4. **RETURN-TO-RUNNING PROTOCOL:** Provide evidence-based guidance on when and how to safely return to running after ${selectedInjuries.join(' and ')}\n`;
            prompt += `5. **MEDICAL DISCLAIMER:** Include: "⚠️ This is not medical advice. Consult your healthcare provider for injury diagnosis and treatment."\n`;
            prompt += `\n`;
            prompt += `**DO NOT SKIP THIS. The injuries (${selectedInjuries.join(', ')}) MUST be mentioned in the FIRST PARAGRAPH of your coaching analysis.**\n\n`;
        } else {
            prompt += `**🚨 INJURY RECOVERY STATUS:** Runner cannot run right now (cross-training only)\n`;
            prompt += `**AVAILABLE EQUIPMENT:** ${availableEquipment.length > 0 ? availableEquipment.join(', ') : 'None specified - use walking only'}\n\n`;
        }

        prompt += `**Current Fitness:**\n`;
        if (profile.recentRaceTime && profile.recentRaceDistance) {
            if (profile.isEstimatedFitness) {
                prompt += `- **Estimated Current Fitness:** ${profile.recentRaceTime} for ${profile.recentRaceDistance} (calculated as 15% slower than goal - user did not provide recent race data)\n`;
                prompt += `  **IMPORTANT:** This is a CONSERVATIVE ESTIMATE to ensure safe training. The user's actual current fitness may be better or worse.\n`;
            } else {
                prompt += `- Recent Race: ${profile.recentRaceTime} for ${profile.recentRaceDistance}\n`;
            }
            const fitnessContext = this.buildFitnessAssessmentContext(profile);
            if (fitnessContext) {
                prompt += fitnessContext;
            }
        }
        prompt += `- Cross-Training Status: Cannot run - using cross-training equipment only\n`;
        prompt += `\n`;

        prompt += `**Training Preferences:**\n`;
        prompt += `- Available Training Days: ${(profile.availableDays || []).join(', ')}\n`;
        if (profile.restDays && profile.restDays.length > 0) {
            prompt += `- Rest Days: ${profile.restDays.join(', ')}\n`;
        }
        prompt += `- Experience Level: ${profile.experienceLevel}\n\n`;

        prompt += `**OUTPUT REQUIREMENTS (Sports Physiologist / Injury Recovery Coach voice):**\n`;
        prompt += `1. **OPEN WITH INJURY ACKNOWLEDGMENT:** First sentence must acknowledge the injuries and recovery situation\n`;
        prompt += `2. **BIOMECHANICAL EXPLANATION:** Explain why specific equipment is safe/unsafe for the injuries\n`;
        prompt += `3. **EQUIPMENT ROTATION STRATEGY:** Explain how you'll rotate through all available equipment\n`;
        prompt += `4. **CROSS-TRAINING PACES/EFFORTS:** Provide effort-based guidance (since we're not running, focus on perceived effort, heart rate zones, or time-based progression)\n`;
        prompt += `5. **RETURN-TO-RUNNING PROTOCOL:** Evidence-based guidance on when/how to return to running\n`;
        prompt += `6. **CHECKPOINTS:** Reality checks for cross-training fitness (e.g., "Week 8: Can you hold moderate effort for 60 minutes?")\n`;
        prompt += `7. **MEDICAL DISCLAIMER:** Include medical disclaimer\n`;
        prompt += `**DO NOT include week-by-week plan yet - that comes in a separate request.**\n`;
        prompt += `Keep response focused on injury recovery, biomechanics, and cross-training strategy.\n`;

        return prompt;
    }

    /**
     * Build prompt for plan structure only (Step 2)
     * Focuses on week-by-week schedule - concise format
     * Routes to specialized methods for injured vs regular runners
     *
     * CRITICAL: Returns { prompt, planMath } so we can enforce deterministic mileages
     * The planMath contains week-by-week calculated targets that MUST override AI output
     */
    buildPlanStructurePrompt(profile, coachingAnalysis) {
        // Route to specialized prompt builder based on runner status
        // Both return { prompt, planMath } object
        if (this.isInjuredRunner(profile)) {
            return this.buildInjuredRunnerPlanStructurePrompt(profile, coachingAnalysis);
        } else {
            return this.buildRegularRunnerPlanStructurePrompt(profile, coachingAnalysis);
        }
    }

    /**
     * Build plan structure prompt for INJURED runners (cross-training only)
     * Returns { prompt, planMath } to match buildRegularRunnerPlanStructurePrompt
     * 
     * CRITICAL: Filters available equipment based on expertAnalysis.equipmentToAvoid
     * to prevent scheduling workouts on equipment that could aggravate the injury
     */
    buildInjuredRunnerPlanStructurePrompt(profile, coachingAnalysis, expertAnalysis = null) {
        // Get expertAnalysis from parameter, profile, or coachingAnalysis
        const analysis = expertAnalysis || 
                         profile.expertAnalysis || 
                         (coachingAnalysis && typeof coachingAnalysis === 'object' && coachingAnalysis.expertAnalysis) ||
                         null;
        
        // Build available equipment list from profile
        const availableEquipment = [];
        if (profile.crossTrainingEquipment?.pool) availableEquipment.push('Pool/Aqua Running');
        if (profile.crossTrainingEquipment?.elliptical) availableEquipment.push('Elliptical');
        if (profile.crossTrainingEquipment?.stationaryBike) availableEquipment.push('Stationary Bike');
        if (profile.crossTrainingEquipment?.swimming) availableEquipment.push('Swimming');
        if (profile.crossTrainingEquipment?.rowing) availableEquipment.push('Rowing Machine');
        if (profile.standUpBikeType && profile.standUpBikeType !== 'none') {
            const bikeName = profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
            availableEquipment.push(bikeName);
        }
        
        // Filter out equipment that should be avoided
        let safeEquipment = availableEquipment;
        let equipmentToAvoid = [];
        
        if (analysis && analysis.equipmentToAvoid && Array.isArray(analysis.equipmentToAvoid) && analysis.equipmentToAvoid.length > 0) {
            equipmentToAvoid = analysis.equipmentToAvoid;
            // Filter: remove any equipment that matches (case-insensitive, handles partial matches)
            // This handles cases where AI might say "Rowing" and we have "Rowing Machine"
            safeEquipment = availableEquipment.filter(eq => {
                const eqLower = eq.toLowerCase().trim();
                // Check for exact match or partial match (either direction)
                return !equipmentToAvoid.some(avoid => {
                    const avoidLower = avoid.toLowerCase().trim();
                    // Exact match
                    if (eqLower === avoidLower) return true;
                    // Partial match: "Rowing" matches "Rowing Machine" or vice versa
                    if (eqLower.includes(avoidLower) || avoidLower.includes(eqLower)) return true;
                    return false;
                });
            });
            
            logger.log('🏥 Injury Recovery Equipment Filter:', {
                available: availableEquipment,
                toAvoid: equipmentToAvoid,
                safe: safeEquipment
            });
        }
        
        // If no safe equipment remains, log warning but proceed (fallback to all available)
        if (safeEquipment.length === 0 && availableEquipment.length > 0) {
            logger.warn('⚠️ All available equipment is marked to avoid - using all equipment as fallback');
            safeEquipment = availableEquipment;
        }
        
        // Build the base prompt using regular runner prompt builder
        const { prompt: basePrompt, planMath } = this.buildRegularRunnerPlanStructurePrompt(profile, coachingAnalysis);
        
        // Add injury-specific equipment filtering instructions
        let injuryEquipmentSection = '';
        
        if (safeEquipment.length > 0) {
            injuryEquipmentSection += `\n**🚨🚨🚨 INJURY RECOVERY EQUIPMENT RESTRICTIONS (CRITICAL - READ THIS):**\n`;
            injuryEquipmentSection += `- **APPROVED EQUIPMENT (USE ONLY THESE):** ${safeEquipment.join(', ')}\n`;
            
            if (equipmentToAvoid.length > 0) {
                injuryEquipmentSection += `- **EQUIPMENT TO AVOID (DO NOT SCHEDULE):** ${equipmentToAvoid.join(', ')}\n`;
                injuryEquipmentSection += `- **CRITICAL:** Do NOT schedule any workouts using ${equipmentToAvoid.join(' or ')}. These could aggravate the injury.\n`;
                if (analysis && analysis.avoidanceReasoning) {
                    injuryEquipmentSection += `- **Reason:** ${analysis.avoidanceReasoning}\n`;
                }
            }
            
            injuryEquipmentSection += `- **ROTATION:** Rotate through the approved equipment list (${safeEquipment.join(', ')}) for variety.\n`;
            injuryEquipmentSection += `- **DO NOT** schedule workouts on equipment that is NOT in the approved list.\n\n`;
        }
        
        // Insert the injury equipment section after the user schedule requirements
        // Find the insertion point (after schedule requirements, before phase plan)
        const phasePlanIndex = basePrompt.indexOf('**PHASE PLAN');
        if (phasePlanIndex > 0 && injuryEquipmentSection) {
            const modifiedPrompt = basePrompt.slice(0, phasePlanIndex) + injuryEquipmentSection + basePrompt.slice(phasePlanIndex);
            return { prompt: modifiedPrompt, planMath };
        }
        
        // Fallback: append at the end if we can't find insertion point
        return { prompt: basePrompt + injuryEquipmentSection, planMath };
    }

    /**
     * Build plan structure prompt for REGULAR runners
     */
    buildRegularRunnerPlanStructurePrompt(profile, coachingAnalysis) {
        // CRITICAL: Use actual start date from profile (may be adjusted if today is a rest day)
        // If no startDate in profile, fall back to today
        const startDate = profile.startDate ? this.parseDate(profile.startDate) : new Date();
        const today = new Date(); // Keep for reference/comparison
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayAbbrevs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const startDayOfWeek = startDate.getDay();
        const startDayName = dayNames[startDayOfWeek];
        const startDayAbbrev = dayAbbrevs[startDayOfWeek];
        // CRITICAL: If starting on Sunday, Week 1 only has 1 day (Sunday). Otherwise, days from start day through Sunday.
        const daysInWeek1 = startDayOfWeek === 0 ? 1 : (7 - startDayOfWeek + 1);

        const units = profile.units || 'imperial';
        const distanceUnit = units === 'metric' ? 'kilometers' : 'miles';
        const restDays = profile.restDays || [];

        // CRITICAL: Calculate total weeks from start date to race date
        const raceDateObj = this.parseDate(profile.raceDate);
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const totalWeeks = Math.ceil((raceDateObj.getTime() - startDate.getTime()) / msPerWeek);
        const phasePlan = this.getPhasePlan(totalWeeks);

        // DETERMINISTIC PLAN MATH: Pre-calculate ALL mileages using formulas (no AI guessing!)
        // This replaces hundreds of lines of "please calculate this correctly" prompts
        const raceDistanceForMath = profile.raceDistance === 'Half' ? 'Half Marathon' : profile.raceDistance;
        let planMath = null;
        try {
            planMath = PlanMathCalculator.generatePlanMath({
                currentWeeklyMileage: parseInt(profile.currentWeeklyMileage),
                currentLongRun: parseInt(profile.currentLongRun),
                totalWeeks: totalWeeks,
                raceDistance: raceDistanceForMath,
                experienceLevel: profile.experienceLevel  // beginner, intermediate, or advanced
            });
            logger.log('✅ Plan math calculated:', {
                peakMileage: planMath.targets.peakWeeklyMileage,
                longRunMax: planMath.targets.longRunMax,
                phases: planMath.phases
            });
        } catch (mathError) {
            logger.warn('⚠️ Plan math calculation failed, AI will calculate mileages:', mathError.message);
        }
        
        // Format start date for the prompt (this is when Week 1 actually starts)
        const startDateFormatted = startDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Calculate Week 1 date range
        const week1EndDate = new Date(startDate);
        if (startDayOfWeek === 0) {
            // Starting on Sunday - Week 1 is just Sunday
            // Week 1 end is also Sunday (same day)
        } else {
            // Week 1 ends on Sunday (7 - startDayOfWeek days later)
            week1EndDate.setDate(startDate.getDate() + (7 - startDayOfWeek));
        }
        const week1EndFormatted = week1EndDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
        
        // Add bike/cross-training day info (CRITICAL: Same as buildCoachingPrompt)
        let bikeDays = [];
        let bikeType = null;
        if (profile.standUpBikeType && profile.standUpBikeType !== 'none' && profile.preferredBikeDays && profile.preferredBikeDays.length > 0) {
            bikeType = profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
            bikeDays = profile.preferredBikeDays;
        }

        let prompt = `**WEEK-BY-WEEK PLAN STRUCTURE REQUEST**\n\n`;
        prompt += `Based on the coaching analysis above, generate ONLY the week-by-week training schedule.\n`;
        prompt += `**CRITICAL: Use the race strategy and pacing plan from the coaching analysis above. The race strategy in Week ${totalWeeks} must match the strategy outlined in the coaching analysis.**\n\n`;
        
        // CRITICAL: Explicitly state race distance to prevent confusion
        const raceDistanceDisplay = profile.raceDistance === 'Half' ? 'Half Marathon (13.1 miles)' : 
                                    profile.raceDistance === 'Marathon' ? 'Marathon (26.2 miles)' :
                                    profile.raceDistance === '5K' ? '5K (3.1 miles)' :
                                    profile.raceDistance === '10K' ? '10K (6.2 miles)' :
                                    profile.raceDistance;
        prompt += `**CRITICAL RACE CONTEXT:**\n`;
        prompt += `- Race Distance: ${raceDistanceDisplay}\n`;
        prompt += `- Goal Time: ${profile.raceTime}\n`;
        prompt += `- Race Date: ${profile.raceDate}\n`;
        // Format start date for short display (e.g., "Nov 25")
        const startDateShort = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        prompt += `- **🚨 CRITICAL - START DATE: ${startDateFormatted} (${startDayName})**\n`;
        prompt += `- **🚨 CRITICAL - WEEK 1 STARTS: ${startDateFormatted} (${startDayName}), NOT today, NOT any other date**\n`;
        prompt += `- **Week 1 date range: ${startDateFormatted} through ${week1EndFormatted} (${daysInWeek1} days)**\n`;
        if (startDayOfWeek === 0) {
            prompt += `- **WEEK 1 DATE RANGE: ${startDateShort} only (1 day)**\n`;
        } else {
            prompt += `- **WEEK 1 DATE RANGE: ${startDateShort} - ${week1EndFormatted}**\n`;
        }
        prompt += `- **TOTAL WEEKS: Generate EXACTLY ${totalWeeks} weeks (Week 1 through Week ${totalWeeks})**\n`;
        prompt += `**DO NOT confuse this with a different race distance. The race is ${raceDistanceDisplay}, NOT a marathon unless explicitly stated above.**\n`;
        prompt += `**DO NOT generate more than ${totalWeeks} weeks. The plan must be exactly ${totalWeeks} weeks long, ending on the race date.**\n`;
        prompt += `**CRITICAL: Week 1 starts on ${startDateFormatted} (${startDayName}), NOT today or any other date. Use the actual date range shown above.**\n\n`;

        // CRITICAL: User schedule requirements - MUST be followed
        prompt += `**🚨🚨🚨 USER SCHEDULE REQUIREMENTS (MANDATORY - DO NOT VIOLATE - READ THIS FIRST):**\n`;

        // Check for overlap between hard days and bike days
        const hardDaysThatAreBikeDays = profile.qualityDays?.filter(day => bikeDays.includes(day)) || [];
        const hardDaysThatAreNotBikeDays = profile.qualityDays?.filter(day => !bikeDays.includes(day)) || [];

        // DEBUG: Log hard/bike day calculation
        console.log('🚨 HARD/BIKE DAY DEBUG:', {
            'profile.qualityDays': profile.qualityDays,
            'profile.preferredBikeDays': profile.preferredBikeDays,
            'bikeDays (calculated)': bikeDays,
            'bikeType': bikeType,
            'hardDaysThatAreBikeDays': hardDaysThatAreBikeDays,
            'hardDaysThatAreNotBikeDays': hardDaysThatAreNotBikeDays
        });
        
        if (profile.qualityDays && profile.qualityDays.length > 0) {
            if (hardDaysThatAreBikeDays.length > 0) {
                // Days that are BOTH hard days AND bike days
                prompt += `**🚨🚨🚨 CRITICAL - HARD BIKE DAYS (READ THIS - IT'S BEING IGNORED):**\n`;
                prompt += `- **${hardDaysThatAreBikeDays.join(' and ')} are BOTH hard days AND ${bikeType} days**\n`;
                prompt += `- **THIS MEANS: ${hardDaysThatAreBikeDays.join(' and ')} MUST ALWAYS have HARD ${bikeType} workouts in EVERY SINGLE WEEK (Weeks 1-${totalWeeks})**\n`;
                prompt += `- **DO NOT put running workouts (tempo, intervals, hills) on ${hardDaysThatAreBikeDays.join(' or ')} - these are ${bikeType} days**\n`;
                prompt += `- **DO NOT put easy bike rides on ${hardDaysThatAreBikeDays.join(' or ')} - these are HARD workout days**\n`;
                hardDaysThatAreBikeDays.forEach(day => {
                    prompt += `\n**FOR ${day.toUpperCase()} IN EVERY WEEK:**\n`;
                    prompt += `  - ${day} MUST be: "Ride X RunEQ miles - [WORKOUT: TEMPO_BIKE|INTERVAL_BIKE|POWER_RESISTANCE - Workout Name] on your ${bikeType}"\n`;
                    prompt += `  - SELECT from these HARD bike workout categories:\n`;
                    prompt += `    * TEMPO_BIKE: "Sustained Threshold Effort", "Tempo Intervals", "Progressive Tempo Build", "Cruise Intervals", "Tempo Sandwich", "Fast Finish Tempo", "Threshold Pyramid"\n`;
                    prompt += `    * INTERVAL_BIKE: "Classic 5-Minute Repeats", "Short Power Repeats", "VO2 Max Intervals", "Aerobic Power Intervals", "Hill Power Repeats"\n`;
                    prompt += `    * POWER_RESISTANCE: "Short Power Repeats", "Hill Power Repeats", "Resistance Intervals", "Power Surges"\n`;
                    prompt += `  - Format: "Ride 5 RunEQ miles - [WORKOUT: TEMPO_BIKE - Sustained Threshold Effort] on your ${bikeType}"\n`;
                    prompt += `  - Examples: "Ride 5 RunEQ miles - [WORKOUT: TEMPO_BIKE - Tempo Sandwich] on your ${bikeType}"\n`;
                    prompt += `  - Examples: "Ride 6 RunEQ miles - [WORKOUT: INTERVAL_BIKE - Classic 5-Minute Repeats] on your ${bikeType}"\n`;
                    prompt += `  - Rotate through categories to ensure variety (don't use the same category every week)\n`;
                    prompt += `  - ${day} MUST NEVER be: running workout, easy bike ride, rest day\n`;
                });
                prompt += `\n**REPEAT: ${hardDaysThatAreBikeDays.join(' and ')} = HARD ${bikeType} workouts in EVERY week, starting from Week 1, not Week 11.**\n\n`;
            }
            if (hardDaysThatAreNotBikeDays.length > 0) {
                // Days that are hard days but NOT bike days
                prompt += `- **HARD RUNNING DAYS: ${hardDaysThatAreNotBikeDays.join(' and ')} MUST ALWAYS have hard RUNNING workouts (tempo, intervals, or hills) in EVERY week**\n`;
                hardDaysThatAreNotBikeDays.forEach(day => {
                    prompt += `  - ${day} MUST be a hard RUNNING workout (tempo, intervals, or hills) - NEVER easy run, NEVER rest, NEVER bike\n`;
                });
            }
            prompt += `  - DO NOT schedule hard workouts on other days\n`;
            prompt += `  - DO NOT make these days easy runs, easy bike rides, or rest days - they MUST be quality sessions\n`;
            prompt += `  - If you see "Easy" on ${profile.qualityDays.join(' or ')}, you have made an error - fix it immediately\n`;
        }
        if (restDays.length > 0) {
            prompt += `- **REST DAYS: ${restDays.join(', ')} = "Rest" ONLY (no workouts, no cross-training) in EVERY week**\n`;
            prompt += `  - DO NOT schedule any workouts on ${restDays.join(' or ')}\n`;
        }
        if (bikeDays.length > 0 && bikeType) {
            const easyBikeDays = bikeDays.filter(day => !profile.qualityDays?.includes(day));
            if (easyBikeDays.length > 0) {
                prompt += `- **EASY CROSS-TRAINING DAYS: ${easyBikeDays.join(' and ')} should be EASY ${bikeType} rides (aerobic, recovery) - NOT runs, NOT hard workouts**\n`;
            }
        }
        prompt += `\n`;

        prompt += `**PHASE PLAN (use these exact labels in every week header):**\n`;
        phasePlan.forEach(block => {
            const rangeLabel = block.startWeek === block.endWeek
                ? `Week ${block.startWeek}`
                : `Weeks ${block.startWeek}-${block.endWeek}`;
            prompt += `- ${rangeLabel}: ${block.phase} Phase\n`;
        });
        prompt += `Always reference the correct phase for each week. Example: "### Week 8 (Jan 12 - Jan 18) • Build Phase • 32 miles".\n\n`;

        // ADD PRE-COMPUTED MILEAGES IF AVAILABLE
        if (planMath && planMath.weeks) {
            prompt += `**🚨🚨🚨 EXACT WEEKLY TARGETS (USE THESE NUMBERS - DO NOT CALCULATE YOUR OWN):**\n`;
            prompt += `The following mileages have been calculated using physiologically-sound formulas. USE THESE EXACT NUMBERS:\n\n`;

            // Handle Week 1 partial week adjustment
            const week1IsPartial = daysInWeek1 < 7;

            planMath.weeks.forEach((week, idx) => {
                const weekNum = week.weekNumber;
                let weeklyTarget = week.weeklyMileage;
                let longRunTarget = week.longRun;

                // Adjust Week 1 for partial week
                if (weekNum === 1 && week1IsPartial) {
                    const partialRatio = daysInWeek1 / 7;
                    weeklyTarget = Math.round(weeklyTarget * partialRatio);
                    // Long run stays same for partial week (it's usually on Sunday)
                }

                prompt += `- **Week ${weekNum}** (${week.phase}): ${weeklyTarget} miles total, Long Run: ${longRunTarget} miles\n`;
            });

            prompt += `\n**CRITICAL:** These are the EXACT mileages to use. Do NOT deviate. The workouts you assign must add up to these weekly totals.\n`;
            prompt += `**Long run is the LONGEST workout of each week - tempo/intervals must be SHORTER than the long run.**\n\n`;
        }

        if (bikeDays.length > 0 && bikeType) {
            prompt += `**🚨🚨🚨 CRITICAL - WEEKLY MILEAGE CALCULATION (MANDATORY - READ THIS FIRST):**\n`;
            prompt += `**THE SMOKING GUN PROBLEM:**\n`;
            const week2Target = parseInt(profile.currentWeeklyMileage) + 1;
            prompt += `- You are writing headers like "Week 2: ${week2Target} miles" but then generating workouts that add up to ${week2Target + 7} miles.\n`;
            prompt += `- This is WRONG. The header total MUST match the sum of all workouts.\n`;
            prompt += `- If you write "${week2Target} miles" in the header, the workouts MUST add up to exactly ${week2Target} miles (or very close).\n`;
            prompt += `\n**STEP-BY-STEP PROCESS YOU MUST FOLLOW FOR EVERY WEEK (NO EXCEPTIONS):**\n`;
            prompt += `1. FIRST: Plan all workouts for the week (running + RunEQ) with specific distances\n`;
            prompt += `2. SECOND: Add up ALL distances: running miles + RunEQ miles = ACTUAL TOTAL\n`;
            prompt += `3. THIRD: Check if ACTUAL TOTAL matches the target for that week\n`;
            prompt += `4. FOURTH: If ACTUAL TOTAL is too high, REDUCE workout distances until ACTUAL TOTAL = target\n`;
            prompt += `5. FIFTH: ONLY AFTER adjusting workouts, write the week header with the FINAL TOTAL\n`;
            prompt += `6. SIXTH: VERIFY: Header total = Sum of all workout distances (within 1 mile)\n`;
            prompt += `\n**CRITICAL RULES:**\n`;
            prompt += `- The mileage number in each week header (e.g., "• ${week2Target} miles") is the TOTAL weekly mileage.\n`;
            prompt += `- This TOTAL includes BOTH running miles AND RunEQ miles combined.\n`;
            prompt += `- RunEQ miles REPLACE runs - they ARE part of the weekly total, NOT additional.\n`;
            // Week 1 is ALWAYS partial (from start day through Sunday)
            // Calculate proportional target based on days in Week 1
            const week1IsPartial = daysInWeek1 < 7;

            // Calculate week1Target outside the if block so it's accessible later
            const proportionalTarget = Math.round((daysInWeek1 / 7) * parseInt(profile.currentWeeklyMileage));
            const minWeek1Target = Math.min(parseInt(profile.currentLongRun) || 6, parseInt(profile.currentWeeklyMileage) || 16);
            const week1Target = week1IsPartial ? Math.max(proportionalTarget, minWeek1Target) : parseInt(profile.currentWeeklyMileage);

            if (week1IsPartial) {
                prompt += `- Week 1 target: EXACTLY ${week1Target} miles TOTAL (Week 1 is PARTIAL - only ${daysInWeek1} days from ${startDayName} through Sunday)\n`;
                prompt += `- Week 2 target: EXACTLY ${parseInt(profile.currentWeeklyMileage) + 1}-${parseInt(profile.currentWeeklyMileage) + 2} miles TOTAL (Week 2 is the FIRST FULL WEEK - 7 days)\n`;
            } else {
                // Week 1 is full (shouldn't happen, but handle it)
                prompt += `- Week 1 target: EXACTLY ${profile.currentWeeklyMileage} miles TOTAL\n`;
            }
            prompt += `- Week 2 target: EXACTLY ${week2Target}-${parseInt(profile.currentWeeklyMileage) + 2} miles TOTAL (only +1-2 from Week 1)\n`;
            prompt += `\n**TEMPO RUN DISTANCE RULES (CRITICAL):**\n`;
            prompt += `- Weeks 1-4: Tempo runs MUST be 4-5 miles MAXIMUM\n`;
            prompt += `- Tempo runs MUST ALWAYS be SHORTER than the long run for that week\n`;
            const exampleLongRun1 = parseInt(profile.currentLongRun) + 1;
            const exampleTempo1 = Math.min(4, exampleLongRun1 - 1);
            prompt += `- Example: If long run is ${exampleLongRun1} miles, tempo must be ${exampleTempo1}-${Math.min(5, exampleLongRun1 - 1)} miles (NOT ${exampleLongRun1 - 1} or ${exampleLongRun1})\n`;
            const exampleTempo2 = Math.min(4, parseInt(profile.currentLongRun) - 1);
            prompt += `- Example: If long run is ${profile.currentLongRun} miles, tempo must be ${exampleTempo2} miles (NOT ${parseInt(profile.currentLongRun) - 1} or ${profile.currentLongRun})\n`;
            const week2Max = parseInt(profile.currentWeeklyMileage) + 2;
            const exampleLongRunWeek2 = parseInt(profile.currentLongRun) + 1;
            const exampleTempoWeek2 = Math.min(4, exampleLongRunWeek2 - 1);
            const exampleWrongTotal = week2Max + 7; // Example of what happens when you don't check
            const exampleTooHigh = week2Max + 4; // Example of initial plan that's too high
            const exampleCorrectTotal = week2Max;
            const exampleAltTotal = week2Target;
            
            prompt += `\n**EXAMPLE FOR WEEK 2 (target: ${week2Target}-${week2Max} miles TOTAL):**\n`;
            prompt += `  * WRONG APPROACH: Write "Week 2: ${week2Max} miles" then generate: 4 RunEQ + 6 tempo + 4 RunEQ + 5 hills + ${exampleLongRunWeek2} long = ${exampleWrongTotal} miles\n`;
            prompt += `    This is INCONSISTENT - header says ${week2Max} but workouts = ${exampleWrongTotal}. DO NOT DO THIS.\n`;
            prompt += `  * CORRECT APPROACH:\n`;
            prompt += `    Step 1: Plan workouts: 4 RunEQ + ${exampleTempoWeek2} tempo + 4 RunEQ + 3 hills + ${exampleLongRunWeek2} long = ${exampleTooHigh} miles\n`;
            prompt += `    Step 2: Target is ${week2Target}-${week2Max}, so ${exampleTooHigh} is too high\n`;
            prompt += `    Step 3: Reduce workouts: 4 RunEQ + ${exampleTempoWeek2} tempo + 3 RunEQ + 3 hills + ${Math.max(3, exampleLongRunWeek2 - 3)} long = ${exampleCorrectTotal} miles\n`;
            prompt += `    Step 4: NOW write header: "Week 2: ${exampleCorrectTotal} miles"\n`;
            prompt += `    Step 5: Verify: 4 + ${exampleTempoWeek2} + 3 + 3 + ${Math.max(3, exampleLongRunWeek2 - 3)} = ${exampleCorrectTotal} ✓\n`;
            prompt += `  * ALTERNATIVE CORRECT: 4 RunEQ + ${exampleTempoWeek2} tempo + 3 RunEQ + 3 hills + ${Math.max(3, exampleLongRunWeek2 - 4)} long = ${exampleAltTotal} miles → "Week 2: ${exampleAltTotal} miles"\n`;
            prompt += `\n**MANDATORY CHECKLIST FOR EVERY WEEK:**\n`;
            prompt += `- [ ] I planned all workouts with specific distances\n`;
            prompt += `- [ ] I added up all distances (running + RunEQ)\n`;
            prompt += `- [ ] I adjusted distances until sum matches target\n`;
            prompt += `- [ ] I wrote the header with the FINAL total (after adjustments)\n`;
            prompt += `- [ ] I verified: header total = sum of workouts (within 1 mile)\n`;

            // Calculate average miles per workout to help AI understand volume distribution
            const numWorkoutDays = (profile.availableDays || []).length;
            const avgMilesPerWorkout = Math.round((parseInt(profile.currentWeeklyMileage) / numWorkoutDays) * 10) / 10;

            prompt += `\n**CRITICAL - WORKOUT DAY COUNT AFFECTS INDIVIDUAL WORKOUT DISTANCES:**\n`;
            prompt += `- This runner has ${numWorkoutDays} workout days per week\n`;
            prompt += `- With ${profile.currentWeeklyMileage} weekly miles / ${numWorkoutDays} days = ~${avgMilesPerWorkout} miles average per workout\n`;
            prompt += `- MORE workout days = SHORTER individual workouts to stay within weekly target\n`;
            prompt += `- Example: 16 miles/week with 4 days = 4mi avg. 16 miles/week with 6 days = 2.7mi avg.\n`;
            prompt += `- DO NOT give everyone 4-6 mile workouts regardless of their workout day count!\n`;

            if (week1IsPartial) {
                prompt += `\n**MANDATORY:** Week 1 = ~${week1Target} miles TOTAL (partial week), Week 2 = ${week2Target}-${parseInt(profile.currentWeeklyMileage) + 2} miles TOTAL (first full week)\n\n`;
            } else {
                prompt += `\n**MANDATORY:** Week 1 = ${profile.currentWeeklyMileage} miles TOTAL, Week 2 = ${week2Target}-${parseInt(profile.currentWeeklyMileage) + 2} miles TOTAL\n\n`;
            }
        }

        prompt += `**CRITICAL FORMAT:**\n`;
        if (startDayOfWeek === 0) {
            // Starting on Sunday - Week 1 is ONLY Sunday
            prompt += `- Week 1: ONLY ${startDayAbbrev} (1 day - starts ${startDateShort}, ${startDayName})\n`;
        } else {
            prompt += `- Week 1: Only ${startDayAbbrev}-Sun (${daysInWeek1} days, starts ${startDateShort}, ${startDayName})\n`;
        }
        prompt += `- Week 2+: Full Mon-Sun (7 days)\n`;
        prompt += `- Use [WORKOUT_ID: type_category_index] for quality workouts (tempo, interval, hill, longrun)\n`;
        prompt += `- Include distance in ${distanceUnit} for EVERY workout\n`;
        prompt += `- Format for quality workouts: "- Day: [WORKOUT_ID: type_category_index] Workout Name X miles"\n`;
        prompt += `- Example: "- Wed: [WORKOUT_ID: tempo_THRESHOLD_0] Tempo Run 5 miles"\n`;
        prompt += `- Example: "- Sun: [WORKOUT_ID: longrun_CONVERSATIONAL_0] Long Run 8 miles"\n\n`;

        prompt += `**RESPONSE RULES (follow 100%):**\n`;
        prompt += `1. Begin with "# Week-by-Week Training Schedule" – absolutely no introduction or recap before this header.\n`;
        prompt += `2. Write the schedule ONCE. Do not repeat weeks, do not restate the plan after the schedule, and do not add narrative sections besides the final Notes block.\n`;
        prompt += `3. Each week header MUST be "### Week {number} (MMM DD - MMM DD) • {Phase} Phase • XX miles". Use the phase plan above for the {Phase} label.\n`;
        prompt += `4. **CRITICAL: For full weeks (Week 2+), you MUST list ALL 7 days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.**\n`;
        prompt += `   - Do NOT skip Saturday or Sunday - every full week has 7 days\n`;
        prompt += `   - Do NOT stop at Friday - always continue through Sunday\n`;
        prompt += `   - List days Monday → Sunday with one bullet per day. No paragraphs, no combined days.\n`;
        prompt += `   - Week 1 may be partial (only days from start date through Sunday), but Week 2+ are ALWAYS full weeks with all 7 days\n`;
        prompt += `5. After Week ${totalWeeks}, add "## Notes" with 2-3 concise bullets (checkpoint reminders, fueling, etc.). Do NOT introduce new workouts there.\n`;
        prompt += `6. Never say "see above", and never paste the plan twice.\n`;
        prompt += `7. **DO NOT add checkpoints, notes, or other sections between weeks - only add "## Notes" after Week ${totalWeeks}**\n\n`;
        
        if (bikeDays.length > 0 && bikeType) {
            prompt += `**CROSS-TRAINING FORMAT:**\n`;
            if (hardDaysThatAreBikeDays.length > 0) {
                // Hard bike days - use hard bike workouts from library
                prompt += `- **HARD BIKE DAYS (${hardDaysThatAreBikeDays.join(', ')}):**\n`;
                prompt += `  - Format: "Tue: Ride X RunEQ miles - [WORKOUT: CATEGORY - Workout Name] on your ${bikeType}"\n`;
                prompt += `  - SELECT from these HARD bike workout categories:\n`;
                prompt += `    * TEMPO_BIKE: "Sustained Threshold Effort", "Tempo Intervals", "Progressive Tempo Build", "Cruise Intervals", "Tempo Sandwich", "Fast Finish Tempo", "Threshold Pyramid"\n`;
                prompt += `    * INTERVAL_BIKE: "Classic 5-Minute Repeats", "Short Power Repeats", "VO2 Max Intervals", "Aerobic Power Intervals", "Hill Power Repeats"\n`;
                prompt += `    * POWER_RESISTANCE: "Short Power Repeats", "Hill Power Repeats", "Resistance Intervals", "Power Surges"\n`;
                prompt += `  - Examples: "Ride 5 RunEQ miles - [WORKOUT: TEMPO_BIKE - Tempo Sandwich] on your ${bikeType}"\n`;
                prompt += `  - Examples: "Ride 6 RunEQ miles - [WORKOUT: INTERVAL_BIKE - Classic 5-Minute Repeats] on your ${bikeType}"\n`;
                prompt += `  - Rotate through categories to ensure variety\n`;
                prompt += `  - These are HARD workouts - NOT easy aerobic rides\n`;
            }
            const easyBikeDays = bikeDays.filter(day => !profile.qualityDays?.includes(day));
            if (easyBikeDays.length > 0) {
                // Easy bike days - use easy bike workouts from library
                prompt += `- **EASY BIKE DAYS (${easyBikeDays.join(', ')}):**\n`;
                prompt += `  - Format: "Thu: Ride X RunEQ miles - [WORKOUT: AEROBIC_BASE|RECOVERY_SPECIFIC - Workout Name] on your ${bikeType}"\n`;
                prompt += `  - SELECT from these EASY bike workout categories:\n`;
                prompt += `    * AEROBIC_BASE: "Conversational Pace Cruise", "Steady State Ride", "Aerobic Endurance Ride", "Zone 2 Base Building"\n`;
                prompt += `    * RECOVERY_SPECIFIC: "Recovery Spin", "Active Recovery Ride", "Easy Flush Ride", "Recovery Pace Cruise"\n`;
                prompt += `  - Examples: "Ride 4 RunEQ miles - [WORKOUT: AEROBIC_BASE - Conversational Pace Cruise] on your ${bikeType}"\n`;
                prompt += `  - Examples: "Ride 3 RunEQ miles - [WORKOUT: RECOVERY_SPECIFIC - Recovery Spin] on your ${bikeType}"\n`;
                prompt += `  - Rotate between AEROBIC_BASE and RECOVERY_SPECIFIC for variety\n`;
            }
            prompt += `- **CRITICAL: Keep as "RunEQ miles" - do NOT convert to actual bike miles. The system handles conversion.**\n`;
            prompt += `- **CRITICAL: Hard bike days get HARD bike workouts (tempo/interval intensity), easy bike days get EASY bike rides (aerobic/recovery intensity)**\n\n`;
        }
        
        // CRITICAL: Handle injured runners who cannot run
        if (profile.runningStatus === 'crossTrainingOnly') {
            const availableEquipment = [];
            if (profile.standUpBikeType) {
                const bikeName = profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
                availableEquipment.push(bikeName);
            }
            if (profile.crossTrainingEquipment) {
                if (profile.crossTrainingEquipment.pool) availableEquipment.push('pool/aqua running');
                if (profile.crossTrainingEquipment.rowing) availableEquipment.push('rowing machine');
                if (profile.crossTrainingEquipment.elliptical) availableEquipment.push('elliptical');
                if (profile.crossTrainingEquipment.stationaryBike) availableEquipment.push('stationary bike');
                if (profile.crossTrainingEquipment.swimming) availableEquipment.push('swimming');
                if (profile.crossTrainingEquipment.walking) availableEquipment.push('walking');
            }
            
            const primaryEquipment = profile.primaryCrossTrainingEquipment 
                ? (profile.primaryCrossTrainingEquipment === 'cyclete' ? 'Cyclete' : 
                   profile.primaryCrossTrainingEquipment === 'elliptigo' ? 'ElliptiGO' :
                   profile.primaryCrossTrainingEquipment === 'pool' ? 'pool/aqua running' :
                   profile.primaryCrossTrainingEquipment === 'rowing' ? 'rowing machine' :
                   profile.primaryCrossTrainingEquipment === 'elliptical' ? 'elliptical' :
                   profile.primaryCrossTrainingEquipment === 'stationaryBike' ? 'stationary bike' :
                   profile.primaryCrossTrainingEquipment === 'swimming' ? 'swimming' :
                   profile.primaryCrossTrainingEquipment === 'walking' ? 'walking' : profile.primaryCrossTrainingEquipment)
                : (availableEquipment.length > 0 ? availableEquipment[0] : 'cross-training');
            
            prompt += `\n**🚨 CRITICAL - INJURY RECOVERY / CROSS-TRAINING ONLY PLAN:**\n`;
            prompt += `- **RUNNING STATUS: Cannot run right now - cross-training only**\n`;
            prompt += `- **AVAILABLE EQUIPMENT: ${availableEquipment.length > 0 ? availableEquipment.join(', ') : 'None specified'}\n`;
            prompt += `- **PRIMARY EQUIPMENT: ${primaryEquipment}**\n`;
            prompt += `- **🚨 ABSOLUTE REQUIREMENT: DO NOT assign ANY running workouts. ZERO running. NO "Easy run", NO "Tempo run", NO "Long run", NO running of any kind.**\n`;
            prompt += `- **🚨 CRITICAL - USE ALL SELECTED EQUIPMENT:** You MUST rotate through ALL available equipment types throughout the plan. Do NOT only use ${primaryEquipment}. Distribute workouts across:\n`;
            if (availableEquipment.length > 0) {
                availableEquipment.forEach((eq, idx) => {
                    prompt += `  ${idx + 1}. ${eq}\n`;
                });
            }
            prompt += `  **Example distribution:** If user has 4 equipment types, use each one 1-2 times per week. Vary the equipment to prevent overuse and provide variety.\n`;
            prompt += `  **Injury consideration:** If injury information was provided in the coaching analysis, prioritize equipment that is safest for those specific injuries.\n`;
            prompt += `- **ONLY assign workouts using the selected equipment (use ALL of them):**\n`;
            if (profile.standUpBikeType) {
                const bikeName = profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
                prompt += `  * ${bikeName}: "Ride X RunEQ miles on your ${bikeName}" (tempo rides, interval rides, long rides)\n`;
            }
            if (profile.crossTrainingEquipment?.pool) {
                prompt += `  * Pool/Aqua Running: "Aqua run X minutes" or "Pool running X minutes" (tempo, intervals, long sessions)\n`;
            }
            if (profile.crossTrainingEquipment?.rowing) {
                prompt += `  * Rowing: "Row X minutes" or "Rowing machine X minutes" (tempo, intervals, long sessions)\n`;
            }
            if (profile.crossTrainingEquipment?.elliptical) {
                prompt += `  * Elliptical: "Elliptical X minutes" (tempo, intervals, long sessions)\n`;
            }
            if (profile.crossTrainingEquipment?.stationaryBike) {
                prompt += `  * Stationary Bike: "Bike X minutes" (tempo, intervals, long sessions)\n`;
            }
            if (profile.crossTrainingEquipment?.swimming) {
                prompt += `  * Swimming: "Swim X minutes" or "Lap swimming X minutes" (tempo, intervals, long sessions)\n`;
            }
            if (profile.crossTrainingEquipment?.walking) {
                prompt += `  * Walking: "Walk X minutes" or "Walking workout X minutes" (easy, tempo, long walks)\n`;
            }
            prompt += `- **Workout structure:** Match training phases (base → build → peak → taper) but use cross-training equipment\n`;
            prompt += `- **Long sessions:** Use "long [equipment] session" instead of "long run" (e.g., "Long Cyclete ride 60 minutes")\n`;
            prompt += `- **Quality workouts:** Use tempo/intervals on selected equipment (e.g., "Tempo ride on Cyclete 30 minutes")\n`;
            prompt += `- **Rest days:** Still respect rest days (${restDays.length > 0 ? restDays.join(', ') : 'as specified'})\n`;
            prompt += `- **If no equipment selected:** Use walking workouts only (low-impact, no equipment needed)\n`;
        } else if (profile.runningStatus === 'transitioning') {
            prompt += `\n**🔄 TRANSITIONING BACK TO RUNNING:**\n`;
            prompt += `- Weeks 1-2: 100% cross-training (no running)\n`;
            prompt += `- Weeks 3-4: Gradually introduce easy runs (25% running, 75% cross-training)\n`;
            prompt += `- Week 5+: Normal mix of running and cross-training\n`;
        }
        
        prompt += `\n`;

        prompt += `**EXAMPLE FORMAT (structure only – replace with real data):**\n`;
        const week1StartDate = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const exampleWeek2Start = new Date(startDate);
        const daysUntilWeekTwo = startDayOfWeek === 0 ? 1 : (7 - startDayOfWeek + 1);
        exampleWeek2Start.setDate(startDate.getDate() + daysUntilWeekTwo);
        const exampleWeek2End = new Date(exampleWeek2Start);
        exampleWeek2End.setDate(exampleWeek2Start.getDate() + 6);
        const week2StartFormatted = exampleWeek2Start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const week2EndFormatted = exampleWeek2End.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const exampleBikeName = bikeType || (profile.standUpBikeType === 'elliptigo' ? 'ElliptiGO' : 'stand-up bike');
        
        prompt += `# Week-by-Week Training Schedule\n`;
        // Calculate example Week 1 - handle ALL partial week scenarios
        let week1Target, week1FinalLongRun, week1Calculated;
        const week1IsPartial = daysInWeek1 < 7;
        
        if (week1IsPartial) {
            // Week 1 is partial - calculate proportional target
            const proportionalTarget = Math.round((daysInWeek1 / 7) * parseInt(profile.currentWeeklyMileage));
            const minWeek1Target = Math.min(parseInt(profile.currentLongRun) || 6, parseInt(profile.currentWeeklyMileage) || 16);
            week1Target = Math.max(proportionalTarget, minWeek1Target);
            
            // For partial weeks, distribute workouts across available days
            // If only 1 day (Sunday), just the long run
            if (daysInWeek1 === 1) {
                week1FinalLongRun = week1Target;
                week1Calculated = week1FinalLongRun;
                prompt += `### Week 1 (${week1StartDate}) • Base Phase • ${week1Target} miles\n`;
                prompt += `- Sun: Classic Easy Long Run ${week1FinalLongRun} miles (conversational, match current long run)\n`;
                prompt += `**CALCULATION: Week 1 = ${week1FinalLongRun} long run = ${week1Calculated} miles TOTAL (Week 1 is only Sunday when starting on Sunday)**\n`;
            } else {
                // Multiple days in Week 1 - distribute workouts
                const week1RunEQ1 = Math.max(2, Math.floor(week1Target * 0.2));
                const week1Tempo = Math.max(3, Math.floor(week1Target * 0.25));
                const week1RunEQ2 = Math.max(2, Math.floor(week1Target * 0.15));
                week1FinalLongRun = week1Target - week1RunEQ1 - week1Tempo - week1RunEQ2;
                week1FinalLongRun = Math.max(4, Math.min(parseInt(profile.currentLongRun) || 6, week1FinalLongRun));
                week1Calculated = week1RunEQ1 + week1Tempo + week1RunEQ2 + week1FinalLongRun;
                
                prompt += `### Week 1 (${week1StartDate} - ${week1EndFormatted}) • Base Phase • ${week1Target} miles\n`;
                // Show example workouts for the days in Week 1
                if (startDayOfWeek <= 2) { // Mon, Tue, or Wed start
                    const exampleStartDayName = dayNames[startDayOfWeek];
                    if (hardDaysThatAreBikeDays.includes(exampleStartDayName)) {
                        prompt += `- ${startDayAbbrev}: Ride ${week1RunEQ1} RunEQ miles - [WORKOUT: TEMPO_BIKE - Tempo Sandwich] on your ${exampleBikeName} (HARD workout - threshold effort)\n`;
                    } else if (bikeDays.includes(exampleStartDayName)) {
                        prompt += `- ${startDayAbbrev}: Ride ${week1RunEQ1} RunEQ miles - [WORKOUT: AEROBIC_BASE - Conversational Pace Cruise] on your ${exampleBikeName} (easy aerobic)\n`;
                    } else {
                        prompt += `- ${startDayAbbrev}: Easy Run ${week1RunEQ1} miles (aerobic base)\n`;
                    }
                    if (startDayOfWeek <= 1) { // Mon or Tue start
                        prompt += `- Wed: Classic Tempo Run ${week1Tempo} miles (tempo effort, controlled pace) - NOTE: ${week1Tempo} miles is SHORTER than long run (${week1FinalLongRun} miles)\n`;
                    }
                }
                if (startDayOfWeek <= 4) { // Thu or earlier
                    if (hardDaysThatAreBikeDays.includes('Thursday')) {
                        prompt += `- Thu: Ride ${week1RunEQ2} RunEQ miles - [WORKOUT: INTERVAL_BIKE - Classic 5-Minute Repeats] on your ${exampleBikeName} (HARD workout - threshold effort)\n`;
                    } else if (bikeDays.includes('Thursday')) {
                        prompt += `- Thu: Ride ${week1RunEQ2} RunEQ miles - [WORKOUT: RECOVERY_SPECIFIC - Recovery Spin] on your ${exampleBikeName} (recovery spin)\n`;
                    } else {
                        prompt += `- Thu: Easy Run ${week1RunEQ2} miles (recovery)\n`;
                    }
                }
                prompt += `- Sun: Classic Easy Long Run ${week1FinalLongRun} miles (conversational, match current long run)\n`;
                prompt += `**CALCULATION: Week 1 = ${week1RunEQ1} RunEQ + ${week1Tempo} tempo + ${week1RunEQ2} RunEQ + ${week1FinalLongRun} long = ${week1Calculated} miles TOTAL (Week 1 is PARTIAL - only ${daysInWeek1} days from ${startDayName} through Sunday)**\n`;
            }
            prompt += `**CRITICAL: Week 1 is PARTIAL (${daysInWeek1} days). Include ALL days from ${startDayName} through Sunday, including rest days. Week 2 will be the first full week (7 days).**\n`;
        } else {
            // Week 1 is full (shouldn't happen, but handle it)
            week1Target = parseInt(profile.currentWeeklyMileage);
            const week1RunEQ1 = 3;
            const week1RunEQ2 = 3;
            const week1Tempo = 4;
            const week1Hills = 3;
            const week1LongRun = week1Target - week1RunEQ1 - week1Tempo - week1RunEQ2 - week1Hills;
            week1FinalLongRun = Math.max(4, Math.min(parseInt(profile.currentLongRun) || 6, week1LongRun));
            week1Calculated = week1RunEQ1 + week1Tempo + week1RunEQ2 + week1Hills + week1FinalLongRun;
            
            prompt += `### Week 1 (${week1StartDate} - ${week1EndFormatted}) • Base Phase • ${week1Target} miles\n`;
            prompt += `- ${startDayAbbrev}: Ride ${week1RunEQ1} RunEQ miles - [WORKOUT: AEROBIC_BASE - Conversational Pace Cruise] on your ${exampleBikeName} (easy aerobic)\n`;
            prompt += `- Wed: Classic Tempo Run ${week1Tempo} miles (tempo effort, controlled pace) - NOTE: ${week1Tempo} miles is SHORTER than long run (${week1FinalLongRun} miles)\n`;
            prompt += `- Thu: Ride ${week1RunEQ2} RunEQ miles - [WORKOUT: RECOVERY_SPECIFIC - Recovery Spin] on your ${exampleBikeName} (recovery spin)\n`;
            prompt += `- Fri: Hill Strides ${week1Hills} miles (building strength)\n`;
            prompt += `- Sun: Classic Easy Long Run ${week1FinalLongRun} miles (conversational, match current long run)\n`;
            prompt += `**CALCULATION: Week 1 = ${week1RunEQ1} RunEQ + ${week1Tempo} tempo + ${week1RunEQ2} RunEQ + ${week1Hills} hills + ${week1FinalLongRun} long = ${week1Calculated} miles TOTAL (matches target ${week1Target})**\n`;
        }
        
        // Week 2 calculation depends on whether Week 1 was full or partial
        let week2Target, week2LongRun, week2Tempo, week2RunEQ1, week2RunEQ2, week2Hills, week2Calculated;
        if (week1IsPartial) {
            // Week 1 was partial - Week 2 is the FIRST FULL WEEK, so it should be currentWeeklyMileage (not +1)
            week2Target = parseInt(profile.currentWeeklyMileage);
            week2LongRun = parseInt(profile.currentLongRun) || 6; // Use current long run (Week 1 was partial)
        } else {
            // Week 1 was full - Week 2 is +1-2 from Week 1
            week2Target = parseInt(profile.currentWeeklyMileage) + 1;
            week2LongRun = parseInt(profile.currentLongRun) + 1; // +1 from Week 1
        }
        week2Tempo = Math.min(4, week2LongRun - 1); // Tempo must be shorter than long run
        week2RunEQ1 = 4;
        week2RunEQ2 = 3;
        week2Hills = week2Target - week2RunEQ1 - week2Tempo - week2RunEQ2 - week2LongRun;
        week2Calculated = week2RunEQ1 + week2Tempo + week2RunEQ2 + week2Hills + week2LongRun;
        
        prompt += `### Week 2 (${week2StartFormatted} - ${week2EndFormatted}) • Base Phase • ${week2Target} miles\n`;
        prompt += `- Mon: Rest\n`;
        // Check if Tuesday is a hard bike day
        if (hardDaysThatAreBikeDays.includes('Tuesday')) {
            prompt += `- Tue: Ride ${week2RunEQ1} RunEQ miles - [WORKOUT: TEMPO_BIKE - Tempo Intervals] on your ${exampleBikeName} (HARD workout - threshold effort)\n`;
        } else if (bikeDays.includes('Tuesday')) {
            prompt += `- Tue: Ride ${week2RunEQ1} RunEQ miles - [WORKOUT: AEROBIC_BASE - Steady State Ride] on your ${exampleBikeName} (easy flush)\n`;
        } else {
            // Tuesday is not a bike day - show a running workout
            prompt += `- Tue: Easy Run ${week2RunEQ1} miles (aerobic base)\n`;
        }
        // Check if Wednesday is a hard day (but not bike)
        if (hardDaysThatAreNotBikeDays.includes('Wednesday')) {
            prompt += `- Wed: Classic Tempo Run ${week2Tempo} miles (tempo effort) - NOTE: ${week2Tempo} miles is SHORTER than long run (${week2LongRun} miles)\n`;
        } else {
            prompt += `- Wed: Classic Tempo Run ${week2Tempo} miles (tempo effort) - NOTE: ${week2Tempo} miles is SHORTER than long run (${week2LongRun} miles)\n`;
        }
        // Check if Thursday is a hard bike day
        if (hardDaysThatAreBikeDays.includes('Thursday')) {
            prompt += `- Thu: Ride ${week2RunEQ2} RunEQ miles - [WORKOUT: INTERVAL_BIKE - Classic 5-Minute Repeats] on your ${exampleBikeName} (HARD workout - threshold effort)\n`;
        } else if (bikeDays.includes('Thursday')) {
            prompt += `- Thu: Ride ${week2RunEQ2} RunEQ miles - [WORKOUT: AEROBIC_BASE - Steady State Ride] on your ${exampleBikeName} (steady aerobic)\n`;
        } else {
            prompt += `- Thu: Easy Run ${week2RunEQ2} miles (recovery)\n`;
        }
        prompt += `- Fri: Hill Strides ${week2Hills} miles (building strength)\n`;
        prompt += `- Sun: Classic Easy Long Run ${week2LongRun} miles (gradual progression from Week 1)\n`;
        if (week1IsPartial) {
            prompt += `**CALCULATION: Week 2 = ${week2RunEQ1} RunEQ + ${week2Tempo} tempo + ${week2RunEQ2} RunEQ + ${week2Hills} hills + ${week2LongRun} long = ${week2Calculated} miles TOTAL (matches target ${week2Target} - Week 2 is the FIRST FULL WEEK since Week 1 was partial)**\n`;
        } else {
            prompt += `**CALCULATION: Week 2 = ${week2RunEQ1} RunEQ + ${week2Tempo} tempo + ${week2RunEQ2} RunEQ + ${week2Hills} hills + ${week2LongRun} long = ${week2Calculated} miles TOTAL (matches target ${week2Target}, only +1 from Week 1)**\n`;
        }
        prompt += `**CRITICAL: Follow this calculation process for EVERY week - add up all workouts, then write the header with the total.**\n`;
        prompt += `## Notes\n`;
        prompt += `- Follow this structure exactly, swap in real dates/mileage/phases, and only write ONE complete schedule followed by concise notes.\n\n`;

        // Calculate taper weeks (last 2-3 weeks before race)
        const taperStartWeek = Math.max(totalWeeks - 2, 1);
        const taperWeeks = [];
        for (let w = taperStartWeek; w <= totalWeeks; w++) {
            taperWeeks.push(w);
        }
        
        prompt += `**REQUIREMENTS:**\n`;
        prompt += `- **CRITICAL: Generate EXACTLY ${totalWeeks} weeks (Week 1 through Week ${totalWeeks})**\n`;
        
        // CRITICAL: Repeat hard bike day instruction right before generation to prevent AI from ignoring it
        if (hardDaysThatAreBikeDays.length > 0) {
            prompt += `\n**🚨🚨🚨 FINAL REMINDER - HARD BIKE DAYS (DO NOT IGNORE THIS):**\n`;
            prompt += `- **${hardDaysThatAreBikeDays.join(' and ')} are HARD ${bikeType} days in EVERY WEEK (1-${totalWeeks})**\n`;
            prompt += `- **${hardDaysThatAreBikeDays.join(' and ')} = HARD ${bikeType} workouts, NOT running workouts**\n`;
            prompt += `- **If you put a running workout (tempo, intervals, hills) on ${hardDaysThatAreBikeDays.join(' or ')}, you have made an error**\n`;
            prompt += `- **Examples for ${hardDaysThatAreBikeDays.join(' and ')}: "Ride X RunEQ miles - Tempo Bike Intervals", "Ride X RunEQ miles - Sustained Threshold Effort", etc.**\n`;
            prompt += `- **This applies to Week 1, Week 2, Week 3, and EVERY week through Week ${totalWeeks}**\n\n`;
        }
        
        if (profile.runningStatus === 'crossTrainingOnly') {
            // Cross-training only progression
            prompt += `- **LONG SESSION PROGRESSION (STRICT - using selected equipment):**\n`;
            prompt += `  * Week 1: Start with 30-45 minutes (easy effort)\n`;
            prompt += `  * Week 2+: Increase by 5-10 minutes per week MAXIMUM (no jumps of 15+ minutes)\n`;
            prompt += `  * Example: Week 1 = 30-45 min, Week 2 = 40-55 min, Week 3 = 50-65 min\n`;
            prompt += `  * Recovery weeks: Reduce by 10-15 minutes (not more than 20 minutes)\n`;
            prompt += `  * Peak long sessions: 60-90 minutes (depending on equipment and fitness)\n`;
            prompt += `- **WEEKLY TIME PROGRESSION (STRICT):**\n`;
            prompt += `  * Week 1: Start with 2-3 hours total per week\n`;
            prompt += `  * Week 2+: Increase by 10-15% OR 15-30 minutes per week MAXIMUM\n`;
            prompt += `  * Example: Week 1 = 2-3 hours, Week 2 = 2.5-3.5 hours, Week 3 = 3-4 hours\n`;
            prompt += `  * Recovery weeks: Reduce by 20-30% (not more than 50%)\n`;
            prompt += `- Recovery weeks every 3-4 weeks\n`;
            prompt += `- **TAPER WEEKS (Weeks ${taperWeeks.join(', ')}):**\n`;
            prompt += `  * Reduce volume by 30-50% compared to peak weeks\n`;
            prompt += `  * Maintain intensity but reduce frequency (1 quality workout per week max)\n`;
            prompt += `  * Long sessions should be 50-60% of peak long session duration\n`;
            prompt += `  * Week ${totalWeeks} (race week): Minimal volume, easy cross-training only, no hard workouts\n`;
        } else {
            // Normal running progression
            prompt += `- **LONG RUN PROGRESSION (STRICT):**\n`;
            prompt += `  * Week 1: AT OR BELOW current long run (${profile.currentLongRun} ${distanceUnit}) - do NOT exceed\n`;
            prompt += `  * Week 2+: Increase by 1-2 ${distanceUnit} per week MAXIMUM (no jumps of 3+ ${distanceUnit})\n`;
            prompt += `  * Example: Week 1 = ${profile.currentLongRun} ${distanceUnit}, Week 2 = ${parseInt(profile.currentLongRun) + 1}-${parseInt(profile.currentLongRun) + 2} ${distanceUnit}, Week 3 = ${parseInt(profile.currentLongRun) + 2}-${parseInt(profile.currentLongRun) + 4} ${distanceUnit}\n`;
            prompt += `  * Recovery weeks: Reduce long run by 1-2 ${distanceUnit} (not more than 3 ${distanceUnit})\n`;
            prompt += `- **WEEKLY MILEAGE PROGRESSION (STRICT - TOTAL INCLUDES RunEQ):**\n`;
            prompt += `  * Week 1: MUST BE EXACTLY ${profile.currentWeeklyMileage} ${distanceUnit} TOTAL (running + RunEQ combined - user's current weekly mileage)\n`;
            prompt += `  * Week 2: MUST BE ${parseInt(profile.currentWeeklyMileage) + 1}-${parseInt(profile.currentWeeklyMileage) + 2} ${distanceUnit} TOTAL (only +1-2 from Week 1, including RunEQ)\n`;
            prompt += `  * Week 3+: Increase by 10% OR 2-3 ${distanceUnit} per week MAXIMUM (no jumps of 5+ ${distanceUnit})\n`;
            prompt += `  * **CRITICAL:** These totals include RunEQ miles. If Week 2 target is 17-18 miles, ALL workouts (running + RunEQ) must add up to 17-18, NOT 17-18 running + RunEQ on top.\n`;
            prompt += `  * Example: Week 1 = ${profile.currentWeeklyMileage} ${distanceUnit} TOTAL, Week 2 = ${parseInt(profile.currentWeeklyMileage) + 1}-${parseInt(profile.currentWeeklyMileage) + 2} ${distanceUnit} TOTAL, Week 3 = ${parseInt(profile.currentWeeklyMileage) + 2}-${parseInt(profile.currentWeeklyMileage) + 4} ${distanceUnit} TOTAL\n`;
            prompt += `  * Recovery weeks: Reduce by 20-30% (not more than 50%)\n`;
            prompt += `- **TEMPO RUN DISTANCE RULES (MANDATORY):**\n`;
            prompt += `  * Weeks 1-4: Tempo runs MUST be 4-5 ${distanceUnit} MAXIMUM\n`;
            prompt += `  * Tempo runs MUST ALWAYS be SHORTER than the long run for that week\n`;
            prompt += `  * Example: Week 2 with 7-mile long run → tempo must be 4-5 ${distanceUnit} (NOT 6 or 7)\n`;
            prompt += `  * Example: Week 1 with 6-mile long run → tempo must be 4 ${distanceUnit} (NOT 5 or 6)\n`;
            prompt += `  * Later weeks (5+): Tempo can be 5-7 ${distanceUnit}, but still shorter than long run\n`;
            prompt += `- Recovery weeks every 3-4 weeks\n`;
            prompt += `- **TAPER WEEKS (Weeks ${taperWeeks.join(', ')}):**\n`;
            prompt += `  * Reduce volume by 30-50% compared to peak weeks\n`;
            prompt += `  * Maintain intensity but reduce frequency (1 quality workout per week max)\n`;
            prompt += `  * Long runs should be 50-60% of peak long run distance\n`;
            prompt += `  * Week ${totalWeeks} (race week): Minimal volume, easy runs only, no hard workouts\n`;
        }
        prompt += `- Include week header with mileage for each week\n`;
        prompt += `- Brief "Notes" for each week explaining focus\n`;
        prompt += `- Week ${totalWeeks} should end on or just before the race date (${profile.raceDate})\n`;
        prompt += `- **CRITICAL: Week ${totalWeeks} race strategy must match the pacing plan from coaching analysis above**\n\n`;

        prompt += `**OUTPUT:** Week-by-week schedule ONLY. No coaching analysis (already provided above).\n`;
        prompt += `**REMINDER: You must generate exactly ${totalWeeks} weeks, no more, no less.**\n`;

        // CRITICAL: Return both prompt AND planMath so we can override AI-generated mileages
        return { prompt, planMath };
    }

    /**
     * Regenerate plan structure from current week using AI (no defaults!)
     * This replaces the rule-based TrainingPlanGenerator for plan updates
     * @param {object} existingPlan - Current training plan
     * @param {object} updatedProfile - Updated user profile with new settings
     * @param {number} currentWeek - Week to regenerate from
     * @returns {Promise<object>} New plan structure with weeks from current week forward
     */
    async regeneratePlanStructureFromCurrentWeek(existingPlan, updatedProfile, currentWeek) {
        logger.log('🤖 AI Regenerating plan structure from week', currentWeek);
        logger.log('  New settings:', {
            workoutsPerWeek: getWorkoutsPerWeek(updatedProfile),
            availableDays: updatedProfile.availableDays,
            hardSessionDays: updatedProfile.hardSessionDays,
            longRunDay: updatedProfile.longRunDay,
            preferredBikeDays: updatedProfile.preferredBikeDays
        });

        // Get existing weekly plans
        const weeklyPlans = existingPlan?.weeks || existingPlan?.weeklyPlans;
        if (!weeklyPlans) {
            throw new Error('Training plan structure is invalid - missing weeks array');
        }

        // Preserve completed weeks (everything before current week)
        const completedWeeks = weeklyPlans.slice(0, currentWeek - 1);
        logger.log('  Preserved', completedWeeks.length, 'completed weeks');

        // Calculate weeks remaining
        const totalWeeks = weeklyPlans.length;
        const weeksRemaining = totalWeeks - currentWeek + 1;
        const raceDate = existingPlan.planOverview?.raceDate || updatedProfile.raceDate;

        // CRITICAL: Calculate deterministic plan-math for mileage enforcement
        // This ensures regenerated weeks follow proper periodization
        const raceDistanceForMath = (existingPlan.planOverview?.raceDistance || updatedProfile.raceDistance) === 'Half'
            ? 'Half Marathon'
            : (existingPlan.planOverview?.raceDistance || updatedProfile.raceDistance);
        let planMath = null;
        try {
            planMath = PlanMathCalculator.generatePlanMath({
                currentWeeklyMileage: parseInt(updatedProfile.currentWeeklyMileage),
                currentLongRun: parseInt(updatedProfile.currentLongRun),
                totalWeeks: totalWeeks,
                raceDistance: raceDistanceForMath,
                experienceLevel: updatedProfile.experienceLevel
            });
            logger.log('  ✅ Plan math calculated for regeneration:', {
                peakMileage: planMath.targets.peakWeeklyMileage,
                longRunMax: planMath.targets.longRunMax
            });
        } catch (mathError) {
            logger.warn('  ⚠️ Plan math calculation failed for regeneration:', mathError.message);
        }

        // Build context about what's been completed
        let completedContext = '';
        if (completedWeeks.length > 0) {
            const recentWeeks = completedWeeks.slice(-3); // Last 3 weeks for context
            completedContext = `\n**COMPLETED WEEKS CONTEXT (for reference only - do not regenerate these):**\n`;
            recentWeeks.forEach(week => {
                const weekNum = week.weekNumber || week.week;
                const mileage = week.totalMileage || 0;
                completedContext += `- Week ${weekNum}: ${mileage} miles\n`;
            });
            completedContext += `\n**IMPORTANT:** You are regenerating weeks ${currentWeek}-${totalWeeks} only. Weeks 1-${currentWeek - 1} are already completed and will be preserved.\n\n`;
        }

        // Build prompt for regenerating from current week
        const today = new Date();
        const todayFormatted = today.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Calculate start day for current week
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayAbbrevs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Get the date of the current week's start (Monday of that week)
        const raceDateObj = this.parseDate(raceDate);
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const planStartDate = new Date(raceDateObj.getTime() - (totalWeeks * msPerWeek));
        const currentWeekStartDate = new Date(planStartDate.getTime() + ((currentWeek - 1) * msPerWeek));
        const currentWeekStartDay = currentWeekStartDate.getDay();
        const currentWeekStartDayName = dayNames[currentWeekStartDay];

        const units = updatedProfile.units;
        if (!units) {
            throw new Error('Missing required field: units');
        }
        const distanceUnit = units === 'metric' ? 'kilometers' : 'miles';

        // Extract first name for personalization
        const fullName = updatedProfile.name || updatedProfile.displayName;
        const firstName = fullName ? fullName.split(' ')[0] : null;

        // Build workout library context
        const workoutContext = promptBuilder.buildWorkoutLibraryContext();

        // Build regeneration prompt
        let prompt = `**PLAN REGENERATION REQUEST**\n\n`;
        prompt += `You are regenerating a training plan starting from Week ${currentWeek} of ${totalWeeks} weeks.\n\n`;
        
        prompt += completedContext;

        prompt += `**UPDATED SETTINGS (use these, not the original settings):**\n`;
        const updatedWorkoutsPerWeek = getWorkoutsPerWeek(updatedProfile);
        prompt += `- Training Days Per Week: ${updatedWorkoutsPerWeek} (total workouts including cross-training)\n`;
        prompt += `- Available Training Days: ${(updatedProfile.availableDays || []).join(', ')}\n`;
        prompt += `- Hard Workout Days: ${(updatedProfile.hardSessionDays || updatedProfile.qualityDays || []).join(', ')}\n`;
        prompt += `- Long Run Day: ${updatedProfile.longRunDay}\n`;
        if (updatedProfile.preferredBikeDays && updatedProfile.preferredBikeDays.length > 0) {
            const bikeType = updatedProfile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
            prompt += `- ${bikeType} Days: ${updatedProfile.preferredBikeDays.join(', ')}\n`;
        }
        prompt += `\n`;

        prompt += `**ORIGINAL PLAN CONTEXT:**\n`;
        prompt += `- Race Goal: ${existingPlan.planOverview?.raceDistance || updatedProfile.raceDistance} in ${existingPlan.planOverview?.goalTime || updatedProfile.raceTime}\n`;
        prompt += `- Race Date: ${raceDate}\n`;
        prompt += `- Current Weekly Mileage: ${updatedProfile.currentWeeklyMileage} ${distanceUnit}\n`;
        prompt += `- Current Long Run: ${updatedProfile.currentLongRun} ${distanceUnit}\n`;
        prompt += `- Experience Level: ${updatedProfile.experienceLevel}\n`;
        prompt += `\n`;

        // CRITICAL: Include original coaching analysis so regenerated workouts match what coach said
        if (existingPlan.aiCoachingAnalysis || existingPlan.fullPlanText) {
            const originalCoaching = existingPlan.aiCoachingAnalysis || existingPlan.fullPlanText;
            if (typeof originalCoaching === 'string' && originalCoaching.length > 0) {
                // Extract just the week-by-week plan section (not the full analysis)
                let weekPlanText = originalCoaching;
                const weekPlanMatch = originalCoaching.match(/WEEK.*?PLAN[\s\S]*?(?=PHASE|$)/i) || 
                                     originalCoaching.match(/Week \d+.*?Week \d+/s);
                
                if (weekPlanMatch && typeof weekPlanMatch[0] === 'string') {
                    weekPlanText = weekPlanMatch[0];
                }
                
                // Limit to 2000 chars to avoid token limits
                const truncatedText = weekPlanText.length > 2000 
                    ? weekPlanText.substring(0, 2000) + '...'
                    : weekPlanText;
                
                prompt += `**ORIGINAL COACHING ANALYSIS (for reference - match these workout types/distances):**\n`;
                prompt += `${truncatedText}\n`;
                prompt += `\n**IMPORTANT:** The workouts you generate should match the style, distances, and progression shown in the original coaching analysis above. Only adjust for the new schedule settings.\n\n`;
            }
        }

        prompt += `**CRITICAL REQUIREMENTS:**\n`;
        prompt += `1. Generate ONLY weeks ${currentWeek}-${totalWeeks} (${weeksRemaining} weeks)\n`;
        prompt += `2. Use the UPDATED SETTINGS above (not original settings)\n`;
        prompt += `3. Maintain progressive periodization from where the plan left off\n`;
        prompt += `4. Week ${currentWeek} starts on ${currentWeekStartDayName}\n`;
        prompt += `5. All distances in ${distanceUnit}\n`;
        prompt += `6. Use [WORKOUT_ID: ...] format for quality workouts\n`;
        prompt += `7. Include distance for EVERY workout\n`;
        prompt += `\n`;

        if (firstName) {
            prompt += `**PERSONALIZATION: The runner's name is ${firstName}.**\n\n`;
        }

        prompt += `**OUTPUT FORMAT (MANDATORY):**\n`;
        prompt += `For each week from ${currentWeek} to ${totalWeeks}, you MUST list ALL 7 DAYS (Monday through Sunday).\n`;
        prompt += `DO NOT stop at Friday. You must explicitly write out Saturday and Sunday, even if they are Rest days.\n`;
        prompt += `For each week, output:\n`;
        prompt += `### Week ${currentWeek} - [mileage] ${distanceUnit}\n`;
        prompt += `- Mon: [workout]\n`;
        prompt += `- Tue: [workout]\n`;
        prompt += `- Wed: [workout]\n`;
        prompt += `- Thu: [workout]\n`;
        prompt += `- Fri: [workout]\n`;
        prompt += `- Sat: [workout] (DO NOT SKIP - even if Rest day)\n`;
        prompt += `- Sun: [workout] (DO NOT SKIP - even if Rest day)\n`;
        prompt += `\n`;
        prompt += `**CRITICAL:** Every week MUST have exactly 7 days listed. Missing Saturday or Sunday is an error.\n`;
        prompt += `\n`;

        // Combine with workout library context
        const fullPrompt = `${workoutContext}\n\n---\n\n${prompt}`;

        try {
            // Call Claude API via Firebase Function (secure server-side call)
            // Plan regeneration can take longer than initial generation (full plan vs partial)
            // Increase timeout to 300 seconds (5 minutes) to handle large plans
            const result = await this.callWithTimeout(
                this.callAnthropicAPI({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 6000, // Reduced from 8000 to speed up generation and reduce timeout risk
                    system: this.coachingSystemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: fullPrompt
                        }
                    ]
                }),
                300000 // 300 seconds (5 minutes) timeout for full plan regeneration
            );

            if (!result.data.success) {
                throw new Error(result.data.error || 'Failed to regenerate plan');
            }

            const planText = result.data.content[0].text;
            logger.log('  ✅ AI generated plan structure');

            // Parse AI response (extracts workout IDs)
            // Pass currentWeek as starting week number for correct week numbering
            const structuredPlan = planParser.parseAIPlanToStructure(planText, updatedProfile, currentWeek);

            // SAFETY NET: Auto-fill missing days (AI sometimes truncates at Friday)
            // Ensure every week has exactly 7 days (Monday through Sunday)
            if (structuredPlan.weeks && Array.isArray(structuredPlan.weeks)) {
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                
                structuredPlan.weeks.forEach(week => {
                    if (!week.workouts || !Array.isArray(week.workouts)) {
                        // If workouts array is missing, create empty array
                        week.workouts = [];
                    }
                    
                    const existingDays = week.workouts.map(w => w.day);
                    
                    // Check for missing days and add Rest days
                    days.forEach(day => {
                        if (!existingDays.includes(day)) {
                            // AI forgot this day - force a Rest day
                            logger.warn(`  ⚠️ Week ${week.weekNumber || week.week}: Missing ${day} - auto-filling as Rest day`);
                            week.workouts.push({
                                day: day,
                                type: 'rest',
                                name: 'Rest Day',
                                description: 'Rest day (Auto-generated - AI truncated week)',
                                workout: { 
                                    name: 'Rest', 
                                    description: 'Rest day (Auto-generated)' 
                                },
                                distance: 0
                            });
                        }
                    });
                    
                    // Sort to ensure Mon-Sun order
                    week.workouts.sort((a, b) => {
                        const aIndex = days.indexOf(a.day);
                        const bIndex = days.indexOf(b.day);
                        // Handle unknown days (shouldn't happen, but defensive)
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });
                    
                    // Log if we had to add any days
                    if (week.workouts.length > existingDays.length) {
                        logger.log(`  ✅ Week ${week.weekNumber || week.week}: Auto-filled ${week.workouts.length - existingDays.length} missing day(s)`);
                    }
                });
            }

            // CRITICAL: Override AI-generated mileages with deterministic plan-math values
            // Same logic as generateTrainingPlan - AI cannot be trusted with mileages
            if (planMath && planMath.weeks && structuredPlan.weeks) {
                logger.log('  🔧 ENFORCING DETERMINISTIC MILEAGES for regenerated weeks');
                structuredPlan.weeks.forEach((week) => {
                    const mathWeek = planMath.weeks.find(w => w.weekNumber === week.weekNumber);
                    if (mathWeek) {
                        const oldMileage = week.totalMileage;
                        week.totalMileage = mathWeek.weeklyMileage;
                        week.longRunTarget = mathWeek.longRun;
                        week.phase = mathWeek.phase;
                        week._planMathTargets = {
                            weeklyMileage: mathWeek.weeklyMileage,
                            longRun: mathWeek.longRun,
                            tempoDistance: mathWeek.tempoDistance,
                            intervalDistance: mathWeek.intervalDistance,
                            hillDistance: mathWeek.hillDistance
                        };
                        if (oldMileage !== week.totalMileage) {
                            logger.log(`    Week ${week.weekNumber}: AI said ${oldMileage}mi → CORRECTED to ${week.totalMileage}mi`);
                        }
                    }
                });
            }

            // Hydrate workout IDs with full workout details from library
            const enrichedPlan = workoutEnricher.enrichPlanWithWorkouts(structuredPlan);

            // Transform to Dashboard format
            const dashboardPlan = planTransformer.transformToDashboardFormat(enrichedPlan, updatedProfile);

            // Get only the weeks from current week forward
            // Filter to ensure we only get weeks >= currentWeek (in case AI generated extra)
            const allWeeks = dashboardPlan.weeks || [];
            const newWeeks = allWeeks.filter(week => {
                const weekNum = week.weekNumber || week.week;
                return weekNum >= currentWeek;
            });
            
            logger.log('  Generated', newWeeks.length, 'new weeks (from week', currentWeek, 'forward)');

            // Return just the new weeks (will be merged by caller)
            return {
                success: true,
                newWeeks: newWeeks,
                rawResponse: planText,
                metadata: {
                    regeneratedAt: new Date().toISOString(),
                    fromWeek: currentWeek,
                    model: 'claude-sonnet-4-5'
                }
            };

        } catch (error) {
            console.error('AI Coach Error (Plan Regeneration):', error);
            
            // Provide user-friendly error messages
            let errorMessage = error.message;
            if (error.message.includes('deadline-exceeded') || error.message.includes('timeout')) {
                errorMessage = 'Plan generation is taking longer than expected. This can happen with large plans. Please try again - the AI coach is working on your plan.';
            } else if (error.message.includes('Request timeout')) {
                errorMessage = 'The request timed out. Please try again - plan generation can take a few minutes for full plans.';
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Build coaching prompt for REGULAR runners (not injured)
     * CRITICAL: No defaults - all data must come from user profile
     */
    buildRegularRunnerCoachingPrompt(profile) {
        // Validate required fields - no defaults allowed
        if (!profile.raceDistance) {
            throw new Error('Missing required field: raceDistance');
        }
        // Allow missing raceTime if we're using estimated fitness (will use goal time as fallback)
        if (!profile.raceTime && !profile.isEstimatedFitness) {
            throw new Error('Missing required field: raceTime');
        }
        // Use goal time as fallback if raceTime is missing but we have estimated fitness
        if (!profile.raceTime && profile.isEstimatedFitness) {
            logger.warn('⚠️ Missing raceTime in prompt builder, but isEstimatedFitness is true. Using goal time as fallback.');
            // Try to extract from recentRaceTime or use a placeholder
            profile.raceTime = profile.recentRaceTime || 'estimated';
        }
        if (!profile.raceDate) {
            throw new Error('Missing required field: raceDate');
        }
        if (!profile.currentWeeklyMileage) {
            throw new Error('Missing required field: currentWeeklyMileage');
        }
        if (!profile.currentLongRun) {
            throw new Error('Missing required field: currentLongRun');
        }
        // Validate workoutsPerWeek (with backward compatibility for runsPerWeek)
        const profileWorkoutsPerWeek = getWorkoutsPerWeek(profile);
        if (!profileWorkoutsPerWeek || profileWorkoutsPerWeek < 3) {
            throw new Error('Missing required field: workoutsPerWeek (or runsPerWeek for backward compatibility)');
        }
        if (!profile.longRunDay) {
            throw new Error('Missing required field: longRunDay');
        }
        if (!profile.experienceLevel) {
            throw new Error('Missing required field: experienceLevel');
        }
        
        const today = new Date();
        const todayFormatted = today.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // CRITICAL: Use actual start date from profile (may be adjusted if today is a rest day)
        // Must be defined BEFORE it's used in daysInWeek1Coaching calculation
        const startDateCoaching = profile.startDate ? new Date(profile.startDate + 'T00:00:00') : today;
        const startDateFormattedCoaching = startDateCoaching.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Calculate start day info for partial Week 1
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayAbbrevs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const startDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
        const startDayName = dayNames[startDayOfWeek];
        const startDayAbbrev = dayAbbrevs[startDayOfWeek];
        const startDayOfWeekCoaching = startDateCoaching.getDay();
        const startDayNameCoaching = dayNames[startDayOfWeekCoaching];

        // Days remaining in Week 1 (from start day through Sunday) - use coaching start date
        const daysInWeek1Coaching = startDayOfWeekCoaching === 0 ? 1 : (7 - startDayOfWeekCoaching + 1);
        const week1Days = [];
        for (let i = startDayOfWeek; i <= 6; i++) {
            week1Days.push(dayAbbrevs[i]);
        }
        week1Days.push('Sun'); // Always end with Sunday
        // Remove duplicates if start is Sunday
        const uniqueWeek1Days = [...new Set(week1Days)];

        // CRITICAL: No defaults - user must provide units during onboarding
        if (!profile.units) {
            console.error('❌ Missing units in user profile - cannot generate plan');
            throw new Error('User profile missing required field: units');
        }
        const units = profile.units;
        const distanceUnit = units === 'metric' ? 'kilometers' : 'miles';

        // Extract first name for personalization - only if explicitly provided
        const fullName = profile.name || profile.displayName;
        const firstName = fullName ? fullName.split(' ')[0] : null;
        
        // CRITICAL: Calculate total weeks from start date to race date for coaching analysis
        const raceDateObj = this.parseDate(profile.raceDate);
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const totalWeeks = Math.ceil((raceDateObj.getTime() - startDateCoaching.getTime()) / msPerWeek);
        
        // Format race date for display
        const raceDateFormatted = raceDateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Calculate approximate months (for comparison, to tell AI NOT to use this)
        const monthsApprox = Math.round((raceDateObj.getTime() - startDateCoaching.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
        
        let prompt = `The training plan starts on ${startDateFormattedCoaching} (${startDayNameCoaching}). Please create a training plan for me:\n\n`;
        prompt += `**IMPORTANT: All distances should be in ${distanceUnit}. The user is using ${units} units.**\n\n`;
        // Calculate exact days for clarity
        const daysBetween = Math.ceil((raceDateObj.getTime() - startDateCoaching.getTime()) / (24 * 60 * 60 * 1000));
        const monthsBetween = Math.round(daysBetween / 30.44);
        console.log(`📅 DATE CALCULATION: Start=${startDateFormattedCoaching}, Race=${raceDateFormatted}, Days=${daysBetween}, Weeks=${totalWeeks}, Months=${monthsBetween}`);
        
        prompt += `**🚨🚨🚨 CRITICAL - PLAN DURATION AND RACE DATE 🚨🚨🚨**\n`;
        prompt += `**CALCULATION:** From ${startDateFormattedCoaching} to ${raceDateFormatted} = ${daysBetween} days = EXACTLY ${totalWeeks} weeks (${monthsBetween} months)\n`;
        prompt += `- **START DATE:** ${startDateFormattedCoaching} (${profile.startDate})\n`;
        prompt += `- **RACE DATE:** ${raceDateFormatted} (${profile.raceDate})\n`;
        prompt += `- **EXACT DURATION:** ${daysBetween} days = EXACTLY ${totalWeeks} weeks\n`;
        prompt += `- **🚨🚨🚨 YOU MUST SAY:** "${totalWeeks} weeks" when describing the plan duration. DO NOT say "a year", "10 months", "30 weeks", or any other duration.\n`;
        prompt += `- **🚨🚨🚨 CHECKPOINTS:** All checkpoints MUST be between Week 1 and Week ${totalWeeks} ONLY.\n`;
        prompt += `  * For a ${totalWeeks}-week plan, example checkpoints: Week ${Math.max(4, Math.floor(totalWeeks * 0.3))}, Week ${Math.floor(totalWeeks * 0.6)}, Week ${Math.floor(totalWeeks * 0.85)}\n`;
        prompt += `  * DO NOT create checkpoints at Week 8, 16, 24, 30, etc. if the plan is only ${totalWeeks} weeks long.\n`;
        prompt += `  * The plan ends at Week ${totalWeeks}, so ALL checkpoints must be BEFORE Week ${totalWeeks}.\n\n`;

        // Add personalization instruction if we have a name
        if (firstName) {
            prompt += `**PERSONALIZATION: The runner's name is ${firstName}. Use their ACTUAL name "${firstName}" naturally 2-3 times throughout your coaching analysis. DO NOT use example names like "Sarah" or any placeholder names. For example: "Hey, ${firstName}!" at the start, and "Here's the thing, ${firstName}..." when being honest about challenges.**\n\n`;
        }

        prompt += `**Goal Race:**\n`;
        prompt += `- Distance: ${profile.raceDistance}\n`;
        // Handle missing raceTime gracefully
        if (profile.raceTime && profile.raceTime !== 'estimated') {
            prompt += `- Goal Time: ${profile.raceTime}\n`;
        } else {
            // Fallback: use recentRaceTime as goal time estimate, or indicate it's estimated
            const goalTimeFallback = profile.recentRaceTime || 'estimated based on current fitness';
            prompt += `- Goal Time: ${goalTimeFallback} (estimated)\n`;
        }
        prompt += `- Race Date: ${profile.raceDate}\n`;

        // Add race course terrain if provided
        if (profile.raceElevationProfile) {
            const terrainDescriptions = {
                'flat': 'Flat course (minimal elevation change)',
                'rolling': 'Rolling hills (moderate elevation changes)',
                'hilly': 'Hilly course (significant elevation gain)'
            };
            prompt += `- Course Terrain: ${terrainDescriptions[profile.raceElevationProfile] || profile.raceElevationProfile}\n`;
        }
        prompt += `\n`;

        // NOTE: Injury logic is now handled in buildInjuredRunnerCoachingPrompt()
        // Regular runners should NOT have injury information in their prompt

        prompt += `**Current Fitness:**\n`;
        prompt += `- Weekly Mileage: ${profile.currentWeeklyMileage} ${distanceUnit}\n`;
        prompt += `- Current Long Run: ${profile.currentLongRun} ${distanceUnit}\n`;

        if (profile.recentRaceTime && profile.recentRaceDistance) {
            // Explicitly clarify race distance with conversions
            let raceExplanation = profile.recentRaceDistance;
            if (profile.recentRaceDistance === '5K') {
                raceExplanation = units === 'metric' ? '5K (5 kilometers)' : '5K (5 kilometers = 3.1 miles)';
            } else if (profile.recentRaceDistance === '10K') {
                raceExplanation = units === 'metric' ? '10K (10 kilometers)' : '10K (10 kilometers = 6.2 miles)';
            } else if (profile.recentRaceDistance === 'Half Marathon') {
                raceExplanation = units === 'metric' ? 'Half Marathon (21.1 kilometers)' : 'Half Marathon (13.1 miles)';
            } else if (profile.recentRaceDistance === 'Marathon') {
                raceExplanation = units === 'metric' ? 'Marathon (42.2 kilometers)' : 'Marathon (26.2 miles)';
            }

            if (profile.isEstimatedFitness) {
                prompt += `- **Estimated Current Fitness:** ${profile.recentRaceTime} for ${raceExplanation} (calculated as 15% slower than goal - user did not provide recent race data)\n`;
                prompt += `  **IMPORTANT:** This is a CONSERVATIVE ESTIMATE to ensure safe training. The user's actual current fitness may be better or worse.\n`;
            } else {
                prompt += `- Recent Race: ${profile.recentRaceTime} for ${raceExplanation}\n`;
            }

            // Add calculated fitness assessment with pace and race predictions
            const fitnessContext = this.buildFitnessAssessmentContext(profile);
            if (fitnessContext) {
                prompt += fitnessContext;
            }
            
            // Extract projected time and gap for explicit use in coaching output
            const predictions = this.predictRaceTimes(profile.recentRaceTime, profile.recentRaceDistance);
            const goalDistance = profile.raceDistance;
            const goalTime = profile.raceTime || profile.recentRaceTime; // Fallback to recentRaceTime if goal time missing
            let projectedTime = null;
            let gapMinutes = null;
            
            if (predictions && goalTime && goalTime !== 'estimated' && goalDistance) {
                const goalTimePart = goalTime.includes('-') ? goalTime.split('-')[1] : goalTime;
                projectedTime = predictions[goalDistance] || predictions['Half'];
                const goalSeconds = this.timeToSeconds(goalTimePart);
                const predictedSeconds = this.timeToSeconds(projectedTime);
                
                if (goalSeconds && predictedSeconds) {
                    const diffSeconds = goalSeconds - predictedSeconds;
                    gapMinutes = Math.abs(Math.round(diffSeconds / 60));
                }
            }
            
            // Store these for use in OUTPUT REQUIREMENTS section
            profile._projectedTime = projectedTime;
            profile._gapMinutes = gapMinutes;
        }

        prompt += `\n**Training Preferences:**\n`;
        
        // Add bike/cross-training day info FIRST (before workoutsPerWeek) to clarify what it means
        let bikeDays = [];
        if (profile.standUpBikeType && profile.standUpBikeType !== 'none' && profile.preferredBikeDays && profile.preferredBikeDays.length > 0) {
            const bikeType = profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
            bikeDays = profile.preferredBikeDays; // User explicitly selected these days during onboarding

            prompt += `- Cross-Training Equipment: ${bikeType}\n`;
            prompt += `- **IMPORTANT: ${bikeDays.join(' and ')} should be ${bikeType} rides, NOT runs**\n`;
            prompt += `  Format: "Tue: Ride X RunEQ miles - [WORKOUT: AEROBIC_BASE|RECOVERY_SPECIFIC - Workout Name] on your ${bikeType}" (NOT "Easy 4 mile run")\n`;
            prompt += `  Select from library workouts: AEROBIC_BASE (e.g., "Conversational Pace Cruise", "Steady State Ride") or RECOVERY_SPECIFIC (e.g., "Recovery Spin", "Active Recovery Ride")\n`;
            prompt += `  These replace what would normally be easy run days with cross-training\n`;
        }
        
        // Get workoutsPerWeek with backward compatibility
        const workoutsPerWeek = getWorkoutsPerWeek(profile);
        
        // CRITICAL: Clarify that workoutsPerWeek includes bike days when bike equipment is present
        if (bikeDays.length > 0) {
            const runningDays = workoutsPerWeek - bikeDays.length;
            prompt += `- Training Days Per Week: ${workoutsPerWeek} total (${runningDays} running workouts + ${bikeDays.length} ${profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'} rides)\n`;
            prompt += `  ⚠️ CRITICAL: "Training Days Per Week: ${workoutsPerWeek}" means ${workoutsPerWeek} TOTAL training sessions (running + cross-training), NOT ${workoutsPerWeek} running workouts.\n`;
            prompt += `  - ${bikeDays.join(' and ')} are ${profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO'} rides (count toward the ${workoutsPerWeek} total)\n`;
            prompt += `  - The remaining ${runningDays} days are RUNNING workouts (not bike)\n`;
        } else {
            prompt += `- Training Days Per Week: ${workoutsPerWeek} (all running workouts)\n`;
        }
        
        prompt += `- Long Run Day: ${profile.longRunDay}\n`;

        // Add rest days info - log for debugging
        console.log('🛑 REST DAYS from profile:', profile.restDays);

        // Add rest days info
        if (profile.restDays && profile.restDays.length > 0) {
            prompt += `- **REST DAYS: ${profile.restDays.join(', ')}** - These days MUST be complete rest (no running, no cross-training)\n`;
        }

        if (profile.qualityDays && profile.qualityDays.length > 0) {
            prompt += `- **QUALITY/HARD WORKOUT DAYS: ${profile.qualityDays.join(' and ')}**\n`;
            prompt += `  ⚠️ CRITICAL: The user specifically requested hard workouts on ${profile.qualityDays.join(' AND ')}.\n`;
            prompt += `  - ${profile.qualityDays[0]} MUST have a hard workout (tempo, intervals, or hills)\n`;
            if (profile.qualityDays[1]) {
                prompt += `  - ${profile.qualityDays[1]} MUST have a hard workout (tempo, intervals, or hills)\n`;
            }
            prompt += `  - DO NOT schedule hard workouts on other days\n`;
            prompt += `  - DO NOT make these days easy runs - they MUST be quality sessions\n`;
        }

        // Add cross-training equipment info for rest_or_xt scheduling
        // CRITICAL: Only include if user actually has equipment (no defaults)
        const crossTrainingEquipment = profile.crossTrainingEquipment;
        const availableCrossTraining = [];
        if (crossTrainingEquipment) {
            if (crossTrainingEquipment.pool) availableCrossTraining.push('pool running');
            if (crossTrainingEquipment.elliptical) availableCrossTraining.push('elliptical');
            if (crossTrainingEquipment.stationaryBike) availableCrossTraining.push('stationary bike');
            if (crossTrainingEquipment.swimming) availableCrossTraining.push('swimming');
            if (crossTrainingEquipment.rowing) availableCrossTraining.push('rowing machine');
        }

        if (availableCrossTraining.length > 0) {
            prompt += `- Cross-Training Options: ${availableCrossTraining.join(', ')}\n`;

            // If user has 2+ rest days AND cross-training equipment, convert one to Rest / XT
            // CRITICAL: Only count rest days if user explicitly set them (no defaults)
            const restDaysCount = profile.restDays ? profile.restDays.length : 0;
            if (restDaysCount >= 2) {
                prompt += `  **IMPORTANT: Since the user has ${restDaysCount} rest days and cross-training equipment:**\n`;
                prompt += `  - Keep ONE day as complete "Rest" (for true recovery)\n`;
                prompt += `  - Make the OTHER rest day(s) "Rest / XT" - this gives flexibility to cross-train or rest\n`;
                prompt += `  - Format: "Wed: Rest / XT" (user chooses between rest or cross-training that day)\n`;
            } else if (restDaysCount === 1) {
                prompt += `  With only 1 rest day, keep it as complete "Rest" for recovery.\n`;
            }
        }

        prompt += `- Experience Level: ${profile.experienceLevel}\n\n`;

        prompt += `**CRITICAL OUTPUT FORMAT REQUIREMENTS:**\n\n`;
        prompt += `For EVERY week, you MUST output the daily schedule using this EXACT format:\n\n`;

        // Build example weeks dynamically based on user's actual preferences
        // CRITICAL: Only use what user explicitly provided (no defaults)
        const qualityDays = profile.qualityDays || [];
        const bikeType = profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';

        // Sample quality workouts to rotate through
        const qualityWorkouts = [
            '[WORKOUT_ID: tempo_THRESHOLD_0] Tempo Run 6 miles',
            '[WORKOUT_ID: interval_VO2_MAX_2] 800m Track Intervals'
        ];

        // Get rest days from profile - only if explicitly set
        const restDays = profile.restDays || [];

        // Track which rest day we're on (for Rest / XT logic)
        let restDayCounter = 0;
        const hasXTEquipment = availableCrossTraining.length > 0;

        // Helper to generate workout for a day
        const getWorkoutForDay = (abbrev, fullDay, qIdx) => {
            // Check rest days FIRST
            if (restDays.includes(fullDay)) {
                restDayCounter++;
                // If user has 2+ rest days AND cross-training equipment, make 2nd+ rest day "Rest / XT"
                if (hasXTEquipment && restDays.length >= 2 && restDayCounter > 1) {
                    return `- ${abbrev}: Rest / XT\n`;
                }
                return `- ${abbrev}: Rest\n`;
            } else if (profile.longRunDay === fullDay) {
                return `- ${abbrev}: [WORKOUT_ID: longrun_CONVERSATIONAL_0] Long Run 5 miles\n`;
            } else if (bikeDays.includes(fullDay)) {
                return `- ${abbrev}: Ride 3 RunEQ miles - [WORKOUT: AEROBIC_BASE - Conversational Pace Cruise] on your ${bikeType}\n`;
            } else if (qualityDays.includes(fullDay)) {
                return `- ${abbrev}: ${qualityWorkouts[qIdx % qualityWorkouts.length]}\n`;
            } else {
                return `- ${abbrev}: Easy 3 miles\n`;
            }
        };

        // Example Week 1 - PARTIAL (only days from start day to Sunday)
        let exampleWeek1 = `### Week 1 (${startDateFormattedCoaching.split(',')[0]}) - ${daysInWeek1Coaching * 3} miles (PARTIAL WEEK - starts ${startDayNameCoaching})\n`;
        let qIdx = 0;
        for (let i = startDayOfWeekCoaching; i <= 6; i++) { // startDayOfWeekCoaching to Saturday (6)
            exampleWeek1 += getWorkoutForDay(dayAbbrevs[i], dayNames[i], qIdx);
            if (qualityDays.includes(dayNames[i])) qIdx++;
        }
        // Add Sunday
        exampleWeek1 += getWorkoutForDay('Sun', 'Sunday', qIdx);
        exampleWeek1 += `\n`;

        // Example Week 2 - FULL Mon-Sun
        let exampleWeek2 = `### Week 2 - 20 miles (FULL WEEK Mon-Sun)\n`;
        qIdx = 0;
        const fullWeekDays = [
            ['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'],
            ['Thu', 'Thursday'], ['Fri', 'Friday'], ['Sat', 'Saturday'], ['Sun', 'Sunday']
        ];
        fullWeekDays.forEach(([abbrev, fullDay]) => {
            exampleWeek2 += getWorkoutForDay(abbrev, fullDay, qIdx);
            if (qualityDays.includes(fullDay)) qIdx++;
        });
        exampleWeek2 += `\n`;

        // Simplified examples - just show format, not full weeks
        prompt += `**EXAMPLE FORMAT:**\n`;
        prompt += `Week 1 (${startDayAbbrev}-Sun) - **CRITICAL: You MUST include ALL days from ${startDayName} through Sunday, including rest days:**\n`;
        
        // Build example showing all days from start day to Sunday
        const exampleDays = [];
        for (let i = startDayOfWeekCoaching; i <= 6; i++) {
            const abbrev = dayAbbrevs[i];
            const fullDay = dayNames[i];
            if (restDays.includes(fullDay)) {
                exampleDays.push(`- ${abbrev}: Rest`);
            } else if (fullDay === profile.longRunDay) {
                exampleDays.push(`- ${abbrev}: [WORKOUT_ID: longrun_CONVERSATIONAL_0] Long Run 5 ${distanceUnit}`);
            } else if (i === startDayOfWeekCoaching) {
                exampleDays.push(`- ${abbrev}: [WORKOUT_ID: tempo_THRESHOLD_0] Tempo Run 6 ${distanceUnit}`);
            } else {
                exampleDays.push(`- ${abbrev}: Easy 3 ${distanceUnit}`);
            }
        }
        prompt += exampleDays.join('\n') + `\n\n`;
        
        prompt += `Week 2 (Mon-Sun):\n`;
        prompt += `- Mon: Rest\n`;
        prompt += `- Wed: [WORKOUT_ID: interval_VO2_MAX_2] 800m Intervals 6 ${distanceUnit}\n`;
        prompt += `- Sun: [WORKOUT_ID: longrun_CONVERSATIONAL_0] Long Run 7 ${distanceUnit}\n\n`;

        prompt += `**CRITICAL:** Week 1 starts ${startDayName} (partial). You MUST list ALL days from ${startDayName} through Sunday, including rest days. Do NOT skip any days in between.\n\n`;

        // Add VERY EXPLICIT rest day rules
        if (restDays.length > 0) {
            prompt += `**🚨 MANDATORY REST DAYS - DO NOT IGNORE:**\n`;
            prompt += `The following days are COMPLETE REST DAYS. The user has ${7 - restDays.length} training days per week.\n`;
            prompt += `**REST DAYS: ${restDays.join(', ')}**\n`;
            prompt += `For each rest day, output EXACTLY: "${restDays[0].substring(0,3)}: Rest"\n`;
            prompt += `DO NOT assign ANY workout (no running, no cross-training, no easy runs) on: ${restDays.join(', ')}\n\n`;
        }

        prompt += `EVERY week MUST include:\n`;
        prompt += `1. Week header with week number, date range, and total mileage\n`;
        prompt += `2. **Week 1: ALL days from ${dayAbbrevs[startDayOfWeekCoaching]} through Sunday (${daysInWeek1Coaching} days total) - DO NOT SKIP ANY DAYS, including rest days.** Week 2+: Full Mon-Sun (7 days)\n`;
        prompt += `3. [WORKOUT_ID: ...] format for quality workouts from the library\n`;
        prompt += `4. **CRITICAL: Include distance in ${distanceUnit} for EVERY workout** (e.g., "Long Run 10 miles", "Tempo Run 6 miles")\n`;
        prompt += `5. Simple descriptions for easy runs and rest days (must include distance)\n`;
        if (restDays.length > 0) {
            prompt += `6. **${restDays.join(', ')} = "Rest" ONLY** (the user picked ${7 - restDays.length} training days, not 7). **CRITICAL: If any of these rest days fall in Week 1 (${dayAbbrevs[startDayOfWeekCoaching]}-Sun), you MUST include them in Week 1's schedule.**\n`;
        }
        prompt += `\n`;

        prompt += `**PROGRESSIVE TRAINING PRINCIPLES (STRICT):**\n`;
        prompt += `1. **Week 1 MUST start conservatively:** First long run should be AT OR BELOW current long run distance (${profile.currentLongRun} ${distanceUnit}) - DO NOT EXCEED\n`;
        prompt += `2. **LONG RUN PROGRESSION (STRICT):** Increase by 1-2 ${distanceUnit} per week MAXIMUM - NO JUMPS OF 3+ ${distanceUnit}\n`;
        prompt += `   Example: Week 1 = ${profile.currentLongRun} ${distanceUnit}, Week 2 = ${parseInt(profile.currentLongRun) + 1}-${parseInt(profile.currentLongRun) + 2} ${distanceUnit}, Week 3 = ${parseInt(profile.currentLongRun) + 2}-${parseInt(profile.currentLongRun) + 4} ${distanceUnit}\n`;
        prompt += `3. **WORKOUT DISTANCE RULES (CRITICAL):**\n`;
        prompt += `   - Long run is ALWAYS the longest workout of the week\n`;
        prompt += `   - Tempo runs in Weeks 1-4: 4-5 ${distanceUnit} MAXIMUM (NOT 6+ ${distanceUnit})\n`;
        prompt += `   - Tempo runs should be 2-3 ${distanceUnit} SHORTER than the long run (e.g., if long run is 7 ${distanceUnit}, tempo should be 4-5 ${distanceUnit}, NOT 6 ${distanceUnit})\n`;
        prompt += `   - Intervals in Weeks 1-4: 5-6 ${distanceUnit} MAXIMUM (including warmup/cooldown)\n`;
        prompt += `   - Hill workouts in Weeks 1-4: 4-5 ${distanceUnit} MAXIMUM\n`;
        prompt += `   - Easy runs: 3-4 ${distanceUnit} in base phase\n`;
        prompt += `4. **WEEKLY MILEAGE PROGRESSION (STRICT):**\n`;
        prompt += `   - Week 1: MUST BE EXACTLY ${profile.currentWeeklyMileage} ${distanceUnit} TOTAL (user's current weekly mileage - DO NOT exceed, DO NOT start higher)\n`;
        prompt += `   - Week 2: MUST BE ${parseInt(profile.currentWeeklyMileage) + 1}-${parseInt(profile.currentWeeklyMileage) + 2} ${distanceUnit} TOTAL (only +1-2 from Week 1, NOT +3)\n`;
        prompt += `   - Week 3: MUST BE ${parseInt(profile.currentWeeklyMileage) + 2}-${parseInt(profile.currentWeeklyMileage) + 4} ${distanceUnit} TOTAL (gradual build, NOT +5+)\n`;
        prompt += `   - Week 4+: Increase by 10% OR 2-3 ${distanceUnit} per week MAXIMUM - NO JUMPS OF 5+ ${distanceUnit}\n`;
        prompt += `   - Example: Week 1 = ${profile.currentWeeklyMileage} ${distanceUnit}, Week 2 = ${parseInt(profile.currentWeeklyMileage) + 1}-${parseInt(profile.currentWeeklyMileage) + 2} ${distanceUnit}, Week 3 = ${parseInt(profile.currentWeeklyMileage) + 2}-${parseInt(profile.currentWeeklyMileage) + 4} ${distanceUnit}\n`;
        if (profile.standUpBikeType && profile.standUpBikeType !== 'none') {
            const bikeType = profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
            prompt += `   **CRITICAL - READ CAREFULLY:**\n`;
            prompt += `   - RunEQ miles from ${bikeType} REPLACE runs (both easy AND hard) - they ARE running miles, not additional miles.\n`;
            prompt += `   - The weekly mileage total you specify in the week header MUST INCLUDE RunEQ miles.\n`;
            prompt += `   - Example: If Week 2 header says "18 miles", then ALL workouts (running + RunEQ) must add up to 18 total.\n`;
            prompt += `   - WRONG: "18 miles" with 17 running + 8 RunEQ = 25 total (this is incorrect!)\n`;
            prompt += `   - CORRECT: "18 miles" with 10 running + 8 RunEQ = 18 total, OR "25 miles" with 17 running + 8 RunEQ = 25 total.\n`;
            prompt += `   - When calculating the weekly total, ADD: running miles + RunEQ miles = total weekly miles.\n`;
        }
        prompt += `4. Recovery weeks every 3-4 weeks (reduce long run by 1-2 ${distanceUnit}, reduce weekly mileage by 20-30%)\n\n`;

        // Note: totalWeeks is already calculated earlier in this function (line 624)

        // Format race date for display in prompt
        const raceDateFormattedPlan = raceDateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        prompt += `**OUTPUT REQUIREMENTS (Jason Fitzgerald voice):**\n`;
        prompt += `1. **OPENING PARAGRAPH - CRITICAL:** Start with a clear, explicit statement that includes:\n`;
        prompt += `   - The user's CURRENT PROJECTED race time (calculated from their recent ${profile.recentRaceDistance || 'race'} via VDOT equivalency)\n`;
        prompt += `   - Their GOAL race time\n`;
        prompt += `   - The GAP between them\n`;
        
        // Use extracted values if available, otherwise provide example format
        if (profile._projectedTime && profile._gapMinutes !== null) {
            const goalTimePart = profile.raceTime.includes('-') ? profile.raceTime.split('-')[1] : profile.raceTime;
            prompt += `   **YOU MUST SAY:** "Based on your ${profile.recentRaceTime} ${profile.recentRaceDistance}, if you raced a ${profile.raceDistance} tomorrow, you'd probably run around ${profile._projectedTime}. Your goal is ${goalTimePart} - that's a ${profile._gapMinutes}-minute gap to close in ${totalWeeks} weeks."\n`;
        } else {
            prompt += `   Example format: "Based on your ${profile.recentRaceTime || 'recent race'}, if you raced a ${profile.raceDistance} tomorrow, you'd probably run around [PROJECTED_TIME]. Your goal is ${profile.raceTime.includes('-') ? profile.raceTime.split('-')[1] : profile.raceTime} - that's a [GAP]-minute gap to close in ${totalWeeks} weeks."\n`;
        }
        
        prompt += `   **DO NOT** just say "you're looking to drop X minutes off your projected time" without stating what the projected time actually IS.\n`;
        prompt += `2. Key training paces with ranges\n`;
        prompt += `3. Training phase overview: Describe the 4 phases (Base, Build, Peak, Taper) with general focus for each - DO NOT output a week-by-week schedule here (that comes in Step 2)\n`;
        prompt += `4. Race day strategy: pacing, fueling, terrain (race date is ${raceDateFormattedPlan})\n`;
        prompt += `5. Checkpoints with metrics (e.g., "Week 8: 10K under 65:00") - ALL checkpoints must be Week 1 through Week ${totalWeeks}, NO checkpoints beyond Week ${totalWeeks}\n`;
        prompt += `6. Final notes: why plan works, what to watch, encouragement\n`;
        prompt += `**CRITICAL:**\n`;
        prompt += `- DO NOT output a week-by-week schedule in this section - only provide the coaching overview\n`;
        prompt += `- DO NOT use workout IDs like [WORKOUT_ID: ...] in your response\n`;
        prompt += `- DO NOT list specific workouts or create a training schedule\n`;
        prompt += `- DO NOT include day-by-day or week-by-week plan structure\n`;
        prompt += `- The plan structure is generated separately by code - your role is narrative coaching only\n`;
        prompt += `- The race date is ${raceDateFormattedPlan} (${profile.raceDate}) - DO NOT mention a different date like "Feb 15"\n`;
        prompt += `- All checkpoints must be between Week 1 and Week ${totalWeeks} (no Week 16, Week 20, etc. if plan is only ${totalWeeks} weeks)\n\n`;

        return prompt;
    }

    /**
     * TWO-LAYER AI ARCHITECTURE FOR INJURY RECOVERY COACHING
     *
     * Layer 1: Expert analysis outputs structured JSON with FACTS ONLY
     * Layer 2: Coach persona delivers those facts - CANNOT hallucinate because
     *          it can only reference data from Layer 1's structured output
     *
     * This prevents hallucination like mentioning "ElliptiGO" when user has "Cyclete"
     */

    /**
     * LAYER 1: Generate structured expert analysis for injury recovery
     * Outputs JSON with facts only - no prose, no persona
     * @private
     */
    async generateInjuryExpertAnalysis(injuryContext, userProfile, trainingPlan) {
        const { weeksOffRunning, selectedEquipment, reduceTrainingDays, currentWeek, returnToRunningWeek } = injuryContext;

        // Build equipment list with EXACT names - this is the source of truth
        const equipmentList = [];
        if (selectedEquipment.pool) equipmentList.push({ name: 'Pool/Aqua Running', type: 'pool', safetyLevel: 'very_safe' });
        if (selectedEquipment.elliptical) equipmentList.push({ name: 'Elliptical', type: 'elliptical', safetyLevel: 'safe' });
        if (selectedEquipment.stationaryBike) equipmentList.push({ name: 'Stationary Bike', type: 'stationaryBike', safetyLevel: 'safe' });
        if (selectedEquipment.swimming) equipmentList.push({ name: 'Swimming', type: 'swimming', safetyLevel: 'very_safe' });
        if (selectedEquipment.rowing) equipmentList.push({ name: 'Rowing Machine', type: 'rowing', safetyLevel: 'moderate' });
        if (selectedEquipment.standUpBike) {
            // CRITICAL: Use exact bike type from user profile - no guessing
            const bikeName = userProfile.standUpBikeType === 'cyclete' ? 'Cyclete' :
                            userProfile.standUpBikeType === 'elliptigo' ? 'ElliptiGO' : 'Stand-Up Bike';
            equipmentList.push({ name: bikeName, type: 'standUpBike', safetyLevel: 'safe' });
        }

        // Build race context
        const raceDistance = trainingPlan?.planOverview?.raceDistance || userProfile.raceDistance;
        const raceTime = trainingPlan?.planOverview?.goalTime || userProfile.raceTime;
        const raceDate = trainingPlan?.planOverview?.raceDate || userProfile.raceDate;
        const totalWeeks = trainingPlan?.weeks?.length || 0;
        const weeksRemaining = totalWeeks - currentWeek + 1;

        // Extract first name
        const fullName = userProfile.name || userProfile.displayName;
        const firstName = fullName ? fullName.split(' ')[0] : null;

        const layer1Prompt = `You are a sports physiologist analyzing an injury recovery situation.
Output ONLY valid JSON - no markdown, no code blocks, no prose.

INJURY RECOVERY FACTS:
- Runner Name: ${firstName || 'Runner'}
- Current Week: Week ${currentWeek} of ${totalWeeks}-week plan
- Weeks Off Running: ${weeksOffRunning} weeks
- Return to Running Week: ${returnToRunningWeek}
- Race Goal: ${raceDistance} in ${raceTime}
- Race Date: ${raceDate}
- Weeks Remaining After Recovery: ${weeksRemaining - weeksOffRunning} weeks
- Training Days Reduced By: ${reduceTrainingDays} day(s)
${injuryContext.injuries && injuryContext.injuries.length > 0 ? `- Injuries: ${injuryContext.injuries.join(', ')}` : '- Injuries: General/unspecified'}
${injuryContext.injuryDescription ? `- Additional Details: ${injuryContext.injuryDescription}` : ''}

AVAILABLE EQUIPMENT (USE THESE EXACT NAMES):
${equipmentList.map(eq => `- ${eq.name} (type: ${eq.type})`).join('\n')}

Analyze this situation and return structured JSON:

{
  "runnerName": "string - first name only",
  "injuries": ["array of injury names"],
  "injurySummary": "1-2 sentence summary of the injury situation",
  "availableEquipment": ["array of EXACT equipment names from the list above - DO NOT invent equipment"],
  "recommendedEquipment": ["array of 1-3 BEST equipment options for this injury - USE EXACT NAMES"],
  "equipmentToAvoid": ["array of equipment that could aggravate this injury - USE EXACT NAMES or empty if none"],
  "biomechanicalReasoning": "2-3 sentences explaining WHY recommended equipment is safe for this injury",
  "avoidanceReasoning": "1-2 sentences explaining why certain equipment should be avoided, or null if none",
  "fitnessRetention": "percentage estimate of running fitness retained through cross-training (e.g., '85-90%')",
  "returnToRunningGuidance": "2-3 sentences on what to expect when returning to running",
  "raceGoalImpact": "honest assessment: 'on track', 'minor adjustment needed', or 'significant adjustment needed'",
  "raceGoalExplanation": "1-2 sentences explaining race goal impact",
  "mentalCoachingPoint": "1 key mental/motivational insight for the runner",
  "weeksSummary": {
    "crossTrainingWeeks": "Week X - Week Y",
    "returnWeek": "Week Z"
  }
}

CRITICAL: Only reference equipment from the AVAILABLE EQUIPMENT list above. Do not invent or assume equipment.`;

        try {
            const result = await this.callWithTimeout(
                this.callAnthropicAPI({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 800,
                    messages: [
                        {
                            role: 'user',
                            content: layer1Prompt
                        }
                    ]
                }),
                60000 // 60 seconds for Layer 1
            );

            if (!result.data.success) {
                throw new Error(result.data.error || 'Layer 1 analysis failed');
            }

            // Parse JSON response
            const responseText = result.data.content[0].text.trim();
            // Remove any markdown code blocks if present
            const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const expertAnalysis = JSON.parse(jsonText);

            // Validate that equipment names match what we provided
            const validEquipmentNames = equipmentList.map(eq => eq.name);
            expertAnalysis.availableEquipment = expertAnalysis.availableEquipment.filter(eq =>
                validEquipmentNames.some(valid => valid.toLowerCase() === eq.toLowerCase())
            );
            expertAnalysis.recommendedEquipment = expertAnalysis.recommendedEquipment.filter(eq =>
                validEquipmentNames.some(valid => valid.toLowerCase() === eq.toLowerCase())
            );

            console.log('✅ Layer 1 Expert Analysis:', expertAnalysis);
            return expertAnalysis;

        } catch (error) {
            console.error('Layer 1 Error:', error);
            // Return fallback structured data
            return {
                runnerName: firstName || 'Runner',
                injuries: injuryContext.injuries || ['General injury'],
                injurySummary: 'Recovering from injury, focusing on cross-training.',
                availableEquipment: equipmentList.map(eq => eq.name),
                recommendedEquipment: equipmentList.slice(0, 2).map(eq => eq.name),
                equipmentToAvoid: [],
                biomechanicalReasoning: 'Cross-training maintains cardiovascular fitness while reducing impact stress.',
                avoidanceReasoning: null,
                fitnessRetention: '80-85%',
                returnToRunningGuidance: 'Start with easy runs at reduced volume. Listen to your body.',
                raceGoalImpact: 'minor adjustment needed',
                raceGoalExplanation: `With ${weeksOffRunning} weeks of cross-training, expect a gradual return to full fitness.`,
                mentalCoachingPoint: 'Trust the process - cross-training keeps you fit while you heal.',
                weeksSummary: {
                    crossTrainingWeeks: `Week ${currentWeek} - Week ${returnToRunningWeek - 1}`,
                    returnWeek: `Week ${returnToRunningWeek}`
                }
            };
        }
    }

    /**
     * LAYER 2: Deliver expert analysis in Jason Fitzgerald's coaching voice
     * CONSTRAINED to only reference facts from Layer 1 - prevents hallucination
     * @private
     */
    async deliverInjuryCoachingInVoice(expertAnalysis) {
        const layer2Prompt = `You are Jason Fitzgerald, USATF-certified running coach and founder of Strength Running.

**YOUR COACHING STYLE:**
- Direct, honest, and encouraging
- Evidence-based but conversational
- Use the runner's name naturally
- Empathetic but not soft

**CRITICAL CONSTRAINT - ANTI-HALLUCINATION PROTOCOL:**
You can ONLY reference the facts provided in the EXPERT ANALYSIS below.
DO NOT invent equipment, injuries, or recommendations not in the analysis.
If the analysis says "Cyclete", say "Cyclete" - not "ElliptiGO" or "stand-up bike".
If the analysis says "Pool/Aqua Running", say that - not something else.

**EXPERT ANALYSIS (YOUR ONLY SOURCE OF FACTS):**
${JSON.stringify(expertAnalysis, null, 2)}

**COACHING RESPONSE REQUIREMENTS:**
Using ONLY the facts above, write a coaching message that:

1. Opens with honest acknowledgment: "Let's be real - injuries happen..."
2. References the EXACT equipment names from recommendedEquipment (not paraphrased)
3. Explains WHY using the biomechanicalReasoning provided
4. If equipmentToAvoid is not empty, mention what to avoid and why
5. Addresses the mental aspect using mentalCoachingPoint
6. Sets expectations for return to running using returnToRunningGuidance
7. Addresses race goal using raceGoalImpact and raceGoalExplanation
8. Includes safety reminder: "If any activity causes pain, stop immediately"
9. Includes medical disclaimer: "This is not medical advice. Consult your healthcare provider."
10. Ends with encouragement

**FORMATTING:**
- DO NOT use markdown formatting (no **, no ##, no bullet points with *)
- Write in plain text paragraphs
- Use line breaks between sections for readability
- Keep response to 200-250 words

Address ${expertAnalysis.runnerName} by name.

REMEMBER: Only reference equipment and facts from the EXPERT ANALYSIS. No improvisation. Plain text only.`;

        try {
            const result = await this.callWithTimeout(
                this.callAnthropicAPI({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 600,
                    system: this.coachingSystemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: layer2Prompt
                        }
                    ]
                }),
                60000 // 60 seconds for Layer 2
            );

            if (!result.data.success) {
                throw new Error(result.data.error || 'Layer 2 delivery failed');
            }

            return result.data.content[0].text;

        } catch (error) {
            console.error('Layer 2 Error:', error);
            // Return fallback message using Layer 1 data
            return `${expertAnalysis.runnerName}, let's be real - injuries happen, but here's how we'll handle this.

For the next ${expertAnalysis.weeksSummary.crossTrainingWeeks}, you'll focus on cross-training with ${expertAnalysis.recommendedEquipment.join(' and ')}. ${expertAnalysis.biomechanicalReasoning}

${expertAnalysis.mentalCoachingPoint}

In ${expertAnalysis.weeksSummary.returnWeek}, we'll begin your return to running. ${expertAnalysis.returnToRunningGuidance}

Regarding your race goal: ${expertAnalysis.raceGoalExplanation}

If any activity causes pain, stop immediately and reassess. This is not medical advice - consult your healthcare provider for injury diagnosis and treatment.

Trust the process. You've got this.`;
        }
    }

    /**
     * Generate injury recovery coaching using Two-Layer AI Architecture
     * Layer 1: Expert analysis (structured JSON)
     * Layer 2: Persona delivery (constrained to Layer 1 facts)
     *
     * @param {object} injuryContext - Injury recovery details
     * @param {object} userProfile - User profile data
     * @param {object} trainingPlan - Current training plan
     * @returns {Promise<string>} Coaching analysis for injury recovery
     */
    async generateInjuryRecoveryCoaching(injuryContext, userProfile, trainingPlan) {
        console.log('🏥 Generating injury recovery coaching (Two-Layer Architecture)...');

        try {
            // LAYER 1: Expert analysis - outputs structured JSON with facts only
            console.log('  📊 Layer 1: Generating expert analysis...');
            const expertAnalysis = await this.generateInjuryExpertAnalysis(injuryContext, userProfile, trainingPlan);

            // LAYER 2: Persona delivery - constrained to Layer 1 facts (prevents hallucination)
            console.log('  🎤 Layer 2: Delivering in coach voice...');
            const coachingMessage = await this.deliverInjuryCoachingInVoice(expertAnalysis);

            console.log('  ✅ Two-Layer coaching generated successfully');
            return coachingMessage;

        } catch (error) {
            console.error('AI Coach Error (Injury Recovery):', error);
            // Return fallback message
            const returnWeek = injuryContext.currentWeek + injuryContext.weeksOffRunning;
            return `Injury recovery plan created. Focus on healing and maintaining fitness through cross-training. We'll gradually return to running in Week ${returnWeek}.`;
        }
    }

    /**
     * Generate plan adjustment coaching analysis in Jason Fitzgerald's voice
     * @param {object} adjustmentContext - Plan adjustment details
     * @param {object} userProfile - User profile data
     * @param {object} trainingPlan - Current training plan
     * @returns {Promise<string>} Coaching analysis for plan adjustments
     */
    async generatePlanAdjustmentCoaching(adjustmentContext, userProfile, trainingPlan) {
        const { 
            oldSettings, 
            newSettings, 
            currentWeek,
            reason // Optional: "too hard", "too easy", "too few cyclete days", etc.
        } = adjustmentContext;
        
        // Extract first name for personalization
        const fullName = userProfile.name || userProfile.displayName;
        const firstName = fullName ? fullName.split(' ')[0] : null;

        // Calculate changes (with backward compatibility)
        const oldWorkoutsPerWeek = getWorkoutsPerWeek(oldSettings);
        const newWorkoutsPerWeek = getWorkoutsPerWeek(newSettings);
        const workoutsPerWeekChange = newWorkoutsPerWeek - oldWorkoutsPerWeek;
        const hardDaysChange = newSettings.hardSessionDays.length - oldSettings.hardSessionDays.length;
        const bikeDaysChange = (newSettings.preferredBikeDays?.length || 0) - (oldSettings.preferredBikeDays?.length || 0);
        const longRunDayChanged = newSettings.longRunDay !== oldSettings.longRunDay;

        // Build race context
        const raceDistance = trainingPlan?.planOverview?.raceDistance || userProfile.raceDistance;
        const raceTime = trainingPlan?.planOverview?.goalTime || userProfile.raceTime;
        const totalWeeks = trainingPlan?.weeks?.length || 0;
        const weeksRemaining = totalWeeks - currentWeek + 1;

        // Build change summary
        const changes = [];
        if (workoutsPerWeekChange !== 0) {
            changes.push(`${workoutsPerWeekChange > 0 ? 'Increased' : 'Reduced'} from ${oldWorkoutsPerWeek} to ${newWorkoutsPerWeek} workouts per week`);
        }
        if (hardDaysChange !== 0) {
            changes.push(`${hardDaysChange > 0 ? 'Added' : 'Reduced'} ${Math.abs(hardDaysChange)} hard workout day${Math.abs(hardDaysChange) !== 1 ? 's' : ''}`);
        }
        if (bikeDaysChange !== 0 && userProfile.standUpBikeType) {
            const bikeName = userProfile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
            changes.push(`${bikeDaysChange > 0 ? 'Added' : 'Reduced'} ${Math.abs(bikeDaysChange)} ${bikeName} day${Math.abs(bikeDaysChange) !== 1 ? 's' : ''}`);
        }
        if (longRunDayChanged) {
            changes.push(`Moved long run from ${oldSettings.longRunDay} to ${newSettings.longRunDay}`);
        }

        const prompt = `You are a USATF-certified running coach providing guidance on training plan adjustments. Your coaching style is direct, honest, and encouraging - like Jason Fitzgerald.

PLAN ADJUSTMENT SITUATION:
- Runner: ${firstName ? firstName : 'The runner'}
- Current Week: Week ${currentWeek} of ${totalWeeks}-week training plan
- Weeks Remaining: ${weeksRemaining} weeks until race
- Race Goal: ${raceDistance} in ${raceTime}
${reason ? `- Reason for adjustment: ${reason}` : ''}

CHANGES MADE:
${changes.length > 0 ? changes.map(c => `- ${c}`).join('\n') : '- No significant changes'}

OLD SETTINGS:
- Workouts per week: ${oldWorkoutsPerWeek}
- Training days: ${oldSettings.availableDays?.join(', ') || 'N/A'}
- Hard workout days: ${oldSettings.hardSessionDays?.join(', ') || 'None'}
- Long run day: ${oldSettings.longRunDay}
${oldSettings.preferredBikeDays?.length ? `- Bike days: ${oldSettings.preferredBikeDays.join(', ')}` : ''}

NEW SETTINGS:
- Workouts per week: ${newWorkoutsPerWeek}
- Training days: ${newSettings.availableDays?.join(', ') || 'N/A'}
- Hard workout days: ${newSettings.hardSessionDays?.join(', ') || 'None'}
- Long run day: ${newSettings.longRunDay}
${newSettings.preferredBikeDays?.length ? `- Bike days: ${newSettings.preferredBikeDays.join(', ')}` : ''}

COACHING REQUIREMENTS (Jason Fitzgerald voice):
1. **Assess the changes**: Are these adjustments smart? Do they make sense for the race goal?
2. **Address the reason**: If reason provided (too hard/easy/few bike days), explain if the adjustment addresses it correctly
3. **Training load impact**: How does this affect weekly volume and intensity?
4. **Recovery implications**: Are there enough rest days? Too many?
5. **Race goal impact**: How do these changes affect the race goal? Positive or negative?
6. **Specific guidance**: 
   - If reducing runs: "This gives you more recovery, which is smart if you were feeling beat up..."
   - If increasing runs: "Adding a day increases volume - make sure you're ready for this..."
   - If changing hard days: "Moving hard workouts affects recovery patterns..."
   - If changing bike days: "More/fewer Cyclete days means more/less running-specific training..."
7. **Encouragement**: End with confidence-building message

Keep response to 200-250 words. Be conversational, direct, and actionable. Use the runner's name naturally if provided.`;

        try {
            const result = await this.callWithTimeout(
                this.callAnthropicAPI({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 600,
                    system: this.coachingSystemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                }),
                180000 // 180 seconds timeout
            );

            if (!result.data.success) {
                throw new Error(result.data.error || 'Failed to generate plan adjustment coaching');
            }

            return result.data.content[0].text;
        } catch (error) {
            console.error('AI Coach Error (Plan Adjustment):', error);
            // Return fallback message if AI fails
            return `Plan adjustments saved. The changes will help you stay on track toward your ${raceDistance} goal. Listen to your body and adjust as needed.`;
        }
    }

    /**
     * Parse AI plan text into structured format
     * Extracts workout IDs for library lookup
     * @param {string} planText - AI-generated plan text
     * @param {object} userProfile - User profile data
     * @param {number} startingWeek - Optional: Starting week number (for regeneration)
     */
    parseAIPlanToStructure(planText, userProfile, startingWeek = null) {
        // Delegated to PlanParser module
        return planParser.parseAIPlanToStructure(planText, userProfile, startingWeek);
    }

    /**
     * Enrich plan with full workout details from library
     */
    enrichPlanWithWorkouts(structuredPlan) {
        // Delegated to WorkoutEnricher module
        return workoutEnricher.enrichPlanWithWorkouts(structuredPlan);
    }

    /**
     * Inject user-specific paces into workout details
     */
    injectUserPaces(workout, userPaces) {
        return workoutEnricher.injectUserPaces(workout, userPaces);
    }

    /**
     * Replace generic pace descriptions with actual paces
     * Handles both structured VDOT paces (paces.threshold.pace) and legacy flat paces (paces.tempo)
     */
    replaceGenericPaces(text, paces) {
        return workoutEnricher.replaceGenericPaces(text, paces);
    }

    /**
     * Transform enriched plan to Dashboard format
     */
    transformToDashboardFormat(enrichedPlan, userProfile) {
        // Delegated to PlanTransformer module
        return planTransformer.transformToDashboardFormat(enrichedPlan, userProfile);
    }

    // Plan fixing delegated to PlanFixer module
    fixHardDaysViolations(plan, profile) {
        return planFixer.fixHardDaysViolations(plan, profile);
    }

    generateDefaultHardWorkout(dayName, distance) {
        return planFixer.generateDefaultHardWorkout(dayName, distance);
    }
}

export default new TrainingPlanAIService();
