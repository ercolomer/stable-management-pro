#!/usr/bin/env node

/**
 * Script para construir y verificar la aplicación
 * Detecta problemas comunes antes del deploy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Iniciando build de producción...\n');

try {
  // 1. Limpiar builds anteriores
  console.log('🧹 Limpiando builds anteriores...');
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true, force: true });
  }

  // 2. Ejecutar build
  console.log('\n📦 Ejecutando build...');
  execSync('npm run build', { stdio: 'inherit' });

  // 3. Verificar que el build se completó
  if (!fs.existsSync('.next')) {
    throw new Error('El directorio .next no fue creado');
  }

  // 4. Verificar archivos de traducción en el build
  console.log('\n🌐 Verificando archivos de traducción...');
  const messagesDir = path.join(__dirname, '..', 'messages');
  const locales = ['es', 'en', 'de'];
  
  locales.forEach(locale => {
    const filePath = path.join(messagesDir, `${locale}.json`);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${locale}.json encontrado`);
    } else {
      console.error(`❌ ${locale}.json NO encontrado`);
    }
  });

  // 5. Verificar configuración de i18n
  console.log('\n⚙️  Verificando configuración i18n...');
  const i18nPath = path.join(__dirname, '..', 'src', 'i18n.ts');
  if (fs.existsSync(i18nPath)) {
    const i18nContent = fs.readFileSync(i18nPath, 'utf8');
    if (i18nContent.includes('preferred-locale')) {
      console.log('✅ Configuración de cookies encontrada en i18n.ts');
    } else {
      console.warn('⚠️  i18n.ts podría no estar leyendo las cookies correctamente');
    }
  }

  console.log('\n✅ Build completado exitosamente!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Prueba localmente: npm run start');
  console.log('2. Deploy a preview: npm run deploy:preview');
  console.log('3. Deploy a producción: npm run deploy');

} catch (error) {
  console.error('\n❌ Error durante el build:', error.message);
  process.exit(1);
}
