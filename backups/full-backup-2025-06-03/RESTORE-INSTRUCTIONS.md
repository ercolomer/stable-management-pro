# 🔄 Instrucciones de Restauración

## 📋 Requisitos Previos
- Node.js 18+ instalado
- Firebase CLI instalado (`npm install -g firebase-tools`)
- Cuenta de Firebase activa

## 🚀 Pasos para Restaurar

### 1. Configurar el entorno
```bash
# Clonar desde GitHub (opción recomendada)
git clone https://github.com/ercolomer/stable-management-pro.git
cd stable-management-pro

# O usar los archivos de configuración del backup
# Copiar todos los archivos de config/ al directorio raíz
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Firebase
```bash
# Iniciar sesión en Firebase
firebase login

# Configurar el proyecto
firebase use stable-management-pro-89fdd
```

### 4. Configurar variables de entorno
Crear archivo `.env.local`:
```
# Firebase Config (ya incluida en el código)
# Las variables están configuradas en src/lib/firebase/config.ts
```

### 5. Probar en desarrollo
```bash
npm run dev
```

### 6. Desplegar a producción
```bash
npm run deploy
```

## 🗃️ Restaurar Base de Datos
La base de datos Firestore debe restaurarse manualmente desde:
- Firebase Console > Firestore > Import
- O usando los archivos JSON de backup si están disponibles

## 🔗 URLs Importantes
- **Aplicación**: https://stable-management-pro-89fdd.web.app
- **GitHub**: https://github.com/ercolomer/stable-management-pro
- **Firebase Console**: https://console.firebase.google.com/project/stable-management-pro-89fdd

## 📞 Contacto
Para soporte técnico, contactar al desarrollador a través del repositorio GitHub.
