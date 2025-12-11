import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CoachingAnalysis from './CoachingAnalysis';
import EnterRaceTimeModal from './EnterRaceTimeModal';
import logger from '../utils/logger';
import { useToast } from './Toast';
import './PlanWelcomeScreen.css';

/**
 * Welcome screen shown after plan generation
 * Displays AI coach's analysis before entering dashboard
 */
export default function PlanWelcomeScreen({ trainingPlan, userProfile, onPlanUpdated }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [showRaceTimeModal, setShowRaceTimeModal] = useState(false);
  const [localUserProfile, setLocalUserProfile] = useState(userProfile);
  const [localTrainingPlan, setLocalTrainingPlan] = useState(trainingPlan);

  // Update local state when props change
  useEffect(() => {
    if (userProfile) {
      setLocalUserProfile(userProfile);
    }
    if (trainingPlan) {
      setLocalTrainingPlan(trainingPlan);
    }
  }, [userProfile, trainingPlan]);

  if (!localTrainingPlan?.aiCoachingAnalysis) {
    // If no coaching analysis, skip to dashboard
    navigate('/dashboard');
    return null;
  }

  // Check if fitness was estimated (user didn't enter recent race time)
  const isEstimatedFitness = localUserProfile?.isEstimatedFitness || false;

  // Handler for when plan is updated
  const handlePlanUpdated = async (updatedPlan, updatedProfile) => {
    // CRITICAL: Validate plan structure before proceeding
    if (!updatedPlan || !updatedPlan.weeks || !Array.isArray(updatedPlan.weeks) || updatedPlan.weeks.length === 0) {
      logger.error('❌ Invalid plan structure in handlePlanUpdated', {
        hasPlan: !!updatedPlan,
        hasWeeks: !!updatedPlan?.weeks,
        weeksType: typeof updatedPlan?.weeks,
        weeksLength: updatedPlan?.weeks?.length,
        planKeys: updatedPlan ? Object.keys(updatedPlan) : 'no plan'
      });
      toast.error('Plan update failed - invalid plan structure. Please try again.', 8000);
      return;
    }
    
    // Update local state immediately
    setLocalTrainingPlan(updatedPlan);
    setLocalUserProfile(updatedProfile);
    
    // Call parent callback if provided
    // CRITICAL: handleOnboardingComplete expects (profile, plan) - NOT (plan, profile)
    if (onPlanUpdated) {
      await onPlanUpdated(updatedProfile, updatedPlan);
    }
    
    // Close modal
    setShowRaceTimeModal(false);
  };

  return (
    <div className="plan-welcome-screen">
      <div className="welcome-container">
        <div className="welcome-header">
          <img
            src="/logo.png"
            alt="Run+ Plans"
            className="welcome-logo"
          />
          <h1>Your Training Plan is Ready</h1>
          <p>Here's what your AI coach has to say about your journey ahead</p>
        </div>

        {/* Show "Enter Recent Race Time" button if fitness was estimated */}
        {isEstimatedFitness && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '0.95rem',
              color: '#FFC107'
            }}>
              ⚠️ Your current fitness was estimated. For more accurate training paces, enter a recent race time.
            </p>
            <button
              onClick={() => setShowRaceTimeModal(true)}
              style={{
                padding: '10px 20px',
                fontSize: '0.95rem',
                background: 'rgba(255, 193, 7, 0.2)',
                border: '1px solid rgba(255, 193, 7, 0.5)',
                borderRadius: '6px',
                color: '#FFC107',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Enter Recent Race Time
            </button>
          </div>
        )}

        <CoachingAnalysis rawResponse={localTrainingPlan.aiCoachingAnalysis} />

        <div className="welcome-actions">
          <button
            className="btn-continue"
            onClick={() => navigate('/dashboard')}
          >
            Continue to My Training Plan →
          </button>
        </div>
      </div>

      {/* Enter Race Time Modal */}
      {showRaceTimeModal && (
        <EnterRaceTimeModal
          isOpen={showRaceTimeModal}
          onClose={() => setShowRaceTimeModal(false)}
          userProfile={localUserProfile}
          trainingPlan={localTrainingPlan}
          onPlanUpdated={handlePlanUpdated}
        />
      )}
    </div>
  );
}
