const sharp = require('sharp');
const path = require('path');

// SVG del logo original correcto para screenshots
const logoSVG = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo beige -->
  <rect width="200" height="200" fill="#f5f1e8" rx="15"/>
  
  <!-- Casa/establo -->
  <path d="M30 90 L100 40 L170 90 L170 100 L160 100 L160 170 L40 170 L40 100 L30 100 Z" 
        fill="none" stroke="#2d5a2d" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  
  <!-- Techo de la casa -->
  <path d="M25 90 L100 35 L175 90" 
        fill="none" stroke="#2d5a2d" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  
  <!-- Caballo más detallado -->
  <ellipse cx="85" cy="130" rx="25" ry="15" fill="#2d5a2d"/>
  <ellipse cx="75" cy="110" rx="8" ry="12" fill="#2d5a2d"/>
  <ellipse cx="70" cy="95" rx="10" ry="8" fill="#2d5a2d"/>
  <ellipse cx="65" cy="98" rx="4" ry="3" fill="#2d5a2d"/>
  <ellipse cx="68" cy="88" rx="2" ry="4" fill="#2d5a2d"/>
  <ellipse cx="72" cy="88" rx="2" ry="4" fill="#2d5a2d"/>
  <path d="M75 85 Q70 80 75 78 Q80 76 85 82 Q88 88 82 92" fill="#2d5a2d"/>
  <rect x="70" y="145" width="4" height="15" fill="#2d5a2d"/>
  <rect x="80" y="145" width="4" height="15" fill="#2d5a2d"/>
  <rect x="90" y="145" width="4" height="15" fill="#2d5a2d"/>
  <rect x="100" y="145" width="4" height="15" fill="#2d5a2d"/>
  <path d="M110 125 Q118 120 120 130 Q118 140 110 135" fill="#2d5a2d"/>
  
  <!-- Puntos de conexión -->
  <circle cx="140" cy="155" r="3" fill="#2d5a2d"/>
  <circle cx="155" cy="160" r="3" fill="#2d5a2d"/>
  <circle cx="170" cy="165" r="3" fill="#2d5a2d"/>
  <path d="M140 155 L155 160 L170 165" stroke="#2d5a2d" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`;

async function generateScreenshots() {
  try {
    console.log('📸 Regenerando screenshots PWA con el logo original correcto...');
    
    // Screenshot wide (1280x720) - Desktop view
    console.log('🖥️ Generando screenshot wide (1280x720)...');
    const wideScreenshot = `
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="720" fill="#f8fafc"/>
      
      <!-- Header -->
      <rect x="0" y="0" width="1280" height="80" fill="#2d5a2d"/>
      
      <!-- Logo en header -->
      <g transform="translate(40, 20) scale(0.3)">
        ${logoSVG.replace(/<svg[^>]*>|<\/svg>/g, '')}
      </g>
      
      <text x="140" y="50" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="bold" fill="white">
        Connected Stable
      </text>
      
      <!-- Sidebar -->
      <rect x="0" y="80" width="250" height="640" fill="#f1f5f9"/>
      <line x1="250" y1="80" x2="250" y2="720" stroke="#e2e8f0" stroke-width="1"/>
      
      <!-- Sidebar menu items -->
      <rect x="20" y="120" width="210" height="40" fill="#2d5a2d" rx="6"/>
      <text x="135" y="145" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="medium" fill="white" text-anchor="middle">📊 Dashboard</text>
      
      <rect x="20" y="170" width="210" height="40" fill="transparent" rx="6"/>
      <text x="135" y="195" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">🐴 Caballos</text>
      
      <rect x="20" y="220" width="210" height="40" fill="transparent" rx="6"/>
      <text x="135" y="245" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">👨‍🏫 Jinetes</text>
      
      <rect x="20" y="270" width="210" height="40" fill="transparent" rx="6"/>
      <text x="135" y="295" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">📋 Tareas</text>
      
      <!-- Main content area -->
      <rect x="280" y="120" width="980" height="580" fill="white" stroke="#e2e8f0" stroke-width="1" rx="8"/>
      
      <!-- Dashboard cards -->
      <rect x="320" y="160" width="280" height="160" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="8"/>
      <text x="460" y="185" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="semibold" fill="#1e293b" text-anchor="middle">Resumen General</text>
      <text x="460" y="220" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="bold" fill="#2d5a2d" text-anchor="middle">24</text>
      <text x="460" y="245" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">Caballos activos</text>
      <text x="460" y="285" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">↗ 8% más que el mes pasado</text>
      
      <rect x="620" y="160" width="280" height="160" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="8"/>
      <text x="760" y="185" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="semibold" fill="#1e293b" text-anchor="middle">Jinetes</text>
      <text x="760" y="220" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="bold" fill="#2d5a2d" text-anchor="middle">12</text>
      <text x="760" y="245" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">Miembros activos</text>
      <text x="760" y="285" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">→ Sin cambios</text>
      
      <rect x="920" y="160" width="280" height="160" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="8"/>
      <text x="1060" y="185" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="semibold" fill="#1e293b" text-anchor="middle">Tareas Pendientes</text>
      <text x="1060" y="220" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="bold" fill="#dc2626" text-anchor="middle">7</text>
      <text x="1060" y="245" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">Requieren atención</text>
      <text x="1060" y="285" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">⚠ 2 urgentes</text>
      
      <!-- Recent activity section -->
      <rect x="320" y="360" width="880" height="300" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="8"/>
      <text x="340" y="385" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="semibold" fill="#1e293b">Actividad Reciente</text>
      
      <!-- Activity items -->
      <circle cx="350" cy="420" r="4" fill="#2d5a2d"/>
      <text x="370" y="425" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1e293b">Alimentación completada - Tornado</text>
      <text x="370" y="445" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b">Hace 2 horas por María García</text>
      
      <circle cx="350" cy="480" r="4" fill="#f59e0b"/>
      <text x="370" y="485" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1e293b">Sesión de entrenamiento programada - Relámpago</text>
      <text x="370" y="505" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b">Mañana a las 9:00 AM</text>
      
      <circle cx="350" cy="540" r="4" fill="#10b981"/>
      <text x="370" y="545" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1e293b">Nuevo jinete agregado - Carlos Mendoza</text>
      <text x="370" y="565" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b">Ayer por Juan Pérez</text>
    </svg>`;
    
    await sharp(Buffer.from(wideScreenshot))
      .resize(1280, 720)
      .png({ quality: 90 })
      .toFile(path.join(process.cwd(), 'public', 'pwa-screenshot-1.png'));
    
    // Screenshot narrow (750x1334) - Mobile view
    console.log('📱 Generando screenshot narrow (750x1334)...');
    const narrowScreenshot = `
    <svg width="750" height="1334" viewBox="0 0 750 1334" xmlns="http://www.w3.org/2000/svg">
      <rect width="750" height="1334" fill="#f8fafc"/>
      
      <!-- Mobile header -->
      <rect x="0" y="0" width="750" height="100" fill="#2d5a2d"/>
      
      <!-- Logo en header -->
      <g transform="translate(30, 25) scale(0.25)">
        ${logoSVG.replace(/<svg[^>]*>|<\/svg>/g, '')}
      </g>
      
      <text x="100" y="60" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="bold" fill="white">
        Connected Stable
      </text>
      
      <!-- Mobile menu button -->
      <g transform="translate(680, 35)">
        <rect width="30" height="2" fill="white" rx="1"/>
        <rect y="8" width="30" height="2" fill="white" rx="1"/>
        <rect y="16" width="30" height="2" fill="white" rx="1"/>
      </g>
      
      <!-- Quick stats cards -->
      <rect x="30" y="140" width="690" height="120" fill="white" stroke="#e2e8f0" stroke-width="1" rx="12"/>
      <text x="375" y="170" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="semibold" fill="#1e293b" text-anchor="middle">Estado General</text>
      
      <g transform="translate(80, 190)">
        <circle cx="0" cy="0" r="20" fill="#e7f5e7"/>
        <text x="0" y="5" font-family="Inter, Arial, sans-serif" font-size="14" fill="#2d5a2d" text-anchor="middle">24</text>
        <text x="0" y="40" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Caballos</text>
      </g>
      
      <g transform="translate(250, 190)">
        <circle cx="0" cy="0" r="20" fill="#e7f5e7"/>
        <text x="0" y="5" font-family="Inter, Arial, sans-serif" font-size="14" fill="#2d5a2d" text-anchor="middle">12</text>
        <text x="0" y="40" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Jinetes</text>
      </g>
      
      <g transform="translate(420, 190)">
        <circle cx="0" cy="0" r="20" fill="#fee2e2"/>
        <text x="0" y="5" font-family="Inter, Arial, sans-serif" font-size="14" fill="#dc2626" text-anchor="middle">7</text>
        <text x="0" y="40" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Tareas</text>
      </g>
      
      <g transform="translate(590, 190)">
        <circle cx="0" cy="0" r="20" fill="#e7f5e7"/>
        <text x="0" y="5" font-family="Inter, Arial, sans-serif" font-size="14" fill="#2d5a2d" text-anchor="middle">✓</text>
        <text x="0" y="40" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Estado</text>
      </g>
      
      <!-- Action cards -->
      <rect x="30" y="300" width="690" height="180" fill="white" stroke="#e2e8f0" stroke-width="1" rx="12"/>
      <rect x="50" y="320" width="60" height="60" fill="#f0fdf4" rx="12"/>
      <text x="80" y="355" font-family="Inter, Arial, sans-serif" font-size="24" fill="#2d5a2d" text-anchor="middle">🐴</text>
      <text x="140" y="340" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="semibold" fill="#1e293b">Mis Caballos</text>
      <text x="140" y="365" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b">Ver y gestionar caballos asignados</text>
      <text x="140" y="385" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b">Última actividad: hace 2 horas</text>
      
      <rect x="30" y="520" width="690" height="180" fill="white" stroke="#e2e8f0" stroke-width="1" rx="12"/>
      <rect x="50" y="540" width="60" height="60" fill="#fef3f2" rx="12"/>
      <text x="80" y="575" font-family="Inter, Arial, sans-serif" font-size="24" fill="#dc2626" text-anchor="middle">📋</text>
      <text x="140" y="560" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="semibold" fill="#1e293b">Tareas Pendientes</text>
      <text x="140" y="585" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b">7 tareas requieren tu atención</text>
      <text x="140" y="605" font-family="Inter, Arial, sans-serif" font-size="14" fill="#dc2626">2 tareas urgentes</text>
      
      <rect x="30" y="740" width="690" height="180" fill="white" stroke="#e2e8f0" stroke-width="1" rx="12"/>
      <rect x="50" y="760" width="60" height="60" fill="#f0f9ff" rx="12"/>
      <text x="80" y="795" font-family="Inter, Arial, sans-serif" font-size="24" fill="#0ea5e9" text-anchor="middle">📅</text>
      <text x="140" y="780" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="semibold" fill="#1e293b">Calendario</text>
      <text x="140" y="805" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b">Programación de montas y eventos</text>
      <text x="140" y="825" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b">Próxima sesión: Mañana 9:00 AM</text>
      
      <!-- Recent activity -->
      <rect x="30" y="960" width="690" height="300" fill="white" stroke="#e2e8f0" stroke-width="1" rx="12"/>
      <text x="50" y="990" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="semibold" fill="#1e293b">Actividad Reciente</text>
      
      <circle cx="60" cy="1020" r="4" fill="#2d5a2d"/>
      <text x="80" y="1025" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1e293b">Alimentación - Tornado</text>
      <text x="80" y="1045" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b">Hace 2h por María</text>
      
      <circle cx="60" cy="1070" r="4" fill="#f59e0b"/>
      <text x="80" y="1075" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1e293b">Entrenamiento programado</text>
      <text x="80" y="1095" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b">Mañana 9:00 AM</text>
      
      <circle cx="60" cy="1120" r="4" fill="#10b981"/>
      <text x="80" y="1125" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1e293b">Nuevo jinete agregado</text>
      <text x="80" y="1145" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b">Ayer por Juan</text>
    </svg>`;
    
    await sharp(Buffer.from(narrowScreenshot))
      .resize(750, 1334)
      .png({ quality: 90 })
      .toFile(path.join(process.cwd(), 'public', 'pwa-screenshot-2.png'));
    
    console.log('✅ Screenshots PWA regenerados con el logo original correcto!');
    console.log('📂 Archivos generados:');
    console.log('   - pwa-screenshot-1.png (1280x720 - Desktop)');
    console.log('   - pwa-screenshot-2.png (750x1334 - Mobile)');
    
  } catch (error) {
    console.error('❌ Error generando screenshots:', error);
    process.exit(1);
  }
}

generateScreenshots(); 