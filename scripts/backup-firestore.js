// scripts/backup-firestore.js
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs').promises;
const path = require('path');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDf4O4bNO2shnpCgepJF1PzN8n_OgahQEA",
  authDomain: "stable-management-pro-89fdd.firebaseapp.com",
  projectId: "stable-management-pro-89fdd",
  storageBucket: "stable-management-pro-89fdd.firebasestorage.app",
  messagingSenderId: "696260241334",
  appId: "1:696260241334:web:163863259e9cbce63f4317",
  measurementId: "G-7BSTSE8MFV"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Colecciones a hacer backup
const collections = ['users', 'stables', 'horses', 'tasks', 'assignments'];

async function backupCollection(collectionName) {
  console.log(`📦 Haciendo backup de la colección: ${collectionName}`);
  
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const documents = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Convertir Timestamps a strings para JSON
      const serializedData = JSON.parse(JSON.stringify(data, (key, value) => {
        if (value && typeof value.toDate === 'function') {
          return { _timestamp: value.toDate().toISOString() };
        }
        return value;
      }));
      
      documents.push({
        id: doc.id,
        data: serializedData
      });
    });
    
    console.log(`   ✅ ${documents.length} documentos encontrados`);
    return documents;
  } catch (error) {
    console.error(`   ❌ Error en ${collectionName}:`, error.message);
    return [];
  }
}

async function createBackup() {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupDir = path.join(__dirname, '..', 'backups', `firestore-backup-${timestamp}`);
  
  try {
    // Crear directorio de backup
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`📁 Directorio de backup creado: ${backupDir}`);
    
    const backup = {
      timestamp: new Date().toISOString(),
      project: 'stable-management-pro-89fdd',
      collections: {}
    };
    
    // Hacer backup de cada colección
    for (const collectionName of collections) {
      backup.collections[collectionName] = await backupCollection(collectionName);
    }
    
    // Guardar backup completo
    const backupFile = path.join(backupDir, 'complete-backup.json');
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    
    // Guardar cada colección por separado
    for (const [collectionName, data] of Object.entries(backup.collections)) {
      const collectionFile = path.join(backupDir, `${collectionName}.json`);
      await fs.writeFile(collectionFile, JSON.stringify(data, null, 2));
    }
    
    console.log('\n🎉 ¡Backup completado exitosamente!');
    console.log(`📍 Ubicación: ${backupDir}`);
    console.log(`📊 Total de colecciones: ${collections.length}`);
    console.log(`📋 Archivos creados:`);
    console.log(`   - complete-backup.json (backup completo)`);
    collections.forEach(col => {
      console.log(`   - ${col}.json`);
    });
    
  } catch (error) {
    console.error('❌ Error durante el backup:', error);
  }
}

// Ejecutar backup
createBackup().then(() => {
  console.log('\n✅ Proceso de backup finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 