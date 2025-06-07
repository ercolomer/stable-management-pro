import {getRequestConfig} from 'next-intl/server';
import { cookies } from 'next/headers';
import { translations, defaultLocale, type Locale } from './lib/translations';

export default getRequestConfig(async () => {
  // Obtener locale de las cookies con múltiples intentos
  const cookieStore = await cookies();
  let savedLocale = cookieStore.get('preferred-locale')?.value;
  
  // También intentar leer de otros posibles nombres de cookie como backup
  if (!savedLocale) {
    savedLocale = cookieStore.get('locale')?.value;
  }
  
  // Validar y usar el locale con validación más estricta
  let locale: Locale = defaultLocale;
  const validLocales: Locale[] = ['es', 'en', 'de'];
  
  if (savedLocale && validLocales.includes(savedLocale as Locale)) {
    locale = savedLocale as Locale;
  }
  
  // Log mejorado para debug en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log(`[i18n] Idioma activo: ${locale} (cookie: ${savedLocale || 'ninguna'})`);
    console.log(`[i18n] Cookies disponibles:`, cookieStore.getAll().map(c => `${c.name}=${c.value}`));
  }

  // Usar traducciones estáticas con validación
  const messages = translations[locale];
  
  if (!messages || Object.keys(messages).length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[i18n] ❌ Error: no hay mensajes para ${locale}, usando fallback a ${defaultLocale}`);
    }
    return {
      locale: defaultLocale,
      messages: translations[defaultLocale]
    };
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[i18n] ✅ Mensajes cargados para ${locale}: ${Object.keys(messages).length} secciones`);
  }

  return {
    locale,
    messages
  };
});
