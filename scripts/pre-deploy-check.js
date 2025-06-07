#!/usr/bin/env node

/**
 * Script de verificación pre-deploy
 * Verifica que todo esté configurado correctamente antes del despliegue
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Verificando configuración para deploy...\n');

let hasErrors = false;

// 1. Verificar variables de entorno
console.log('1️⃣ Verificando variables de entorno...');
const envPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.error('❌ ERROR: No se encontró archivo .env.local');
  console.log('   Copia .env.example a .env.local y configura tus variables');
  hasErrors = true;
} else {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];

  const missingVars = requiredVars.filter(varName => {
    const regex = new RegExp(`^${varName}=.+`, 'm');
    return !regex.test(envContent) || envContent.includes(`${varName}=TU_`) || envContent.includes(`${varName}=your_`);
  });

  if (missingVars.length > 0) {
    console.error('❌ ERROR: Variables de entorno no configuradas:');
    missingVars.forEach(v => console.log(`   - ${v}`));
    hasErrors = true;
  } else {
    console.log('✅ Variables de entorno configuradas correctamente');
  }
}

// 2. Verificar archivos de traducción
console.log('\n2️⃣ Verificando archivos de traducción...');
const locales = ['es', 'en', 'de'];
const messagesDir = path.join(__dirname, '..', 'messages');

locales.forEach(locale => {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ERROR: No se encontró archivo de traducción ${locale}.json`);
    hasErrors = true;
  } else {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`✅ ${locale}.json válido`);
    } catch (e) {
      console.error(`❌ ERROR: ${locale}.json contiene JSON inválido`);
      hasErrors = true;
    }
  }
});

// Verificar configuración i18n
const i18nPath = path.join(__dirname, '..', 'src', 'i18n.ts');
if (!fs.existsSync(i18nPath)) {
  console.error('❌ ERROR: No se encontró src/i18n.ts');
  hasErrors = true;
} else {
  const i18nContent = fs.readFileSync(i18nPath, 'utf8');
  if (!i18nContent.includes('preferred-locale')) {
    console.error('❌ ERROR: i18n.ts no está configurado para leer cookies');
    hasErrors = true;
  } else {
    console.log('✅ i18n.ts configurado correctamente');
  }
}

// 3. Verificar configuración de Firebase
console.log('\n3️⃣ Verificando configuración de Firebase...');
const firebaseConfigFiles = [
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  'storage.rules'
];

firebaseConfigFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ERROR: No se encontró ${file}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${file} encontrado`);
  }
});

// 4. Verificar build de Next.js
console.log('\n4️⃣ Verificando configuración de Next.js...');
const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
if (!fs.existsSync(nextConfigPath)) {
  console.error('❌ ERROR: No se encontró next.config.js');
  hasErrors = true;
} else {
  console.log('✅ next.config.js encontrado');
}

// 5. Verificar archivos PWA
console.log('\n5️⃣ Verificando archivos PWA...');
const pwaFiles = [
  'public/manifest.json',
  'public/favicon.ico',
  'public/apple-touch-icon.png',
  'public/favicon-16x16.png',
  'public/favicon-32x32.png'
];

pwaFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  ADVERTENCIA: No se encontró ${file} (opcional para PWA)`);
  } else {
    console.log(`✅ ${file} encontrado`);
  }
});

// 6. Verificar dependencias
console.log('\n6️⃣ Verificando dependencias...');
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

if (!packageJson.dependencies['firebase']) {
  console.error('❌ ERROR: Firebase no está en las dependencias');
  hasErrors = true;
}

if (!packageJson.dependencies['next-intl']) {
  console.error('❌ ERROR: next-intl no está en las dependencias');
  hasErrors = true;
}

console.log('✅ Dependencias principales verificadas');

// Resumen final
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ Se encontraron errores. Por favor, corrígelos antes del deploy.');
  process.exit(1);
} else {
  console.log('\n✅ ¡Todo listo para el deploy!');
  console.log('\nPróximos pasos:');
  console.log('1. npm run build');
  console.log('2. npm run deploy (o tu comando de deploy preferido)');
}
