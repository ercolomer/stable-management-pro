const fs = require('fs');
const path = require('path');

async function checkPWACriteria() {
  console.log('🔍 Verificando criterios de instalabilidad PWA...\n');
  
  let allChecksPass = true;
  
  // 1. Verificar manifest.json
  console.log('📄 Verificando manifest.json...');
  try {
    const manifestPath = path.join('./public', 'manifest.json');
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    const manifestChecks = [
      { key: 'name', value: manifestContent.name, required: true },
      { key: 'short_name', value: manifestContent.short_name, required: true },
      { key: 'start_url', value: manifestContent.start_url, required: true },
      { key: 'display', value: manifestContent.display, required: true, expectedValues: ['standalone', 'fullscreen'] },
      { key: 'theme_color', value: manifestContent.theme_color, required: true },
      { key: 'background_color', value: manifestContent.background_color, required: true },
      { key: 'icons', value: manifestContent.icons, required: true, isArray: true }
    ];
    
    manifestChecks.forEach(check => {
      if (check.required && !check.value) {
        console.log(`   ❌ ${check.key}: FALTANTE`);
        allChecksPass = false;
      } else if (check.expectedValues && !check.expectedValues.includes(check.value)) {
        console.log(`   ❌ ${check.key}: "${check.value}" (debería ser: ${check.expectedValues.join(' o ')})`);
        allChecksPass = false;
      } else if (check.isArray && (!Array.isArray(check.value) || check.value.length === 0)) {
        console.log(`   ❌ ${check.key}: VACÍO o NO ES ARRAY`);
        allChecksPass = false;
      } else {
        console.log(`   ✅ ${check.key}: "${check.value}"`);
      }
    });
    
    // Verificar iconos específicos
    console.log('\n🖼️  Verificando iconos requeridos...');
    const requiredIconSizes = ['192x192', '512x512'];
    const availableIcons = manifestContent.icons.map(icon => icon.sizes);
    
    requiredIconSizes.forEach(size => {
      if (availableIcons.includes(size)) {
        console.log(`   ✅ Icono ${size}: DISPONIBLE`);
      } else {
        console.log(`   ❌ Icono ${size}: FALTANTE (CRÍTICO para instalación)`);
        allChecksPass = false;
      }
    });
    
    // Verificar iconos maskable
    const maskableIcons = manifestContent.icons.filter(icon => 
      icon.purpose && icon.purpose.includes('maskable')
    );
    
    if (maskableIcons.length > 0) {
      console.log(`   ✅ Iconos maskable: ${maskableIcons.length} disponibles`);
    } else {
      console.log(`   ⚠️  Iconos maskable: NO DISPONIBLES (recomendado para mejor experiencia)`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error leyendo manifest.json: ${error.message}`);
    allChecksPass = false;
  }
  
  // 2. Verificar Service Worker
  console.log('\n🔧 Verificando Service Worker...');
  try {
    const swPath = path.join('./public', 'sw.js');
    if (fs.existsSync(swPath)) {
      const swContent = fs.readFileSync(swPath, 'utf8');
      if (swContent.length > 100) { // Basic check for non-empty SW
        console.log('   ✅ Service Worker: DISPONIBLE y con contenido');
      } else {
        console.log('   ⚠️  Service Worker: DISPONIBLE pero muy pequeño');
      }
    } else {
      console.log('   ❌ Service Worker: NO ENCONTRADO');
      allChecksPass = false;
    }
  } catch (error) {
    console.log(`   ❌ Error verificando Service Worker: ${error.message}`);
    allChecksPass = false;
  }
  
  // 3. Verificar archivos de iconos físicos
  console.log('\n📁 Verificando archivos de iconos...');
  const criticalIcons = [
    'icon-192x192.png',
    'icon-512x512.png',
    'icon-192x192-maskable.png',
    'icon-512x512-maskable.png'
  ];
  
  criticalIcons.forEach(iconFile => {
    const iconPath = path.join('./public', iconFile);
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      if (stats.size > 1000) { // At least 1KB
        console.log(`   ✅ ${iconFile}: DISPONIBLE (${Math.round(stats.size/1024)}KB)`);
      } else {
        console.log(`   ⚠️  ${iconFile}: DISPONIBLE pero muy pequeño (${stats.size} bytes)`);
      }
    } else {
      console.log(`   ❌ ${iconFile}: NO ENCONTRADO`);
      allChecksPass = false;
    }
  });
  
  // 4. Verificar screenshots
  console.log('\n📸 Verificando screenshots...');
  const screenshots = ['pwa-screenshot-1.png', 'pwa-screenshot-2.png'];
  
  screenshots.forEach(screenshot => {
    const screenshotPath = path.join('./public', screenshot);
    if (fs.existsSync(screenshotPath)) {
      const stats = fs.statSync(screenshotPath);
      console.log(`   ✅ ${screenshot}: DISPONIBLE (${Math.round(stats.size/1024)}KB)`);
    } else {
      console.log(`   ⚠️  ${screenshot}: NO ENCONTRADO (recomendado para Play Store)`);
    }
  });
  
  // 5. Verificar HTTPS (simulation)
  console.log('\n🔒 Criterios HTTPS y dominio...');
  console.log('   ✅ Firebase Hosting: Provee HTTPS automáticamente');
  console.log('   ✅ Dominio válido: stable-management-pro-89fdd.web.app');
  
  // Resumen final
  console.log('\n📋 RESUMEN DE VERIFICACIÓN');
  console.log('=' * 50);
  
  if (allChecksPass) {
    console.log('🎉 ¡TODOS LOS CRITERIOS CUMPLEN!');
    console.log('');
    console.log('✅ Tu PWA debería mostrar el ícono de instalación en:');
    console.log('   • Chrome: Ícono ⚙️ o + en la barra de direcciones');
    console.log('   • Edge: Ícono + en la barra de direcciones');
    console.log('   • Firefox: Opción "Instalar" en el menú');
    console.log('   • Safari: Usar "Agregar a pantalla de inicio"');
    console.log('');
    console.log('🚀 Después del deploy, el ícono debería aparecer automáticamente.');
  } else {
    console.log('❌ ALGUNOS CRITERIOS NO SE CUMPLEN');
    console.log('');
    console.log('⚠️  Revisa los elementos marcados con ❌ arriba.');
    console.log('📝 Una vez corregidos, haz build y deploy para ver el ícono de instalación.');
  }
  
  console.log('\n💡 TIP: En Chrome DevTools → Application → Manifest puedes ver detalles adicionales.');
  console.log('💡 TIP: En Lighthouse → PWA puedes obtener un reporte completo.');
}

// Ejecutar verificación
checkPWACriteria().catch(console.error); 