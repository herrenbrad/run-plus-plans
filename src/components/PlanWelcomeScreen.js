import React from 'react';
import { useNavigate } from 'react-router-dom';
import CoachingAnalysis from './CoachingAnalysis';
import './PlanWelcomeScreen.css';

/**
 * Welcome screen shown after plan generation
 * Displays AI coach's analysis before entering dashboard
 */
export default function PlanWelcomeScreen({ trainingPlan }) {
  const navigate = useNavigate();

  if (!trainingPlan?.aiCoachingAnalysis) {
    // If no coaching analysis, skip to dashboard
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="plan-welcome-screen">
      <div className="welcome-container">
        <div className="welcome-header">
          <h1>🎉 Your Training Plan is Ready!</h1>
          <p>Here's what your AI coach has to say about your journey ahead</p>
        </div>

        <CoachingAnalysis rawResponse={trainingPlan.aiCoachingAnalysis} />

        <div className="welcome-actions">
          <button
            className="btn-continue"
            onClick={() => navigate('/dashboard')}
          >
            Continue to My Training Plan →
          </button>
        </div>
      </div>
    </div>
  );
}
