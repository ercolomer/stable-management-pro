// Este archivo asegura que todos los archivos de traducción se incluyan en el build
// Importamos todos los archivos JSON de forma estática para garantizar su inclusión

import esMessages from '../../messages/es.json';
import enMessages from '../../messages/en.json';
import deMessages from '../../messages/de.json';

export const translations = {
  es: esMessages,
  en: enMessages,
  de: deMessages,
} as const;

export const locales = ['es', 'en', 'de'] as const;
export const defaultLocale = 'es' as const;

export type Locale = typeof locales[number];

// Función helper para obtener traducciones
export function getMessages(locale: Locale) {
  return translations[locale] || translations[defaultLocale];
} 