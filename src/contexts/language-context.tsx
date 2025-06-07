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
    console.log(`[LanguageProvider] 🏗️ Inicializandoo - nextIntlLocale: ${nextIntlLocale}, initialLocale: ${locale}`);
    console.log(`[LanguageProvider] 📊 Estado actual: locale=${locale}, isLoading=${isLoading}, nextIntl=${nextIntlLocale}`);
  }

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LanguageProvider] 🔄 useEffect ejecutándose. nextIntlLocale: ${nextIntlLocale}, currentLocale: ${locale}`);
    }
    
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
      console.log(`[LanguageProvider] 🔄 Solicitando cambio a: ${newLocale} (actual: ${locale})`);
    }
    
    // Prevenir cambios si ya es el mismo idioma
    if (newLocale === locale) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[LanguageProvider] ⏭️ Idioma ya seleccionado: ${newLocale}`);
      }
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Importar dinámicamente para evitar problemas SSR
      const { setLocaleCookie } = await import('@/lib/cookies');
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[LanguageProvider] 🍪 Configurando cookies para: ${newLocale}`);
      }
      
      // Configurar cookie de idioma
      const cookieResult = setLocaleCookie(newLocale);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[LanguageProvider] 🍪 Cookie configurada: ${cookieResult}`);
      }
      
      // Actualizar estado inmediatamente
      setLocaleState(newLocale);
      
      // En producción, forzar recarga después de un breve delay
      // Esto es necesario para Firebase Hosting
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[LanguageProvider] 🔄 Recargando página para aplicar cambio de idioma`);
          }
          window.location.reload();
        }, 150); // Aumentar el delay para producción
      }
      
    } catch (error) {
      console.error(`[LanguageProvider] ❌ Error al cambiar idioma:`, error);
      setIsLoading(false);
      
      // Intentar método alternativo si falla
      if (typeof window !== 'undefined') {
        try {
          // Método directo de cookie como fallback
          document.cookie = `preferred-locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
          localStorage.setItem('preferred-locale', newLocale);
          
          setTimeout(() => {
            window.location.reload();
          }, 200);
        } catch (fallbackError) {
          console.error(`[LanguageProvider] ❌ Error en método fallback:`, fallbackError);
        }
      }
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
