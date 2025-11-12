import React from 'react';
import { useNavigate } from 'react-router-dom';
import { calorieCalculator } from '../lib/calorie-calculator.js';

function TrainingPlanPreview({ userProfile, trainingPlan }) {
  const navigate = useNavigate();

  // Mock expanded plan data to show variety
  const mockExpandedPlan = {
    ...trainingPlan,
    weeks: [
      {
        week: 1, phase: 'base', totalMileage: 15, isRestWeek: false,
        workouts: [
          { day: 'Monday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Tuesday', type: 'tempo', workout: { name: 'Sandwich Tempo', description: 'Tempo effort sandwiched between easy running' }, focus: 'Lactate Threshold', equipmentSpecific: false },
          { day: 'Wednesday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Thursday', type: 'easy', workout: { name: 'Easy Run', description: 'Conversational pace, aerobic base building' }, focus: 'Recovery' },
          { day: 'Friday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Saturday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Sunday', type: 'longRun', workout: { name: 'Conversational Long Run', description: 'Easy long run emphasizing conversational pace' }, focus: 'Endurance' }
        ]
      },
      {
        week: 2, phase: 'base', totalMileage: 18, isRestWeek: false,
        workouts: [
          { day: 'Monday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Tuesday', type: 'hills', workout: { name: 'Long Hill Progression', description: 'Build power on sustained grades' }, focus: 'Power & Strength' },
          { day: 'Wednesday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Thursday', type: 'tempo', workout: { name: 'Classic Tempo Run', description: 'Continuous run at lactate threshold pace' }, focus: 'Lactate Threshold' },
          { day: 'Friday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Saturday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Sunday', type: 'longRun', workout: { name: 'Thirds Progression', description: 'Equal time segments with increasing intensity' }, focus: 'Endurance' }
        ]
      },
      {
        week: 5, phase: 'build', totalMileage: 25, isRestWeek: false,
        workouts: [
          { day: 'Monday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Tuesday', type: 'intervals', workout: { name: '1000m VO2 Max Intervals', description: 'Classic VO2 max development intervals' }, focus: 'VO2 Max & Speed' },
          { day: 'Wednesday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Thursday', type: 'tempo', workout: { name: 'McMillan 2x2 Miles', description: 'Two 2-mile repeats at threshold pace' }, focus: 'Lactate Threshold' },
          { day: 'Friday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Saturday', type: 'rest', workout: { name: 'Rest Day' }, focus: 'Recovery' },
          { day: 'Sunday', type: 'longRun', workout: { name: 'Marathon Pace Long Run', description: 'Extended time at goal marathon pace' }, focus: 'Endurance' }
        ]
      }
    ],
    varietyShowcase: [
      'Sandwich Tempo', 'Long Hill Progression', 'Classic Tempo Run', 'Conversational Long Run',
      'Thirds Progression', '1000m VO2 Max Intervals', 'McMillan 2x2 Miles', 'Marathon Pace Long Run',
      'Hill Strides', 'Cruise Intervals', 'Super Fast Finish', 'Tempo Hills', 'Ladder Intervals',
      'DUSA Progression', 'Cut-Down Intervals', 'Progressive Build Session'
    ]
  };

  // Add equipment-specific workouts if user has equipment
  if (userProfile.standUpBikeType) {
    mockExpandedPlan.weeks[0].workouts[1] = {
      ...mockExpandedPlan.weeks[0].workouts[1],
      type: 'bike',
      workout: {
        name: 'Progressive Build Session',
        description: `${userProfile.standUpBikeType}-specific teardrop/elliptical motion workout`
      },
      equipmentSpecific: true,
      distance: 4 // RunEQ miles
    };

    // Add bike workouts to other weeks for preview
    mockExpandedPlan.weeks[1].workouts[1] = {
      ...mockExpandedPlan.weeks[1].workouts[1],
      type: 'bike',
      equipmentSpecific: true,
      distance: 5
    };

    mockExpandedPlan.weeks[2].workouts[1] = {
      ...mockExpandedPlan.weeks[2].workouts[1],
      type: 'bike',
      equipmentSpecific: true,
      distance: 6
    };
  }

  const getWorkoutTypeColor = (type) => {
    const colors = {
      tempo: '#4299e1',
      intervals: '#e53e3e',
      hills: '#38a169',
      longRun: '#805ad5',
      easy: '#718096',
      rest: '#a0aec0',
      bike: '#FF9500'
    };
    return colors[type] || '#718096';
  };

  const calculateWeekCalories = (week) => {
    let totalCalories = { min: 0, max: 0 };
    const bikeWorkouts = week.workouts?.filter(w =>
      (w.type === 'bike' || w.equipmentSpecific) && w.distance && w.distance > 0
    ) || [];

    bikeWorkouts.forEach(workout => {
      const calories = calorieCalculator.calculateWorkoutCalories(workout);
      if (calories) {
        totalCalories.min += calories.min;
        totalCalories.max += calories.max;
      }
    });

    return { totalCalories, bikeWorkoutCount: bikeWorkouts.length };
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ color: '#AAAAAA', padding: '30px 0' }}>
        <div className="container">
          <h1 style={{ margin: '0 0 16px 0' }}>🎉 Your RunEQ Plan Preview</h1>
          <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>
            See how we've personalized training for your goals and equipment
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '20px 16px' }}>
        {/* Plan Overview */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Your Personalized Plan</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <h3 style={{ color: '#AAAAAA', margin: '0 0 8px 0' }}>Goal</h3>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                {trainingPlan.planOverview.raceDistance} Training
              </p>
            </div>
            <div>
              <h3 style={{ color: '#AAAAAA', margin: '0 0 8px 0' }}>Duration</h3>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                {trainingPlan.planOverview.totalWeeks} weeks
              </p>
            </div>
            <div>
              <h3 style={{ color: '#AAAAAA', margin: '0 0 8px 0' }}>Training Days</h3>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                {trainingPlan.planOverview.runsPerWeek} days/week
              </p>
            </div>
            {userProfile.standUpBikeType && (
              <div>
                <h3 style={{ color: '#AAAAAA', margin: '0 0 8px 0' }}>Equipment</h3>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                  {userProfile.standUpBikeType} optimized
                  <span className="badge badge-success" style={{ marginLeft: '8px' }}>Unique!</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Competitive Advantages Highlight */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#00FF88' }}>🚀 Why Your Plan is Superior</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
              <span><strong>Climate adapted:</strong> Paces adjusted for {userProfile.climate} conditions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
              <span><strong>Workout variety:</strong> {mockExpandedPlan.varietyShowcase.length}+ different workouts vs repetitive formats</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
              <span><strong>Life flexible:</strong> {userProfile.missedWorkoutPreference} approach to missed workouts</span>
            </div>
            {userProfile.standUpBikeType && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
                <span><strong>Equipment specific:</strong> {userProfile.standUpBikeType} motion-optimized workouts</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
              <span><strong>Philosophy aligned:</strong> {userProfile.trainingPhilosophy.replace('_', '/')} training approach</span>
            </div>
          </div>
        </div>

        {/* Sample Weeks */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Sample Training Weeks</h2>
            <p style={{ margin: '8px 0 0 0', color: '#666' }}>See how varied and intelligent your workouts are</p>
          </div>
          
          {mockExpandedPlan.weeks.map((week, index) => {
            const { totalCalories, bikeWorkoutCount } = calculateWeekCalories(week);

            return (
            <div key={week.week} style={{ marginBottom: index < mockExpandedPlan.weeks.length - 1 ? '32px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ margin: 0, color: '#AAAAAA' }}>
                  Week {week.week} - {week.phase.toUpperCase()} Phase
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span className="badge badge-info">{week.totalMileage} miles</span>
                  {bikeWorkoutCount > 0 && (
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(255, 149, 0, 0.15)',
                        color: '#FF9500',
                        border: '1px solid rgba(255, 149, 0, 0.3)',
                        padding: '6px 12px',
                        fontWeight: '600'
                      }}
                    >
                      🔥 {Math.round(totalCalories.min)}-{Math.round(totalCalories.max)} cal
                    </span>
                  )}
                  {week.isRestWeek && <span className="badge badge-warning">Recovery Week</span>}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {week.workouts.filter(w => w.type !== 'rest').map((workout) => (
                  <div 
                    key={workout.day} 
                    className="card" 
                    style={{ 
                      background: workout.equipmentSpecific ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      border: `2px solid ${getWorkoutTypeColor(workout.type)}20`,
                      borderLeft: `4px solid ${getWorkoutTypeColor(workout.type)}`,
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: '#AAAAAA' }}>{workout.day}</h4>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <span 
                          className="badge"
                          style={{ 
                            background: `${getWorkoutTypeColor(workout.type)}20`,
                            color: getWorkoutTypeColor(workout.type),
                            fontSize: '0.7rem'
                          }}
                        >
                          {workout.focus}
                        </span>
                        {workout.equipmentSpecific && (
                          <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                            {userProfile.standUpBikeType}
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{workout.workout.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', lineHeight: 1.4 }}>
                      {workout.workout.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            );
          })}
        </div>

        {/* Workout Variety Showcase */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>🎨 Workout Variety Showcase</h2>
            <p style={{ margin: '8px 0 0 0', color: '#666' }}>No more boring, repetitive training!</p>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ color: '#AAAAAA', marginBottom: '12px' }}>Your Plan Includes:</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {mockExpandedPlan.varietyShowcase.map((workout, index) => (
                <span 
                  key={index}
                  className="badge"
                  style={{ 
                    background: '#ebf8ff',
                    color: '#00D4FF',
                    padding: '6px 12px',
                    fontSize: '0.8rem'
                  }}
                >
                  {workout}
                </span>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(255, 184, 0, 0.1)', border: '1px solid rgba(255, 184, 0, 0.3)' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              <strong>🔥 Compare to Other Apps:</strong> Most training apps repeat the same 5-10 workouts endlessly. 
              Your RunEQ plan includes research-based workouts from McMillan Running, Hal Higdon, Ben Parkes, and Runner's World.
            </p>
          </div>
        </div>

        {/* "Something Else" Feature Preview */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#c05621' }}>🔄 "Something Else" Button</h3>
          <p style={{ marginBottom: '16px', color: '#744210' }}>
            <strong>Tired of rigid apps?</strong> Every workout has our signature "Something Else" button:
          </p>
          
          <div className="card" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', margin: '0 0 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: '600' }}>Today: Tempo Run - 6 miles</span>
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                Something Else
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
              Click to see alternatives based on weather, energy level, time, or just wanting variety!
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <strong style={{ color: '#744210' }}>Feeling Tired:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Easy recovery options</p>
            </div>
            <div>
              <strong style={{ color: '#744210' }}>Too Hot:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Indoor or easier alternatives</p>
            </div>
            <div>
              <strong style={{ color: '#744210' }}>Want Variety:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Different workout types</p>
            </div>
            <div>
              <strong style={{ color: '#744210' }}>Time Crunch:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Shorter, efficient options</p>
            </div>
          </div>
          
          <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', fontStyle: 'italic', color: '#744210' }}>
            And unlike other apps, we COUNT IT PROPERLY in your weekly training load!
          </p>
        </div>

        {/* Call to Action */}
        <div className="card" style={{ textAlign: 'center', background: 'rgba(0, 212, 255, 0.1)', color: '#AAAAAA', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
          <h2 style={{ margin: '0 0 16px 0' }}>Ready to Start Training Smarter?</h2>
          <p style={{ margin: '0 0 24px 0', opacity: 0.9 }}>
            You've seen how RunEQ adapts to YOUR equipment, climate, and lifestyle. 
            No more rigid, one-size-fits-all training!
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
            <button 
              className="btn btn-success btn-full-width"
              onClick={() => navigate('/dashboard')}
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#AAAAAA', fontSize: '1.1rem' }}
            >
              🎯 Start My Training Plan
            </button>
            
            <p style={{ fontSize: '0.9rem', margin: '8px 0 0 0', opacity: 0.8 }}>
              Free preview • Try all features • Subscribe when ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainingPlanPreview;