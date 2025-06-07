const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function generateFavicon() {
  try {
    console.log('🔄 Generando favicon ICO verdadero desde logo original...');
    
    const logoPath = path.join(__dirname, '..', 'public', 'logo-original.svg');
    const faviconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
    
    // Primero generar PNG temporales en diferentes tamaños
    const sizes = [16, 32, 48];
    const pngBuffers = [];
    
    for (const size of sizes) {
      console.log(`📐 Generando imagen ${size}x${size}...`);
      const buffer = await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 251, g: 247, b: 235, alpha: 1 } // Fondo beige
        })
        .png()
        .toBuffer();
      
      pngBuffers.push(buffer);
    }
    
    // Convertir a ICO verdadero
    console.log('🔄 Convirtiendo a formato ICO...');
    const icoBuffer = await toIco(pngBuffers);
    
    // Guardar el archivo ICO
    fs.writeFileSync(faviconPath, icoBuffer);
    
    console.log('✅ Favicon ICO verdadero generado correctamente en public/favicon.ico');
    console.log(`📊 Tamaño del archivo: ${icoBuffer.length} bytes`);
    
  } catch (error) {
    console.error('❌ Error generando favicon:', error);
  }
}

generateFavicon(); 