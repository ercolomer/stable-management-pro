import {getRequestConfig} from 'next-intl/server';
import { cookies } from 'next/headers';
import { translations, defaultLocale, type Locale } from './lib/translations';

export default getRequestConfig(async () => {
  // Obtener locale de las cookies
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get('preferred-locale')?.value;
  
  // Validar y usar el locale
  let locale: Locale = defaultLocale;
  if (savedLocale && (savedLocale === 'es' || savedLocale === 'en' || savedLocale === 'de')) {
    locale = savedLocale as Locale;
  }
  
  // En producción, no logueamos para evitar ruido
  if (process.env.NODE_ENV === 'development') {
    console.log(`[i18n] Idioma activo: ${locale} (cookie: ${savedLocale || 'ninguna'})`);
  }

  // Usar traducciones estáticas
  const messages = translations[locale];
  
  if (!messages) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[i18n] ❌ Error: no hay mensajes para ${locale}`);
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
