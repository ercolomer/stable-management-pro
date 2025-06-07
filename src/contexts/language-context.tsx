"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';

type Locale = 'es' | 'en' | 'de';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const nextIntlLocale = useLocale() as Locale;
  
  // Usar el locale de next-intl como estado inicial
  const [locale, setLocaleState] = useState<Locale>(nextIntlLocale); 
  const [isLoading, setIsLoading] = useState(false);

  // Log solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log(`[LanguageProvider] 🏗️ Inicializando - nextIntlLocale: ${nextIntlLocale}`);
  }

  useEffect(() => {
    // Solo sincronizar si es diferente
    if (nextIntlLocale && nextIntlLocale !== locale) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[LanguageProvider] ✅ Sincronizando con nextIntlLocale: ${locale} → ${nextIntlLocale}`);
      }
      setLocaleState(nextIntlLocale);
    }
  }, [nextIntlLocale, locale]);

  const setLocale = useCallback(async (newLocale: Locale) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LanguageProvider] 🔄 Cambiando a ${newLocale}`);
    }
    
    // Prevenir cambios si ya es el mismo idioma
    if (newLocale === locale) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Actualizar estado inmediatamente para feedback visual
      setLocaleState(newLocale);
      
      // Guardar en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferred-locale', newLocale);
      }
      
      // Establecer cookie de forma segura
      const { setLocaleCookie } = await import('@/lib/cookies');
      setLocaleCookie(newLocale);
      
      // Pequeño delay para asegurar que las cookies se guarden
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[LanguageProvider] ❌ Error al cambiar idioma:`, error);
      }
      setIsLoading(false);
    }
  }, [locale]);

  const value = {
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
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
