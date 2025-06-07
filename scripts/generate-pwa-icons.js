const sharp = require('sharp');
const ico = require('sharp-ico');
const fs = require('fs').promises;
const path = require('path');

// Tamaños de iconos requeridos
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    console.log('🎨 Regenerando iconos PWA desde el favicon correcto del usuario...');
    
    // Usar el favicon correcto del usuario como fuente
    const sourceIconPath = path.join(process.cwd(), 'public', 'ChatGPT-Image-3-jun-2025_-20_38_29-_1_.ico');
    
    // Verificar que el archivo fuente existe
    try {
      await fs.access(sourceIconPath);
      console.log('✅ Archivo fuente encontrado:', sourceIconPath);
    } catch (error) {
      throw new Error(`❌ No se encontró el archivo fuente: ${sourceIconPath}`);
    }
    
    // Leer el archivo ICO
    console.log('🔄 Leyendo archivo ICO...');
    const icoData = await fs.readFile(sourceIconPath);
    const pngData = ico.sharpsFromIco(icoData, { sizes: [32] })[0]; // Obtener la imagen de 32x32
    
    // Crear directorio de iconos si no existe
    const iconsDir = path.join(process.cwd(), 'public', 'icons');
    await fs.mkdir(iconsDir, { recursive: true });
    
    // Generar iconos en diferentes tamaños
    for (const size of iconSizes) {
      console.log(`🔄 Generando icono ${size}x${size}...`);
      
      // Icono normal
      await pngData
        .resize(size, size, { 
          fit: 'contain',
          background: { r: 251, g: 247, b: 235, alpha: 1 } // Fondo beige
        })
        .png()
        .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
      
      // Icono maskable (para Android con safe area)
      await pngData
        .resize(Math.round(size * 0.8), Math.round(size * 0.8), { 
          fit: 'contain',
          background: { r: 251, g: 247, b: 235, alpha: 1 }
        })
        .extend({
          top: Math.round(size * 0.1),
          bottom: Math.round(size * 0.1),
          left: Math.round(size * 0.1),
          right: Math.round(size * 0.1),
          background: { r: 251, g: 247, b: 235, alpha: 1 }
        })
        .png()
        .toFile(path.join(iconsDir, `maskable-icon-${size}x${size}.png`));
    }
    
    // Generar Apple Touch Icon
    console.log('🍎 Generando Apple Touch Icon...');
    await pngData
      .resize(180, 180, { 
        fit: 'contain',
        background: { r: 251, g: 247, b: 235, alpha: 1 }
      })
      .png()
      .toFile(path.join(process.cwd(), 'public', 'apple-touch-icon.png'));
    
    console.log('✅ ¡Iconos PWA regenerados desde el favicon correcto!');
    console.log('📂 Archivos generados:');
    console.log('   - apple-touch-icon.png (180x180)');
    iconSizes.forEach(size => {
      console.log(`   - icons/icon-${size}x${size}.png`);
      console.log(`   - icons/maskable-icon-${size}x${size}.png`);
    });
    
  } catch (error) {
    console.error('❌ Error generando iconos:', error);
    process.exit(1);
  }
}

generateIcons(); 