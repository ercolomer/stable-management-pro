#!/usr/bin/env node

/**
 * Script para verificar que el sistema de traducción funcione en producción
 */

const fs = require('fs');
const path = require('path');

console.log('🌐 Verificando sistema de traducción para producción...\n');

let hasErrors = false;

// 1. Verificar archivos de traducción
console.log('1️⃣ Verificando archivos de traducción...');
const messagesDir = path.join(__dirname, '..', 'messages');
const requiredLocales = ['es', 'en', 'de'];
const requiredKeys = ['common', 'navigation', 'dashboard', 'auth'];

requiredLocales.forEach(locale => {
  const filePath = path.join(messagesDir, `${locale}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No se encontró ${locale}.json`);
    hasErrors = true;
    return;
  }
  
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const missingKeys = requiredKeys.filter(key => !content[key]);
    
    if (missingKeys.length > 0) {
      console.error(`❌ ${locale}.json le faltan las secciones: ${missingKeys.join(', ')}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${locale}.json completo`);
    }
  } catch (e) {
    console.error(`❌ Error parseando ${locale}.json:`, e.message);
    hasErrors = true;
  }
});

// 2. Verificar configuración de i18n
console.log('\n2️⃣ Verificando configuración i18n...');
const i18nPath = path.join(__dirname, '..', 'src', 'i18n.ts');

if (!fs.existsSync(i18nPath)) {
  console.error('❌ No se encontró src/i18n.ts');
  hasErrors = true;
} else {
  const content = fs.readFileSync(i18nPath, 'utf8');
  
  if (!content.includes('preferred-locale')) {
    console.error('❌ i18n.ts no está leyendo la cookie preferred-locale');
    hasErrors = true;
  } else if (content.includes('getLocaleFromPath')) {
    console.error('❌ i18n.ts todavía tiene lógica de rutas con prefijos');
    hasErrors = true;
  } else {
    console.log('✅ i18n.ts configurado correctamente para cookies');
  }
}

// 3. Verificar middleware
console.log('\n3️⃣ Verificando middleware...');
const middlewarePath = path.join(__dirname, '..', 'middleware.ts');

if (fs.existsSync(middlewarePath)) {
  const content = fs.readFileSync(middlewarePath, 'utf8');
  
  if (content.includes('matcher: []')) {
    console.log('✅ Middleware configurado para no interferir');
  } else {
    console.warn('⚠️  Middleware puede estar interfiriendo con las rutas');
  }
}

// 4. Verificar next.config.js
console.log('\n4️⃣ Verificando next.config.js...');
const nextConfigPath = path.join(__dirname, '..', 'next.config.js');

if (!fs.existsSync(nextConfigPath)) {
  console.error('❌ No se encontró next.config.js');
  hasErrors = true;
} else {
  const content = fs.readFileSync(nextConfigPath, 'utf8');
  
  if (content.includes('i18n:')) {
    console.error('❌ next.config.js tiene configuración i18n que puede causar conflictos');
    hasErrors = true;
  } else if (!content.includes('createNextIntlPlugin')) {
    console.error('❌ next.config.js no está usando createNextIntlPlugin');
    hasErrors = true;
  } else {
    console.log('✅ next.config.js configurado correctamente');
  }
}

// 5. Verificar componentes críticos
console.log('\n5️⃣ Verificando componentes de traducción...');
const componentsToCheck = [
  'src/components/language-selector.tsx',
  'src/contexts/language-context.tsx',
  'src/lib/cookies.ts'
];

componentsToCheck.forEach(component => {
  const componentPath = path.join(__dirname, '..', component);
  if (!fs.existsSync(componentPath)) {
    console.error(`❌ No se encontró ${component}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${component} existe`);
  }
});

// Resumen
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ Se encontraron errores en el sistema de traducción.');
  console.log('\nAsegúrate de corregir estos errores antes del deploy.');
  process.exit(1);
} else {
  console.log('\n✅ Sistema de traducción listo para producción!');
  console.log('\nRecuerda:');
  console.log('- El idioma se guarda en la cookie "preferred-locale"');
  console.log('- No se usan rutas con prefijos de idioma');
  console.log('- El cambio de idioma requiere recargar la página');
}
