# 🛡️ Guía Completa de Copias de Seguridad - Stable Management Pro

Esta guía te explica todas las formas disponibles de hacer backup de tu aplicación web.

## 📋 **Resumen de Componentes a Respaldar**

### ✅ **1. Código Fuente**
- **Estado**: ✅ **YA RESPALDADO AUTOMÁTICAMENTE**
- **Ubicación**: GitHub - https://github.com/ercolomer/stable-management-pro
- **Frecuencia**: Automática con cada `git push`
- **Qué incluye**: Todo el código, configuración, componentes, estilos

### 🗃️ **2. Base de Datos Firestore**
- **Estado**: ⚠️ **REQUIERE ACCIÓN MANUAL**
- **Importancia**: 🔴 **CRÍTICO** - Contiene todos los datos de usuarios, cuadras, caballos
- **Métodos disponibles**: Ver secciones siguientes

### ⚙️ **3. Configuración de Firebase**
- **Estado**: ✅ **INCLUIDO EN SCRIPTS DE BACKUP**
- **Qué incluye**: Reglas de seguridad, configuración de hosting, índices

---

## 🚀 **Métodos de Backup Disponibles**

### **Método 1: Backup Rápido de Configuración (Recomendado)**
```bash
npm run backup:full
```
**✅ Incluye:**
- Archivos de configuración (firebase.json, package.json, etc.)
- Información del proyecto
- Instrucciones de restauración completas

**📍 Ubicación:** `backups/full-backup-YYYY-MM-DD/`

### **Método 2: Backup Manual desde Firebase Console**
1. Ir a [Firebase Console](https://console.firebase.google.com/project/stable-management-pro-89fdd/firestore)
2. **Firestore Database** → **Exportar datos**
3. Seleccionar todas las colecciones
4. Exportar a Cloud Storage

### **Método 3: Backup de Código desde GitHub**
```bash
# Clonar repositorio completo
git clone https://github.com/ercolomer/stable-management-pro.git

# O descargar ZIP desde GitHub
# https://github.com/ercolomer/stable-management-pro/archive/main.zip
```

---

## 📂 **Estructura de Backups Locales**

```
backups/
├── full-backup-YYYY-MM-DD/
│   ├── config/                     # Archivos de configuración
│   │   ├── firebase.json
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── ...
│   ├── project-info.json           # Información del proyecto
│   └── RESTORE-INSTRUCTIONS.md     # Guía de restauración
│
└── firestore-backup-YYYY-MM-DD/    # (Cuando funcione la autenticación)
    ├── complete-backup.json        # Backup completo
    ├── users.json                  # Usuarios
    ├── stables.json                # Cuadras
    ├── horses.json                 # Caballos
    ├── tasks.json                  # Tareas
    └── assignments.json            # Asignaciones
```

---

## 🔄 **Restauración Completa**

### **Escenario 1: Recuperar desde GitHub + Configuración Local**
```bash
# 1. Clonar repositorio
git clone https://github.com/ercolomer/stable-management-pro.git
cd stable-management-pro

# 2. Instalar dependencias
npm install

# 3. Configurar Firebase
firebase login
firebase use stable-management-pro-89fdd

# 4. Probar aplicación
npm run dev

# 5. Desplegar
npm run deploy
```

### **Escenario 2: Recuperar desde Backup Local**
```bash
# 1. Usar archivos del backup
cp backups/full-backup-YYYY-MM-DD/config/* ./

# 2. Instalar dependencias
npm install

# 3. Continuar pasos 3-5 del escenario anterior
```

---

## ⏰ **Estrategia de Backup Recomendada**

### **Frecuencia Sugerida:**
- 📅 **Semanal**: `npm run backup:full`
- 📅 **Mensual**: Backup manual de Firestore desde console
- 📅 **Antes de cambios importantes**: Backup completo
- 📅 **Automático**: GitHub mantiene historial de código

### **Rotación de Backups:**
- Mantener últimos 5 backups locales
- Archivar backups mensuales en ubicación externa
- GitHub mantiene historial completo automáticamente

---

## 🔗 **URLs Importantes para Backup**

- **Firebase Console**: https://console.firebase.google.com/project/stable-management-pro-89fdd
- **GitHub Repo**: https://github.com/ercolomer/stable-management-pro
- **Aplicación Live**: https://stable-management-pro-89fdd.web.app

---

## 📞 **Comandos Útiles**

```bash
# Backup completo de configuración
npm run backup:full

# Backup de Firestore (cuando esté configurado)
npm run backup:firestore

# Ver estado de Git
git status

# Subir cambios a GitHub
git add .
git commit -m "Descripción de cambios"
git push

# Desplegar aplicación
npm run deploy

# Ver logs de Firebase
firebase --help
```

---

## ⚠️ **Notas Importantes**

1. **GitHub es tu backup principal** - Todo el código está ahí automáticamente
2. **Firestore requiere backup manual** - Firebase Console es la opción más confiable
3. **Configuración local se puede recuperar** - Con los scripts de backup o desde GitHub
4. **Variables de entorno** - Las credenciales están en el código, no hay .env secreto
5. **Hosting se redespliega fácil** - Con `npm run deploy`

---

## 🆘 **En Caso de Emergencia**

**Si pierdes todo localmente:**
1. 📥 Clona desde GitHub: `git clone https://github.com/ercolomer/stable-management-pro.git`
2. 📦 Instala: `npm install`
3. 🔧 Configura Firebase: `firebase use stable-management-pro-89fdd`
4. 🚀 Despliega: `npm run deploy`

**La aplicación estará funcionando en menos de 10 minutos.**

---

**Última actualización**: $(date)
**Versión**: 1.0.0 