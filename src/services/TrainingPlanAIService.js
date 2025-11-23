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
import logger from '../utils/logger';

class TrainingPlanAIService {
    constructor() {
        // Use Firebase Functions to proxy Anthropic API calls (keeps API key secure)
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
- **Direct and honest**: "Let's be real" - no sugarcoating, but always encouraging
- **Data-driven**: Use specific paces, times, and metrics - show the math
- **Practical periodization**: "Run less, run faster" philosophy - quality over quantity
- **Injury prevention focus**: Emphasize recovery, rest days, and smart progression
- **Mental toughness**: Acknowledge the challenge, build confidence through checkpoints
- **Conversational but professional**: Like talking to a friend who happens to be an expert
- **Actionable specifics**: Not just "run tempo" but "run tempo at 9:35-9:50/mile for 20 minutes"
- **Reality checks**: Set clear checkpoints with specific metrics (e.g., "10K under 65:00 by Week 8")
- **Explain the "why"**: Don't just say what to do - explain why it matters
- **Encouraging but realistic**: "This is ambitious, but here's why it can work..."
- **Personal connection**: Use the runner's name naturally, reference their specific situation

COACHING VOICE GUIDELINES:
- Start with honest assessment: "Let's be real about this goal..."
- Use specific data: paces, times, distances, checkpoints with clear metrics
- Be direct about challenges: "This is ambitious" or "This is very achievable"
- Emphasize injury prevention: "Rest days are non-negotiable" or "Cyclete keeps you fresh"
- Include mental coaching: "Trust the process" or "You've put in the work"
- Provide race strategy: Specific pacing plans, fueling, terrain tactics
- Set clear checkpoints: "Week 8 tune-up: 10K under 65:00 or we adjust goal"
- Explain workout purpose: "Hill repeats build strength without track pounding"
- Be conversational: Use contractions, natural phrasing, "you" not "the runner"
- End with encouragement: "Let's do this" or "You've got this"
- DO NOT use any real coach names in your response
- Be concise and insightful, not flowery or generic

When building training plans:
1. SELECT workouts from library using [WORKOUT_ID: type_category_index] format
2. SEQUENCE according to periodization principles
3. PROGRESS intensity/volume appropriately
4. VARY workout types to prevent monotony
5. Consider recovery needs between workouts
6. Workouts will be automatically enriched with user-specific paces

OUTPUT FORMAT FOR WORKOUTS:
- Tue: [WORKOUT_ID: hill_medium_vo2_0] Classic Hill Repeats
- Thu: [WORKOUT_ID: interval_VO2_MAX_2] 800m Track Intervals
- Fri: [WORKOUT_ID: tempo_THRESHOLD_1] Tempo Run
- Sun: [WORKOUT_ID: longrun_MARATHON_PACE_3] Long Run with MP Finish

The WORKOUT_ID allows the system to retrieve full workout details (warmup/cooldown, safety notes, terrain requirements, RunEQ cross-training options).

Your role: COACHING (periodization, goal assessment, progression, recovery guidance) NOT workout design.

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
        context += `- Predicted Race Times (based on VDOT equivalency):\n`;
        context += `  - 5K: ${predictions['5K']}\n`;
        context += `  - 10K: ${predictions['10K']}\n`;
        context += `  - Half Marathon: ${predictions['Half']}\n`;
        context += `  - Marathon: ${predictions['Marathon']}\n`;

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
                context += `- Current predicted ${goalDistance}: ${predictedGoalTime}\n`;
                context += `- Goal ${goalDistance}: ${goalTimePart}\n`;
                context += `- Gap to close: ${diffMinutes} minutes ${diffSeconds < 0 ? 'faster' : 'slower'}\n`;

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

    /**
     * Build workout library context for AI
     * Shows available workouts that AI can select from
     */
    buildWorkoutLibraryContext() {
        let context = `**WORKOUT LIBRARY AVAILABLE FOR SELECTION**\n\n`;

        // Hill Workouts
        context += `**HILL WORKOUTS**\n`;
        const hillCategories = this.hillLibrary.getCategories();
        hillCategories.forEach(category => {
            const workouts = this.hillLibrary.getWorkoutsByCategory(category);
            const categoryName = category.replace(/_/g, ' ').toUpperCase();
            context += `\n${categoryName}:\n`;
            workouts.forEach((workout, index) => {
                context += `  [WORKOUT_ID: hill_${category}_${index}] ${workout.name}\n`;
                context += `    Duration: ${workout.duration} | Focus: ${workout.focus}\n`;
                context += `    Intensity: ${workout.intensity}\n`;
            });
        });

        // Interval Workouts
        context += `\n**INTERVAL WORKOUTS**\n`;
        const intervalCategories = this.intervalLibrary.getCategories();
        intervalCategories.forEach(category => {
            const workouts = this.intervalLibrary.getWorkoutsByCategory(category);
            const categoryName = category.replace(/_/g, ' ');
            context += `\n${categoryName}:\n`;
            workouts.forEach((workout, index) => {
                context += `  [WORKOUT_ID: interval_${category}_${index}] ${workout.name}\n`;
                context += `    ${workout.repetitions.length} reps | Pace: ${workout.pace}\n`;
            });
        });

        // Tempo Workouts
        context += `\n**TEMPO WORKOUTS**\n`;
        const tempoCategories = this.tempoLibrary.getCategories();
        tempoCategories.forEach(category => {
            const workouts = this.tempoLibrary.getWorkoutsByCategory(category);
            const categoryName = category.replace(/_/g, ' ');
            context += `\n${categoryName}:\n`;
            workouts.forEach((workout, index) => {
                context += `  [WORKOUT_ID: tempo_${category}_${index}] ${workout.name}\n`;
                context += `    Duration: ${workout.duration} | ${workout.description}\n`;
            });
        });

        // Long Run Workouts
        context += `\n**LONG RUN WORKOUTS**\n`;
        const longRunCategories = this.longRunLibrary.getCategories();
        longRunCategories.forEach(category => {
            const workouts = this.longRunLibrary.getWorkoutsByCategory(category);
            const categoryName = category.replace(/_/g, ' ');
            context += `\n${categoryName}:\n`;
            workouts.forEach((workout, index) => {
                context += `  [WORKOUT_ID: longrun_${category}_${index}] ${workout.name}\n`;
                context += `    ${workout.description}\n`;
            });
        });

        context += `\n**IMPORTANT:** Always use [WORKOUT_ID: ...] format when assigning workouts!\n`;
        return context;
    }

    /**
     * Generate training plan with workout library integration
     */
    async generateTrainingPlan(userProfile) {
        // 1. Build workout library context for AI
        const workoutContext = this.buildWorkoutLibraryContext();

        // 2. Build user coaching prompt
        const userPrompt = this.buildCoachingPrompt(userProfile);

        // 3. Combine into full prompt
        const fullPrompt = `${workoutContext}\n\n---\n\n${userPrompt}`;

        try {
            // 4. Call Claude API via Firebase Function (secure server-side call)
            const result = await this.callAnthropicAPI({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 8000,
                system: this.coachingSystemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: fullPrompt
                    }
                ]
            });

            if (!result.data.success) {
                throw new Error(result.data.error || 'Failed to generate plan');
            }

            const planText = result.data.content[0].text;

            // 5. Parse AI response (extracts workout IDs)
            const structuredPlan = this.parseAIPlanToStructure(planText, userProfile);

            // 6. Hydrate workout IDs with full workout details from library
            const enrichedPlan = this.enrichPlanWithWorkouts(structuredPlan);

            // 7. Transform to Dashboard format
            const dashboardPlan = this.transformToDashboardFormat(enrichedPlan, userProfile);

            return {
                success: true,
                plan: dashboardPlan,
                rawResponse: planText,
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
            runsPerWeek: updatedProfile.runsPerWeek,
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
        const raceDateObj = new Date(raceDate);
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
        const workoutContext = this.buildWorkoutLibraryContext();

        // Build regeneration prompt
        let prompt = `**PLAN REGENERATION REQUEST**\n\n`;
        prompt += `You are regenerating a training plan starting from Week ${currentWeek} of ${totalWeeks} weeks.\n\n`;
        
        prompt += completedContext;

        prompt += `**UPDATED SETTINGS (use these, not the original settings):**\n`;
        prompt += `- Training Days Per Week: ${updatedProfile.runsPerWeek}\n`;
        prompt += `- Available Training Days: ${(updatedProfile.availableDays || []).join(', ')}\n`;
        prompt += `- Hard Workout Days: ${(updatedProfile.hardSessionDays || []).join(', ')}\n`;
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

        prompt += `**OUTPUT FORMAT:**\n`;
        prompt += `For each week from ${currentWeek} to ${totalWeeks}, output:\n`;
        prompt += `### Week ${currentWeek} - [mileage] ${distanceUnit}\n`;
        prompt += `- Mon: [workout]\n`;
        prompt += `- Tue: [workout]\n`;
        prompt += `... (all 7 days)\n`;
        prompt += `\n`;

        // Combine with workout library context
        const fullPrompt = `${workoutContext}\n\n---\n\n${prompt}`;

        try {
            // Call Claude API via Firebase Function (secure server-side call)
            const result = await this.callAnthropicAPI({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 8000,
                system: this.coachingSystemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: fullPrompt
                    }
                ]
            });

            if (!result.data.success) {
                throw new Error(result.data.error || 'Failed to regenerate plan');
            }

            const planText = result.data.content[0].text;
            logger.log('  ✅ AI generated plan structure');

            // Parse AI response (extracts workout IDs)
            // Pass currentWeek as starting week number for correct week numbering
            const structuredPlan = this.parseAIPlanToStructure(planText, updatedProfile, currentWeek);

            // Hydrate workout IDs with full workout details from library
            const enrichedPlan = this.enrichPlanWithWorkouts(structuredPlan);

            // Transform to Dashboard format
            const dashboardPlan = this.transformToDashboardFormat(enrichedPlan, updatedProfile);

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
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Build coaching prompt from user profile
     * CRITICAL: No defaults - all data must come from user profile
     */
    buildCoachingPrompt(profile) {
        // Validate required fields - no defaults allowed
        if (!profile.raceDistance) {
            throw new Error('Missing required field: raceDistance');
        }
        if (!profile.raceTime) {
            throw new Error('Missing required field: raceTime');
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
        if (!profile.runsPerWeek) {
            throw new Error('Missing required field: runsPerWeek');
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

        // Calculate start day info for partial Week 1
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayAbbrevs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const startDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
        const startDayName = dayNames[startDayOfWeek];
        const startDayAbbrev = dayAbbrevs[startDayOfWeek];

        // Days remaining in Week 1 (from start day through Sunday)
        const daysInWeek1 = startDayOfWeek === 0 ? 7 : (7 - startDayOfWeek + 1); // +1 to include Sunday
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

        let prompt = `Today is ${todayFormatted} (${startDayName}). Please create a training plan for me:\n\n`;
        prompt += `**IMPORTANT: All distances should be in ${distanceUnit}. The user is using ${units} units.**\n\n`;

        // Add personalization instruction if we have a name
        if (firstName) {
            prompt += `**PERSONALIZATION: The runner's name is ${firstName}. Use their name naturally 2-3 times throughout your coaching analysis to make it feel personal and engaging. For example: "Hey, ${firstName}!" at the start, and "Here's the thing, ${firstName}..." when being honest about challenges.**\n\n`;
        }

        prompt += `**Goal Race:**\n`;
        prompt += `- Distance: ${profile.raceDistance}\n`;
        prompt += `- Goal Time: ${profile.raceTime}\n`;
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

            prompt += `- Recent Race: ${profile.recentRaceTime} for ${raceExplanation}\n`;

            // Add calculated fitness assessment with pace and race predictions
            const fitnessContext = this.buildFitnessAssessmentContext(profile);
            if (fitnessContext) {
                prompt += fitnessContext;
            }
        }

        prompt += `\n**Training Preferences:**\n`;
        prompt += `- Training Days Per Week: ${profile.runsPerWeek}\n`;
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

        // Add bike/cross-training day info
        let bikeDays = [];
        if (profile.standUpBikeType && profile.standUpBikeType !== 'none' && profile.preferredBikeDays && profile.preferredBikeDays.length > 0) {
            const bikeType = profile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
            bikeDays = profile.preferredBikeDays; // User explicitly selected these days during onboarding

            prompt += `- Cross-Training Equipment: ${bikeType}\n`;
            prompt += `- **IMPORTANT: ${bikeDays.join(' and ')} should be ${bikeType} rides, NOT runs**\n`;
            prompt += `  Format: "Tue: Ride 4 RunEQ miles on your ${bikeType}" (NOT "Easy 4 mile run")\n`;
            prompt += `  These replace what would normally be easy run days with cross-training\n`;
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
                return `- ${abbrev}: Ride 3 RunEQ miles on your ${bikeType}\n`;
            } else if (qualityDays.includes(fullDay)) {
                return `- ${abbrev}: ${qualityWorkouts[qIdx % qualityWorkouts.length]}\n`;
            } else {
                return `- ${abbrev}: Easy 3 miles\n`;
            }
        };

        // Example Week 1 - PARTIAL (only days from start day to Sunday)
        let exampleWeek1 = `### Week 1 (${todayFormatted.split(',')[0]}) - ${daysInWeek1 * 3} miles (PARTIAL WEEK - starts ${startDayName})\n`;
        let qIdx = 0;
        for (let i = startDayOfWeek; i <= 6; i++) { // startDayOfWeek to Saturday (6)
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

        prompt += exampleWeek1;
        prompt += exampleWeek2;

        prompt += `**CRITICAL WEEK STRUCTURE:**\n`;
        prompt += `- **Week 1 is a PARTIAL week** starting today (${startDayName}). Only include these days: ${uniqueWeek1Days.join(', ')}\n`;
        prompt += `- **Week 2 onwards are FULL Mon-Sun weeks**\n\n`;

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
        prompt += `2. Week 1: Only ${startDayAbbrev}-Sun (${daysInWeek1} days). Week 2+: Full Mon-Sun (7 days)\n`;
        prompt += `3. [WORKOUT_ID: ...] format for quality workouts from the library\n`;
        prompt += `4. **CRITICAL: Include distance in ${distanceUnit} for EVERY workout** (e.g., "Long Run 10 miles", "Tempo Run 6 miles")\n`;
        prompt += `5. Simple descriptions for easy runs and rest days (must include distance)\n`;
        if (restDays.length > 0) {
            prompt += `6. **${restDays.join(', ')} = "Rest" ONLY** (the user picked ${7 - restDays.length} training days, not 7)\n`;
        }
        prompt += `\n`;

        prompt += `**PROGRESSIVE TRAINING PRINCIPLES:**\n`;
        prompt += `1. **Week 1 MUST start conservatively:** First long run should be AT OR BELOW current long run distance (${profile.currentLongRun} ${distanceUnit})\n`;
        prompt += `2. Increase long run by 1-2 ${distanceUnit} per week, with recovery weeks every 3-4 weeks\n`;
        prompt += `3. Build from current fitness level (${profile.currentWeeklyMileage} ${distanceUnit}/week) - don't jump more than 10% weekly\n\n`;

        prompt += `**Please provide in Jason Fitzgerald's coaching voice:**\n`;
        prompt += `1. **Honest assessment** - Start with "Let's be real about this goal..." Be direct about whether it's ambitious, realistic, or very achievable. Use data (e.g., "39 minutes improvement in 13 weeks = 3 min/week").\n`;
        prompt += `2. **Key training paces** - List all paces with specific ranges (e.g., "Easy: 11:30-12:30/mile", "Threshold: 9:35-9:50/mile"). Include why each pace matters.\n`;
        prompt += `3. **Complete week-by-week plan** - For each week, include:\n`;
        prompt += `   - Week header with focus (e.g., "Focus: Build aerobic base, introduce speed")\n`;
        prompt += `   - All 7 days with specific workouts\n`;
        prompt += `   - Brief "Notes" explaining the week's purpose and key workouts\n`;
        prompt += `4. **Race day strategy** - Specific pacing plan, fueling strategy, terrain tactics\n`;
        prompt += `5. **Checkpoints & reality checks** - Clear milestones with specific metrics (e.g., "Week 8: 10K under 65:00 or adjust goal"). Explain what each checkpoint tells us.\n`;
        prompt += `6. **Final coaching notes** - Why this plan works, what to watch for, encouragement to trust the process\n\n`;
        prompt += `**TONE:** Be conversational, direct, and encouraging. Use the runner's name naturally. Explain the "why" behind workouts. Emphasize injury prevention and smart recovery. End with confidence-building encouragement.\n\n`;

        return prompt;
    }

    /**
     * Generate injury recovery coaching analysis in Jason Fitzgerald's voice
     * @param {object} injuryContext - Injury recovery details
     * @param {object} userProfile - User profile data
     * @param {object} trainingPlan - Current training plan
     * @returns {Promise<string>} Coaching analysis for injury recovery
     */
    async generateInjuryRecoveryCoaching(injuryContext, userProfile, trainingPlan) {
        const { weeksOffRunning, selectedEquipment, reduceTrainingDays, currentWeek, returnToRunningWeek } = injuryContext;
        
        // Extract first name for personalization
        const fullName = userProfile.name || userProfile.displayName;
        const firstName = fullName ? fullName.split(' ')[0] : null;

        // Build equipment list
        const equipmentList = [];
        if (selectedEquipment.pool) equipmentList.push('pool/aqua running');
        if (selectedEquipment.elliptical) equipmentList.push('elliptical');
        if (selectedEquipment.stationaryBike) equipmentList.push('stationary bike');
        if (selectedEquipment.swimming) equipmentList.push('swimming');
        if (selectedEquipment.rowing) equipmentList.push('rowing machine');
        if (selectedEquipment.standUpBike) {
            const bikeName = userProfile.standUpBikeType === 'cyclete' ? 'Cyclete' : 'ElliptiGO';
            equipmentList.push(bikeName);
        }

        // Build race context
        const raceDistance = trainingPlan?.planOverview?.raceDistance || userProfile.raceDistance;
        const raceTime = trainingPlan?.planOverview?.goalTime || userProfile.raceTime;
        const raceDate = trainingPlan?.planOverview?.raceDate || userProfile.raceDate;
        const totalWeeks = trainingPlan?.weeks?.length || 0;
        const weeksRemaining = totalWeeks - currentWeek + 1;

        const prompt = `You are a USATF-certified running coach providing injury recovery guidance. Your coaching style is direct, honest, and encouraging - like Jason Fitzgerald.

INJURY RECOVERY SITUATION:
- Runner: ${firstName ? firstName : 'The runner'}
- Current Week: Week ${currentWeek} of ${totalWeeks}-week training plan
- Weeks Off Running: ${weeksOffRunning} weeks
- Return to Running: Week ${returnToRunningWeek}
- Race Goal: ${raceDistance} in ${raceTime}
- Race Date: ${raceDate}
- Weeks Remaining After Recovery: ${weeksRemaining - weeksOffRunning} weeks

AVAILABLE CROSS-TRAINING EQUIPMENT:
${equipmentList.map(eq => `- ${eq}`).join('\n')}

TRAINING ADJUSTMENTS:
- Training days reduced by: ${reduceTrainingDays} day${reduceTrainingDays !== 1 ? 's' : ''} during recovery

COACHING REQUIREMENTS (Jason Fitzgerald voice):
1. **Start with honest assessment**: "Let's be real - injuries happen, but here's how we'll handle this..."
2. **Explain the strategy**: Why cross-training maintains fitness, what each equipment type does
3. **Address mental aspect**: Staying motivated during injury, trust in the process
4. **Set expectations**: What to expect when returning to running, how fitness may have changed
5. **Provide specific guidance**: 
   - Which equipment is best for maintaining running fitness
   - How to structure cross-training workouts
   - What to watch for when returning to running
6. **Race goal reality check**: How this affects the race goal, whether adjustments are needed
7. **Encouragement**: End with confidence-building message

Keep response to 200-250 words. Be conversational, direct, and actionable. Use the runner's name naturally if provided.`;

        try {
            const result = await this.callAnthropicAPI({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 600,
                system: this.coachingSystemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            if (!result.data.success) {
                throw new Error(result.data.error || 'Failed to generate injury recovery coaching');
            }

            return result.data.content[0].text;
        } catch (error) {
            console.error('AI Coach Error (Injury Recovery):', error);
            // Return fallback message if AI fails
            return `Injury recovery plan created. Focus on healing and maintaining fitness through cross-training. We'll gradually return to running in Week ${returnToRunningWeek}.`;
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

        // Calculate changes
        const runsPerWeekChange = newSettings.runsPerWeek - oldSettings.runsPerWeek;
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
        if (runsPerWeekChange !== 0) {
            changes.push(`${runsPerWeekChange > 0 ? 'Increased' : 'Reduced'} from ${oldSettings.runsPerWeek} to ${newSettings.runsPerWeek} runs per week`);
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
- Runs per week: ${oldSettings.runsPerWeek}
- Training days: ${oldSettings.availableDays?.join(', ') || 'N/A'}
- Hard workout days: ${oldSettings.hardSessionDays?.join(', ') || 'None'}
- Long run day: ${oldSettings.longRunDay}
${oldSettings.preferredBikeDays?.length ? `- Bike days: ${oldSettings.preferredBikeDays.join(', ')}` : ''}

NEW SETTINGS:
- Runs per week: ${newSettings.runsPerWeek}
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
            const result = await this.callAnthropicAPI({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 600,
                system: this.coachingSystemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

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
        const lines = planText.split('\n');
        const weeks = [];
        let currentWeek = null;
        let paces = {};
        const seenWeekNumbers = new Set();

        console.log(`\n=== PARSING AI PLAN (${lines.length} lines) ===`);

        lines.forEach((line, lineIndex) => {
            // DEBUG: Log all lines that contain "Week" to see what we're missing
            if (line.toLowerCase().includes('week')) {
                console.log(`Line ${lineIndex} contains "week": "${line}"`);
            }

            // Detect week headers - can have markdown headers (###), bold (**), etc.
            // Format: "### Week 1 (dates) - XX miles" or "**Week 1** - XX miles" or "Week 1 - XX miles"
            // Also support "kilometers" for metric users
            // Match various dash types: hyphen (-), en-dash (–), em-dash (—)
            const weekMatch = line.match(/^[\s#*]*Week\s+(\d+).*?[-–—]\s*(\d+)\s*(miles|kilometers|km|mi)/i);
            if (weekMatch) {
                const weekNum = parseInt(weekMatch[1]);
                console.log(`✅ REGEX MATCHED Week ${weekNum}!`);

                // If startingWeek is specified (regeneration), only parse weeks >= startingWeek
                if (startingWeek !== null && weekNum < startingWeek) {
                    console.log(`Skipping Week ${weekNum} (before starting week ${startingWeek})`);
                    return;
                }

                // Skip duplicate week numbers (from coaching analysis section)
                if (seenWeekNumbers.has(weekNum)) {
                    console.log(`Skipping duplicate Week ${weekNum} at line ${lineIndex}`);
                    return;
                }

                if (currentWeek) {
                    weeks.push(currentWeek);
                }

                seenWeekNumbers.add(weekNum);
                currentWeek = {
                    weekNumber: weekNum,
                    totalMileage: parseInt(weekMatch[2]),
                    workouts: []
                };
                console.log(`Found Week ${weekNum} at line ${lineIndex}: ${line.substring(0, 80)}`);
            }

            // Detect workout lines with potential WORKOUT_ID
            // Allow leading whitespace, bullets (-, *), and markdown formatting before day names
            const workoutMatch = line.match(/^\s*[-*]*\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun):\s*(.+)/i);
            if (workoutMatch && currentWeek) {
                const rawDescription = workoutMatch[2].trim();

                // Extract workout ID if present: [WORKOUT_ID: type_category_index]
                // Format examples:
                //   tempo_ALTERNATING_TEMPO_0 -> type:tempo, category:ALTERNATING_TEMPO, index:0
                //   hill_medium_vo2_0 -> type:hill, category:medium_vo2, index:0
                //   longrun_TRADITIONAL_EASY_1 -> type:longrun, category:TRADITIONAL_EASY, index:1
                const idMatch = rawDescription.match(/\[WORKOUT_ID:\s*(tempo|interval|longrun|hill)_(.+?)_(\d+)\]/);

                // Remove the WORKOUT_ID tag from description for display
                const cleanDescription = idMatch
                    ? rawDescription.replace(/\[WORKOUT_ID:\s*(?:tempo|interval|longrun|hill)_.+?_\d+\]\s*/, '').trim()
                    : rawDescription;

                // Determine workout type from description for non-library workouts
                let inferredType = null;
                const descLower = cleanDescription.toLowerCase();
                if (descLower === 'rest' || descLower.match(/^rest\s*$/)) {
                    inferredType = 'rest';
                } else if (descLower.match(/rest\s*\/\s*xt|rest\/xt|rest or xt|rest or cross/i)) {
                    inferredType = 'rest_or_xt';
                } else if (descLower.includes('ride') || descLower.includes('runeq')) {
                    inferredType = 'bike';
                }

                currentWeek.workouts.push({
                    day: workoutMatch[1],
                    description: cleanDescription,
                    workoutId: idMatch ? idMatch[0] : null,
                    workoutType: idMatch ? idMatch[1] : inferredType,
                    workoutCategory: idMatch ? idMatch[2] : null,
                    workoutIndex: idMatch ? parseInt(idMatch[3]) : null
                });
                console.log(`  Added workout: ${workoutMatch[1]} - ${cleanDescription.substring(0, 50)}`);
            }

            // Extract paces - more flexible matching
            if (line.match(/Easy.*?:/i)) {
                const paceMatch = line.match(/(\d+:\d+(?:-\d+:\d+)?)/);
                if (paceMatch) {
                    paces.easy = paceMatch[0];
                    console.log(`Found Easy pace: ${paceMatch[0]}`);
                }
            }
            if (line.match(/Tempo|Threshold/i) && line.includes(':')) {
                const paceMatch = line.match(/(\d+:\d+(?:-\d+:\d+)?)/);
                if (paceMatch) {
                    paces.tempo = paceMatch[0];
                    console.log(`Found Tempo pace: ${paceMatch[0]}`);
                }
            }
            if (line.match(/Marathon Pace|MP:/i)) {
                const paceMatch = line.match(/(\d+:\d+(?:-\d+:\d+)?)/);
                if (paceMatch) {
                    paces.marathonPace = paceMatch[0];
                    console.log(`Found Marathon pace: ${paceMatch[0]}`);
                }
            }
            if (line.match(/Half.*?Marathon.*?Pace|HMP|Goal Pace/i) && line.includes(':')) {
                const paceMatch = line.match(/(\d+:\d+(?:-\d+:\d+)?)/);
                if (paceMatch) {
                    paces.halfMarathonPace = paceMatch[0];
                    console.log(`Found Half Marathon pace: ${paceMatch[0]}`);
                }
            }
            if (line.match(/10K Pace|10-K/i) && line.includes(':')) {
                const paceMatch = line.match(/(\d+:\d+(?:-\d+:\d+)?)/);
                if (paceMatch) {
                    paces.tenKPace = paceMatch[0];
                    console.log(`Found 10K pace: ${paceMatch[0]}`);
                }
            }
            if (line.match(/5K Pace|5-K/i) && line.includes(':')) {
                const paceMatch = line.match(/(\d+:\d+(?:-\d+:\d+)?)/);
                if (paceMatch) {
                    paces.fiveKPace = paceMatch[0];
                    console.log(`Found 5K pace: ${paceMatch[0]}`);
                }
            }
            if (line.match(/VO2|Interval/i) && line.includes(':') && !line.match(/Cruise|Tempo/i)) {
                const paceMatch = line.match(/(\d+:\d+(?:-\d+:\d+)?)/);
                if (paceMatch) {
                    paces.interval = paceMatch[0];
                    console.log(`Found Interval pace: ${paceMatch[0]}`);
                }
            }
        });

        if (currentWeek) {
            weeks.push(currentWeek);
        }

        console.log(`\n=== PARSING COMPLETE ===`);
        console.log(`Parsed ${weeks.length} weeks:`, weeks.map(w => `Week ${w.weekNumber} (${w.totalMileage}mi, ${w.workouts.length} workouts)`));
        console.log(`Paces from AI text:`, paces);

        // CRITICAL: Calculate proper VDOT-based structured paces from user's goal time
        // The AI text paces are just for reference - we use PaceCalculator for actual training paces
        let structuredPaces = null;
        let trackIntervals = null;

        if (userProfile.raceTime && userProfile.raceDistance) {
            try {
                // Extract time from format like "Half-1:45:00" or "1:45:00"
                let goalTime = userProfile.raceTime;
                if (goalTime.includes('-')) {
                    goalTime = goalTime.split('-')[1];
                }

                console.log(`📊 Calculating VDOT paces for ${userProfile.raceDistance} @ ${goalTime}`);
                const vdotPaceData = this.paceCalculator.calculateFromGoal(userProfile.raceDistance, goalTime);

                if (vdotPaceData && vdotPaceData.paces) {
                    structuredPaces = vdotPaceData.paces;
                    trackIntervals = vdotPaceData.trackIntervals;

                    console.log(`✅ VDOT Paces calculated:`, {
                        easy: `${structuredPaces.easy.min}-${structuredPaces.easy.max}/mi`,
                        marathon: `${structuredPaces.marathon.pace}/mi`,
                        threshold: `${structuredPaces.threshold.pace}/mi`,
                        interval: `${structuredPaces.interval.pace}/mi`
                    });
                }
            } catch (error) {
                console.warn('⚠️ Could not calculate VDOT paces:', error.message);
                // Fall back to AI-extracted paces (simple strings) if VDOT calculation fails
            }
        }

        console.log(`===================\n`);

        return {
            userProfile,
            paces: structuredPaces || paces, // Use structured VDOT paces, fall back to AI text paces
            trackIntervals,
            weeks,
            fullPlanText: planText
        };
    }

    /**
     * Enrich plan with full workout details from library
     */
    enrichPlanWithWorkouts(structuredPlan) {
        console.log('\n🔍 ENRICHING WORKOUTS WITH LIBRARY DETAILS');
        const totalWeeks = structuredPlan.weeks.length;
        const enrichedWeeks = structuredPlan.weeks.map(week => {
            const weekNumber = week.weekNumber || 1;
            const enrichedWorkouts = week.workouts.map(workout => {
                if (!workout.workoutId) {
                    return { ...workout, hasStructuredWorkout: false };
                }

                console.log(`\n  Enriching: ${workout.workoutId}`, {
                    type: workout.workoutType,
                    category: workout.workoutCategory,
                    index: workout.workoutIndex
                });

                let fullWorkout = null;

                // Extract distance from description (e.g., "800m Track Intervals 6 miles" -> 6)
                const distanceMatch = workout.description?.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/i);
                const totalDistance = distanceMatch ? parseFloat(distanceMatch[1]) : null;
                if (totalDistance) {
                    console.log(`    📏 Extracted distance: ${totalDistance} miles from "${workout.description}"`);
                }

                try {
                    // Retrieve from appropriate library
                    if (workout.workoutType === 'hill') {
                        // Use prescribeHillWorkout to inject paces
                        const workouts = this.hillLibrary.getWorkoutsByCategory(workout.workoutCategory);
                        console.log(`    Hill library returned ${workouts?.length || 0} workouts for category "${workout.workoutCategory}"`);
                        const rawWorkout = workouts[workout.workoutIndex];
                        if (rawWorkout) {
                            fullWorkout = this.hillLibrary.prescribeHillWorkout(rawWorkout.name, {
                                paces: structuredPlan.paces
                            });
                        }
                    } else if (workout.workoutType === 'interval') {
                        // Use prescribeIntervalWorkout to calculate specific reps from distance
                        const workouts = this.intervalLibrary.getWorkoutsByCategory(workout.workoutCategory);
                        console.log(`    Interval library returned ${workouts?.length || 0} workouts for category "${workout.workoutCategory}"`);
                        const rawWorkout = workouts[workout.workoutIndex];
                        if (rawWorkout) {
                            // Prescribe with distance to get specific rep count
                            fullWorkout = this.intervalLibrary.prescribeIntervalWorkout(rawWorkout.name, {
                                paces: structuredPlan.paces,
                                trackIntervals: structuredPlan.trackIntervals,
                                totalDistance: totalDistance,
                                weekNumber: weekNumber,
                                totalWeeks: totalWeeks
                            });
                        }
                    } else if (workout.workoutType === 'tempo') {
                        // Use prescribeTempoWorkout to inject paces and convert vague structures
                        const workouts = this.tempoLibrary.getWorkoutsByCategory(workout.workoutCategory);
                        console.log(`    Tempo library returned ${workouts?.length || 0} workouts for category "${workout.workoutCategory}"`);
                        const rawWorkout = workouts[workout.workoutIndex];
                        if (rawWorkout) {
                            fullWorkout = this.tempoLibrary.prescribeTempoWorkout(rawWorkout.name, {
                                paces: structuredPlan.paces,
                                weekNumber: weekNumber,
                                totalWeeks: totalWeeks
                            });
                        }
                    } else if (workout.workoutType === 'longrun') {
                        // Use prescribeLongRunWorkout to calculate duration from distance and inject paces
                        const workouts = this.longRunLibrary.getWorkoutsByCategory(workout.workoutCategory);
                        console.log(`    LongRun library returned ${workouts?.length || 0} workouts for category "${workout.workoutCategory}"`);
                        const rawWorkout = workouts[workout.workoutIndex];
                        if (rawWorkout) {
                            // Prescribe with distance and paces to get personalized workout
                            fullWorkout = this.longRunLibrary.prescribeLongRunWorkout(rawWorkout.name, {
                                paces: structuredPlan.paces,
                                distance: totalDistance
                            });
                        }
                    }

                    if (fullWorkout) {
                        console.log(`    ✅ Found workout: ${fullWorkout.name}`);
                        const enriched = this.injectUserPaces(fullWorkout, structuredPlan.paces);

                        return {
                            ...workout,
                            fullWorkoutDetails: enriched,
                            hasStructuredWorkout: true
                        };
                    } else {
                        console.log(`    ❌ No workout found at index ${workout.workoutIndex}`);
                    }
                } catch (error) {
                    console.warn(`    ⚠️ Error enriching workout: ${workout.workoutId}`, error);
                }

                return { ...workout, hasStructuredWorkout: false };
            });

            return { ...week, workouts: enrichedWorkouts };
        });

        return { ...structuredPlan, weeks: enrichedWeeks };
    }

    /**
     * Inject user-specific paces into workout details
     */
    injectUserPaces(workout, userPaces) {
        if (!userPaces) return workout;

        const enriched = JSON.parse(JSON.stringify(workout));

        if (enriched.workout) {
            ['warmup', 'main', 'recovery', 'cooldown'].forEach(phase => {
                if (enriched.workout[phase]) {
                    enriched.workout[phase] = this.replaceGenericPaces(enriched.workout[phase], userPaces);
                }
            });
        }

        if (enriched.repetitions && Array.isArray(enriched.repetitions)) {
            enriched.repetitions = enriched.repetitions.map(rep =>
                this.replaceGenericPaces(rep, userPaces)
            );
        }

        return enriched;
    }

    /**
     * Replace generic pace descriptions with actual paces
     * Handles both structured VDOT paces (paces.threshold.pace) and legacy flat paces (paces.tempo)
     */
    replaceGenericPaces(text, paces) {
        if (!text || typeof text !== 'string') return text;

        let updated = text;

        // CRITICAL: Use structured VDOT paces only - no fallbacks to legacy field names
        // If pace is missing, it means VDOT calculation failed - don't guess
        const thresholdPace = paces.threshold?.pace;
        if (thresholdPace) {
            updated = updated.replace(/threshold effort|tempo effort|tempo pace/gi, `@ ${thresholdPace}/mi`);
        }

        // Handle interval paces - use structured format only
        const intervalPace = paces.interval?.pace;
        if (intervalPace && typeof intervalPace === 'string') {
            updated = updated.replace(/VO2 max effort|interval pace/gi, `@ ${intervalPace}/mi`);
        }

        // Handle marathon pace - use structured format only
        const marathonPace = paces.marathon?.pace;
        if (marathonPace) {
            updated = updated.replace(/marathon pace|MP/gi, `@ ${marathonPace}/mi`);
        }

        // Handle easy pace - check both structured and legacy format
        const easyPace = (paces.easy?.min && paces.easy?.max)
            ? `${paces.easy.min}-${paces.easy.max}`
            : paces.easy;
        if (easyPace && typeof easyPace === 'string') {
            updated = updated.replace(/easy pace|easy effort/gi, `@ ${easyPace}/mi`);
        }

        return updated;
    }

    /**
     * Transform enriched plan to Dashboard format
     */
    transformToDashboardFormat(enrichedPlan, userProfile) {
        console.log('\n🔧 TRANSFORMING TO DASHBOARD FORMAT');
        const dashboardWeeks = enrichedPlan.weeks.map(week => {
            console.log(`\n📅 Week ${week.weekNumber} - ${week.workouts.length} workouts`);
            const dashboardWorkouts = week.workouts.map(workout => {
                console.log(`\n  Processing workout:`, {
                    day: workout.day,
                    description: workout.description,
                    hasWorkoutId: !!workout.workoutId,
                    hasFullDetails: !!workout.fullWorkoutDetails,
                    workoutType: workout.workoutType
                });

                // If workout has full details from library, use them
                if (workout.fullWorkoutDetails) {
                    const details = workout.fullWorkoutDetails;
                    console.log(`  ✅ Using fullWorkoutDetails:`, {
                        name: details.name,
                        category: details.category,
                        hasNestedWorkout: !!details.workout
                    });

                    // Try to extract distance from AI's workout description (e.g., "Long Run 10 miles")
                    let extractedDistance = details.distance || 0;
                    if (!extractedDistance) {
                        const distanceMatch = workout.description.match(/(\d+(?:\.\d+)?)\s*(mile|miles|mi|km)/i);
                        if (distanceMatch) {
                            extractedDistance = parseFloat(distanceMatch[1]);
                            console.log(`  📏 Extracted distance from description: ${extractedDistance} ${distanceMatch[2]}`);
                        }
                    }

                    // Dashboard expects workout.workout.name structure
                    // Some libraries have nested workout{} object (hills), others are flat (tempo/interval/longrun)
                    // IMPORTANT: Always include name from details.name for library lookup in WorkoutDetail
                    const workoutObj = details.workout
                        ? { ...details.workout, name: details.name, description: details.description }
                        : {
                            name: details.name,
                            description: details.description,
                            warmup: details.warmup,
                            main: details.main,
                            cooldown: details.cooldown,
                            repetitions: details.repetitions,
                            structure: details.structure,
                            duration: details.duration,
                            pace: details.pace,
                            intensity: details.intensity
                        };

                    // Normalize workout type for Dashboard (intervals, hills, tempo, longRun, easy)
                    // The library category (VO2_MAX, SHORT_SPEED, etc.) is for internal use
                    // but we need normalized types for the Choose Adventure button logic
                    const normalizeWorkoutType = (workoutType, category) => {
                        const type = (workoutType || '').toLowerCase();
                        const cat = (category || '').toLowerCase();

                        // Interval types
                        if (type === 'interval' || cat.includes('vo2') || cat.includes('speed') ||
                            cat.includes('interval') || cat.includes('short_speed') || cat.includes('long_interval')) {
                            return 'intervals';
                        }
                        // Hill types
                        if (type === 'hill' || cat.includes('hill') || cat.includes('power') || cat.includes('strength')) {
                            return 'hills';
                        }
                        // Tempo types
                        if (type === 'tempo' || cat.includes('tempo') || cat.includes('threshold')) {
                            return 'tempo';
                        }
                        // Long run types
                        if (type === 'longrun' || cat.includes('long') || cat.includes('progressive') || cat.includes('mixed_pace')) {
                            return 'longRun';
                        }
                        return type || 'easy';
                    };

                    const normalizedType = normalizeWorkoutType(workout.workoutType, details.category);

                    const focusMap = {
                        tempo: 'Lactate Threshold',
                        intervals: 'Speed & VO2 Max',
                        hills: 'Strength & Power',
                        longRun: 'Endurance',
                        easy: 'Aerobic Base',
                        bike: 'Cross-Training',
                        rest: 'Recovery',
                        rest_or_xt: 'Recovery / XT'
                    };

                    return {
                        day: workout.day,
                    type: normalizedType,
                    // CRITICAL: Library should provide name/description - if missing, use workout description but log warning
                    name: details.name || workout.description,
                    description: details.description || workout.description,
                    distance: extractedDistance,
                    // CRITICAL: Focus should come from library or type mapping - only fallback to 'Training' if truly unknown
                    focus: focusMap[normalizedType] || details.focus || 'Training',
                        workout: workoutObj,
                        terrain: details.terrain,
                        safety: details.safety,
                        runeq_options: details.runeq_options || details.runEqOptions,
                        warmup: workoutObj.warmup,
                        cooldown: workoutObj.cooldown,
                        repetitions: workoutObj.repetitions || details.repetitions,
                        metadata: {
                            workoutId: workout.workoutId,
                            aiGenerated: true,
                            libraryCategory: details.category // Keep original category for internal use
                        }
                    };
                }

                // Fallback for workouts without library details (e.g., rest days, easy runs, bike days)
                console.log(`  ⚠️ Using FALLBACK - description: "${workout.description}"`);

                // Try to extract distance from description (e.g., "Easy 4 miles", "8 RunEQ miles")
                let extractedDistance = 0;
                const distanceMatch = workout.description.match(/(\d+(?:\.\d+)?)\s*(mile|miles|mi|km|RunEQ)/i);
                if (distanceMatch) {
                    extractedDistance = parseFloat(distanceMatch[1]);
                    console.log(`  📏 Extracted distance: ${extractedDistance} ${distanceMatch[2]}`);
                }

                // Determine focus for fallback workouts
                // CRITICAL: Extract type from description, don't default to 'easy'
                // Fallback workouts are rest days, easy runs, or bike days - extract type from description
                let fallbackType = 'easy'; // Only default if we can't determine from description
                const descLower = workout.description.toLowerCase();
                if (descLower.includes('rest') || descLower === 'rest') {
                    fallbackType = 'rest';
                } else if (descLower.includes('ride') || descLower.includes('runeq') || descLower.includes('bike')) {
                    fallbackType = 'bike';
                } else if (descLower.includes('easy')) {
                    fallbackType = 'easy';
                } else if (descLower.includes('tempo')) {
                    fallbackType = 'tempo';
                } else if (descLower.includes('interval')) {
                    fallbackType = 'intervals';
                } else if (descLower.includes('hill')) {
                    fallbackType = 'hills';
                } else if (descLower.includes('long')) {
                    fallbackType = 'longRun';
                }
                
                const fallbackFocusMap = {
                    tempo: 'Lactate Threshold',
                    intervals: 'Speed & VO2 Max',
                    hills: 'Strength & Power',
                    longRun: 'Endurance',
                    easy: 'Aerobic Base',
                    bike: 'Cross-Training',
                    rest: 'Recovery',
                    rest_or_xt: 'Recovery / XT'
                };

                const fallbackWorkout = {
                    day: workout.day,
                    type: fallbackType,
                    name: workout.description,
                    description: workout.description,
                    distance: extractedDistance,
                    focus: fallbackFocusMap[fallbackType] || 'Training', // Keep this fallback for safety, but type should be determined above
                    workout: {
                        name: workout.description,
                        description: workout.description
                    },
                    metadata: {
                        aiGenerated: true,
                        fallback: true
                    }
                };
                console.log(`  Created fallback workout:`, fallbackWorkout);
                return fallbackWorkout;
            });

            return {
                weekNumber: week.weekNumber,
                totalMileage: week.totalMileage,
                workouts: dashboardWorkouts
            };
        });

        // Clean WORKOUT_ID tags from coaching analysis for display
        const cleanedCoachingText = enrichedPlan.fullPlanText
            ? enrichedPlan.fullPlanText.replace(/\[WORKOUT_ID:\s*(?:tempo|interval|longrun|hill)_.+?_\d+\]\s*/g, '')
            : enrichedPlan.fullPlanText;

        // Calculate start date (working backwards from race date)
        const totalWeeks = enrichedPlan.weeks.length;
        const raceDate = new Date(userProfile.raceDate);
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const startDate = new Date(raceDate.getTime() - (totalWeeks * msPerWeek));

        // Format as YYYY-MM-DD for consistency
        const startDateString = startDate.toISOString().split('T')[0];
        const raceDateString = raceDate.toISOString().split('T')[0];

        return {
            userProfile: enrichedPlan.userProfile,
            paces: enrichedPlan.paces,
            trackIntervals: enrichedPlan.trackIntervals, // Include VDOT track interval times
            weeks: dashboardWeeks,
            fullPlanText: enrichedPlan.fullPlanText,
            aiCoachingAnalysis: cleanedCoachingText, // Store cleaned coaching output
            planOverview: {
                startDate: startDateString,
                raceDate: raceDateString,
                totalWeeks: totalWeeks,
                raceDistance: userProfile.raceDistance,
                goalTime: userProfile.raceTime
            }
        };
    }
}

export default new TrainingPlanAIService();
