'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      console.log('[SW Register] Starting service worker registration...');
      
      const registerSW = async () => {
        try {
          // Unregister any existing service workers first
          const registrations = await navigator.serviceWorker.getRegistrations();
          console.log('[SW Register] Found', registrations.length, 'existing registrations');
          
          for (const registration of registrations) {
            console.log('[SW Register] Unregistering existing SW:', registration.scope);
            await registration.unregister();
          }
          
          // Wait a bit for cleanup
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Register new service worker
          console.log('[SW Register] Registering new service worker...');
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });
          
          console.log('[SW Register] Service worker registered successfully:', registration.scope);
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            console.log('[SW Register] Service worker update found');
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                console.log('[SW Register] Service Worker state changed:', newWorker.state);
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[SW Register] New content available, will refresh...');
                  // Auto refresh when new content is available
                  window.location.reload();
                }
              });
            }
          });
          
        } catch (error) {
          console.warn('[SW Register] Service worker registration failed:', error);
          // Don't throw error, just log it - app should work without SW
        }
      };
      
      // Register on page load
      registerSW();
      
    } else {
      console.log('[SW Register] Service workers not supported');
    }
  }, []);

  return null;
} 