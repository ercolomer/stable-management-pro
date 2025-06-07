import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// =====================================================================================
// !! CRITICAL: ENSURE THESE VALUES MATCH YOUR ACTUAL FIREBASE PROJECT CONFIGURATION !!
// You can find these in your Firebase project console:
// Project settings > General > Your apps > Firebase SDK snippet > Config
// =====================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDjbzTRChjUeZ7P8F1Ve_1YOJ0fgu976Z0",
  authDomain: "connected-stable.firebaseapp.com",
  projectId: "connected-stable",
  storageBucket: "connected-stable.firebasestorage.app",
  messagingSenderId: "595096557320",
  appId: "1:595096557320:web:d83d58fa1e60e1d04c3ebd",
  measurementId: "G-T06L1L5465"
};
// =====================================================================================
// !! END OF CRITICAL CONFIGURATION SECTION !!
// =====================================================================================

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let analyticsInstance: Analytics | null = null;
let storageInstance: FirebaseStorage | null = null;

let firebaseInitializationAttempted = false;
let firebaseInitializationSucceeded = false;

/**
 * Initializes Firebase services. This function should run once.
 * Returns true if initialization was successful, false otherwise.
 */
function initializeFirebaseServicesInternal(): boolean {
  if (firebaseInitializationSucceeded) {
    console.log("Firebase config: Services already successfully initialized.");
    return true;
  }

  if (firebaseInitializationAttempted) {
    console.warn("Firebase config: Initialization previously attempted. Succeeded:", firebaseInitializationSucceeded, ". Won't re-attempt if failed.");
    return firebaseInitializationSucceeded;
  }

  firebaseInitializationAttempted = true;
  console.log("Firebase config: Attempting to initialize Firebase services for the first time...");

  try {
    console.log("Firebase config: Initializing Firebase App with Project ID:", firebaseConfig.projectId);
    if (!getApps().length) {
      appInstance = initializeApp(firebaseConfig);
      console.log("Firebase config: Firebase App initialized via initializeApp().");
    } else {
      appInstance = getApp();
      console.log("Firebase config: Firebase App obtained via getApp().");
    }

    if (!appInstance) {
      console.error("Firebase config: CRITICAL - Firebase app instance is null after App initialization attempt.");
      return false;
    }

    console.log("Firebase config: Attempting to get Firebase Auth service...");
    authInstance = getAuth(appInstance);
    if (!authInstance) {
      console.error("Firebase config: CRITICAL - getAuth(app) did not return a valid Auth instance.");
      return false;
    }
    console.log("Firebase config: Firebase Auth service obtained.");

    console.log("Firebase config: Attempting to get Firestore service...");
    dbInstance = getFirestore(appInstance);
    if (!dbInstance) {
      console.error("Firebase config: CRITICAL - getFirestore(app) did not return a valid Firestore instance.");
      return false;
    }
    console.log("Firebase config: Firestore service obtained.");

    if (firebaseConfig.storageBucket) {
      console.log("Firebase config: Attempting to get Firebase Storage service...");
      storageInstance = getStorage(appInstance);
      if (!storageInstance) {
        console.warn("Firebase config: getStorage(app) did not return a valid Storage instance.");
      } else {
        console.log("Firebase config: Firebase Storage service obtained.");
      }
    }

    if (firebaseConfig.measurementId) {
      isAnalyticsSupported().then(supported => {
        if (supported) {
          console.log("Firebase config: Attempting to get Firebase Analytics service...");
          analyticsInstance = getAnalytics(appInstance!);
          if (!analyticsInstance) {
            console.warn("Firebase config: getAnalytics(app) did not return a valid Analytics instance, though supported.");
          } else {
            console.log("Firebase config: Firebase Analytics service obtained.");
          }
        } else {
          console.log("Firebase config: Firebase Analytics is not supported in this environment.");
        }
      }).catch(err => {
        console.warn("Firebase config: Error checking Analytics support or initializing Analytics:", err);
      });
    }

    console.log("Firebase config: Firebase services initialization successful.");
    firebaseInitializationSucceeded = true;
    return true;

  } catch (error: any) {
    console.error("Firebase config: CRITICAL error during Firebase services initialization:", error.message, error.code ? `(Code: ${error.code})` : '');
    appInstance = null; 
    authInstance = null; 
    dbInstance = null; 
    analyticsInstance = null; 
    storageInstance = null;
    firebaseInitializationSucceeded = false;
    return false;
  }
}

if (typeof window !== 'undefined') {
  console.log("[Firebase Config] Cliente detectado, inicializando Firebase...");
  const initResult = initializeFirebaseServicesInternal();
  console.log("[Firebase Config] Resultado de inicialización:", initResult);
}

export const getFirebaseApp = (): FirebaseApp => {
  if (!firebaseInitializationSucceeded || !appInstance) {
    console.error("Firebase App is not available. Initialization failed or app instance is missing.");
    throw new Error("Firebase App not initialized. Check console for Firebase setup errors.");
  }
  return appInstance;
};

export const getFirebaseAuth = (): Auth => {
  if (!firebaseInitializationSucceeded || !authInstance) {
    console.error("Firebase Auth is not available. Initialization failed or auth instance is missing.");
    throw new Error("Firebase Auth not initialized. Check console for Firebase setup errors.");
  }
  return authInstance;
};

export const getDb = (): Firestore => {
  if (!firebaseInitializationSucceeded || !dbInstance) {
    console.error("Firestore is not available. Initialization failed or db instance is missing.");
    throw new Error("Firestore not initialized. Check console for Firebase setup errors.");
  }
  return dbInstance;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!firebaseInitializationSucceeded || !storageInstance) {
    console.error("Firebase Storage is not available. Initialization failed or storage instance is missing.");
    throw new Error("Firebase Storage not initialized. Check console for errors.");
  }
  return storageInstance;
};

export const getFirebaseAnalytics = (): Analytics | null => {
  if (!firebaseInitializationSucceeded) {
    console.warn("Firebase Analytics might not be available because core Firebase initialization did not succeed.");
  }
  return analyticsInstance;
};

export const isFirebaseInitialized = (): boolean => firebaseInitializationSucceeded; 