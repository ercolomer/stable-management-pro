// Utilidades para manejo de cookies en producción
import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';

export const COOKIE_NAME = 'preferred-locale';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number;
  domain?: string;
}

export function setCookie(name: string, value: string, options: CookieOptions = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isFirebaseHosting = typeof window !== 'undefined' && window.location.hostname.includes('.web.app');
  
  const defaultOptions: CookieOptions = {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: isProduction && !window.location.hostname.includes('localhost'), // HTTPS excepto localhost
    ...options
  };

  // Para Firebase Hosting, no especificar domain para evitar problemas cross-domain
  if (isFirebaseHosting) {
    delete defaultOptions.domain;
  }

  const cookieParts = [
    `${name}=${value}`,
    `path=${defaultOptions.path}`,
    `max-age=${defaultOptions.maxAge}`,
    `SameSite=${defaultOptions.sameSite}`
  ];

  if (defaultOptions.secure) {
    cookieParts.push('Secure');
  }

  if (defaultOptions.httpOnly) {
    cookieParts.push('HttpOnly');
  }

  if (defaultOptions.domain) {
    cookieParts.push(`Domain=${defaultOptions.domain}`);
  }

  return cookieParts.join('; ');
}

export function setLocaleCookie(locale: string) {
  if (typeof document === 'undefined') {
    return '';
  }

  // También guardar en localStorage como backup
  try {
    localStorage.setItem('preferred-locale', locale);
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }

  const cookieString = setCookie(COOKIE_NAME, locale);
  document.cookie = cookieString;
  
  // Log en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cookies] Configurando idioma: ${locale} -> ${cookieString}`);
  }
  
  return cookieString;
}

export function getLocaleCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  // Primero intentar obtener de las cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_NAME) {
      return value;
    }
  }
  
  // Si no hay cookie, intentar obtener de localStorage como fallback
  try {
    const stored = localStorage.getItem('preferred-locale');
    if (stored) {
      // Si encontramos en localStorage, configurar la cookie también
      setLocaleCookie(stored);
      return stored;
    }
  } catch (e) {
    console.warn('No se pudo leer de localStorage:', e);
  }
  
  return null;
}

// Para uso en Server Components
export function getLocaleFromCookies(cookieStore: RequestCookies): string | null {
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value || null;
}
