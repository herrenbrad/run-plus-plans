/**
 * DashboardCoaching Component
 * Extracted from Dashboard.js to reduce component size and improve maintainability
 * Displays injury recovery and plan adjustment coaching sections
 */

import { useState } from 'react';

export default function DashboardCoaching({
  trainingPlan,
  currentWeekData,
  userProfile
}) {
  const [isInjuryCoachingExpanded, setIsInjuryCoachingExpanded] = useState(true);
  const [isPlanAdjustmentCoachingExpanded, setIsPlanAdjustmentCoachingExpanded] = useState(true);

  return (
    <>
      {/* Injury Recovery Alert */}
      {currentWeekData.weekType === 'injury-recovery' && (
        <>
          <div className="card" style={{ marginBottom: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '2px solid rgba(239, 68, 68, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="dashboard-alert-emoji" style={{ fontSize: '1.5rem' }}>🏥</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', color: '#ef4444' }}>Injury Recovery Protocol Active</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#dc2626' }}>
                  No running this week. You're cross-training to maintain fitness while healing.
                  {userProfile?.injuryRecovery && (
                    <span>
                      {' '}Return to running: Week {userProfile.injuryRecovery.returnToRunningWeek}.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Injury Recovery Coaching Analysis - Collapsible Accordion */}
          {trainingPlan?.injuryRecoveryCoaching && (
            <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #1a2a3a 0%, #0f1f2f 100%)', border: '2px solid #00D4FF' }}>
              <div style={{ padding: '20px' }}>
                <h3 
                  onClick={() => setIsInjuryCoachingExpanded(!isInjuryCoachingExpanded)}
                  style={{ 
                    margin: '0 0 16px 0', 
                    color: '#00D4FF', 
                    fontSize: '1.3rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <span>💡</span>
                  <span style={{ flex: 1 }}>Coach's Recovery Guidance</span>
                  <span 
                    style={{ 
                      fontSize: '1rem',
                      transition: 'transform 0.3s ease',
                      transform: isInjuryCoachingExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      display: 'inline-block'
                    }}
                  >
                    ▼
                  </span>
                </h3>
                {isInjuryCoachingExpanded && (
                  <div 
                    className="dashboard-coaching-text" 
                    style={{ 
                      color: '#DDD', 
                      fontSize: '1rem', 
                      lineHeight: '1.8', 
                      whiteSpace: 'pre-line',
                      animation: 'fadeIn 0.3s ease'
                    }}
                  >
                    {trainingPlan.injuryRecoveryCoaching}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Return to Running Alert */}
      {currentWeekData.weekType === 'return-to-running' && (
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(34, 197, 94, 0.15)', border: '2px solid rgba(34, 197, 94, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="dashboard-alert-emoji" style={{ fontSize: '1.5rem' }}>🎯</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px 0', color: '#22c55e' }}>Return to Running Week</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#16a34a' }}>
                Gradual return to running mixed with cross-training. Listen to your body and ease back into it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Adjustment Coaching Analysis - Collapsible Accordion */}
      {trainingPlan?.planAdjustmentCoaching && (
        <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #1a2a3a 0%, #0f1f2f 100%)', border: '2px solid #3b82f6' }}>
          <div style={{ padding: '20px' }}>
            <h3 
              onClick={() => setIsPlanAdjustmentCoachingExpanded(!isPlanAdjustmentCoachingExpanded)}
              style={{ 
                margin: '0 0 16px 0', 
                color: '#3b82f6', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                userSelect: 'none'
              }}
            >
              <span>💡</span>
              <span style={{ flex: 1 }}>Coach's Take on Your Plan Adjustments</span>
              <span 
                style={{ 
                  fontSize: '1rem',
                  transition: 'transform 0.3s ease',
                  transform: isPlanAdjustmentCoachingExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  display: 'inline-block'
                }}
              >
                ▼
              </span>
            </h3>
              {isPlanAdjustmentCoachingExpanded && (
                <div 
                  className="dashboard-coaching-text" 
                  style={{ 
                    color: '#DDD', 
                    fontSize: '1rem', 
                    lineHeight: '1.8', 
                    whiteSpace: 'pre-line',
                    animation: 'fadeIn 0.3s ease'
                  }}
                >
                  {trainingPlan.planAdjustmentCoaching}
                </div>
              )}
          </div>
        </div>
      )}
    </>
  );
}

