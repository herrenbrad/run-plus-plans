/**
 * Test cases for Plan Math Calculator
 * Validates formulas work across all plan lengths and ability levels
 */

import { PlanMathCalculator } from './plan-math-calculator.js';

const { generatePlanMath } = PlanMathCalculator;

// Test cases covering the full range
const testCases = [
    // Your plan (the reference case)
    {
        name: '19-week Marathon (Your plan)',
        inputs: { currentWeeklyMileage: 25, currentLongRun: 6, totalWeeks: 19, raceDistance: 'Marathon' },
        expectations: { minPeak: 40, maxPeak: 60, minLongRun: 18, maxLongRun: 23 }
    },
    // Short plans
    {
        name: '12-week Half Marathon (aggressive)',
        inputs: { currentWeeklyMileage: 30, currentLongRun: 8, totalWeeks: 12, raceDistance: 'Half Marathon' },
        expectations: { minPeak: 40, maxPeak: 60, minLongRun: 12, maxLongRun: 16 }
    },
    {
        name: '12-week Marathon (very aggressive)',
        inputs: { currentWeeklyMileage: 35, currentLongRun: 10, totalWeeks: 12, raceDistance: 'Marathon' },
        expectations: { minPeak: 45, maxPeak: 65, minLongRun: 16, maxLongRun: 23 }
    },
    // Medium plans
    {
        name: '16-week Marathon (standard)',
        inputs: { currentWeeklyMileage: 30, currentLongRun: 8, totalWeeks: 16, raceDistance: 'Marathon' },
        expectations: { minPeak: 45, maxPeak: 70, minLongRun: 18, maxLongRun: 23 }
    },
    {
        name: '16-week Half Marathon',
        inputs: { currentWeeklyMileage: 25, currentLongRun: 7, totalWeeks: 16, raceDistance: 'Half Marathon' },
        expectations: { minPeak: 35, maxPeak: 55, minLongRun: 12, maxLongRun: 16 }
    },
    // Long plans
    {
        name: '24-week Marathon (long build)',
        inputs: { currentWeeklyMileage: 25, currentLongRun: 6, totalWeeks: 24, raceDistance: 'Marathon' },
        expectations: { minPeak: 50, maxPeak: 75, minLongRun: 18, maxLongRun: 23 }
    },
    {
        // This tests the edge case: 20 mpw starting is low, but with 30 weeks AND the 20-mile floor
        // the plan will stretch to reach 20 miles (the marathon minimum)
        name: '30-week Marathon (low start - floor ensures 20 miler)',
        inputs: { currentWeeklyMileage: 20, currentLongRun: 5, totalWeeks: 30, raceDistance: 'Marathon' },
        expectations: { minPeak: 35, maxPeak: 50, minLongRun: 20, maxLongRun: 22 } // Floor ensures 20-miler
    },
    {
        // 30-week marathon from higher base - achievable
        name: '30-week Marathon (adequate start)',
        inputs: { currentWeeklyMileage: 35, currentLongRun: 10, totalWeeks: 30, raceDistance: 'Marathon' },
        expectations: { minPeak: 55, maxPeak: 75, minLongRun: 18, maxLongRun: 23 }
    },
    // Different race distances
    {
        name: '12-week 5K',
        inputs: { currentWeeklyMileage: 20, currentLongRun: 5, totalWeeks: 12, raceDistance: '5K' },
        expectations: { minPeak: 28, maxPeak: 45, minLongRun: 6, maxLongRun: 12 }
    },
    {
        name: '16-week 10K',
        inputs: { currentWeeklyMileage: 25, currentLongRun: 6, totalWeeks: 16, raceDistance: '10K' },
        expectations: { minPeak: 35, maxPeak: 55, minLongRun: 8, maxLongRun: 15 }
    },
    // Low fitness starters
    {
        name: '20-week Half (low fitness start)',
        inputs: { currentWeeklyMileage: 15, currentLongRun: 4, totalWeeks: 20, raceDistance: 'Half Marathon' },
        expectations: { minPeak: 25, maxPeak: 50, minLongRun: 10, maxLongRun: 16 }
    },
    // High fitness starters
    {
        name: '16-week Marathon (high fitness)',
        inputs: { currentWeeklyMileage: 50, currentLongRun: 14, totalWeeks: 16, raceDistance: 'Marathon' },
        expectations: { minPeak: 60, maxPeak: 75, minLongRun: 20, maxLongRun: 23 }
    },
    // EXPERIENCE LEVEL TESTS - MARATHON (must have 20 miler regardless of experience)
    {
        name: '19-week Marathon BEGINNER (conservative but still gets 20 miler)',
        inputs: { currentWeeklyMileage: 25, currentLongRun: 6, totalWeeks: 19, raceDistance: 'Marathon', experienceLevel: 'beginner' },
        // Beginner: 80% peak, BUT long run floor is 20 for marathon (non-negotiable)
        expectations: { minPeak: 38, maxPeak: 45, minLongRun: 20, maxLongRun: 22 }
    },
    {
        name: '19-week Marathon INTERMEDIATE (standard)',
        inputs: { currentWeeklyMileage: 25, currentLongRun: 6, totalWeeks: 19, raceDistance: 'Marathon', experienceLevel: 'intermediate' },
        // Intermediate: 100% peak (51), 100% long run (18) but floor is 20
        expectations: { minPeak: 48, maxPeak: 55, minLongRun: 20, maxLongRun: 22 }
    },
    {
        name: '19-week Marathon ADVANCED (aggressive)',
        inputs: { currentWeeklyMileage: 25, currentLongRun: 6, totalWeeks: 19, raceDistance: 'Marathon', experienceLevel: 'advanced' },
        // Advanced: 115% peak (51*1.15=59), 110% long run (18*1.1=20)
        expectations: { minPeak: 55, maxPeak: 65, minLongRun: 20, maxLongRun: 23 }
    },
    // EXPERIENCE LEVEL TESTS - HALF MARATHON
    {
        name: '16-week Half BEGINNER',
        inputs: { currentWeeklyMileage: 20, currentLongRun: 5, totalWeeks: 16, raceDistance: 'Half Marathon', experienceLevel: 'beginner' },
        // Beginner: 80% peak, long run floor is 12 for half
        expectations: { minPeak: 30, maxPeak: 40, minLongRun: 12, maxLongRun: 14 }
    },
    {
        name: '16-week Half ADVANCED',
        inputs: { currentWeeklyMileage: 20, currentLongRun: 5, totalWeeks: 16, raceDistance: 'Half Marathon', experienceLevel: 'advanced' },
        // Advanced: 115% peak (38*1.15=44), 110% long run capped by floor of 12
        expectations: { minPeak: 40, maxPeak: 50, minLongRun: 12, maxLongRun: 15 }
    },
    // EXPERIENCE LEVEL TESTS - 10K
    {
        name: '12-week 10K BEGINNER',
        inputs: { currentWeeklyMileage: 15, currentLongRun: 4, totalWeeks: 12, raceDistance: '10K', experienceLevel: 'beginner' },
        // Beginner: 80% peak, long run floor is 7 for 10K
        expectations: { minPeak: 20, maxPeak: 30, minLongRun: 7, maxLongRun: 10 }
    },
    // EXPERIENCE LEVEL TESTS - 5K
    {
        name: '10-week 5K BEGINNER',
        inputs: { currentWeeklyMileage: 12, currentLongRun: 3, totalWeeks: 10, raceDistance: '5K', experienceLevel: 'beginner' },
        // Beginner: 80% peak (18*0.8=14), long run floor is 5 for 5K
        // Very short plan with low starting point - constrained
        expectations: { minPeak: 12, maxPeak: 20, minLongRun: 5, maxLongRun: 8 }
    }
];

function runTests() {
    console.log('=' .repeat(80));
    console.log('PLAN MATH CALCULATOR TEST SUITE');
    console.log('=' .repeat(80));

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        console.log(`\n--- ${testCase.name} ---`);
        console.log(`Inputs: ${testCase.inputs.currentWeeklyMileage} mpw, ${testCase.inputs.currentLongRun} mi long run, ${testCase.inputs.totalWeeks} weeks, ${testCase.inputs.raceDistance}`);

        try {
            const result = generatePlanMath(testCase.inputs);

            const peak = result.targets.peakWeeklyMileage;
            const longRunMax = result.targets.longRunMax;

            console.log(`Results: Peak=${peak} mpw, LongRunMax=${longRunMax} mi`);

            // Check expectations
            const peakOk = peak >= testCase.expectations.minPeak && peak <= testCase.expectations.maxPeak;
            const longRunOk = longRunMax >= testCase.expectations.minLongRun && longRunMax <= testCase.expectations.maxLongRun;

            if (peakOk && longRunOk) {
                console.log('✓ PASS');
                passed++;
            } else {
                console.log(`✗ FAIL: Expected peak ${testCase.expectations.minPeak}-${testCase.expectations.maxPeak}, got ${peak}`);
                console.log(`        Expected longRun ${testCase.expectations.minLongRun}-${testCase.expectations.maxLongRun}, got ${longRunMax}`);
                failed++;
            }

            // Print weekly progression
            console.log(`Weekly mileage: ${result.weeks.map(w => w.weeklyMileage).join(', ')}`);
            console.log(`Long runs: ${result.weeks.map(w => w.longRun).join(', ')}`);

        } catch (error) {
            console.log(`✗ ERROR: ${error.message}`);
            failed++;
        }
    }

    console.log('\n' + '=' .repeat(80));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('=' .repeat(80));

    return failed === 0;
}

// Run tests
runTests();
