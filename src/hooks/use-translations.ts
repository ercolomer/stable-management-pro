import { useLanguage } from '@/contexts/language-context';
import { translations, type Locale } from '@/lib/translations';

/**
 * Hook personalizado que reemplaza useTranslations de next-intl
 * Mantiene exactamente la misma sintaxis y funcionalidad
 */
export function useTranslations(section: string) {
  const { locale } = useLanguage();
  
  return (key: string): string => {
    try {
      // Acceder a la traducción usando la estructura actual
      const localeTranslations = translations[locale as Locale];
      const sectionTranslations = (localeTranslations as any)?.[section];
      
      if (!sectionTranslations) {
        console.warn(`[useTranslations] Sección '${section}' no encontrada para idioma '${locale}'`);
        return key; // Devolver la key como fallback
      }
      
      const translation = sectionTranslations[key];
      
      if (!translation) {
        console.warn(`[useTranslations] Clave '${key}' no encontrada en sección '${section}' para idioma '${locale}'`);
        return key; // Devolver la key como fallback
      }
      
      return translation;
    } catch (error) {
      console.error(`[useTranslations] Error obteniendo traducción ${section}.${key}:`, error);
      return key; // Devolver la key como fallback
    }
  };
}

/**
 * Hook para obtener el locale actual (compatibilidad con next-intl)
 */
export function useLocale() {
  const { locale } = useLanguage();
  return locale;
} 