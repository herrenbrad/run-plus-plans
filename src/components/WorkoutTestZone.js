/**
 * TESTING ZONE - DELETE WHEN DONE
 *
 * Proving the simple approach:
 * 1. Get workout from library
 * 2. Inject paces
 * 3. Render
 *
 * That's it. No transformers, no enrichers, no field name gymnastics.
 */

import React, { useState } from 'react';
import { HillWorkoutLibrary } from '../lib/hill-workout-library';
import { TempoWorkoutLibrary } from '../lib/tempo-workout-library';
import { IntervalWorkoutLibrary } from '../lib/interval-workout-library';
import { LongRunWorkoutLibrary } from '../lib/long-run-workout-library';

// Simple pace lookup - this is all you need
const samplePaces = {
  easy: { min: '9:30', max: '10:15' },
  threshold: { pace: '8:00' },
  interval: { pace: '7:15' },
  marathon: { pace: '8:30' }
};

// One function. Gets workout. Done.
function getWorkoutFromLibrary(type, workoutName) {
  const libraries = {
    hill: new HillWorkoutLibrary(),
    tempo: new TempoWorkoutLibrary(),
    interval: new IntervalWorkoutLibrary(),
    longRun: new LongRunWorkoutLibrary()
  };

  const lib = libraries[type];
  if (!lib) return null;

  // Each library has a prescribe method - use it directly
  switch (type) {
    case 'hill':
      return lib.prescribeHillWorkout(workoutName, { paces: samplePaces });
    case 'tempo':
      return lib.prescribeTempoWorkout(workoutName, { paces: samplePaces });
    case 'interval':
      return lib.prescribeIntervalWorkout(workoutName, { paces: samplePaces });
    case 'longRun':
      return lib.prescribeLongRunWorkout(workoutName, { paces: samplePaces });
    default:
      return null;
  }
}

// Simple renderer - no 400 lines of transformation
function SimpleWorkoutCard({ workout }) {
  if (!workout) return <div style={styles.error}>Workout not found</div>;

  // Handle both nested (workout.workout.warmup) and flat (workout.warmup) structures
  const structure = workout.workout || workout;
  const hasStructuredWorkout = structure.warmup || structure.main;

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>{workout.name}</h2>

      {workout.focus && (
        <div style={styles.focus}>{workout.focus}</div>
      )}

      {workout.duration && (
        <div style={styles.duration}>Duration: {workout.duration}</div>
      )}

      {hasStructuredWorkout ? (
        <div style={styles.structure}>
          {structure.warmup && (
            <div style={styles.section}>
              <strong>Warmup:</strong> {structure.warmup}
            </div>
          )}
          {structure.main && (
            <div style={styles.section}>
              <strong>Main Set:</strong> {structure.main}
            </div>
          )}
          {structure.recovery && (
            <div style={styles.section}>
              <strong>Recovery:</strong> {structure.recovery}
            </div>
          )}
          {structure.cooldown && (
            <div style={styles.section}>
              <strong>Cooldown:</strong> {structure.cooldown}
            </div>
          )}
        </div>
      ) : workout.structure ? (
        <div style={styles.structure}>
          <strong>Structure:</strong> {workout.structure}
        </div>
      ) : null}

      {workout.hillRequirement && (
        <div style={styles.terrain}>
          <strong>Hill Required:</strong> {workout.hillRequirement.description}
        </div>
      )}

      {workout.paces && (
        <div style={styles.paces}>
          <strong>Your Paces:</strong>
          <ul>
            {workout.paces.easy && <li>Easy: {workout.paces.easy.min}-{workout.paces.easy.max}/mi</li>}
            {workout.paces.threshold && <li>Threshold: {workout.paces.threshold.pace}/mi</li>}
            {workout.paces.interval && <li>Interval: {workout.paces.interval.pace}/mi</li>}
          </ul>
        </div>
      )}

      {/* Debug: Show raw data */}
      <details style={styles.debug}>
        <summary>Raw Data (click to expand)</summary>
        <pre>{JSON.stringify(workout, null, 2)}</pre>
      </details>
    </div>
  );
}

// The test zone component
export default function WorkoutTestZone() {
  const [selectedType, setSelectedType] = useState('hill');
  const [selectedWorkout, setSelectedWorkout] = useState('Hill Strides');

  const workoutOptions = {
    hill: ['Hill Strides', 'Classic Hill Repeats', 'Hill Pyramid', 'Stadium Steps Simulation'],
    tempo: ['Classic Tempo', 'Cruise Intervals', 'Tempo Sandwich', 'Progressive Tempo'],
    interval: ['Classic 400s', 'Ladder Workout', '800m Repeats', 'Mile Repeats'],
    longRun: ['Easy Long Run', 'Progressive Long Run', 'Marathon Pace Long Run', 'Fast Finish Long Run']
  };

  const workout = getWorkoutFromLibrary(selectedType, selectedWorkout);

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Workout Test Zone</h1>
      <p style={styles.subtitle}>Proving the simple approach works. Delete this file when done.</p>

      <div style={styles.controls}>
        <label>
          Type:
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setSelectedWorkout(workoutOptions[e.target.value][0]);
            }}
            style={styles.select}
          >
            <option value="hill">Hill</option>
            <option value="tempo">Tempo</option>
            <option value="interval">Interval</option>
            <option value="longRun">Long Run</option>
          </select>
        </label>

        <label>
          Workout:
          <select
            value={selectedWorkout}
            onChange={(e) => setSelectedWorkout(e.target.value)}
            style={styles.select}
          >
            {workoutOptions[selectedType].map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      <SimpleWorkoutCard workout={workout} />

      <div style={styles.codeBlock}>
        <h3>This is ALL the code needed:</h3>
        <pre>{`
const workout = library.prescribeWorkout(name, { paces });
// workout now has everything - structure, paces, terrain
// Just render it.
        `}</pre>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    color: '#e74c3c',
    borderBottom: '2px solid #e74c3c',
    paddingBottom: '10px'
  },
  subtitle: {
    color: '#666',
    fontStyle: 'italic'
  },
  controls: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px'
  },
  select: {
    marginLeft: '10px',
    padding: '8px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '1px solid #ccc'
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  title: {
    margin: '0 0 10px 0',
    color: '#2c3e50'
  },
  focus: {
    color: '#e74c3c',
    fontWeight: '600',
    marginBottom: '10px'
  },
  duration: {
    color: '#666',
    marginBottom: '15px'
  },
  structure: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px'
  },
  section: {
    marginBottom: '10px',
    lineHeight: '1.6'
  },
  terrain: {
    backgroundColor: '#fff3cd',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '15px'
  },
  paces: {
    backgroundColor: '#d4edda',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '15px'
  },
  debug: {
    marginTop: '20px',
    fontSize: '12px',
    color: '#666'
  },
  error: {
    color: '#e74c3c',
    padding: '20px',
    textAlign: 'center'
  },
  codeBlock: {
    marginTop: '30px',
    backgroundColor: '#2c3e50',
    color: '#ecf0f1',
    padding: '20px',
    borderRadius: '8px'
  }
};
