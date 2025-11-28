/**
 * PlanParser - Parses AI-generated training plan text into structured data
 * 
 * Single Responsibility: Extract weeks, workouts, and paces from AI text
 */

import { PaceCalculator } from '../../lib/pace-calculator';

class PlanParser {
    constructor() {
        this.paceCalculator = new PaceCalculator();
    }

    /**
     * Parse AI-generated plan text into structured format
     * @param {string} planText - Raw AI response text
     * @param {object} userProfile - User profile for pace calculations
     * @param {number} startingWeek - Optional: only parse weeks >= this (for regeneration)
     * @returns {object} Structured plan with weeks, workouts, and paces
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
            let weekMatch = null;
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
                        weekMatch = { 1: weekNum, 2: mileage, 3: lastMileageMatch[2] };
                    } else {
                        // No mileage found, but we have a week number
                        weekMatch = { 1: weekNum };
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
}

// Export singleton instance
export default new PlanParser();

