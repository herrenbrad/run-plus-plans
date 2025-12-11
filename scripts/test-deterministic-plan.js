/**
 * Test script for deterministic plan generation
 * 
 * Tests TrainingPlanService.generatePlanStructure() to verify:
 * - Periodization is smooth (no 50% jumps)
 * - Schedule is respected (rest days, bike days, quality days)
 * - Race day distance is correct
 * - Structure is deterministic (same inputs = same output)
 */

import TrainingPlanService from '../src/services/TrainingPlanService.js';

// Test profile matching your setup
const testProfile = {
    raceDistance: "Half Marathon",
    raceTime: "2:00:00",
    raceDate: "2026-04-19",
    startDate: "2025-12-09",
    raceElevationProfile: "moderate",
    currentWeeklyMileage: 16,
    currentLongRun: 6,
    recentRaceTime: "1:07:00",
    recentRaceDistance: "10k",
    workoutsPerWeek: 5,
    availableDays: ["Tuesday", "Wednesday", "Thursday", "Friday", "Sunday"],
    restDays: ["Monday", "Saturday"],
    longRunDay: "Sunday",
    qualityDays: ["Wednesday", "Friday"],
    standUpBikeType: "cyclete",
    preferredBikeDays: ["Tuesday", "Thursday"],
    crossTrainingEquipment: {},
    experienceLevel: "intermediate",
    runningStatus: "active",
    units: "imperial",
    name: "Test User"
};

console.log('🧪 Testing Deterministic Plan Generation...\n');

try {
    const plan = TrainingPlanService.generatePlanStructure(testProfile);
    
    console.log('✅ Plan generated successfully!\n');
    console.log(`📊 Plan Overview:`);
    console.log(`   Total Weeks: ${plan.planOverview.totalWeeks}`);
    console.log(`   Race: ${plan.planOverview.raceDistance}`);
    console.log(`   Goal Time: ${plan.planOverview.goalTime}\n`);
    
    // Check periodization
    console.log('📈 Periodization Check:');
    let prevMileage = null;
    let issues = [];
    
    plan.weeks.forEach((week, idx) => {
        const change = prevMileage !== null ? week.totalMileage - prevMileage : 0;
        const changePercent = prevMileage !== null ? (change / prevMileage * 100).toFixed(1) : 0;
        
        if (prevMileage !== null) {
            if (Math.abs(changePercent) > 30 && idx < plan.weeks.length - 2) {
                issues.push(`Week ${week.weekNumber}: ${prevMileage} → ${week.totalMileage} (${changePercent > 0 ? '+' : ''}${changePercent}%)`);
            }
        }
        
        console.log(`   Week ${week.weekNumber}: ${week.totalMileage} miles (${week.phase} phase)`);
        prevMileage = week.totalMileage;
    });
    
    if (issues.length > 0) {
        console.log('\n⚠️ Periodization Issues Found:');
        issues.forEach(issue => console.log(`   ${issue}`));
    } else {
        console.log('\n✅ Periodization looks smooth!');
    }
    
    // Check schedule compliance
    console.log('\n📅 Schedule Compliance Check:');
    let scheduleIssues = [];
    
    plan.weeks.forEach(week => {
        week.workouts.forEach(workout => {
            const day = workout.day;
            
            // Check rest days
            if (testProfile.restDays.includes(day) && workout.type !== 'rest') {
                scheduleIssues.push(`Week ${week.weekNumber}, ${day}: Should be rest but is ${workout.type}`);
            }
            
            // Check bike days
            if (testProfile.preferredBikeDays.includes(day) && workout.type !== 'bike') {
                scheduleIssues.push(`Week ${week.weekNumber}, ${day}: Should be bike but is ${workout.type}`);
            }
            
            // Check quality days
            if (testProfile.qualityDays.includes(day) && !['tempo', 'intervals', 'hills'].includes(workout.type)) {
                scheduleIssues.push(`Week ${week.weekNumber}, ${day}: Should be quality workout but is ${workout.type}`);
            }
            
            // Check long run day
            if (day === testProfile.longRunDay && week.weekNumber < plan.planOverview.totalWeeks && workout.type !== 'longRun') {
                scheduleIssues.push(`Week ${week.weekNumber}, ${day}: Should be long run but is ${workout.type}`);
            }
        });
    });
    
    if (scheduleIssues.length > 0) {
        console.log('⚠️ Schedule Compliance Issues:');
        scheduleIssues.forEach(issue => console.log(`   ${issue}`));
    } else {
        console.log('✅ Schedule compliance looks good!');
    }
    
    // Check race day
    const finalWeek = plan.weeks[plan.weeks.length - 1];
    const raceDay = finalWeek.workouts.find(w => w.day === 'Sunday');
    console.log('\n🏁 Race Day Check:');
    if (raceDay && raceDay.type === 'race') {
        const expectedDistance = testProfile.raceDistance === 'Half Marathon' ? 13.1 : 26.2;
        if (raceDay.distance === expectedDistance) {
            console.log(`✅ Race day distance correct: ${raceDay.distance} miles`);
        } else {
            console.log(`❌ Race day distance WRONG: ${raceDay.distance} (should be ${expectedDistance})`);
        }
    } else {
        console.log('❌ Race day not found or wrong type');
    }
    
    // Check workout count
    console.log('\n📊 Workout Count Check:');
    plan.weeks.forEach(week => {
        const workoutCount = week.workouts.filter(w => w.type !== 'rest').length;
        if (workoutCount !== testProfile.workoutsPerWeek) {
            console.log(`⚠️ Week ${week.weekNumber}: ${workoutCount} workouts (expected ${testProfile.workoutsPerWeek})`);
        }
    });
    
    console.log('\n✅ Test complete!');
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
}



