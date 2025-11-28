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
import phaseCalculator from './ai/PhaseCalculator';
import planFixer from './ai/PlanFixer';
import promptBuilder from './ai/PromptBuilder';

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
- **Direct and honest**: "Let's be real" - no sugarcoating, but always encouraging
- **Data-driven**: Use specific paces, times, and metrics - show the math
- **Practical periodization**: "Run less, run faster" philosophy - quality over quantity
- **Injury prevention focus**: Emphasize recovery, rest days, and smart progression
- **Mental toughness**: Acknowledge the challenge, build confidence through checkpoints
- **Conversational but professional**: Like talking to a friend who happens to be an expert
- **Actionable specifics**: Not just "run tempo" but "run tempo at 9:35-9:50/mile for 20 minutes"
- **Reality checks**: Set clear checkpoints with specific metrics (e.g., "10K under 65:00 by Week 8") - checkpoints must be within the plan duration (Week 1 to Week [totalWeeks])
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
            const normalizedProfile = {
                ...userProfile,
                qualityDays: userProfile.qualityDays || userProfile.hardSessionDays || []
            };
            
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
            const planPrompt = this.buildPlanStructurePrompt(normalizedProfile, coachingText);
            const fullPlanPrompt = `${workoutContext}\n\n---\n\n**COACHING ANALYSIS FROM STEP 1 (for reference):**\n${coachingText}\n\n---\n\n${planPrompt}`;

            const planResult = await this.callWithTimeout(
                this.callAnthropicAPI({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 4000, // Reduced for plan structure only
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
            const structuredPlan = this.parseAIPlanToStructure(combinedText, normalizedProfile);

            // Hydrate workout IDs with full workout details from library
            const enrichedPlan = this.enrichPlanWithWorkouts(structuredPlan);

            // Transform to Dashboard format
            const dashboardPlan = this.transformToDashboardFormat(enrichedPlan, normalizedProfile);
            
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
            prompt += `- Recent Race: ${profile.recentRaceTime} for ${profile.recentRaceDistance}\n`;
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
     */
    buildPlanStructurePrompt(profile, coachingAnalysis) {
        // Route to specialized prompt builder based on runner status
        if (this.isInjuredRunner(profile)) {
            return this.buildInjuredRunnerPlanStructurePrompt(profile, coachingAnalysis);
        } else {
            return this.buildRegularRunnerPlanStructurePrompt(profile, coachingAnalysis);
        }
    }

    /**
     * Build plan structure prompt for INJURED runners (cross-training only)
     */
    buildInjuredRunnerPlanStructurePrompt(profile, coachingAnalysis) {
        // For now, use the regular one but we can specialize later
        // The cross-training logic is already in buildRegularRunnerPlanStructurePrompt
        return this.buildRegularRunnerPlanStructurePrompt(profile, coachingAnalysis);
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
        prompt += `**🚨 USER SCHEDULE REQUIREMENTS (MANDATORY - DO NOT VIOLATE):**\n`;
        if (profile.qualityDays && profile.qualityDays.length > 0) {
            prompt += `- **HARD WORKOUT DAYS: ${profile.qualityDays.join(' and ')} MUST ALWAYS have hard workouts (tempo, intervals, or hills) in EVERY week**\n`;
            prompt += `  - ${profile.qualityDays[0]} MUST be a hard workout (tempo, intervals, or hills) - NEVER easy run, NEVER rest, NEVER bike-only\n`;
            if (profile.qualityDays[1]) {
                prompt += `  - ${profile.qualityDays[1]} MUST be a hard workout (tempo, intervals, or hills) - NEVER easy run, NEVER rest, NEVER bike-only\n`;
            }
            prompt += `  - DO NOT schedule hard workouts on other days\n`;
            prompt += `  - DO NOT make these days easy runs or rest days - they MUST be quality sessions\n`;
            prompt += `  - If you see "Easy" on ${profile.qualityDays.join(' or ')}, you have made an error - fix it immediately\n`;
        }
        if (restDays.length > 0) {
            prompt += `- **REST DAYS: ${restDays.join(', ')} = "Rest" ONLY (no workouts, no cross-training) in EVERY week**\n`;
            prompt += `  - DO NOT schedule any workouts on ${restDays.join(' or ')}\n`;
        }
        if (bikeDays.length > 0 && bikeType) {
            prompt += `- **CROSS-TRAINING DAYS: ${bikeDays.join(' and ')} should be ${bikeType} rides, NOT runs**\n`;
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

        prompt += `**CRITICAL FORMAT:**\n`;
        if (startDayOfWeek === 0) {
            // Starting on Sunday - Week 1 is ONLY Sunday
            prompt += `- Week 1: ONLY ${startDayAbbrev} (1 day - starts ${startDateShort}, ${startDayName})\n`;
        } else {
            prompt += `- Week 1: Only ${startDayAbbrev}-Sun (${daysInWeek1} days, starts ${startDateShort}, ${startDayName})\n`;
        }
        prompt += `- Week 2+: Full Mon-Sun (7 days)\n`;
        prompt += `- Use [WORKOUT_ID: type_category_index] for quality workouts\n`;
        prompt += `- Include distance in ${distanceUnit} for EVERY workout\n`;
        prompt += `- **CRITICAL: DO NOT include [WORKOUT_ID: ...] tags in your output text. Only use the tags internally for reference, but in the actual workout lines, write clean names like:\n`;
        prompt += `  * "Classic Easy Long Run 5 miles" (NOT "[WORKOUT_ID: longrun_TRADITIONAL_EASY_0] Classic Easy Long Run 5 miles")\n`;
        prompt += `  * "Classic Hill Repeats 6 miles" (NOT "[WORKOUT_ID: hill_medium_vo2_0] Classic Hill Repeats 6 miles")\n`;
        prompt += `  * "Classic Tempo Run 6 miles" (NOT "[WORKOUT_ID: tempo_TRADITIONAL_TEMPO_0] Classic Tempo Run 6 miles")\n`;
        prompt += `  The system will automatically match workouts using the library, but users should see clean, readable names.\n`;
        prompt += `- If you start to type "[WORKOUT_ID:" in the visible text, DELETE it entirely before responding.\n\n`;

        prompt += `**RESPONSE RULES (follow 100%):**\n`;
        prompt += `1. Begin with "# Week-by-Week Training Schedule" – absolutely no introduction or recap before this header.\n`;
        prompt += `2. Write the schedule ONCE. Do not repeat weeks, do not restate the plan after the schedule, and do not add narrative sections besides the final Notes block.\n`;
        prompt += `3. Each week header MUST be "### Week {number} (MMM DD - MMM DD) • {Phase} Phase • XX miles". Use the phase plan above for the {Phase} label.\n`;
        prompt += `4. List days Monday → Sunday (or the actual Week 1 partial sequence) with one bullet per day. No paragraphs, no combined days.\n`;
        prompt += `5. After Week ${totalWeeks}, add "## Notes" with 2-3 concise bullets (checkpoint reminders, fueling, etc.). Do NOT introduce new workouts there.\n`;
        prompt += `6. Never include [WORKOUT_ID: ...] in visible text, never say "see above", and never paste the plan twice.\n\n`;
        
        if (bikeDays.length > 0 && bikeType) {
            prompt += `**CROSS-TRAINING FORMAT:**\n`;
            prompt += `- Format: "Tue: Ride 4 RunEQ miles on your ${bikeType}" (NOT "Easy 4 mile run")\n`;
            prompt += `- **CRITICAL: Keep as "RunEQ miles" - do NOT convert to actual bike miles. The system handles conversion.**\n\n`;
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
        prompt += `### Week 1 (${startDayOfWeek === 0 ? week1StartDate : `${week1StartDate} - ${week1EndFormatted}`}) • Base Phase • 16 miles\n`;
        prompt += `- ${startDayAbbrev}: Ride 3 RunEQ miles on your ${exampleBikeName} (easy aerobic)\n`;
        prompt += `- Wed: Classic Tempo Run 5 miles (2 mi warmup, 1.5 mi @ tempo, 1.5 mi cooldown)\n`;
        prompt += `- Thu: Ride 3 RunEQ miles on your ${exampleBikeName} (recovery spin)\n`;
        prompt += `- Fri: Hill Strides 4 miles (warmup, 6x30sec hills, cooldown)\n`;
        prompt += `- Sun: Classic Easy Long Run 6 miles (conversational)\n`;
        prompt += `### Week 2 (${week2StartFormatted} - ${week2EndFormatted}) • Base Phase • 19 miles\n`;
        prompt += `- Mon: Rest\n`;
        prompt += `- Tue: Ride 3 RunEQ miles on your ${exampleBikeName} (easy flush)\n`;
        prompt += `- Wed: 800m Track Intervals 6 miles (2 mi warmup, 6x800m @ VO2 pace, 2 mi cooldown)\n`;
        prompt += `- Thu: Ride 4 RunEQ miles on your ${exampleBikeName} (steady aerobic)\n`;
        prompt += `- Fri: Classic Tempo Run 5 miles (1 mi warmup, 3 mi @ tempo, 1 mi cooldown)\n`;
        prompt += `- Sun: Classic Easy Long Run 7 miles (build endurance)\n`;
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
            prompt += `- **WEEKLY MILEAGE PROGRESSION (STRICT):**\n`;
            prompt += `  * Week 1: Start at or near current weekly mileage (${profile.currentWeeklyMileage} ${distanceUnit})\n`;
            prompt += `  * Week 2+: Increase by 10% OR 2-3 ${distanceUnit} per week MAXIMUM (no jumps of 5+ ${distanceUnit})\n`;
            prompt += `  * Example: Week 1 = ${profile.currentWeeklyMileage} ${distanceUnit}, Week 2 = ${parseInt(profile.currentWeeklyMileage) + 2}-${parseInt(profile.currentWeeklyMileage) + 3} ${distanceUnit}\n`;
            prompt += `  * Recovery weeks: Reduce by 20-30% (not more than 50%)\n`;
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

        return prompt;
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
                180000 // 180 seconds timeout
            );

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
     * Build coaching prompt for REGULAR runners (not injured)
     * CRITICAL: No defaults - all data must come from user profile
     */
    buildRegularRunnerCoachingPrompt(profile) {
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
        prompt += `Week 1 (${startDayAbbrev}-Sun):\n`;
        prompt += `- ${startDayAbbrev}: [WORKOUT_ID: tempo_THRESHOLD_0] Tempo Run 6 ${distanceUnit}\n`;
        prompt += `- Sun: [WORKOUT_ID: longrun_CONVERSATIONAL_0] Long Run 5 ${distanceUnit}\n\n`;
        prompt += `Week 2 (Mon-Sun):\n`;
        prompt += `- Mon: Rest\n`;
        prompt += `- Wed: [WORKOUT_ID: interval_VO2_MAX_2] 800m Intervals 6 ${distanceUnit}\n`;
        prompt += `- Sun: [WORKOUT_ID: longrun_CONVERSATIONAL_0] Long Run 7 ${distanceUnit}\n\n`;

        prompt += `**CRITICAL:** Week 1 starts ${startDayName} (partial). Week 2+ are full Mon-Sun.\n\n`;

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
        prompt += `2. Week 1: Only ${dayAbbrevs[startDayOfWeekCoaching]}-Sun (${daysInWeek1Coaching} days). Week 2+: Full Mon-Sun (7 days)\n`;
        prompt += `3. [WORKOUT_ID: ...] format for quality workouts from the library\n`;
        prompt += `4. **CRITICAL: Include distance in ${distanceUnit} for EVERY workout** (e.g., "Long Run 10 miles", "Tempo Run 6 miles")\n`;
        prompt += `5. Simple descriptions for easy runs and rest days (must include distance)\n`;
        if (restDays.length > 0) {
            prompt += `6. **${restDays.join(', ')} = "Rest" ONLY** (the user picked ${7 - restDays.length} training days, not 7)\n`;
        }
        prompt += `\n`;

        prompt += `**PROGRESSIVE TRAINING PRINCIPLES (STRICT):**\n`;
        prompt += `1. **Week 1 MUST start conservatively:** First long run should be AT OR BELOW current long run distance (${profile.currentLongRun} ${distanceUnit}) - DO NOT EXCEED\n`;
        prompt += `2. **LONG RUN PROGRESSION (STRICT):** Increase by 1-2 ${distanceUnit} per week MAXIMUM - NO JUMPS OF 3+ ${distanceUnit}\n`;
        prompt += `   Example: Week 1 = ${profile.currentLongRun} ${distanceUnit}, Week 2 = ${parseInt(profile.currentLongRun) + 1}-${parseInt(profile.currentLongRun) + 2} ${distanceUnit}, Week 3 = ${parseInt(profile.currentLongRun) + 2}-${parseInt(profile.currentLongRun) + 4} ${distanceUnit}\n`;
        prompt += `3. **WEEKLY MILEAGE PROGRESSION (STRICT):** Build from current fitness (${profile.currentWeeklyMileage} ${distanceUnit}/week) - increase by 10% OR 2-3 ${distanceUnit} per week MAXIMUM - NO JUMPS OF 5+ ${distanceUnit}\n`;
        prompt += `   Example: Week 1 = ${profile.currentWeeklyMileage} ${distanceUnit}, Week 2 = ${parseInt(profile.currentWeeklyMileage) + 2}-${parseInt(profile.currentWeeklyMileage) + 3} ${distanceUnit}\n`;
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
        prompt += `1. Honest assessment with data (e.g., "39 min improvement = 3 min/week")\n`;
        prompt += `2. Key training paces with ranges\n`;
        prompt += `3. Week-by-week plan: **EXACTLY ${totalWeeks} weeks** (Week 1 through Week ${totalWeeks}), header, all days, brief notes\n`;
        prompt += `4. Race day strategy: pacing, fueling, terrain (race date is ${raceDateFormattedPlan})\n`;
        prompt += `5. Checkpoints with metrics (e.g., "Week 8: 10K under 65:00") - ALL checkpoints must be Week 1 through Week ${totalWeeks}, NO checkpoints beyond Week ${totalWeeks}\n`;
        prompt += `6. Final notes: why plan works, what to watch, encouragement\n`;
        prompt += `**CRITICAL:**\n`;
        prompt += `- The week-by-week plan must be exactly ${totalWeeks} weeks long (Week 1 through Week ${totalWeeks})\n`;
        prompt += `- The race date is ${raceDateFormattedPlan} (${profile.raceDate}) - DO NOT mention a different date like "Feb 15"\n`;
        prompt += `- All checkpoints must be between Week 1 and Week ${totalWeeks} (no Week 16, Week 20, etc. if plan is only ${totalWeeks} weeks)\n\n`;

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

        const prompt = `You are a USATF-certified running coach with advanced knowledge of sports physiology and injury rehabilitation. 
When working with injured runners, you MUST adopt a research-oriented, safety-first approach:

**CRITICAL PROTOCOL - RESEARCH BEFORE RECOMMENDING:**
1. **CONSIDER BIOMECHANICS FIRST:** Before recommending any equipment or workout, think through:
   - What movements/muscles does this equipment engage?
   - What are the biomechanical implications for this specific injury?
   - Could this movement pattern aggravate the injury?
   - What does sports medicine research say about this injury + equipment combination?

2. **DRAW UPON YOUR KNOWLEDGE:** Consider established principles of:
   - Sports physiology (how different activities affect the body)
   - Biomechanics (movement patterns, joint loading, muscle engagement)
   - Injury rehabilitation protocols (evidence-based safe/unsafe activities)
   - Exercise science research (what the literature says)

3. **SAFETY-FIRST:** When in doubt, choose the SAFEST option. It's better to be overly conservative 
   than to risk aggravating an injury. Always explain the WHY behind recommendations.

**YOUR COACHING STYLE:** Direct, honest, and encouraging - like Jason Fitzgerald, but with added 
scientific rigor when dealing with injuries. Be conversational but evidence-based.

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

COACHING REQUIREMENTS:
1. **Start with honest assessment**: "Let's be real - injuries happen, but here's how we'll handle this..."
2. **Explain the strategy with biomechanical reasoning**: Why cross-training maintains fitness, what each equipment type does, 
   and WHY certain equipment is safer for this injury (reference movement patterns, not just "it's safer")
3. **Address mental aspect**: Staying motivated during injury, trust in the process
4. **Set expectations**: What to expect when returning to running, how fitness may have changed
5. **Provide specific, evidence-based guidance**: 
   - Which equipment is best for maintaining running fitness AND why (biomechanical reasoning)
   - How to structure cross-training workouts
   - What to watch for when returning to running
   - If any equipment could aggravate the injury, explain WHY and recommend safer alternatives
6. **Race goal reality check**: How this affects the race goal, whether adjustments are needed
7. **Safety reminder**: "If any activity causes pain, stop immediately and consult your healthcare provider"
8. **Medical disclaimer**: Always include: "This is not medical advice. Consult your healthcare provider for injury diagnosis and treatment."
9. **Encouragement**: End with confidence-building message

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
            
            // DEBUG: Log lines that might be workouts (contain day names)
            const dayPattern = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;
            if (dayPattern.test(line) && currentWeek && line.trim().length > 0 && !line.match(/^[\s#*]*Week/i)) {
                console.log(`  🔍 Line ${lineIndex} might be a workout: "${line.substring(0, 100)}"`);
            }

            // Detect week headers - can have markdown headers (###), bold (**), etc.
            // Format: "### Week 1 (dates) - XX miles" or "**Week 1** - XX miles" or "Week 1 - XX miles"
            // Also support "### Week 1 (dates) • Phase • XX miles" (bullet point format)
            // Also support "kilometers" for metric users
            // Strategy: Match week number first, then find the LAST number followed by miles/km (to avoid matching dates)
            if (line.match(/^[\s#*]*Week\s+\d+/i)) {
                const weekNumMatch = line.match(/^[\s#*]*Week\s+(\d+)/i);
                if (weekNumMatch) {
                    const weekNum = parseInt(weekNumMatch[1]);
                    
                    // Find the LAST occurrence of "number + miles/km" (to avoid matching dates like "Nov 28")
                    // Look for patterns like "16 miles", "24 kilometers", etc. at the end of the line
                    const mileageMatches = [...line.matchAll(/(\d+)\s*(miles|kilometers|km|mi)\b/gi)];
                    const lastMileageMatch = mileageMatches[mileageMatches.length - 1];
                    
                    if (lastMileageMatch) {
                        const mileage = parseInt(lastMileageMatch[1]);
                        const weekMatchWithMileage = { 1: weekNum, 2: mileage, 3: lastMileageMatch[2] };
                        var weekMatch = weekMatchWithMileage;
                    } else {
                        // No mileage found, but we have a week number
                        const weekMatchWithoutMileage = { 1: weekNum };
                        var weekMatch = weekMatchWithoutMileage;
                    }
                }
            }
            
            // Fallback to original regex patterns if week number wasn't found above
            if (!weekMatch) {
                const weekMatchWithMileage = line.match(/^[\s#*]*Week\s+(\d+)(?:\s*\([^)]+\))?\s*[-–—]\s*(\d+)\s*(miles|kilometers|km|mi)/i);
                const weekMatchWithoutMileage = line.match(/^[\s#*]*Week\s+(\d+)(?:\s*\([^)]+\))?\s*[-–—•]/i);
                weekMatch = weekMatchWithMileage || weekMatchWithoutMileage;
            }
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
                // For cross-training plans, mileage might not be specified - use 0 as placeholder
                const mileage = weekMatch[2] ? parseInt(weekMatch[2]) : 0;
                currentWeek = {
                    weekNumber: weekNum,
                    totalMileage: mileage,
                    workouts: []
                };
                console.log(`Found Week ${weekNum} at line ${lineIndex}: ${line.substring(0, 80)}`);
            }

            // Detect workout lines with potential WORKOUT_ID
            // Allow leading whitespace, bullets (-, *), markdown formatting, and various separators
            // Also support full day names (Monday, Tuesday, etc.) for flexibility
            // Support formats like: "- Tue: workout", "Tue: workout", "**Tue:** workout", etc.
            // More flexible regex to match various formats:
            // - **Tue**: workout
            // - Tue: workout  
            // - **Tue** - workout
            // - Tue - workout
            const workoutMatch = line.match(/^\s*[-*\s]*\**\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\**\s*[:\-]\s*(.+)/i);
            if (workoutMatch && currentWeek) {
                console.log(`  ✅ MATCHED workout line ${lineIndex}: "${line.substring(0, 80)}"`);
                // Normalize day name to abbreviation for consistency, then convert to full name
                const dayInput = workoutMatch[1];
                const dayAbbrevMap = {
                    'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu',
                    'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun',
                    'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed', 'Thu': 'Thu',
                    'Fri': 'Fri', 'Sat': 'Sat', 'Sun': 'Sun'
                };
                const normalizedDayAbbrev = dayAbbrevMap[dayInput] || dayInput;
                
                // Convert to full day name for Dashboard compatibility
                const dayAbbrevToFull = {
                    'Mon': 'Monday',
                    'Tue': 'Tuesday',
                    'Wed': 'Wednesday',
                    'Thu': 'Thursday',
                    'Fri': 'Friday',
                    'Sat': 'Saturday',
                    'Sun': 'Sunday'
                };
                const fullDayName = dayAbbrevToFull[normalizedDayAbbrev] || normalizedDayAbbrev;
                
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
                
                // CRITICAL: Store original description before cleaning for distance extraction
                const originalDescription = rawDescription;

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
                    day: fullDayName, // Use full day name for Dashboard compatibility
                    description: cleanDescription,
                    originalDescription: originalDescription, // Store original for distance extraction
                    workoutId: idMatch ? idMatch[0] : null,
                    workoutType: idMatch ? idMatch[1] : inferredType,
                    workoutCategory: idMatch ? idMatch[2] : null,
                    workoutIndex: idMatch ? parseInt(idMatch[3]) : null
                });
                console.log(`  ✅ Added workout: ${fullDayName} - ${cleanDescription.substring(0, 50)}`);
                console.log(`     Day abbreviation: ${workoutMatch[1]}, Full name: ${fullDayName}`);
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

        // CRITICAL: Calculate progressive paces - start from CURRENT FITNESS, progress toward GOAL
        // Use recent race time for current fitness, goal time for target
        let structuredPaces = null;
        let trackIntervals = null;
        let currentFitnessPaces = null;
        let goalPaces = null;
        const totalWeeks = weeks.length;

        // Step 1: Calculate CURRENT FITNESS paces from recent race time
        if (userProfile.recentRaceTime && userProfile.recentRaceDistance) {
            try {
                let recentTime = userProfile.recentRaceTime;
                // Handle format like "1:07:35" or "10K-1:07:35"
                if (recentTime.includes('-')) {
                    recentTime = recentTime.split('-').pop();
                }

                console.log(`📊 Calculating CURRENT FITNESS paces from ${userProfile.recentRaceDistance} @ ${recentTime}`);
                const currentPaceData = this.paceCalculator.calculateFromGoal(userProfile.recentRaceDistance, recentTime);

                if (currentPaceData && currentPaceData.paces) {
                    currentFitnessPaces = currentPaceData;
                    console.log(`✅ Current Fitness Paces:`, {
                        easy: `${currentPaceData.paces.easy.min}-${currentPaceData.paces.easy.max}/mi`,
                        threshold: `${currentPaceData.paces.threshold.pace}/mi`,
                        interval: `${currentPaceData.paces.interval.pace}/mi`
                    });
                }
            } catch (error) {
                console.warn('⚠️ Could not calculate current fitness paces:', error.message);
            }
        }

        // Step 2: Calculate GOAL paces from goal race time
        if (userProfile.raceTime && userProfile.raceDistance) {
            try {
                let goalTime = userProfile.raceTime;
                if (goalTime.includes('-')) {
                    goalTime = goalTime.split('-')[1];
                }

                console.log(`🎯 Calculating GOAL paces for ${userProfile.raceDistance} @ ${goalTime}`);
                const goalPaceData = this.paceCalculator.calculateFromGoal(userProfile.raceDistance, goalTime);

                if (goalPaceData && goalPaceData.paces) {
                    goalPaces = goalPaceData;
                    trackIntervals = goalPaceData.trackIntervals;
                    console.log(`✅ Goal Paces:`, {
                        easy: `${goalPaceData.paces.easy.min}-${goalPaceData.paces.easy.max}/mi`,
                        threshold: `${goalPaceData.paces.threshold.pace}/mi`,
                        interval: `${goalPaceData.paces.interval.pace}/mi`
                    });
                }
            } catch (error) {
                console.warn('⚠️ Could not calculate goal paces:', error.message);
            }
        }

        // Step 3: Use progressive pacing if we have both current and goal paces
        if (currentFitnessPaces && goalPaces && totalWeeks > 1) {
            console.log(`📈 Using PROGRESSIVE PACING: Week 1 = current fitness, Week ${totalWeeks} = near goal`);
            // For Week 1, use current fitness paces (will be blended per week in enrichPlanWithWorkouts)
            structuredPaces = currentFitnessPaces.paces;
            // Store both for progressive blending
            structuredPaces._progressive = {
                current: currentFitnessPaces,
                goal: goalPaces,
                totalWeeks: totalWeeks
            };
        } else if (currentFitnessPaces) {
            // Only current fitness available - use it
            console.log(`📊 Using CURRENT FITNESS paces only (no goal paces available)`);
            structuredPaces = currentFitnessPaces.paces;
        } else if (goalPaces) {
            // Only goal paces available - use them (fallback to old behavior)
            console.warn(`⚠️ Using GOAL paces only (no recent race time provided) - this may be too aggressive`);
            structuredPaces = goalPaces.paces;
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
        
        // Get progressive pacing data if available
        const progressiveData = structuredPlan.paces?._progressive;
        const hasProgressivePacing = progressiveData && progressiveData.current && progressiveData.goal;
        
        const enrichedWeeks = structuredPlan.weeks.map(week => {
            const weekNumber = week.weekNumber || 1;
            
            // Calculate week-specific paces using progressive blending
            let weekPaces = structuredPlan.paces;
            if (hasProgressivePacing) {
                const blendedPaces = this.paceCalculator.blendPaces(
                    progressiveData.current,
                    progressiveData.goal,
                    weekNumber,
                    totalWeeks
                );
                weekPaces = blendedPaces.paces;
                console.log(`\n📊 Week ${weekNumber} Progressive Paces:`, {
                    easy: `${weekPaces.easy.min}-${weekPaces.easy.max}/mi`,
                    threshold: `${weekPaces.threshold.pace}/mi`,
                    interval: `${weekPaces.interval.pace}/mi`
                });
            }
            
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
                                paces: weekPaces
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
                                paces: weekPaces,
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
                                paces: weekPaces,
                                totalDistance: totalDistance,
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
                                paces: weekPaces,
                                distance: totalDistance
                            });
                        }
                    }

                    if (fullWorkout) {
                        console.log(`    ✅ Found workout: ${fullWorkout.name}`);
                        const enriched = this.injectUserPaces(fullWorkout, weekPaces);
                        
                        // CRITICAL: Ensure distance is preserved from AI's description
                        if (totalDistance && !enriched.distance) {
                            enriched.distance = totalDistance;
                            console.log(`    📏 Added distance ${totalDistance} miles to enriched workout`);
                        }

                        return {
                            ...workout,
                            fullWorkoutDetails: enriched,
                            hasStructuredWorkout: true,
                            extractedDistance: totalDistance // Store for later use
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
        
        // CRITICAL: Calculate totalWeeks from dates as fallback if weeks array is empty
        let totalWeeks = enrichedPlan.weeks?.length || 0;
        if (totalWeeks === 0) {
            // Fallback: Calculate from race date and start date
            const startDate = this.parseDate(userProfile.startDate);
            const raceDate = this.parseDate(userProfile.raceDate);
            if (startDate && raceDate && !isNaN(startDate.getTime()) && !isNaN(raceDate.getTime())) {
                const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                totalWeeks = Math.max(1, Math.ceil((raceDate.getTime() - startDate.getTime()) / msPerWeek));
                console.warn(`⚠️ Weeks array is empty - calculated totalWeeks from dates: ${totalWeeks}`);
            } else {
                console.error('❌ Cannot calculate totalWeeks - missing or invalid dates');
                throw new Error('Cannot create plan: weeks array is empty and dates are invalid');
            }
        }
        const phasePlan = this.getPhasePlan(totalWeeks);
        const phaseFocusMap = {
            Base: 'Aerobic foundation & durability',
            Build: 'Strength & speed development',
            Peak: 'Race-specific sharpening',
            Taper: 'Freshen up & execute'
        };
        const motivationMap = {
            Base: [
                'Consistency right now builds race-day confidence 💪',
                'Aerobic base today = faster workouts later ⚙️',
                'Keep stacking easy miles – durability wins 🧱',
                'Recovery matters as much as the miles 😴'
            ],
            Build: [
                'Dial in effort – smooth, fast, controlled 🚀',
                'This phase teaches you to love the grind 🔁',
                'Every quality day is sharpening your edge ✂️',
                'Fuel, sleep, repeat – you’re in the work zone 🧪'
            ],
            Peak: [
                'Race-specific work now = calm on race day 🏁',
                'Trust your legs – they know what to do 👣',
                'Two words: race rehearsals 🧠',
                'Your engine is built. Now we fine tune 🔧'
            ],
            Taper: [
                'Less work, more readiness – let freshness build 🌱',
                'Nothing new. Stay sharp, stay calm 🎯',
                'Visualize success – you’ve earned this 💫',
                'Rest is training. Really. 😴'
            ]
        };
        // Parse start date - handle both ISO strings and date-only strings
        let planStartDate;
        if (userProfile.startDate) {
            if (userProfile.startDate.includes('T')) {
                // Already an ISO string
                planStartDate = new Date(userProfile.startDate);
            } else {
                // Date-only string, append time
                planStartDate = new Date(`${userProfile.startDate}T00:00:00`);
            }
        } else {
            planStartDate = new Date();
        }
        
        // Parse race date - handle both ISO strings and date-only strings
        let raceDate;
        if (userProfile.raceDate) {
            if (userProfile.raceDate.includes('T')) {
                // Already an ISO string
                raceDate = new Date(userProfile.raceDate);
            } else {
                // Date-only string, append time
                raceDate = new Date(`${userProfile.raceDate}T00:00:00`);
            }
        } else {
            raceDate = new Date(planStartDate);
        }
        
        // Validate dates
        if (isNaN(planStartDate.getTime())) {
            throw new Error(`Invalid start date: ${userProfile.startDate}`);
        }
        if (isNaN(raceDate.getTime())) {
            throw new Error(`Invalid race date: ${userProfile.raceDate}`);
        }
        const formatWeekDates = (weekNumber) => {
            const start = new Date(planStartDate);
            start.setDate(planStartDate.getDate() + (weekNumber - 1) * 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
                displayText: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            };
        };
        const getMotivation = (phase, weekNumber) => {
            const options = motivationMap[phase] || motivationMap.Base;
            return options[(weekNumber - 1) % options.length];
        };

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
                    // CRITICAL: Check workout.extractedDistance first (from enrichPlanWithWorkouts)
                    let extractedDistance = workout.extractedDistance || details.distance || 0;
                    if (!extractedDistance) {
                        const distanceMatch = workout.description.match(/(\d+(?:\.\d+)?)\s*(mile|miles|mi|km)/i);
                        if (distanceMatch) {
                            extractedDistance = parseFloat(distanceMatch[1]);
                            console.log(`  📏 Extracted distance from description: ${extractedDistance} ${distanceMatch[2]}`);
                        }
                    }
                    
                    // CRITICAL: If still no distance, try to extract from the original description before cleaning
                    if (!extractedDistance && workout.originalDescription) {
                        const originalMatch = workout.originalDescription.match(/(\d+(?:\.\d+)?)\s*(mile|miles|mi|km)/i);
                        if (originalMatch) {
                            extractedDistance = parseFloat(originalMatch[1]);
                            console.log(`  📏 Extracted distance from original description: ${extractedDistance}`);
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

                    // Clean workout name - remove [WORKOUT_ID: ...] tags if present
                    let cleanName = details.name || workout.description;
                    cleanName = cleanName.replace(/\[WORKOUT_ID:\s*(?:tempo|interval|longrun|hill)_.+?_\d+\]\s*/g, '').trim();
                    
                    let cleanDescription = details.description || workout.description;
                    cleanDescription = cleanDescription.replace(/\[WORKOUT_ID:\s*(?:tempo|interval|longrun|hill)_.+?_\d+\]\s*/g, '').trim();

                    return {
                        day: workout.day,
                    type: normalizedType,
                    // CRITICAL: Clean names/descriptions - remove WORKOUT_ID tags
                    name: cleanName,
                    description: cleanDescription,
                    distance: extractedDistance || workout.extractedDistance || 0, // CRITICAL: Preserve distance from AI description
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
                    // CRITICAL: For bike workouts, extract RunEQ miles (not convert to bike miles)
                    // The AI generates "Ride 3 RunEQ miles" - we want to preserve the RunEQ value
                    const runEqMatch = workout.description.match(/(\d+(?:\.\d+)?)\s*RunEQ/i);
                    if (runEqMatch) {
                        extractedDistance = parseFloat(runEqMatch[1]);
                        console.log(`  📏 Extracted RunEQ distance: ${extractedDistance} RunEQ miles`);
                    }
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

                // Clean fallback workout name - remove [WORKOUT_ID: ...] tags if present
                let cleanFallbackName = workout.description;
                cleanFallbackName = cleanFallbackName.replace(/\[WORKOUT_ID:\s*(?:tempo|interval|longrun|hill)_.+?_\d+\]\s*/g, '').trim();

                // CRITICAL: For bike workouts, preserve RunEQ in the name
                let finalName = cleanFallbackName;
                let finalDescription = cleanFallbackName;
                if (fallbackType === 'bike' && workout.description.match(/RunEQ/i)) {
                    // Preserve "RunEQ miles" in the name/description
                    const runEqMatch = workout.description.match(/(\d+(?:\.\d+)?)\s*RunEQ\s*miles?/i);
                    if (runEqMatch) {
                        finalName = `Ride ${runEqMatch[1]} RunEQ miles`;
                        finalDescription = workout.description; // Keep original description with RunEQ
                    }
                }
                
                const fallbackWorkout = {
                    day: workout.day,
                    type: fallbackType,
                    name: finalName,
                    description: finalDescription,
                    distance: extractedDistance,
                    focus: fallbackFocusMap[fallbackType] || 'Training', // Keep this fallback for safety, but type should be determined above
                    workout: {
                        name: finalName,
                        description: finalDescription
                    },
                    metadata: {
                        aiGenerated: true,
                        fallback: true
                    }
                };
                console.log(`  Created fallback workout:`, fallbackWorkout);
                return fallbackWorkout;
            });

            const phaseLabel = this.getPhaseForWeek(week.weekNumber, totalWeeks);
            const phaseKey = phaseLabel.toLowerCase();
            if (week.weekNumber === 1 || week.weekNumber === Math.ceil(totalWeeks * 0.5) || week.weekNumber === totalWeeks) {
                console.log(`📅 Week ${week.weekNumber}/${totalWeeks}: Phase = ${phaseLabel} (${phaseKey})`);
            }
            return {
                weekNumber: week.weekNumber,
                totalMileage: week.totalMileage,
                workouts: dashboardWorkouts,
                phase: phaseKey,
                weeklyFocus: phaseFocusMap[phaseLabel] || 'Periodized training',
                motivation: getMotivation(phaseLabel, week.weekNumber),
                weekDates: formatWeekDates(week.weekNumber)
            };
        });

        // Clean WORKOUT_ID tags from coaching analysis for display
        // Use a more aggressive regex that catches all variations
        const workoutIdRegex = /\[WORKOUT_ID:\s*(?:tempo|interval|longrun|hill)_[^\]]+\]\s*/gi;
        const cleanedCoachingText = enrichedPlan.fullPlanText
            ? enrichedPlan.fullPlanText.replace(workoutIdRegex, '').trim()
            : enrichedPlan.fullPlanText;

        // Format as YYYY-MM-DD for consistency
        const startDateString = planStartDate.toISOString().split('T')[0];
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
                goalTime: userProfile.raceTime,
                trainingPhilosophy: userProfile.trainingPhilosophy || userProfile.trainingStyle || 'practical_periodization',
                phasePlan
            }
        };
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
