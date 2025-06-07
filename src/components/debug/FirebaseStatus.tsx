"use client";

import { useEffect, useState } from 'react';
import { isFirebaseInitialized, getFirebaseAuth, getFirebaseApp } from '@/lib/firebase/config';

export default function FirebaseStatus() {
  const [status, setStatus] = useState({
    initialized: false,
    authConfigured: false,
    error: null as any,
    projectId: '',
    authDomain: '',
    detailedError: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("[FirebaseStatus] Checking Firebase status...");
      
      try {
        const initialized = isFirebaseInitialized();
        console.log("[FirebaseStatus] Firebase initialized:", initialized);
        
        if (initialized) {
          try {
            const app = getFirebaseApp();
            const auth = getFirebaseAuth();
            console.log("[FirebaseStatus] App:", app.name, "Auth:", auth.app.name);
            
            setStatus({
              initialized: true,
              authConfigured: true,
              error: null,
              projectId: app.options.projectId || 'N/A',
              authDomain: app.options.authDomain || 'N/A',
              detailedError: ''
            });
          } catch (authError: any) {
            console.error("[FirebaseStatus] Auth error:", authError);
            setStatus({
              initialized: true,
              authConfigured: false,
              error: authError,
              projectId: 'Error getting app',
              authDomain: 'Error getting app',
              detailedError: authError.message || authError.toString()
            });
          }
        } else {
          setStatus({
            initialized: false,
            authConfigured: false,
            error: "Firebase not initialized",
            projectId: 'N/A',
            authDomain: 'N/A',
            detailedError: 'Firebase core not initialized'
          });
        }
      } catch (error: any) {
        console.error("[FirebaseStatus] General error:", error);
        setStatus({
          initialized: false,
          authConfigured: false,
          error: error,
          projectId: 'Error',
          authDomain: 'Error',
          detailedError: error.message || error.toString()
        });
      }
    }, 2000); // Esperar 2 segundos para dar tiempo a que Firebase se inicialice

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '10px',
      fontSize: '11px',
      zIndex: 9999,
      maxWidth: '350px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#d32f2f' }}>🔥 Firebase Debug Status</h4>
      <div><strong>Initialized:</strong> {status.initialized ? '✅' : '❌'}</div>
      <div><strong>Auth:</strong> {status.authConfigured ? '✅' : '❌'}</div>
      <div><strong>Project ID:</strong> {status.projectId}</div>
      <div><strong>Auth Domain:</strong> {status.authDomain}</div>
      {status.error && (
        <div style={{ marginTop: '8px', padding: '8px', background: '#ffebee', border: '1px solid #f44336', borderRadius: '4px' }}>
          <strong>Error:</strong><br/>
          {status.detailedError}
        </div>
      )}
    </div>
  );
} 