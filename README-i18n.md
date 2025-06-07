# Internacionalización sin Routing en Connected Stable

Este proyecto utiliza `next-intl` para la internacionalización, pero **sin rutas internacionalizadas**. Esto significa que el idioma se maneja internamente sin agregar `/es` o `/en` a las URLs.

## Configuración

### 1. Archivos de configuración

- **`src/i18n.ts`**: Configuración principal de next-intl que obtiene el idioma de las cookies
- **`src/contexts/language-context.tsx`**: Contexto de React que maneja el estado del idioma y sincronización con cookies
- **`messages/es.json`** y **`messages/en.json`**: Archivos de traducciones

### 2. Estructura sin routing internacionalizado

Las páginas están en `src/app/` directamente (no en `src/app/[locale]/`):
- `src/app/page.tsx` - Página principal
- `src/app/(auth)/login/page.tsx` - Login
- `src/app/(auth)/register/page.tsx` - Registro
- `src/app/profile/page.tsx` - Perfil
- etc.

### 3. Cómo funciona

1. **Detección de idioma**: El idioma se obtiene de las cookies usando `src/i18n.ts`
2. **Estado del idioma**: Se maneja con `LanguageContext` que sincroniza `localStorage` y cookies
3. **Selector de idioma**: Componente `LanguageSelector` que permite cambiar el idioma
4. **Sin rutas de idioma**: Las URLs no incluyen `/es` o `/en`

## Uso

### En componentes

```tsx
import { useTranslations } from 'next-intl';
import { useLanguage } from '@/contexts/language-context';

function MyComponent() {
  const t = useTranslations('common');
  const { locale, setLocale } = useLanguage();
  
  return (
    <div>
      <p>{t('welcome')}</p>
      <button onClick={() => setLocale('en')}>English</button>
    </div>
  );
}
```

### Selector de idioma

```tsx
import { LanguageSelector } from '@/components/language-selector';

function MyPage() {
  return (
    <div>
      <LanguageSelector />
      {/* resto del contenido */}
    </div>
  );
}
```

## Traducciones

Las traducciones están organizadas por secciones en los archivos JSON:

- `common`: Textos comunes (botones, loading, etc.)
- `auth`: Autenticación (login, registro, etc.)
- `navigation`: Navegación
- `dashboard`: Panel de control
- `horses`: Gestión de caballos
- `training`: Planes de entrenamiento
- `profile`: Perfil de usuario
- `stable`: Gestión de cuadra

## Ventajas de esta configuración

1. **URLs limpias**: Sin prefijos de idioma en las URLs
2. **SEO amigable**: Una sola URL por página
3. **Experiencia de usuario**: Cambio de idioma sin cambiar la URL
4. **Simplicidad**: No hay que manejar rutas complejas con locale
5. **Persistencia**: El idioma se guarda en cookies y localStorage

## Cambio de idioma

Cuando el usuario cambia el idioma:
1. Se actualiza el estado en `LanguageContext`
2. Se guarda en cookies para el servidor
3. Se guarda en localStorage para persistencia
4. Se recarga la página para aplicar los nuevos mensajes

## Migración desde routing internacionalizado

Si se necesita migrar a rutas con idioma:
1. Mover páginas a `src/app/[locale]/`
2. Actualizar `src/i18n.ts` para usar el parámetro locale
3. Actualizar las rutas en los componentes
4. Configurar `next.config.js` para routing internacionalizado 