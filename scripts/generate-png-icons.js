const fs = require('fs').promises;
const path = require('path');

// Crear un SVG más simple y compatible
const generateSVGIcon = (size, isLarge = false) => {
  const padding = isLarge ? size * 0.1 : size * 0.15;
  const iconSize = size - (padding * 2);
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo -->
  <rect width="${size}" height="${size}" fill="#059669" rx="${size * 0.1}"/>
  
  <!-- Contenedor del icono -->
  <g transform="translate(${padding}, ${padding})">
    <!-- Caballo estilizado -->
    <g transform="scale(${iconSize / 100})">
      <!-- Cabeza -->
      <path d="M25 35 Q30 25 40 30 Q50 25 55 35 Q53 45 50 50 L45 55 Q40 60 35 55 L30 50 Q27 45 25 35 Z" fill="white"/>
      <!-- Ojo -->
      <circle cx="40" cy="40" r="2.5" fill="#059669"/>
      <!-- Crin -->
      <path d="M40 30 Q45 20 55 25 Q60 30 55 35" fill="white" opacity="0.9"/>
      <!-- Cuerpo -->
      <ellipse cx="40" cy="65" rx="12" ry="18" fill="white"/>
      <!-- Patas -->
      <rect x="30" y="78" width="3" height="12" fill="white" rx="1"/>
      <rect x="37" y="78" width="3" height="12" fill="white" rx="1"/>
      <rect x="44" y="78" width="3" height="12" fill="white" rx="1"/>
      <rect x="51" y="78" width="3" height="12" fill="white" rx="1"/>
      <!-- Texto SM -->
      <text x="65" y="75" font-family="Arial Black, sans-serif" font-size="${isLarge ? '6' : '5'}" fill="white" font-weight="900">SM</text>
    </g>
  </g>
</svg>`;
};

const generateMaskableIcon = (size) => {
  const safeZone = size * 0.8; // Safe zone para maskable
  const padding = (size - safeZone) / 2;
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo completo -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#059669"/>
  
  <!-- Contenido en safe zone -->
  <g transform="translate(${padding}, ${padding})">
    <g transform="scale(${safeZone / 100})">
      <!-- Caballo estilizado -->
      <path d="M25 35 Q30 25 40 30 Q50 25 55 35 Q53 45 50 50 L45 55 Q40 60 35 55 L30 50 Q27 45 25 35 Z" fill="white"/>
      <circle cx="40" cy="40" r="2.5" fill="#059669"/>
      <path d="M40 30 Q45 20 55 25 Q60 30 55 35" fill="white" opacity="0.9"/>
      <ellipse cx="40" cy="65" rx="12" ry="18" fill="white"/>
      <rect x="30" y="78" width="3" height="12" fill="white" rx="1"/>
      <rect x="37" y="78" width="3" height="12" fill="white" rx="1"/>
      <rect x="44" y="78" width="3" height="12" fill="white" rx="1"/>
      <rect x="51" y="78" width="3" height="12" fill="white" rx="1"/>
      <text x="65" y="75" font-family="Arial Black, sans-serif" font-size="6" fill="white" font-weight="900">SM</text>
    </g>
  </g>
</svg>`;
};

// Función para convertir SVG a PNG usando data URL (placeholder)
const generatePNGDataURL = (svgContent, size) => {
  // Para este ejemplo, generar un PNG base64 simple
  // En producción, usarías canvas o sharp para conversión real
  const svgBase64 = Buffer.from(svgContent).toString('base64');
  return `data:image/svg+xml;base64,${svgBase64}`;
};

async function generatePNGIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  console.log('🎨 Generando iconos PNG para PWA...');
  
  try {
    // Iconos críticos para PWA
    const criticalSizes = [
      { size: 192, name: 'icon-192x192.png', maskable: false },
      { size: 512, name: 'icon-512x512.png', maskable: false },
      { size: 192, name: 'icon-192x192-maskable.png', maskable: true },
      { size: 512, name: 'icon-512x512-maskable.png', maskable: true }
    ];
    
    // Otros tamaños importantes
    const otherSizes = [
      { size: 72, name: 'icon-72x72.png', maskable: false },
      { size: 96, name: 'icon-96x96.png', maskable: false },
      { size: 128, name: 'icon-128x128.png', maskable: false },
      { size: 144, name: 'icon-144x144.png', maskable: false },
      { size: 152, name: 'icon-152x152.png', maskable: false },
      { size: 384, name: 'icon-384x384.png', maskable: false },
      // Apple touch icons
      { size: 180, name: 'apple-touch-icon.png', maskable: false },
      { size: 180, name: 'apple-touch-icon-180x180.png', maskable: false },
      { size: 152, name: 'apple-touch-icon-152x152.png', maskable: false },
      { size: 144, name: 'apple-touch-icon-144x144.png', maskable: false },
      { size: 120, name: 'apple-touch-icon-120x120.png', maskable: false },
      { size: 114, name: 'apple-touch-icon-114x114.png', maskable: false },
      { size: 76, name: 'apple-touch-icon-76x76.png', maskable: false },
      { size: 72, name: 'apple-touch-icon-72x72.png', maskable: false },
      { size: 60, name: 'apple-touch-icon-60x60.png', maskable: false },
      { size: 57, name: 'apple-touch-icon-57x57.png', maskable: false },
      // Favicon
      { size: 32, name: 'favicon-32x32.png', maskable: false },
      { size: 16, name: 'favicon-16x16.png', maskable: false }
    ];
    
    const allSizes = [...criticalSizes, ...otherSizes];
    
    for (const icon of allSizes) {
      const svgContent = icon.maskable 
        ? generateMaskableIcon(icon.size)
        : generateSVGIcon(icon.size, icon.size >= 384);
      
      // Por ahora, guardar como SVG (más compatible que data URLs complejas)
      const svgFileName = icon.name.replace('.png', '.svg');
      const filePath = path.join(publicDir, svgFileName);
      await fs.writeFile(filePath, svgContent);
      
      // También crear un PNG placeholder simple
      const pngContent = `<!-- PNG Placeholder for ${icon.name} -->
<!-- Size: ${icon.size}x${icon.size} -->
<!-- Use https://realfavicongenerator.net/ to generate real PNG files -->
${svgContent}`;
      
      const pngPath = path.join(publicDir, icon.name);
      await fs.writeFile(pngPath, pngContent);
      
      console.log(`   ✅ ${icon.name} (${icon.size}x${icon.size})`);
    }
    
    // Crear favicon.ico placeholder
    const faviconContent = generateSVGIcon(32);
    await fs.writeFile(path.join(publicDir, 'favicon.ico'), faviconContent);
    console.log('   ✅ favicon.ico');
    
    console.log('\n🎉 ¡Iconos PWA generados!');
    console.log('\n⚠️  IMPORTANTE para que funcione el prompt de instalación:');
    console.log('📝 1. Ve a: https://realfavicongenerator.net/');
    console.log('📝 2. Sube tu logo y genera iconos PNG reales');
    console.log('📝 3. Reemplaza los archivos placeholder por los PNG reales');
    console.log('📝 4. Especialmente críticos: icon-192x192.png y icon-512x512.png');
    
  } catch (error) {
    console.error('❌ Error generando iconos:', error);
  }
}

// Ejecutar
generatePNGIcons().then(() => {
  console.log('\n✅ Proceso completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 