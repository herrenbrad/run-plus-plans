/**
 * Test for modular Plan Math Calculator
 * Run with: node --experimental-vm-modules src/lib/plan-math/test.js
 */

import { PlanMathCalculator } from './index.js';

const { generatePlanMath, getRaceParams, getAvailableRaces } = PlanMathCalculator;

console.log('=' .repeat(80));
console.log('MODULAR PLAN MATH CALCULATOR TEST');
console.log('=' .repeat(80));

// Test available races
console.log('\nAvailable races:', getAvailableRaces());

// Test race params
console.log('\n--- Race Parameters ---');
for (const race of getAvailableRaces()) {
    const params = getRaceParams(race);
    console.log(`${race}:`);
    console.log(`  Peak cap: ${params.peakWeeklyMileageCap} mpw`);
    console.log(`  Long run max: ${params.longRunMax} mi`);
    console.log(`  Long run floor: ${params.longRunFloor} mi`);
}

// Test cases
const testCases = [
    // Marathon tests (must have 20 miler)
    {
        name: '19-week Marathon BEGINNER',
        inputs: { currentWeeklyMileage: 25, currentLongRun: 6, totalWeeks: 19, raceDistance: 'Marathon', experienceLevel: 'beginner' },
        expectations: { minLongRun: 20 }  // Must have 20-miler regardless of experience
    },
    {
        name: '19-week Marathon INTERMEDIATE',
        inputs: { currentWeeklyMileage: 25, currentLongRun: 6, totalWeeks: 19, raceDistance: 'Marathon', experienceLevel: 'intermediate' },
        expectations: { minLongRun: 20 }
    },
    {
        name: '19-week Marathon ADVANCED',
        inputs: { currentWeeklyMileage: 25, currentLongRun: 6, totalWeeks: 19, raceDistance: 'Marathon', experienceLevel: 'advanced' },
        expectations: { minLongRun: 20 }
    },
    // Half Marathon tests
    {
        name: '16-week Half Marathon',
        inputs: { currentWeeklyMileage: 20, currentLongRun: 5, totalWeeks: 16, raceDistance: 'Half Marathon', experienceLevel: 'intermediate' },
        expectations: { minLongRun: 12 }  // Floor is 12 for half
    },
    // 10K test
    {
        name: '12-week 10K',
        inputs: { currentWeeklyMileage: 20, currentLongRun: 5, totalWeeks: 12, raceDistance: '10K', experienceLevel: 'intermediate' },
        expectations: { minLongRun: 7 }  // Floor is 7 for 10K
    },
    // 5K test
    {
        name: '10-week 5K',
        inputs: { currentWeeklyMileage: 15, currentLongRun: 4, totalWeeks: 10, raceDistance: '5K', experienceLevel: 'intermediate' },
        expectations: { minLongRun: 5 }  // Floor is 5 for 5K
    }
];

let passed = 0;
let failed = 0;

console.log('\n--- Test Results ---');
for (const test of testCases) {
    console.log(`\n${test.name}:`);
    try {
        const result = generatePlanMath(test.inputs);

        const maxLongRun = Math.max(...result.weeks.map(w => w.longRun));
        const peak = result.targets.peakWeeklyMileage;

        console.log(`  Peak: ${peak} mpw`);
        console.log(`  Long Run Max: ${result.targets.longRunMax} mi`);
        console.log(`  Max Long Run in Plan: ${maxLongRun} mi`);

        if (maxLongRun >= test.expectations.minLongRun) {
            console.log(`  ✓ PASS (meets minimum of ${test.expectations.minLongRun} mi)`);
            passed++;
        } else {
            console.log(`  ✗ FAIL (expected min ${test.expectations.minLongRun} mi, got ${maxLongRun} mi)`);
            failed++;
        }

        // Print progression
        console.log(`  Long runs: ${result.weeks.map(w => w.longRun).join(', ')}`);
    } catch (error) {
        console.log(`  ✗ ERROR: ${error.message}`);
        failed++;
    }
}

console.log('\n' + '=' .repeat(80));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('=' .repeat(80));

process.exit(failed > 0 ? 1 : 0);
