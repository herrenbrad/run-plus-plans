import React from 'react';
import { formatEquipmentName } from '../utils/typography';
import { getWorkoutTypeColor, getIntensityColors, getNormalizedWorkoutType, isLongRun, getWorkoutDistance, cleanWorkoutText } from '../utils/workoutHelpers';
import BrickOptions from './BrickOptions';
import WorkoutAdventureOptions from './WorkoutAdventureOptions';
import logger from '../utils/logger';

/**
 * WorkoutCard Component
 * 
 * Displays a single workout card with all its actions, options, and completion data.
 * Extracted from Dashboard.js to reduce complexity.
 */
function WorkoutCard({
  workout,
  workoutIdx,
  workouts,
  currentWeek,
  userProfile,
  workoutCompletions,
  // Handlers
  onWorkoutClick,
  onMarkComplete,
  onSomethingElse,
  onShowBrickOptions,
  onHideBrickOptions,
  onMakeBrick,
  onMakeRegularRun,
  onShowOptions,
  onHideOptions,
  onSelectOption,
  onConfirmSelection,
  onCancelSelection,
  onRemoveWorkout,
  // State
  showBrickOptions,
  showingOptions,
  workoutOptions,
  selectedOptions
}) {
  const workoutKey = `${currentWeek}-${workout.day}-${workout.workoutIndex || 0}`;
  const completionData = workoutCompletions[workoutKey];
  const isStravaSynced = completionData?.autoCompletedFromStrava;
  const normalizedType = getNormalizedWorkoutType(workout);
  const isHardWorkout = ['tempo', 'intervals', 'longRun', 'hills'].includes(normalizedType);
  const showAdventureButton = (userProfile?.trainingStyle === 'adventure' ||
    (userProfile?.trainingStyle === 'flexible' && isHardWorkout)) && isHardWorkout && !isStravaSynced;

  return (
    <div
      key={`${workout.day}-${workoutIdx}`}
      className="card dashboard-workout-card"
      style={{
        background: workout.type === 'rest' 
          ? 'linear-gradient(135deg, rgba(160, 174, 192, 0.1) 0%, rgba(160, 174, 192, 0.05) 100%)'
          : workout.type === 'rest_or_xt'
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.08) 100%)'
          : `linear-gradient(135deg, ${getWorkoutTypeColor(workout.type)}25 0%, ${getWorkoutTypeColor(workout.type)}08 50%, rgba(255, 255, 255, 0.05) 100%)`,
        border: `2px solid ${getWorkoutTypeColor(workout.type)}40`,
        borderLeft: `5px solid ${getWorkoutTypeColor(workout.type)}`,
        boxShadow: workout.type === 'rest' 
          ? '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(workout.type)}20, 0 0 20px ${getWorkoutTypeColor(workout.type)}15`,
        opacity: (workout.type === 'rest' || workout.type === 'rest_or_xt') ? 0.7 : 1,
        cursor: (workout.type === 'rest' || workout.type === 'rest_or_xt') ? 'default' : 'pointer',
        position: 'relative',
        color: '#FFFFFF',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateY(0)',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        if (workout.type !== 'rest' && workout.type !== 'rest_or_xt') {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
          e.currentTarget.style.boxShadow = `0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px ${getWorkoutTypeColor(workout.type)}50, 0 0 30px ${getWorkoutTypeColor(workout.type)}30`;
          e.currentTarget.style.borderColor = `${getWorkoutTypeColor(workout.type)}60`;
          e.currentTarget.style.borderLeftWidth = '6px';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = workout.type === 'rest' 
          ? '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : `0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px ${getWorkoutTypeColor(workout.type)}20, 0 0 20px ${getWorkoutTypeColor(workout.type)}15`;
        e.currentTarget.style.borderColor = `${getWorkoutTypeColor(workout.type)}40`;
        e.currentTarget.style.borderLeftWidth = '5px';
      }}
      onClick={() => onWorkoutClick(workout)}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Workout Content */}
        <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
          {/* Header with day, date, workout number */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#EEEEEE', fontSize: '1.1rem', fontWeight: '600' }}>
                {workout.day}
                {workout.date && (
                  <span style={{ fontSize: '0.85rem', marginLeft: '8px', color: '#AAAAAA', fontWeight: '400' }}>
                    {workout.date}
                  </span>
                )}
                {workouts.length > 1 && (
                  <span style={{
                    fontSize: '0.75rem',
                    marginLeft: '8px',
                    background: 'rgba(0, 212, 255, 0.2)',
                    color: '#00D4FF',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    border: '1px solid rgba(0, 212, 255, 0.4)'
                  }}>
                    Workout {workoutIdx + 1}/{workouts.length}
                  </span>
                )}
              </h3>
            </div>
            {workout.equipmentSpecific && <span style={{ fontSize: '1rem' }}>⚡</span>}
            {workout.type === 'bike' && (
              <span style={{ fontSize: '1rem', color: '#ff9500' }} title="Pure bike workout">🚴</span>
            )}
            {(workout.type === 'brick' || workout.type === 'brickLongRun') && (
              <span style={{ fontSize: '1rem', color: '#ff6b6b' }} title="Brick workout (Run + Bike combination)">🧱</span>
            )}
            {workout.type === 'cross-training' && (() => {
              const badges = {
                'pool': { emoji: '🏊', color: '#3b82f6', label: 'Pool / Aqua Running' },
                'aquaRunning': { emoji: '🏊', color: '#3b82f6', label: 'Aqua Running' },
                'rowing': { emoji: '🚣', color: '#22c55e', label: 'Rowing Machine' },
                'elliptical': { emoji: '⚡', color: '#f59e0b', label: 'Elliptical' },
                'swimming': { emoji: '🏊‍♂️', color: '#06b6d4', label: 'Swimming' },
                'stationaryBike': { emoji: '🚴‍♀️', color: '#8b5cf6', label: 'Stationary Bike' },
                'standUpBike': { emoji: '🚴', color: '#ec4899', label: 'Stand-Up Bike' },
                'cyclete': { emoji: '🚴', color: '#ec4899', label: 'Cyclete' },
                'elliptigo': { emoji: '🚴', color: '#ec4899', label: 'ElliptiGO' }
              };
              const badge = badges[workout.crossTrainingType] || { emoji: '🏃', color: '#999', label: 'Cross-Training' };
              return (
                <span style={{ fontSize: '1rem', color: badge.color }} title={badge.label}>
                  {badge.emoji}
                </span>
              );
            })()}
            {workout.completed && <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>}
            {workout.replacementReason && (
              <span style={{ color: 'var(--runeq-accent)', fontSize: '1.2rem' }} title={`Changed: ${workout.replacementReason}`}>🔄</span>
            )}
          </div>
          
          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: getWorkoutTypeColor(workout.type) }}>
            {workout.type === 'rest_or_xt' ? '🧘 Rest / Cross-Train' : cleanWorkoutText(workout.workout?.name || workout.name || 'Workout')}
          </h4>

          {/* Distance/Duration badge */}
          {getWorkoutDistance(workout) && (
            <div style={{
              display: 'inline-block',
              background: 'rgba(0, 212, 255, 0.15)',
              color: '#00D4FF',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '600',
              marginBottom: '8px',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}>
              {getWorkoutDistance(workout)}
            </div>
          )}

          {/* Cross-Training Equipment Badge */}
          {workout.type === 'cross-training' && workout.crossTrainingType && (() => {
            const equipmentLabels = {
              'pool': 'Pool / Aqua Running',
              'aquaRunning': 'Aqua Running',
              'rowing': 'Rowing Machine',
              'elliptical': 'Elliptical',
              'swimming': 'Swimming',
              'stationaryBike': 'Stationary Bike',
              'standUpBike': 'Stand-Up Bike',
              'cyclete': 'Cyclete',
              'elliptigo': 'ElliptiGO'
            };
            const label = equipmentLabels[workout.crossTrainingType] || workout.crossTrainingType;
            return (
              <div style={{
                display: 'inline-block',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '8px',
                marginLeft: getWorkoutDistance(workout) ? '8px' : '0',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                🏥 {label}
              </div>
            );
          })()}

          {/* Description */}
          {(workout.workout?.description || workout.description) && (
            <p style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#CCCCCC', lineHeight: '1.4' }}>
              {workout.workout?.description || workout.description}
            </p>
          )}

          {/* Completed Workout Stats */}
          {workout.completed && completionData && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 212, 255, 0.15) 100%)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1rem' }}>✓</span>
                <span style={{ color: '#00FF88', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.5px' }}>
                  {completionData.autoCompletedFromStrava ? '🔗 SYNCED FROM STRAVA' : 'COMPLETED'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', fontSize: '0.85rem' }}>
                {completionData.distance && (
                  <div>
                    <div style={{ color: '#999', fontSize: '0.75rem' }}>Distance</div>
                    <div style={{ color: '#FFF', fontWeight: '600' }}>{completionData.distance} mi</div>
                  </div>
                )}
                {completionData.duration && (
                  <div>
                    <div style={{ color: '#999', fontSize: '0.75rem' }}>Duration</div>
                    <div style={{ color: '#FFF', fontWeight: '600' }}>{completionData.duration} min</div>
                  </div>
                )}
                {completionData.pace && (
                  <div>
                    <div style={{ color: '#999', fontSize: '0.75rem' }}>Pace</div>
                    <div style={{ color: '#FFF', fontWeight: '600' }}>{completionData.pace}</div>
                  </div>
                )}
                {completionData.avgHeartRate && (
                  <div>
                    <div style={{ color: '#999', fontSize: '0.75rem' }}>Avg HR</div>
                    <div style={{ color: '#FFF', fontWeight: '600' }}>{completionData.avgHeartRate} bpm</div>
                  </div>
                )}
                {completionData.cadence && (
                  <div>
                    <div style={{ color: '#999', fontSize: '0.75rem' }}>Cadence</div>
                    <div style={{ color: '#FFF', fontWeight: '600' }}>{Math.round(completionData.cadence)} spm</div>
                  </div>
                )}
                {completionData.elevationGain && (
                  <div>
                    <div style={{ color: '#999', fontSize: '0.75rem' }}>Elevation</div>
                    <div style={{ color: '#FFF', fontWeight: '600' }}>{completionData.elevationGain} ft</div>
                  </div>
                )}
              </div>

              {completionData.notes && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: '4px' }}>Notes</div>
                  <div style={{ color: '#CCC', fontSize: '0.85rem' }}>{completionData.notes}</div>
                </div>
              )}

              {completionData.stravaActivityUrl && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <a
                    href={completionData.stravaActivityUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#FC4C02',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on Strava
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Focus badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(() => {
              const typeFocusMap = {
                tempo: 'Lactate Threshold',
                intervals: 'Speed & VO2 Max',
                hills: 'Strength & Power',
                longRun: 'Distance Builder',
                brickLongRun: 'Distance Builder',
                long: 'Distance Builder',
                easy: 'Aerobic Base',
                bike: 'Cross-Training',
                rest: 'Recovery',
                rest_or_xt: 'Recovery / XT'
              };

              const workoutName = (workout.workout?.name || workout.name || '').toLowerCase();
              const isLongRunByName = workoutName.includes('long run') || workoutName.includes('long-run');

              let focusText;
              if (workout.focus && workout.focus !== 'Training') {
                focusText = workout.focus;
              } else if (typeFocusMap[workout.type]) {
                focusText = typeFocusMap[workout.type];
              } else if (isLongRunByName) {
                focusText = 'Distance Builder';
              } else {
                focusText = 'Training';
              }

              const focusColors = {
                'Lactate Threshold': '#4299e1',
                'Speed & VO2 Max': '#e53e3e',
                'Strength & Power': '#38a169',
                'Endurance': '#805ad5',
                'Distance Builder': '#a78bfa',
                'Aerobic Base': '#38b2ac',
                'Aerobic Power': '#ed8936',
                'Cross-Training': '#ed8936',
                'Recovery': '#68d391',
                'Recovery / XT': '#48bb78',
                'Active Recovery': '#68d391',
                'Easy Effort': '#38b2ac',
                'Base Building': '#4299e1',
                'Training': '#a0aec0'
              };

              const badgeColor = focusColors[focusText] || getWorkoutTypeColor(workout.type);

              return (
                <span
                  className="badge"
                  style={{
                    background: `${badgeColor}30`,
                    color: badgeColor,
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}
                >
                  {focusText}
                </span>
              );
            })()}
            {workout.equipmentSpecific && userProfile?.preferredBikeDays?.includes(workout.day) && (
              <span className="badge badge-warning" style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                {formatEquipmentName(userProfile.standUpBikeType)}
              </span>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        {(workout.type === 'rest' || workout.type === 'rest_or_xt') ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '140px',
            flexShrink: 0
          }}>
            <button
              className="btn"
              style={{
                fontSize: '0.85rem',
                padding: '10px 12px',
                fontWeight: '600',
                background: workout.completed ? 'rgba(156, 163, 175, 0.1)' : 'rgba(0, 255, 136, 0.1)',
                color: workout.completed ? '#9ca3af' : '#00FF88',
                border: workout.completed ? '1px solid rgba(156, 163, 175, 0.3)' : '1px solid rgba(0, 255, 136, 0.3)',
                textAlign: 'center'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onMarkComplete(workout);
              }}
            >
              {workout.completed ? '⏪ Undo Rest' : '✅ Rested'}
            </button>

            <button
              className="btn"
              style={{
                fontSize: '0.8rem',
                padding: '8px 12px',
                background: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontWeight: '600',
                textAlign: 'center'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSomethingElse(workout);
              }}
            >
              {workout.type === 'rest_or_xt' ? '🏊 Cross-Train' : '🌟 Add Workout'}
            </button>
          </div>
        ) : workout.type !== 'rest' && workout.type !== 'rest_or_xt' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '140px',
            flexShrink: 0
          }}>
            {/* Mark Complete Button */}
            <button
              className="btn"
              style={{
                fontSize: '0.85rem',
                padding: '10px 12px',
                fontWeight: '600',
                background: workout.completed
                  ? 'rgba(156, 163, 175, 0.1)'
                  : userProfile?.stravaConnected
                    ? 'rgba(0, 212, 255, 0.1)'
                    : 'rgba(0, 255, 136, 0.1)',
                color: workout.completed
                  ? '#9ca3af'
                  : userProfile?.stravaConnected
                    ? '#00D4FF'
                    : '#00FF88',
                border: workout.completed
                  ? '1px solid rgba(156, 163, 175, 0.3)'
                  : userProfile?.stravaConnected
                    ? '1px solid rgba(0, 212, 255, 0.3)'
                    : '1px solid rgba(0, 255, 136, 0.3)',
                textAlign: 'center',
                cursor: workout.completed
                  ? 'pointer'
                  : userProfile?.stravaConnected
                    ? 'default'
                    : 'pointer',
                opacity: userProfile?.stravaConnected && !workout.completed ? 0.7 : 1
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!userProfile?.stravaConnected || workout.completed) {
                  onMarkComplete(workout);
                }
              }}
            >
              {workout.completed
                ? '⏪ Undo'
                : userProfile?.stravaConnected
                  ? <>
                      <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }}>
                        <path fill="#FC4C02" d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                      </svg>
                      Strava Sync
                    </>
                  : '📝 Log Workout'}
            </button>

            {/* Choose Adventure Button */}
            {showAdventureButton && (
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#4299e1', border: '1px solid #4299e1', textAlign: 'center' }}
                onClick={(e) => {
                  e.stopPropagation();
                  const key = `${currentWeek}-${workout.day}`;
                  if (showingOptions[key]) {
                    onHideOptions(workout);
                  } else {
                    onShowOptions(workout);
                  }
                }}
              >
                {showingOptions[`${currentWeek}-${workout.day}`] ? '📋 Hide' : '🎲 Choose Adventure'}
              </button>
            )}
            
            {/* Make Brick Button */}
            {isLongRun(workout) && userProfile?.standUpBikeType && !isStravaSynced && (
              <button
                className="btn"
                style={{
                  fontSize: '0.8rem',
                  padding: '8px 12px',
                  fontWeight: '600',
                  background: workout.type === 'brickLongRun' ? (workout.day === 'Sunday' ? '#48bb78' : '#805ad5') : 'transparent',
                  color: workout.type === 'brickLongRun' ? 'white' : '#c4a77d',
                  border: `1px solid ${workout.type === 'brickLongRun' ? (workout.day === 'Sunday' ? '#48bb78' : '#805ad5') : '#c4a77d'}`,
                  textAlign: 'center'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (workout.type === 'brickLongRun') {
                    onMakeRegularRun(workout);
                  } else {
                    if (showBrickOptions[workoutKey]) {
                      onHideBrickOptions(workout);
                    } else {
                      onShowBrickOptions(workout);
                    }
                  }
                }}
              >
                {workout.type === 'brickLongRun' ? '🏃 Run Only' : '🧱 Make Brick'}
              </button>
            )}

            {/* Life Adaptations Button */}
            {!isStravaSynced && (
              <button
                className="btn"
                style={{
                  fontSize: '0.8rem',
                  padding: '8px 14px',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 255, 136, 0.2) 100%)',
                  border: '2px solid rgba(0, 212, 255, 0.5)',
                  color: '#00D4FF',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.35) 0%, rgba(0, 255, 136, 0.3) 100%)';
                  e.currentTarget.style.border = '2px solid rgba(0, 212, 255, 0.8)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 255, 136, 0.2) 100%)';
                  e.currentTarget.style.border = '2px solid rgba(0, 212, 255, 0.5)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSomethingElse(workout);
                }}
              >
                Life Adaptations
              </button>
            )}

            {/* Revert to Original Button */}
            {workout.replacementReason && workoutIdx === 0 && (
              <button
                className="btn"
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontWeight: '600',
                  textAlign: 'center'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMakeRegularRun(workout);
                }}
                title="Restore the original scheduled workout"
              >
                ↩️ Revert to Original
              </button>
            )}

            {/* Remove Button */}
            {workoutIdx > 0 && (
              <button
                className="btn"
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontWeight: '600',
                  textAlign: 'center'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Remove this workout?')) {
                    onRemoveWorkout(workout, workoutIdx);
                  }
                }}
              >
                🗑️ Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* Brick Options */}
      {showBrickOptions[workoutKey] && isLongRun(workout) && (
        <BrickOptions
          workout={workout}
          onMakeBrick={onMakeBrick}
          onHideBrickOptions={onHideBrickOptions}
        />
      )}

      {/* Adventure Options */}
      {showingOptions[`${currentWeek}-${workout.day}`] && workoutOptions[`${currentWeek}-${workout.day}`] && (
        <WorkoutAdventureOptions
          workout={workout}
          currentWeek={currentWeek}
          options={workoutOptions[`${currentWeek}-${workout.day}`]}
          selectedOption={selectedOptions[`${currentWeek}-${workout.day}`]}
          onSelectOption={onSelectOption}
          onConfirmSelection={onConfirmSelection}
          onCancelSelection={onCancelSelection}
        />
      )}
    </div>
  );
}

export default WorkoutCard;

