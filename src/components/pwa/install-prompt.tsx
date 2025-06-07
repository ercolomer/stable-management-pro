'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { LogoIcon } from '@/components/icons/logo-icon';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      console.log('[InstallPrompt] Component mounted, setting up PWA install functionality...');
      
      // PARA TESTING: Limpiar estado previo de dismissal
      try {
        localStorage.removeItem('installPromptDismissed');
        console.log('[InstallPrompt] Cleared previous dismissal state for testing');
      } catch (e) {
        console.warn('[InstallPrompt] Could not clear localStorage:', e);
      }
      
      // Verificar si ya está instalado
      const checkStandalone = () => {
        try {
          const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                            (window.navigator as any).standalone ||
                            document.referrer.includes('android-app://');
          console.log('[InstallPrompt] Standalone check:', { 
            standalone,
            displayMode: window.matchMedia('(display-mode: standalone)').matches,
            navigatorStandalone: (window.navigator as any).standalone,
            referrer: document.referrer.substring(0, 50)
          });
          setIsStandalone(standalone);
        } catch (error) {
          console.warn('[InstallPrompt] Error checking standalone mode:', error);
          setIsStandalone(false);
        }
      };

      checkStandalone();

      // Verificar Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          console.log('[InstallPrompt] Service Worker status:', registration ? 'Active' : 'Not found');
        });
      }

      // Verificar manifest
      const ensureManifest = () => {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
          console.log('[InstallPrompt] Creating manifest link...');
          const link = document.createElement('link');
          link.rel = 'manifest';
          link.href = '/manifest.json';
          document.head.appendChild(link);
          console.log('[InstallPrompt] Manifest link created');
        } else {
          console.log('[InstallPrompt] Manifest link exists:', manifestLink.getAttribute('href'));
        }
      };

      ensureManifest();

      // Escuchar el evento beforeinstallprompt - CRÍTICO para la funcionalidad
      const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
        try {
          console.log('🎉 [InstallPrompt] beforeinstallprompt event CAPTURED!');
          console.log('[InstallPrompt] Event platforms:', e.platforms);
          
          // Prevenir el prompt automático del navegador
          e.preventDefault();
          
          // Guardar el evento para uso posterior
          setDeferredPrompt(e);
          promptEventRef.current = e;
          
          console.log('[InstallPrompt] Install prompt event stored, ready for manual trigger');
          
          // Mostrar nuestro banner personalizado
          setTimeout(() => {
            console.log('[InstallPrompt] Showing custom install banner');
            setShowInstallPrompt(true);
          }, 1500);
          
        } catch (error) {
          console.error('[InstallPrompt] Error handling beforeinstallprompt:', error);
          setHasError(true);
        }
      };

      // Escuchar cuando se instala la app
      const handleAppInstalled = () => {
        try {
          console.log('✅ [InstallPrompt] PWA installed successfully!');
          setShowInstallPrompt(false);
          setDeferredPrompt(null);
          promptEventRef.current = null;
          setIsStandalone(true);
        } catch (error) {
          console.error('[InstallPrompt] Error handling appinstalled:', error);
        }
      };

      // Registrar listeners
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      console.log('[InstallPrompt] Event listeners registered, waiting for beforeinstallprompt...');

      // PARA TESTING: Forzar mostrar si no hay evento nativo después de un tiempo
      const testingTimeout = setTimeout(() => {
        console.log('[InstallPrompt] 🧪 Testing timeout - checking conditions...');
        console.log('[InstallPrompt] Current state:', { 
          hasPromptEvent: !!promptEventRef.current, 
          isStandalone, 
          showInstallPrompt,
          hasError
        });
        
        if (!isStandalone && !showInstallPrompt && !hasError) {
          console.log('[InstallPrompt] 🚀 TESTING: Forcing banner display (no native event detected)');
          setShowInstallPrompt(true);
        }
      }, 3000);

      // Cleanup
      return () => {
        try {
          clearTimeout(testingTimeout);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          window.removeEventListener('appinstalled', handleAppInstalled);
          console.log('[InstallPrompt] Event listeners cleaned up');
        } catch (error) {
          console.warn('[InstallPrompt] Error during cleanup:', error);
        }
      };
    } catch (error) {
      console.error('[InstallPrompt] Error in setup:', error);
      setHasError(true);
    }
  }, []);

  const handleInstallClick = async () => {
    console.log('[InstallPrompt] Install button clicked');
    console.log('[InstallPrompt] Available prompt:', !!deferredPrompt, !!promptEventRef.current);
    
    const promptToUse = deferredPrompt || promptEventRef.current;
    
    if (!promptToUse) {
      console.log('[InstallPrompt] No native install prompt available, showing manual instructions');
      
      // Mostrar instrucciones específicas por navegador
      const userAgent = navigator.userAgent;
      const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');
      const isEdge = userAgent.includes('Edg');
      const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
      const isFirefox = userAgent.includes('Firefox');
      
      let instructions = '';
      if (isChrome) {
        instructions = '✅ En Chrome:\n1. Busca el ícono de instalación (⚙️) en la barra de direcciones\n2. O ve al menú (⋮) → "Instalar Connected Stable"\n3. Confirma la instalación';
      } else if (isEdge) {
        instructions = '✅ En Edge:\n1. Busca el ícono de instalación (+) en la barra de direcciones\n2. O ve al menú (⋯) → "Aplicaciones" → "Instalar este sitio como aplicación"\n3. Confirma la instalación';
      } else if (isSafari) {
        instructions = '✅ En Safari:\n1. Toca el botón de compartir (□↗)\n2. Selecciona "Agregar a pantalla de inicio"\n3. Confirma con "Agregar"';
      } else if (isFirefox) {
        instructions = '✅ En Firefox:\n1. Ve al menú (≡) → "Instalar"\n2. O busca el ícono de instalación en la barra de direcciones';
      } else {
        instructions = '✅ Para instalar:\n1. Busca el ícono de instalación en la barra de direcciones\n2. O ve al menú del navegador → "Instalar"\n3. Sigue las instrucciones del navegador';
      }
      
      alert(`📱 Instalación Manual\n\n${instructions}\n\n💡 Tip: Una vez instalada, la app aparecerá como cualquier otra aplicación en tu dispositivo.`);
      return;
    }

    try {
      setIsInstalling(true);
      console.log('[InstallPrompt] Triggering native install prompt...');
      
      // Mostrar el prompt nativo del navegador
      await promptToUse.prompt();
      
      // Esperar la respuesta del usuario
      const choiceResult = await promptToUse.userChoice;
      console.log(`[InstallPrompt] User choice: ${choiceResult.outcome}`);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[InstallPrompt] ✅ User accepted installation!');
        setShowInstallPrompt(false);
        // La app se instalará automáticamente
      } else {
        console.log('[InstallPrompt] ❌ User dismissed installation');
        setShowInstallPrompt(false);
      }
      
    } catch (error) {
      console.error('[InstallPrompt] Error during installation:', error);
      alert('⚠️ Error durante la instalación. Por favor, intenta instalar manualmente desde el menú del navegador.');
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
      promptEventRef.current = null;
    }
  };

  const handleDismiss = () => {
    try {
      console.log('[InstallPrompt] User dismissed install banner');
      setShowInstallPrompt(false);
      
      // En producción, recordar dismissal por un día
      if (process.env.NODE_ENV === 'production') {
        try {
          localStorage.setItem('installPromptDismissed', Date.now().toString());
          console.log('[InstallPrompt] Dismissal saved for production');
        } catch (e) {
          console.warn('[InstallPrompt] Could not save dismissal state:', e);
        }
      }
    } catch (error) {
      console.warn('[InstallPrompt] Error in dismiss handler:', error);
      setShowInstallPrompt(false);
    }
  };

  // No mostrar en SSR
  if (typeof window === 'undefined') {
    return null;
  }

  // Logging de decisión de renderizado
  console.log('[InstallPrompt] Render decision:', {
    hasError,
    isStandalone, 
    showInstallPrompt,
    hasPromptEvent: !!deferredPrompt || !!promptEventRef.current,
    isInstalling
  });

  // Condiciones para no mostrar
  if (hasError) {
    console.log('[InstallPrompt] Hidden due to error');
    return null;
  }
  
  if (isStandalone) {
    console.log('[InstallPrompt] Hidden - app already in standalone mode');
    return null;
  }
  
  if (!showInstallPrompt) {
    console.log('[InstallPrompt] Hidden - showInstallPrompt flag is false');
    return null;
  }

  // En producción, verificar dismissal reciente
  if (process.env.NODE_ENV === 'production') {
    try {
      const lastDismissed = localStorage.getItem('installPromptDismissed');
      if (lastDismissed) {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (parseInt(lastDismissed) > oneDayAgo) {
          console.log('[InstallPrompt] Hidden - recently dismissed in production');
          return null;
        }
      }
    } catch (error) {
      console.warn('[InstallPrompt] Error checking dismissal state:', error);
    }
  }

  console.log('[InstallPrompt] 🚀 RENDERING INSTALL BANNER!');

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#fbf7eb' }}>
              <LogoIcon width={40} height={40} />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Instalar Connected Stable
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {deferredPrompt || promptEventRef.current 
                ? "Instala la app para acceso rápido y mejor experiencia" 
                : "Accede desde el menú del navegador para instalar"
              }
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button 
                onClick={handleInstallClick}
                disabled={isInstalling}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs px-3 py-1"
              >
                <Download className="w-3 h-3 mr-1" />
                {isInstalling ? 'Instalando...' : 'Instalar'}
              </Button>
              <Button 
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1"
              >
                Ahora no
              </Button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 