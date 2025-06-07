"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type Locale, defaultLocale } from '@/lib/translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Inicializar con locale por defecto
  const [locale, setLocaleState] = useState<Locale>(defaultLocale); 
  const [isLoading, setIsLoading] = useState(false);

  // Cargar el idioma guardado al inicializar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLocale = getCookieLocale();
      if (savedLocale && savedLocale !== locale) {
        setLocaleState(savedLocale);
      }
    }
  }, []);

  // Log solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log(`[LanguageProvider] Locale actual: ${locale}`);
  }

  const setLocale = useCallback(async (newLocale: Locale) => {
    if (newLocale === locale) return;

    setIsLoading(true);
    
    try {
      // Guardar en cookies
      setCookieLocale(newLocale);
      
      // Actualizar estado
      setLocaleState(newLocale);
      
      // Recargar la página para aplicar el cambio
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('[LanguageProvider] Error al cambiar idioma:', error);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  const value: LanguageContextType = {
    locale,
    setLocale,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage debe usarse dentro de LanguageProvider');
  }
  return context;
}

// Funciones helper para cookies
function getCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'NEXT_LOCALE' || name === 'locale') {
      const locale = value as Locale;
      if (['es', 'en', 'de'].includes(locale)) {
        return locale;
      }
    }
  }
  return null;
}

function setCookieLocale(locale: Locale) {
  if (typeof document === 'undefined') return;
  
  const isProduction = window.location.hostname.includes('web.app');
  const domain = isProduction ? '.web.app' : '';
  const sameSite = isProduction ? 'None; Secure' : 'Lax';
  
  // Establecer múltiples cookies para compatibilidad
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=${sameSite}${domain ? `; domain=${domain}` : ''}`;
  document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=${sameSite}${domain ? `; domain=${domain}` : ''}`;
}
