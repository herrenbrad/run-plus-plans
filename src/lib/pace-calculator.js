/**
 * Run+ Training Pace Calculator
 * Based on Jack Daniels' VDOT System
 * Uses real VDOT pace data with interpolation for goal times between data points
 */

import { trainingPaceData, paceToSeconds, secondsToPace } from './vdot-pace-data.js';

class PaceCalculator {
    constructor() {
        // Distance mapping for human-readable input to data keys
        this.distanceMap = {
            '10K': '10K',
            '10k': '10K',
            '10 K': '10K',
            'Marathon': 'marathon',
            'marathon': 'marathon',
            'MARATHON': 'marathon',
            'Half Marathon': 'halfMarathon',
            'Half': 'halfMarathon',
            'half': 'halfMarathon',
            'halfMarathon': 'halfMarathon',
            'HalfMarathon': 'halfMarathon'
        };

        // Valid ranges for each distance
        this.validRanges = {
            '10K': { min: "30:00", max: "90:00" },
            marathon: { min: "2:00:00", max: "6:00:00" },
            halfMarathon: { min: "1:00:00", max: "3:00:00" }
        };
    }

    /**
     * Convert time string (H:MM:SS or MM:SS) to total seconds
     */
    timeToSeconds(timeString) {
        const parts = timeString.split(':').map(Number);
        if (parts.length === 2) {
            // MM:SS format
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            // H:MM:SS format
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        throw new Error('Invalid time format. Use MM:SS or H:MM:SS');
    }

    /**
     * Convert seconds to time string (H:MM:SS)
     */
    secondsToTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.round(seconds % 60);
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Normalize distance input to internal key
     */
    normalizeDistance(distance) {
        const normalized = this.distanceMap[distance];
        if (!normalized) {
            throw new Error(`Unsupported race distance: ${distance}. Use 'Marathon' or 'Half Marathon'`);
        }
        return normalized;
    }

    /**
     * Check if goal time is within valid range for distance
     */
    isWithinRange(distance, goalTimeSeconds) {
        const range = this.validRanges[distance];
        const minSeconds = this.timeToSeconds(range.min);
        const maxSeconds = this.timeToSeconds(range.max);
        return goalTimeSeconds >= minSeconds && goalTimeSeconds <= maxSeconds;
    }

    /**
     * Get range message for distance
     */
    getRangeMessage(distance) {
        const range = this.validRanges[distance];
        const distanceName = distance === 'marathon' ? 'Marathon' : 'Half Marathon';
        return `Training plans are designed for ${distanceName} times between ${range.min} and ${range.max}. ` +
               `For goals outside this range, please reach out to the developer for additional support.`;
    }

    /**
     * Find exact match in VDOT data
     */
    findExactMatch(distance, goalTime) {
        const data = trainingPaceData[distance];
        if (!data) return null;
        return data.find(entry => entry.goalTime === goalTime) || null;
    }

    /**
     * Find surrounding data points for interpolation
     */
    findSurroundingPoints(distance, goalTimeSeconds) {
        const data = trainingPaceData[distance];
        if (!data) return null;

        // Convert all goal times to seconds and sort
        const sortedData = data
            .map(entry => ({
                ...entry,
                seconds: this.timeToSeconds(entry.goalTime)
            }))
            .sort((a, b) => a.seconds - b.seconds);

        // Find the closest points above and below
        let lowerPoint = null;
        let upperPoint = null;

        for (let i = 0; i < sortedData.length; i++) {
            if (sortedData[i].seconds <= goalTimeSeconds) {
                lowerPoint = sortedData[i];
            }
            if (sortedData[i].seconds >= goalTimeSeconds && !upperPoint) {
                upperPoint = sortedData[i];
                break;
            }
        }

        if (!lowerPoint || !upperPoint) return null;
        return { lowerPoint, upperPoint };
    }

    /**
     * Interpolate a pace value between two data points
     */
    interpolatePace(lowerPace, upperPace, ratio) {
        const lowerSeconds = paceToSeconds(lowerPace);
        const upperSeconds = paceToSeconds(upperPace);
        const interpolatedSeconds = lowerSeconds + (upperSeconds - lowerSeconds) * ratio;
        return secondsToPace(interpolatedSeconds);
    }

    /**
     * Interpolate pace data between two goal times
     */
    interpolatePaceData(distance, goalTime, goalTimeSeconds) {
        const points = this.findSurroundingPoints(distance, goalTimeSeconds);

        if (!points) {
            throw new Error(`Unable to find data points for interpolation`);
        }

        const { lowerPoint, upperPoint } = points;

        // If they're the same point, return it directly
        if (lowerPoint.goalTime === upperPoint.goalTime) {
            return {
                goalTime: goalTime,
                paces: lowerPoint.paces,
                trackIntervals: lowerPoint.trackIntervals,
                interpolated: false
            };
        }

        // Calculate interpolation ratio
        const totalDiff = upperPoint.seconds - lowerPoint.seconds;
        const goalDiff = goalTimeSeconds - lowerPoint.seconds;
        const ratio = goalDiff / totalDiff;

        // Interpolate all pace values
        const interpolatedPaces = {
            easy: {
                min: this.interpolatePace(lowerPoint.paces.easy.min, upperPoint.paces.easy.min, ratio),
                max: this.interpolatePace(lowerPoint.paces.easy.max, upperPoint.paces.easy.max, ratio),
                km: lowerPoint.paces.easy.km // Keep km as-is for now
            },
            marathon: {
                pace: this.interpolatePace(lowerPoint.paces.marathon.pace, upperPoint.paces.marathon.pace, ratio),
                km: lowerPoint.paces.marathon.km
            },
            threshold: {
                pace: this.interpolatePace(lowerPoint.paces.threshold.pace, upperPoint.paces.threshold.pace, ratio),
                km: lowerPoint.paces.threshold.km
            },
            interval: {
                pace: this.interpolatePace(lowerPoint.paces.interval.pace, upperPoint.paces.interval.pace, ratio),
                km: lowerPoint.paces.interval.km
            }
        };

        // Interpolate track intervals
        const interpolatedIntervals = {
            threshold: {},
            interval: {}
        };

        for (const [distance, time] of Object.entries(lowerPoint.trackIntervals.threshold)) {
            interpolatedIntervals.threshold[distance] = this.interpolatePace(
                lowerPoint.trackIntervals.threshold[distance],
                upperPoint.trackIntervals.threshold[distance],
                ratio
            );
        }

        for (const [distance, time] of Object.entries(lowerPoint.trackIntervals.interval)) {
            interpolatedIntervals.interval[distance] = this.interpolatePace(
                lowerPoint.trackIntervals.interval[distance],
                upperPoint.trackIntervals.interval[distance],
                ratio
            );
        }

        return {
            goalTime: goalTime,
            paces: interpolatedPaces,
            trackIntervals: interpolatedIntervals,
            interpolated: true,
            interpolatedBetween: {
                lower: lowerPoint.goalTime,
                upper: upperPoint.goalTime
            }
        };
    }

    /**
     * Get pace data for a specific goal time
     * Returns exact match or interpolated data
     */
    getPaceData(distance, goalTime) {
        const normalizedDistance = this.normalizeDistance(distance);
        const goalTimeSeconds = this.timeToSeconds(goalTime);

        // Check if within valid range
        if (!this.isWithinRange(normalizedDistance, goalTimeSeconds)) {
            throw new Error(this.getRangeMessage(normalizedDistance));
        }

        // Try exact match first
        const exactMatch = this.findExactMatch(normalizedDistance, goalTime);
        if (exactMatch) {
            return {
                ...exactMatch,
                interpolated: false
            };
        }

        // Interpolate between closest points
        return this.interpolatePaceData(normalizedDistance, goalTime, goalTimeSeconds);
    }

    /**
     * Calculate training paces from a goal race time
     * Main API function for the application
     */
    calculateFromGoal(distance, goalTime) {
        try {
            const paceData = this.getPaceData(distance, goalTime);

            return {
                distance: distance,
                goalTime: goalTime,
                paces: {
                    easy: {
                        pace: `${paceData.paces.easy.min}-${paceData.paces.easy.max}`,
                        min: paceData.paces.easy.min,
                        max: paceData.paces.easy.max,
                        description: 'Easy/Recovery runs',
                        heartRate: '65-79% max HR'
                    },
                    marathon: {
                        pace: paceData.paces.marathon.pace,
                        description: 'Marathon race pace',
                        heartRate: '80-85% max HR'
                    },
                    threshold: {
                        pace: paceData.paces.threshold.pace,
                        description: 'Tempo/Threshold runs',
                        heartRate: '86-90% max HR'
                    },
                    interval: {
                        pace: paceData.paces.interval.pace,
                        description: 'VO2 Max intervals (3-8 min)',
                        heartRate: '95-100% max HR'
                    }
                },
                trackIntervals: paceData.trackIntervals,
                interpolated: paceData.interpolated,
                ...(paceData.interpolated && {
                    interpolatedBetween: paceData.interpolatedBetween
                })
            };
        } catch (error) {
            throw new Error(`Pace calculation failed: ${error.message}`);
        }
    }

    /**
     * Estimate current VDOT from long run distance and weekly mileage
     * Conservative estimation for safe training prescription
     */
    estimateCurrentVDOT(currentLongRunDistance, currentWeeklyMileage) {
        // Use long run distance as primary indicator (more reliable than weekly mileage)
        let estimatedVDOT = 30; // Conservative baseline

        if (!currentLongRunDistance || currentLongRunDistance <= 0) {
            // No long run data - use weekly mileage as fallback
            if (currentWeeklyMileage >= 40) estimatedVDOT = 40;
            else if (currentWeeklyMileage >= 30) estimatedVDOT = 35;
            else if (currentWeeklyMileage >= 20) estimatedVDOT = 32;
            else estimatedVDOT = 30;
        } else {
            // Estimate from long run distance (conservative)
            // Logic: Long run capability correlates with aerobic fitness
            if (currentLongRunDistance >= 18) estimatedVDOT = 42;
            else if (currentLongRunDistance >= 15) estimatedVDOT = 40;
            else if (currentLongRunDistance >= 13) estimatedVDOT = 38;
            else if (currentLongRunDistance >= 10) estimatedVDOT = 36;
            else if (currentLongRunDistance >= 8) estimatedVDOT = 34;
            else if (currentLongRunDistance >= 6) estimatedVDOT = 32;
            else estimatedVDOT = 30;

            // Adjust based on weekly mileage (secondary factor)
            if (currentWeeklyMileage >= 50) estimatedVDOT += 2;
            else if (currentWeeklyMileage < 20) estimatedVDOT -= 2;
        }

        return Math.max(25, Math.min(55, estimatedVDOT)); // Clamp between 25-55
    }

    /**
     * Estimate current race time from VDOT for a given distance
     * Returns time in H:MM:SS or MM:SS format
     */
    estimateRaceTimeFromVDOT(vdot, distance) {
        // Approximate race times by VDOT (from Daniels' tables)
        const vdotToRaceTimes = {
            25: { '10K': '65:00', halfMarathon: '2:35:00', marathon: '5:30:00' },
            30: { '10K': '58:00', halfMarathon: '2:15:00', marathon: '4:45:00' },
            32: { '10K': '55:00', halfMarathon: '2:08:00', marathon: '4:30:00' },
            34: { '10K': '52:00', halfMarathon: '2:02:00', marathon: '4:15:00' },
            36: { '10K': '49:30', halfMarathon: '1:56:00', marathon: '4:02:00' },
            38: { '10K': '47:00', halfMarathon: '1:50:00', marathon: '3:50:00' },
            40: { '10K': '45:00', halfMarathon: '1:45:00', marathon: '3:40:00' },
            42: { '10K': '43:00', halfMarathon: '1:40:00', marathon: '3:30:00' },
            45: { '10K': '40:30', halfMarathon: '1:33:00', marathon: '3:15:00' },
            50: { '10K': '37:00', halfMarathon: '1:23:00', marathon: '2:55:00' }
        };

        // Find closest VDOT
        const vdots = Object.keys(vdotToRaceTimes).map(Number).sort((a, b) => a - b);
        let closestVDOT = vdots[0];
        for (const v of vdots) {
            if (Math.abs(v - vdot) < Math.abs(closestVDOT - vdot)) {
                closestVDOT = v;
            }
        }

        const normalizedDistance = this.normalizeDistance(distance);
        return vdotToRaceTimes[closestVDOT][normalizedDistance] || '2:00:00';
    }

    /**
     * Calculate current fitness paces from long run and weekly mileage
     * Returns same format as calculateFromGoal()
     */
    calculateFromCurrentFitness(currentLongRunDistance, currentWeeklyMileage, goalDistance) {
        const estimatedVDOT = this.estimateCurrentVDOT(currentLongRunDistance, currentWeeklyMileage);
        const estimatedTime = this.estimateRaceTimeFromVDOT(estimatedVDOT, goalDistance);

        console.log(`📊 Estimated current fitness: VDOT ${estimatedVDOT} = ${goalDistance} in ${estimatedTime}`);

        // Use existing VDOT pace calculator with estimated time
        return this.calculateFromGoal(goalDistance, estimatedTime);
    }

    /**
     * Create progressive pace blend between current and goal paces
     * weekNumber: 1 to totalWeeks
     * Returns blended pace object
     */
    blendPaces(currentPaces, goalPaces, weekNumber, totalWeeks) {
        // Calculate blend ratio
        // Week 1 = 100% current (ratio = 0.0)
        // Final week = 100% goal (ratio = 1.0)
        // Linear progression with slight plateau at start and end
        const rawRatio = (weekNumber - 1) / (totalWeeks - 1);

        // Apply sigmoid curve for smoother progression
        // More time at current paces early, accelerate mid-plan
        const ratio = this.smoothProgressionCurve(rawRatio);

        const blend = (current, goal) => {
            const currentSec = paceToSeconds(current);
            const goalSec = paceToSeconds(goal);
            const blendedSec = currentSec - (currentSec - goalSec) * ratio;
            return secondsToPace(blendedSec);
        };

        const blendRange = (currentMin, currentMax, goalMin, goalMax) => {
            return {
                min: blend(currentMin, goalMin),
                max: blend(currentMax, goalMax)
            };
        };

        const currentPaceData = currentPaces.paces || currentPaces;
        const goalPaceData = goalPaces.paces || goalPaces;

        return {
            paces: {
                easy: blendRange(
                    currentPaceData.easy.min,
                    currentPaceData.easy.max,
                    goalPaceData.easy.min,
                    goalPaceData.easy.max
                ),
                marathon: {
                    pace: blend(currentPaceData.marathon.pace, goalPaceData.marathon.pace)
                },
                threshold: {
                    pace: blend(currentPaceData.threshold.pace, goalPaceData.threshold.pace)
                },
                interval: {
                    pace: blend(currentPaceData.interval.pace, goalPaceData.interval.pace)
                }
            },
            progressionRatio: ratio,
            weekNumber: weekNumber,
            totalWeeks: totalWeeks
        };
    }

    /**
     * Smooth progression curve (sigmoid-like)
     * Input: 0.0 to 1.0
     * Output: 0.0 to 1.0 with smoother acceleration
     */
    smoothProgressionCurve(x) {
        // Stay closer to current paces for first 30% of plan
        // Accelerate in middle 40%
        // Approach goal paces in final 30%
        if (x < 0.3) {
            return x * 0.5; // Slow progression early (0.0 to 0.15)
        } else if (x < 0.7) {
            return 0.15 + (x - 0.3) * 1.5; // Faster progression mid-plan (0.15 to 0.75)
        } else {
            return 0.75 + (x - 0.7) * 0.833; // Smooth approach to goal (0.75 to 1.0)
        }
    }

    /**
     * Calculate stand-up bike / ElliptiGO equivalent distance
     * For easy run replacement workouts
     */
    calculateRunEqDistance(easyRunMiles) {
        // Stand-up bike conversion factor: 2.0x for easy effort
        const runEqFactor = 2.0;
        const bikeDistance = easyRunMiles * runEqFactor;

        return {
            runDistance: easyRunMiles,
            bikeDistance: bikeDistance,
            factor: runEqFactor,
            description: `Ride ${bikeDistance} miles on stand-up bike (${runEqFactor}x run equivalent)`
        };
    }

    /**
     * Get all available goal times for a distance
     */
    getAvailableGoalTimes(distance) {
        const normalizedDistance = this.normalizeDistance(distance);
        const data = trainingPaceData[normalizedDistance];
        if (!data) return [];
        return data.map(entry => entry.goalTime);
    }
}

// Export for ES modules and CommonJS
export { PaceCalculator };

// Fallback for CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PaceCalculator };
}
