"use client";

import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

export default function SimpleAuthTest() {
  const [authState, setAuthState] = useState({
    loading: true,
    user: null as any,
    error: null as any,
    timeoutHit: false
  });

  useEffect(() => {
    console.log("[SimpleAuthTest] Starting simple auth test...");
    
    // Timeout de seguridad
    const timeout = setTimeout(() => {
      console.log("[SimpleAuthTest] TIMEOUT HIT - Auth taking too long");
      setAuthState(prev => ({ ...prev, loading: false, timeoutHit: true }));
    }, 5000); // 5 segundos

    try {
      const auth = getFirebaseAuth();
      console.log("[SimpleAuthTest] Got auth instance, setting up listener...");
      
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          clearTimeout(timeout);
          console.log("[SimpleAuthTest] Auth state changed:", user ? `User: ${user.uid.substring(0,5)}` : 'No user');
          setAuthState({
            loading: false,
            user: user,
            error: null,
            timeoutHit: false
          });
        },
        (error) => {
          clearTimeout(timeout);
          console.error("[SimpleAuthTest] Auth error:", error);
          setAuthState({
            loading: false,
            user: null,
            error: error,
            timeoutHit: false
          });
        }
      );

      return () => {
        clearTimeout(timeout);
        unsubscribe();
      };
    } catch (error) {
      clearTimeout(timeout);
      console.error("[SimpleAuthTest] Failed to get auth:", error);
      setAuthState({
        loading: false,
        user: null,
        error: error,
        timeoutHit: false
      });
    }
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 120, 
      right: 10, 
      background: '#e3f2fd', 
      border: '1px solid #2196f3', 
      padding: '10px',
      fontSize: '11px',
      zIndex: 9999,
      maxWidth: '350px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>🔐 Simple Auth Test</h4>
      <div><strong>Loading:</strong> {authState.loading ? '⏳' : '✅'}</div>
      <div><strong>User:</strong> {authState.user ? `✅ ${authState.user.email}` : '❌'}</div>
      <div><strong>Timeout Hit:</strong> {authState.timeoutHit ? '🚨 YES' : '✅ No'}</div>
      {authState.error && (
        <div style={{ marginTop: '8px', padding: '8px', background: '#ffebee', border: '1px solid #f44336', borderRadius: '4px' }}>
          <strong>Error:</strong><br/>
          {authState.error.message || authState.error.toString()}
        </div>
      )}
    </div>
  );
} 