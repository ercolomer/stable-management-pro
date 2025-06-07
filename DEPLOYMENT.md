# Guía de Deployment - Connected Stable

## 📋 Pre-requisitos

1. **Node.js** v18 o superior
2. **Firebase CLI** instalado (`npm install -g firebase-tools`)
3. **Cuenta de Firebase** con proyecto configurado
4. **Variables de entorno** configuradas en `.env.local`

## 🚀 Pasos para el Deploy

### 1. Verificación Pre-deploy

Ejecuta el script de verificación para asegurarte de que todo esté configurado:

```bash
npm run pre-deploy
```

Este script verificará:
- ✅ Variables de entorno configuradas
- ✅ Archivos de traducción válidos
- ✅ Configuración de Firebase
- ✅ Archivos PWA
- ✅ Dependencias necesarias

### 2. Build de Producción

```bash
npm run build
```

Esto creará una versión optimizada de la aplicación en la carpeta `.next/`.

### 3. Deploy a Firebase

#### Opción A: Deploy a Producción
```bash
npm run deploy
```

#### Opción B: Deploy a Preview (recomendado para pruebas)
```bash
npm run deploy:preview
```

### 4. Verificación Post-deploy

1. Visita tu URL de Firebase: `https://[tu-proyecto].web.app`
2. Verifica que el selector de idiomas funcione
3. Prueba el login/registro
4. Verifica que las traducciones cambien correctamente

## 🔧 Configuración de Variables de Entorno

### En Local (.env.local)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### En Firebase (para funciones serverless)
```bash
firebase functions:config:set someservice.key="THE API KEY"
```

## 🌐 Configuración de Dominio Personalizado

1. En Firebase Console → Hosting → Agregar dominio personalizado
2. Sigue las instrucciones para verificar el dominio
3. Configura los registros DNS según las instrucciones

## 📱 PWA (Progressive Web App)

La aplicación está configurada como PWA. Para verificar:

1. Abre la aplicación en Chrome
2. Verifica que aparezca el ícono de instalación en la barra de direcciones
3. En DevTools → Application → Manifest, verifica que todo esté correcto

## 🔍 Monitoreo Post-deploy

### Firebase Console
- **Analytics**: Verifica el tráfico y eventos
- **Performance**: Monitorea el rendimiento
- **Crashlytics**: Revisa errores (si está configurado)

### Logs
```bash
firebase functions:log
```

## 🚨 Solución de Problemas Comunes

### Error: "Firebase project not found"
```bash
firebase login
firebase use --add
```

### Error: "Build failed"
1. Verifica que no haya errores de TypeScript: `npm run typecheck`
2. Verifica los logs de build para errores específicos
3. Asegúrate de que todas las dependencias estén instaladas

### Las traducciones no funcionan
1. Verifica que los archivos en `/messages` estén completos
2. Verifica que las cookies se estén guardando correctamente
3. Revisa la consola del navegador para errores

## 🔄 Actualizaciones Futuras

Para actualizar la aplicación:

1. Haz tus cambios en el código
2. Ejecuta `npm run pre-deploy` para verificar
3. Ejecuta `npm run deploy`

## 📊 Métricas de Rendimiento

La aplicación debe cumplir con:
- **Lighthouse Score**: > 90 en todas las categorías
- **First Contentful Paint**: < 1.8s
- **Time to Interactive**: < 3.9s

## 🔐 Seguridad

- Las reglas de Firestore están configuradas en `firestore.rules`
- Las reglas de Storage están en `storage.rules`
- Revisa regularmente las dependencias: `npm audit`

## 📞 Soporte

Si encuentras problemas durante el deploy:
1. Revisa los logs de Firebase
2. Verifica la consola del navegador
3. Revisa esta documentación
