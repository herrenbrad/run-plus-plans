/**
 * Dev Mode - Fast Plan Generation Testing
 * 
 * Protected route: Only accessible to herrenbrad@gmail.com
 * 
 * Features:
 * - Load profile from Firestore or paste JSON
 * - Generate plan instantly (no onboarding)
 * - View full plan structure
 * - See validation results
 * - Regenerate quickly
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import FirestoreService from '../services/FirestoreService';
import TrainingPlanAIService from '../services/TrainingPlanAIService';
import TrainingPlanService from '../services/TrainingPlanService';
import { validateTrainingPlan } from '../services/TrainingPlanAIService.validators';
import logger from '../utils/logger';
import { useToast } from './Toast';
import Dashboard from './Dashboard';
import CoachingAnalysis from './CoachingAnalysis';
import './DevMode.css';

const DEV_MODE_EMAIL = 'herrenbrad@gmail.com';

function DevMode() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Profile state
  const [profileJson, setProfileJson] = useState('');
  const [profile, setProfile] = useState(null);
  const [profileFromFirestore, setProfileFromFirestore] = useState(null);
  
  // Plan state
  const [plan, setPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const [showCoaching, setShowCoaching] = useState(false);
  
  // Check authorization
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const isAuthorized = firebaseUser.email === DEV_MODE_EMAIL;
        setAuthorized(isAuthorized);
        if (isAuthorized) {
          loadProfileFromFirestore(firebaseUser.uid);
        }
      } else {
        setUser(null);
        setAuthorized(false);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Load profile from Firestore
  const loadProfileFromFirestore = async (uid) => {
    try {
      const userData = await FirestoreService.getUserData(uid);
      if (userData?.profile) {
        setProfileFromFirestore(userData.profile);
        setProfileJson(JSON.stringify(userData.profile, null, 2));
        toast.success('Profile loaded from Firestore');
      }
    } catch (error) {
      logger.error('Error loading profile from Firestore:', error);
    }
  };
  
  // Parse JSON profile
  const handleProfileChange = (e) => {
    setProfileJson(e.target.value);
    try {
      const parsed = JSON.parse(e.target.value);
      // Remove _comment fields
      Object.keys(parsed).forEach(key => {
        if (key.startsWith('_comment')) {
          delete parsed[key];
        }
      });
      setProfile(parsed);
      setErrors([]);
    } catch (error) {
      setErrors([`JSON Parse Error: ${error.message}`]);
      setProfile(null);
    }
  };
  
  // Generate plan
  const handleGeneratePlan = async () => {
    if (!profile) {
      toast.error('Please provide a valid profile JSON');
      return;
    }
    
    setGenerating(true);
    setPlan(null);
    setValidationResults(null);
    setErrors([]);
    
    try {
      logger.log('🚀 Generating plan with profile:', profile);
      
      // STEP 1: Generate deterministic plan structure
      logger.log('🏗️ Step 1: Generating deterministic plan structure...');
      const planStructure = TrainingPlanService.generatePlanStructure(profile);
      
      if (!planStructure || !planStructure.weeks || planStructure.weeks.length === 0) {
        throw new Error('Failed to generate plan structure - weeks array is missing');
      }
      
      logger.log(`✅ Plan structure generated: ${planStructure.weeks.length} weeks`);
      
      // STEP 2: Add AI coaching analysis
      logger.log('🤖 Step 2: Adding AI coaching analysis...');
      let coachingAnalysis = null;
      try {
        const coachingResult = await TrainingPlanAIService.generateCoachingAnalysis(profile);
        if (coachingResult.success) {
          coachingAnalysis = coachingResult.analysis;
          logger.log('✅ AI coaching analysis generated');
        } else {
          logger.warn('⚠️ AI coaching failed, continuing without it:', coachingResult.error);
          coachingAnalysis = "Welcome to your training plan! This plan is designed specifically for your goals and schedule.";
        }
      } catch (coachingError) {
        logger.warn('⚠️ AI coaching failed, continuing without it:', coachingError);
        coachingAnalysis = "Welcome to your training plan! This plan is designed specifically for your goals and schedule.";
      }
      
      // Combine structure + coaching into final plan
      const finalPlan = {
        ...planStructure,
        aiCoachingAnalysis: coachingAnalysis,
        fullPlanText: coachingAnalysis || "Your personalized training plan"
      };
      
      setPlan(finalPlan);
      setShowCoaching(!!coachingAnalysis); // Show coaching if it exists
      
      // Run validations
      try {
        const validation = validateTrainingPlan(finalPlan, profile);
        setValidationResults(validation);
        
        if (!validation.valid) {
          logger.warn('⚠️ Validation failed:', validation.errors);
          toast.warning(`Plan generated but ${validation.errors.length} validation errors found`);
        } else {
          toast.success('Plan generated successfully!');
        }
      } catch (validationError) {
        logger.warn('Could not run validations:', validationError);
      }
      
    } catch (error) {
      logger.error('Error generating plan:', error);
      setErrors([error.message]);
      toast.error(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };
  
  // Load template
  const loadTemplate = () => {
    const template = {
      raceDistance: "Half Marathon",
      raceTime: "2:00:00",
      raceDate: "2025-06-15",
      startDate: new Date().toISOString().split('T')[0],
      raceElevationProfile: "flat",
      currentWeeklyMileage: 16,
      currentLongRun: 6,
      recentRaceTime: "1:58:00",
      recentRaceDistance: "Half Marathon",
      workoutsPerWeek: 4,
      runsPerWeek: 4, // Backward compatibility
      availableDays: ["Monday", "Wednesday", "Friday", "Saturday"],
      restDays: ["Tuesday", "Thursday", "Sunday"],
      longRunDay: "Saturday",
      qualityDays: ["Wednesday", "Friday"],
      standUpBikeType: "cyclete",
      preferredBikeDays: ["Monday"],
      crossTrainingEquipment: {},
      experienceLevel: "intermediate",
      runningStatus: "active",
      units: "imperial",
      name: "Test User"
    };
    
    setProfileJson(JSON.stringify(template, null, 2));
    setProfile(template);
    toast.info('Template loaded');
  };
  
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!authorized) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>🔒 Access Denied</h1>
        <p>Dev Mode is only accessible to authorized users.</p>
        <p>Current user: {user?.email || 'Not logged in'}</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Go Home
        </button>
      </div>
    );
  }
  
  return (
    <div className="dev-mode">
      <div className="dev-mode-header">
        <h1>🔧 Dev Mode - Plan Generation Testing</h1>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">
          Back to Dashboard
        </button>
      </div>
      
      <div className="dev-mode-content">
        {/* Left Panel: Profile Input */}
        <div className="dev-mode-panel">
          <h2>Profile Input</h2>
          
          <div className="dev-mode-actions">
            <button onClick={loadTemplate} className="btn-secondary">
              Load Template
            </button>
            {profileFromFirestore && (
              <button 
                onClick={() => {
                  setProfileJson(JSON.stringify(profileFromFirestore, null, 2));
                  setProfile(profileFromFirestore);
                  toast.info('Profile loaded from Firestore');
                }}
                className="btn-secondary"
              >
                Load from Firestore
              </button>
            )}
          </div>
          
          <textarea
            value={profileJson}
            onChange={handleProfileChange}
            placeholder="Paste profile JSON here..."
            className="dev-mode-textarea"
            rows={20}
          />
          
          {errors.length > 0 && (
            <div className="dev-mode-errors">
              <h3>Errors:</h3>
              <ul>
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <button
            onClick={handleGeneratePlan}
            disabled={!profile || generating}
            className="btn-primary"
            style={{ marginTop: '20px', width: '100%' }}
          >
            {generating ? 'Generating...' : 'Generate Plan'}
          </button>
        </div>
        
        {/* Right Panel: Results */}
        <div className="dev-mode-panel">
          <h2>Generated Plan</h2>
          
          {validationResults && (
            <div className={`dev-mode-validation ${validationResults.valid ? 'valid' : 'invalid'}`}>
              <h3>Validation Results:</h3>
              {validationResults.valid ? (
                <p>✅ All validations passed</p>
              ) : (
                <div>
                  <p>❌ {validationResults.errors.length} validation errors:</p>
                  <ul>
                    {validationResults.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {plan ? (
            <div className="dev-mode-plan">
              <div className="dev-mode-plan-actions">
                <button onClick={handleGeneratePlan} className="btn-secondary" disabled={generating}>
                  Regenerate
                </button>
                <button 
                  onClick={() => {
                    // Handle circular references by using a replacer function
                    const seen = new WeakSet();
                    const json = JSON.stringify(plan, (key, value) => {
                      if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) {
                          return '[Circular]';
                        }
                        seen.add(value);
                      }
                      return value;
                    }, 2);
                    navigator.clipboard.writeText(json);
                    toast.success('Plan JSON copied to clipboard');
                  }}
                  className="btn-secondary"
                >
                  Copy Plan JSON
                </button>
                {plan.aiCoachingAnalysis && (
                  <button 
                    onClick={() => setShowCoaching(!showCoaching)}
                    className="btn-secondary"
                  >
                    {showCoaching ? 'Hide' : 'Show'} AI Coach
                  </button>
                )}
              </div>
              
              <div className="dev-mode-plan-stats">
                <p><strong>Total Weeks:</strong> {plan.planOverview?.totalWeeks || plan.weeks?.length}</p>
                <p><strong>Start Date:</strong> {plan.planOverview?.startDate}</p>
                <p><strong>Race Date:</strong> {plan.planOverview?.raceDate}</p>
                {plan.aiCoachingAnalysis && (
                  <p><strong>AI Coaching:</strong> {showCoaching ? '✅ Visible' : '📄 Available'}</p>
                )}
              </div>
              
              {/* Show AI Coaching Analysis (like welcome screen) */}
              {showCoaching && plan.aiCoachingAnalysis && (
                <div className="dev-mode-coaching" style={{
                  marginBottom: '20px',
                  padding: '20px',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '8px',
                  border: '1px solid #333'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '15px' }}>🤖 AI Coach Analysis</h3>
                  <CoachingAnalysis rawResponse={plan.aiCoachingAnalysis} />
                </div>
              )}
              
              {/* Show plan in Dashboard format */}
              <div className="dev-mode-dashboard">
                <Dashboard
                  userProfile={profile}
                  trainingPlan={plan}
                  completedWorkouts={null}
                  clearAllData={() => {}}
                />
              </div>
            </div>
          ) : (
            <div className="dev-mode-placeholder">
              {generating ? (
                <p>Generating plan... This may take 30-60 seconds.</p>
              ) : (
                <p>Enter a profile and click "Generate Plan" to start.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DevMode;

