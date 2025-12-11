import React from 'react';
import { isLongRun } from '../utils/workoutHelpers';

/**
 * BrickOptions Component
 * 
 * Displays brick workout split options for long runs.
 * Extracted from Dashboard.js to reduce complexity.
 */
function BrickOptions({ workout, onMakeBrick, onHideBrickOptions }) {
  // Try to get distance from workout.distance field first, then workout name, finally default to 10
  let originalDistance = workout.distance || 0;
  if (!originalDistance) {
    const nameMatch = workout.workout?.name?.match(/(\d+(?:\.\d+)?)/);
    originalDistance = nameMatch ? parseFloat(nameMatch[1]) : 10;
  }

  if (!isLongRun(workout)) return null;

  const splitOptions = [
    {
      key: 'heavy-run',
      emoji: '🏃‍♂️',
      label: 'Heavy Run',
      runMiles: Math.round(originalDistance * 0.8),
      bikeMiles: Math.round(originalDistance * 0.2),
      description: 'Feeling strong - mostly running',
      color: '#4299e1'
    },
    {
      key: 'balanced',
      emoji: '⚖️',
      label: 'Balanced',
      runMiles: Math.round(originalDistance * 0.6),
      bikeMiles: Math.round(originalDistance * 0.4),
      description: 'Standard brick workout',
      color: '#ed8936'
    },
    {
      key: 'heavy-bike',
      emoji: '🚴',
      label: 'Heavy Bike',
      runMiles: Math.round(originalDistance * 0.4),
      bikeMiles: Math.round(originalDistance * 0.6),
      description: 'Legs need a break - more biking',
      color: '#9f7aea'
    },
    {
      key: 'light-run',
      emoji: '🚴‍♂️',
      label: 'Light Run',
      runMiles: Math.round(originalDistance * 0.2),
      bikeMiles: Math.round(originalDistance * 0.8),
      description: 'Recovery mode - minimal running',
      color: '#48bb78'
    }
  ];

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{
        background: 'transparent',
        border: 'none',
        padding: '0'
      }}>
        <h4 style={{ margin: '0 0 16px 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: '700' }}>
          🧱 Choose Your Brick Workout Split
        </h4>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#CCCCCC' }}>
          All options = {originalDistance} miles total training load. Pick based on how your legs feel today:
        </p>
        <div style={{ display: 'grid', gap: '12px' }}>
          {splitOptions.map((option) => (
            <div
              key={option.key}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onMakeBrick(workout, option.key);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = option.color;
                e.currentTarget.style.background = `${option.color}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{option.emoji}</span>
                  <strong style={{ color: option.color, fontSize: '1.1rem' }}>{option.label}</strong>
                </div>
                <span style={{ fontSize: '0.9rem', color: '#00D4FF', fontWeight: 'bold' }}>
                  {option.runMiles}mi + {option.bikeMiles} RunEQ
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>
                {option.description}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHideBrickOptions(workout);
          }}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: 'rgba(156, 163, 175, 0.1)',
            color: '#9ca3af',
            border: '1px solid rgba(156, 163, 175, 0.3)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default BrickOptions;








