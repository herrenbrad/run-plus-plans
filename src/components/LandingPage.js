import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();
  const [hasSavedData, setHasSavedData] = useState(false);
  
  // Check for existing saved data on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('runeq_userProfile');
    const savedPlan = localStorage.getItem('runeq_trainingPlan');
    setHasSavedData(!!savedProfile && !!savedPlan);
  }, []);

  return (
    <div className="fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
              Run+ Plans
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#AAAAAA', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
              The intelligent training app that adapts to your equipment, climate, and life.
              Built for runners, cyclists, and stand-up bike athletes.
            </p>
            
            {/* Key Differentiators */}
            <div className="card-grid" style={{ marginBottom: '40px', textAlign: 'left' }}>
              <div className="card slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="equipment-icon">🚴‍♂️</div>
                <h3 style={{ color: '#AAAAAA', marginBottom: '8px' }}>Equipment Specific</h3>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  Cyclete and ElliptiGO workouts with motion-specific training. 
                  No more generic "bike conversion" - real equipment intelligence.
                </p>
              </div>
              
              <div className="card slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="equipment-icon">🌡️</div>
                <h3 style={{ color: '#AAAAAA', marginBottom: '8px' }}>Climate Smart</h3>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  Automatic pace adjustments for heat, humidity, and altitude. 
                  No more impossible paces in tropical climates.
                </p>
              </div>
              
              <div className="card slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="equipment-icon">🔄</div>
                <h3 style={{ color: '#AAAAAA', marginBottom: '8px' }}>Life Flexible</h3>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  Miss a workout? Change your mind? We adapt without penalty. 
                  Real training for real life.
                </p>
              </div>
            </div>

            {/* Competitive Advantages */}
            <div className="card" style={{ marginBottom: '32px', textAlign: 'left' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Why Run+ Plans vs Others?</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
                  <span><strong>80+ workout varieties</strong> vs repetitive formats</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
                  <span><strong>Cross-platform access</strong> - phone, tablet, and web</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
                  <span><strong>Equipment-specific training</strong> nobody else offers</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
                  <span><strong>Smart workout substitution</strong> that counts properly</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#00FF88', fontSize: '1.2rem' }}>✓</span>
                  <span><strong>Future Garmin integration</strong> - instant workout sync</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
              {hasSavedData ? (
                // Show continue option if user has saved data
                <>
                  <button 
                    className="btn btn-success btn-full-width"
                    onClick={() => navigate('/dashboard')}
                    style={{ fontSize: '1.1rem', padding: '20px' }}
                  >
                    📅 Continue Your Training Plan
                  </button>
                  
                  <button 
                    className="btn btn-secondary btn-full-width"
                    onClick={() => navigate('/onboarding')}
                    style={{ fontSize: '1rem', padding: '16px' }}
                  >
                    🚀 Start New Training Plan
                  </button>
                  
                  <button 
                    className="btn"
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    style={{ 
                      fontSize: '0.9rem', 
                      padding: '12px',
                      background: 'transparent',
                      border: '1px solid #666',
                      color: '#999'
                    }}
                  >
                    🗑️ Clear All Data & Start Fresh
                  </button>
                  
                  <p style={{ fontSize: '0.9rem', color: '#888888', margin: '8px 0' }}>
                    Welcome back! Continue where you left off or create a new plan.
                  </p>
                </>
              ) : (
                // Show start option if no saved data
                <>
                  <button 
                    className="btn btn-success btn-full-width"
                    onClick={() => navigate('/onboarding')}
                    style={{ fontSize: '1.1rem', padding: '20px' }}
                  >
                    🚀 Start Free Training Plan
                  </button>
                  
                  <p style={{ fontSize: '0.9rem', color: '#888888', margin: '8px 0' }}>
                    Experience the full onboarding flow for free. See your personalized plan before subscribing.
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.8rem', color: '#666666' }}>
                    <span>✓ No credit card</span>
                    <span>✓ Full preview</span>
                    <span>✓ All features</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', color: '#AAAAAA', padding: '20px 0', textAlign: 'center' }}>
        <div className="container">
          <p style={{ margin: '0', fontSize: '0.9rem', color: '#888888' }}>
            Built by runners, for runners. Research-based workouts from McMillan, Hal Higdon, Ben Parkes, and more.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;