import React from 'react';
import { getIntensityColors } from '../utils/workoutHelpers';
import logger from '../utils/logger';

/**
 * WorkoutAdventureOptions Component
 * 
 * Displays "Choose Your Adventure" workout options with selection and confirmation.
 * Extracted from Dashboard.js to reduce complexity.
 */
function WorkoutAdventureOptions({
  workout,
  currentWeek,
  options,
  selectedOption,
  onSelectOption,
  onConfirmSelection,
  onCancelSelection
}) {
  if (!options || options.length === 0) return null;

  const workoutKey = `${currentWeek}-${workout.day}`;
  const workoutTypeLabel = workout.type === 'longRun' ? 'Long Run' :
                           workout.type === 'intervals' ? 'Speed' :
                           workout.type === 'tempo' ? 'Tempo' :
                           workout.type === 'hills' ? 'Hill' :
                           'Easy Run';

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{
        background: 'transparent',
        border: 'none',
        padding: '0'
      }}>
        <h4 style={{ margin: '0 0 16px 0', color: '#00D4FF', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: '700' }}>
          🎲 Choose Your {workoutTypeLabel} Adventure
        </h4>
        <div style={{ display: 'grid', gap: '12px' }}>
          {options.map((option) => {
            const colors = getIntensityColors(option.intensity, option.difficulty);
            const isSelected = selectedOption?.id === option.id;
            
            return (
              <div 
                key={option.id}
                className="card"
                style={{ 
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(74, 222, 128, 0.2)' : colors.bg,
                  border: isSelected ? '3px solid #4ade80' : `2px solid ${colors.border}`,
                  borderLeft: isSelected ? '6px solid #22c55e' : `6px solid ${colors.accent}`,
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(3px)',
                  boxShadow: isSelected ? '0 4px 20px rgba(74, 222, 128, 0.4)' : `0 4px 16px ${colors.accent}20`,
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectOption(workout, option);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.bg.replace('0.1', '0.2').replace('0.15', '0.25');
                  e.currentTarget.style.border = `2px solid ${colors.accent}`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.accent}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.bg;
                  e.currentTarget.style.border = `2px solid ${colors.border}`;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{colors.icon}</span>
                      <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#FFFFFF' }}>
                        {option.name}
                      </h5>
                      {isSelected && (
                        <span style={{ 
                          background: '#22c55e', 
                          color: 'white', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          ✓ SELECTED
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#FFFFFF', lineHeight: '1.4', opacity: '1' }}>
                      {option.description}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#FFFFFF', opacity: '1', marginBottom: '8px' }}>
                      <span>⏱️ {option.timeRequired}</span>
                      <span>📍 {option.location}</span>
                      <span>💪 {option.difficulty}</span>
                    </div>
                  </div>
                  <div style={{
                    background: colors.accent + '20',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    marginLeft: '12px',
                    border: `1px solid ${colors.accent}40`
                  }}>
                    {option.focus}
                  </div>
                </div>
                <div style={{
                  background: colors.accent + '15',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  border: `1px solid ${colors.accent}30`
                }}>
                  💡 {option.benefits}
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#CCCCCC', fontStyle: 'italic' }}>
            💡 <strong>All options target the same training system</strong> - choose based on your mood, time, and location!
          </p>
        </div>
        
        {/* Confirmation buttons when selection is made */}
        {selectedOption && (() => {
          logger.log('✅ Showing confirmation buttons for:', selectedOption.shortName);
          
          return (
            <div style={{ 
              marginTop: '16px', 
              padding: '20px', 
              background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.3), rgba(34, 197, 94, 0.2))', 
              border: '3px solid #22c55e',
              borderRadius: '12px',
              boxShadow: '0 8px 25px rgba(34, 197, 94, 0.4)',
              position: 'relative',
              zIndex: 1000
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>✅</span>
                <span style={{ 
                  color: '#4ade80', 
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}>
                  Selected: {selectedOption.shortName}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onConfirmSelection(workout);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: 'white',
                    border: '2px solid #16a34a',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#22c55e'}
                  onMouseLeave={(e) => e.target.style.background = '#4ade80'}
                >
                  ✓ Confirm Selection
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCancelSelection(workout);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.target.style.borderColor = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  }}
                >
                  ✗ Cancel
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default WorkoutAdventureOptions;








