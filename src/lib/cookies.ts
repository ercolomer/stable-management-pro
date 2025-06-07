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
}

export function setCookie(name: string, value: string, options: CookieOptions = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const defaultOptions: CookieOptions = {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: isProduction, // Solo HTTPS en producción
    ...options
  };

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

  return cookieParts.join('; ');
}

export function setLocaleCookie(locale: string) {
  const cookieString = setCookie(COOKIE_NAME, locale);
  
  if (typeof document !== 'undefined') {
    document.cookie = cookieString;
  }
  
  return cookieString;
}

export function getLocaleCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_NAME) {
      return value;
    }
  }
  
  return null;
}

// Para uso en Server Components
export function getLocaleFromCookies(cookieStore: RequestCookies): string | null {
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value || null;
}
