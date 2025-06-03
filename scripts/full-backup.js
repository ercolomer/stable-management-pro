// scripts/full-backup.js
const fs = require('fs').promises;
const path = require('path');

async function createFullBackup() {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupDir = path.join(__dirname, '..', 'backups', `full-backup-${timestamp}`);
  
  try {
    // Crear directorio de backup
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`📁 Directorio de backup completo creado: ${backupDir}`);
    
    // Archivos importantes de configuración
    const configFiles = [
      'firebase.json',
      'package.json',
      'next.config.js',
      'tailwind.config.ts',
      'tsconfig.json',
      '.firebaserc',
      'apphosting.yaml',
      'README.md'
    ];
    
    console.log('📄 Copiando archivos de configuración...');
    for (const file of configFiles) {
      try {
        const source = path.join(__dirname, '..', file);
        const dest = path.join(backupDir, 'config', file);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(source, dest);
        console.log(`   ✅ ${file}`);
      } catch (error) {
        console.log(`   ⚠️  ${file} (no encontrado)`);
      }
    }
    
    // Información del proyecto
    const projectInfo = {
      timestamp: new Date().toISOString(),
      projectName: "Stable Management Pro",
      version: "1.0.0",
      firebaseProject: "stable-management-pro-89fdd",
      hostingUrl: "https://stable-management-pro-89fdd.web.app",
      githubRepo: "https://github.com/ercolomer/stable-management-pro",
      description: "Sistema de gestión de cuadras de caballos",
      dependencies: {
        framework: "Next.js 15",
        database: "Firebase Firestore",
        auth: "Firebase Auth",
        hosting: "Firebase Hosting",
        ui: "Tailwind CSS + shadcn/ui"
      },
      features: [
        "Autenticación con Google",
        "Gestión de usuarios y roles",
        "Gestión de cuadras",
        "Gestión de caballos",
        "Asignación de tareas",
        "Panel de administración",
        "Panel de jinetes"
      ],
      structure: {
        "src/app": "Páginas de la aplicación (App Router)",
        "src/components": "Componentes React reutilizables",
        "src/contexts": "Contextos de React (Auth)",
        "src/lib": "Utilidades y configuración",
        "src/types": "Definiciones de tipos TypeScript",
        "public": "Archivos estáticos",
        "scripts": "Scripts de utilidad"
      }
    };
    
    const projectInfoFile = path.join(backupDir, 'project-info.json');
    await fs.writeFile(projectInfoFile, JSON.stringify(projectInfo, null, 2));
    console.log('   ✅ project-info.json');
    
    // Instrucciones de restauración
    const restoreInstructions = `# 🔄 Instrucciones de Restauración

## 📋 Requisitos Previos
- Node.js 18+ instalado
- Firebase CLI instalado (\`npm install -g firebase-tools\`)
- Cuenta de Firebase activa

## 🚀 Pasos para Restaurar

### 1. Configurar el entorno
\`\`\`bash
# Clonar desde GitHub (opción recomendada)
git clone https://github.com/ercolomer/stable-management-pro.git
cd stable-management-pro

# O usar los archivos de configuración del backup
# Copiar todos los archivos de config/ al directorio raíz
\`\`\`

### 2. Instalar dependencias
\`\`\`bash
npm install
\`\`\`

### 3. Configurar Firebase
\`\`\`bash
# Iniciar sesión en Firebase
firebase login

# Configurar el proyecto
firebase use stable-management-pro-89fdd
\`\`\`

### 4. Configurar variables de entorno
Crear archivo \`.env.local\`:
\`\`\`
# Firebase Config (ya incluida en el código)
# Las variables están configuradas en src/lib/firebase/config.ts
\`\`\`

### 5. Probar en desarrollo
\`\`\`bash
npm run dev
\`\`\`

### 6. Desplegar a producción
\`\`\`bash
npm run deploy
\`\`\`

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
`;
    
    const instructionsFile = path.join(backupDir, 'RESTORE-INSTRUCTIONS.md');
    await fs.writeFile(instructionsFile, restoreInstructions);
    console.log('   ✅ RESTORE-INSTRUCTIONS.md');
    
    console.log('\n🎉 ¡Backup completo creado exitosamente!');
    console.log(`📍 Ubicación: ${backupDir}`);
    console.log(`📋 Contenido del backup:`);
    console.log(`   📁 config/ - Archivos de configuración`);
    console.log(`   📄 project-info.json - Información del proyecto`);
    console.log(`   📖 RESTORE-INSTRUCTIONS.md - Instrucciones de restauración`);
    
  } catch (error) {
    console.error('❌ Error durante el backup completo:', error);
  }
}

// Ejecutar backup
createFullBackup().then(() => {
  console.log('\n✅ Proceso de backup completo finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 