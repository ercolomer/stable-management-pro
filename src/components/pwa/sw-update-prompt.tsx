'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

interface ServiceWorkerUpdatePromptProps {
  autoUpdate?: boolean;
}

export function ServiceWorkerUpdatePrompt({ autoUpdate = false }: ServiceWorkerUpdatePromptProps) {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Función para activar el nuevo service worker (fuera del useEffect)
  const activateNewServiceWorker = (registration: ServiceWorkerRegistration) => {
    if (registration.waiting) {
      console.log('[SW Update] Activating new service worker...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;

    // Función para recargar la página
    const refreshPage = () => {
      if (refreshing) return;
      refreshing = true;
      console.log('[SW Update] Refreshing page...');
      window.location.reload();
    };

    // Listener para detectar cuando el SW toma control
    const onControllerChange = () => {
      console.log('[SW Update] New service worker took control');
      if (refreshing) return;
      refreshPage();
    };

    // Función para manejar actualizaciones del SW
    const handleServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
      console.log('[SW Update] Service worker update detected');
      setSwRegistration(registration);
      
      if (autoUpdate) {
        // Activar automáticamente el nuevo SW
        activateNewServiceWorker(registration);
      } else {
        // Mostrar prompt para que el usuario decida
        setShowUpdatePrompt(true);
      }
    };

    // Configurar listeners
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Función para manejar mensajes del SW
    const handleMessage = (event: MessageEvent) => {
      console.log('[SW Update] Message from SW:', event.data);
      
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('[SW Update] SW reports it has been updated');
        // El SW ya está activado, solo necesitamos refrescar
        setTimeout(refreshPage, 100);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Verificar si ya hay una registration y un SW esperando
    navigator.serviceWorker.getRegistration()
      .then((registration) => {
        if (registration) {
          console.log('[SW Update] Existing registration found');
          
          // Verificar si hay un SW esperando
          if (registration.waiting) {
            console.log('[SW Update] SW waiting found on load');
            handleServiceWorkerUpdate(registration);
          }
          
          // Escuchar por nuevas actualizaciones
          registration.addEventListener('updatefound', () => {
            console.log('[SW Update] Update found event');
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                console.log('[SW Update] New worker state:', newWorker.state);
                
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Hay un nuevo SW instalado y uno activo (update disponible)
                  handleServiceWorkerUpdate(registration);
                }
              });
            }
          });
        }
      })
      .catch((error) => {
        console.warn('[SW Update] Error getting registration:', error);
      });

    // Cleanup
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [autoUpdate]);

  const handleUpdateClick = () => {
    if (swRegistration) {
      activateNewServiceWorker(swRegistration);
      setShowUpdatePrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    // Guardar que el usuario rechazó esta actualización
    try {
      localStorage.setItem('swUpdateDismissed', Date.now().toString());
    } catch (error) {
      console.warn('[SW Update] Error saving dismiss state:', error);
    }
  };

  // Verificar si fue rechazado recientemente
  useEffect(() => {
    if (showUpdatePrompt) {
      try {
        const lastDismissed = localStorage.getItem('swUpdateDismissed');
        if (lastDismissed) {
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          if (parseInt(lastDismissed) > oneHourAgo) {
            setShowUpdatePrompt(false);
            return;
          }
        }
      } catch (error) {
        console.warn('[SW Update] Error checking dismiss state:', error);
      }
    }
  }, [showUpdatePrompt]);

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <RefreshCw className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">
              Nueva versión disponible
            </h3>
            <p className="text-xs opacity-90 mt-1">
              Hay una actualización de la aplicación. ¿Recargar ahora?
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button 
                onClick={handleUpdateClick}
                size="sm"
                variant="secondary"
                className="text-xs px-3 py-1"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Actualizar
              </Button>
              <Button 
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 text-xs px-2 py-1"
              >
                Más tarde
              </Button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/80 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 