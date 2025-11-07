import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

function AdminApproval() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const currentUserEmail = auth.currentUser?.email;

  // List of admin emails - UPDATE THIS WITH YOUR EMAIL
  const ADMIN_EMAILS = ['herrenbrad@gmail.com']; // TODO: Replace with your actual email

  const isAdmin = ADMIN_EMAILS.includes(currentUserEmail);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('approvalStatus', '==', 'pending'));
      const querySnapshot = await getDocs(q);

      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by creation date (newest first)
      users.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      setPendingUsers(users);
      setLoading(false);
    } catch (err) {
      console.error('Error loading pending users:', err);
      setError('Error loading pending users: ' + err.message);
      setLoading(false);
    }
  };

  const approveUser = async (userId, userEmail) => {
    if (!window.confirm(`Approve ${userEmail}?`)) return;

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approvalStatus: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: currentUserEmail
      });

      console.log(`✅ Approved user: ${userEmail}`);

      // Refresh the list
      await loadPendingUsers();
    } catch (err) {
      console.error('Error approving user:', err);
      alert('Error approving user: ' + err.message);
    }
  };

  const denyUser = async (userId, userEmail) => {
    if (!window.confirm(`Deny ${userEmail}? They will need to create a new account.`)) return;

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approvalStatus: 'denied',
        deniedAt: serverTimestamp(),
        deniedBy: currentUserEmail
      });

      console.log(`❌ Denied user: ${userEmail}`);

      // Refresh the list
      await loadPendingUsers();
    } catch (err) {
      console.error('Error denying user:', err);
      alert('Error denying user: ' + err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</div>
          <h1 style={{ color: '#FF6B6B', marginBottom: '16px' }}>Access Denied</h1>
          <p style={{ color: '#AAAAAA', fontSize: '1.1rem', marginBottom: '24px' }}>
            You do not have permission to access this page.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              background: '#00D4FF',
              border: 'none',
              borderRadius: '6px',
              color: '#000000',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ color: '#00D4FF', margin: '0 0 8px 0' }}>Admin: User Approvals</h1>
            <p style={{ color: '#AAAAAA', margin: 0 }}>
              Approve or deny pending user accounts
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={loadPendingUsers}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: 'rgba(0, 212, 255, 0.2)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '6px',
                color: '#00D4FF',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {loading ? 'Loading...' : '🔄 Refresh'}
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(229, 62, 62, 0.1)',
            border: '1px solid rgba(229, 62, 62, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            color: '#FC8181',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Pending Users List */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#AAAAAA' }}>
              Loading pending users...
            </div>
          ) : pendingUsers.length === 0 ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
              <h2 style={{ color: '#00D4FF', marginBottom: '8px' }}>All Caught Up!</h2>
              <p style={{ color: '#AAAAAA', margin: 0 }}>
                No pending user approvals at this time.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div style={{
                        fontSize: '1.2rem',
                        color: '#FFFFFF',
                        marginBottom: '8px',
                        fontWeight: 'bold'
                      }}>
                        {user.displayName || 'No name provided'}
                      </div>
                      <div style={{
                        color: '#00D4FF',
                        marginBottom: '8px',
                        fontSize: '0.95rem'
                      }}>
                        {user.email}
                      </div>
                      <div style={{
                        color: '#AAAAAA',
                        fontSize: '0.85rem'
                      }}>
                        Signed up: {user.createdAt ? new Date(user.createdAt.toMillis()).toLocaleString() : 'Unknown'}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '12px'
                    }}>
                      <button
                        onClick={() => approveUser(user.id, user.email)}
                        style={{
                          padding: '10px 24px',
                          background: '#00FF88',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#000000',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: 'bold'
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => denyUser(user.id, user.email)}
                        style={{
                          padding: '10px 24px',
                          background: 'rgba(255, 107, 107, 0.2)',
                          border: '1px solid rgba(255, 107, 107, 0.3)',
                          borderRadius: '6px',
                          color: '#FF6B6B',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: 'bold'
                        }}
                      >
                        ❌ Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminApproval;
