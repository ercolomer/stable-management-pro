
// src/lib/firebase/config.ts

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
  apiKey: "AIzaSyDf4O4bNO2shnpCgepJF1PzN8n_OgahQEA",
  authDomain: "stable-management-pro-89fdd.firebaseapp.com",
  projectId: "stable-management-pro-89fdd",
  storageBucket: "stable-management-pro-89fdd.firebasestorage.app", // Verify this format, usually project-id.appspot.com
  messagingSenderId: "696260241334",
  appId: "1:696260241334:web:163863259e9cbce63f4317",
  measurementId: "G-7BSTSE8MFV"
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

  // Critical check for placeholder values - REMOVED startsWith("AIzaSy") check
  if (
    firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.apiKey === "" ||
    !firebaseConfig.projectId || firebaseConfig.projectId === "YOUR_PROJECT_ID"
  ) {
    console.error(
      "Firebase config: ACTION REQUIRED - CRITICAL - firebaseConfig object in src/lib/firebase/config.ts contains placeholder or incomplete values (apiKey or projectId). Firebase will not initialize correctly. Please replace with your actual Firebase project configuration values."
    );
    return false;
  }

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

    if (firebaseConfig.storageBucket && firebaseConfig.storageBucket !== "YOUR_PROJECT_ID.appspot.com" && firebaseConfig.storageBucket !== "" && !firebaseConfig.storageBucket.includes("YOUR_PROJECT_ID")) {
      console.log("Firebase config: Attempting to get Firebase Storage service...");
      storageInstance = getStorage(appInstance);
      if (!storageInstance) {
        console.warn("Firebase config: getStorage(app) did not return a valid Storage instance. Current bucket:", firebaseConfig.storageBucket);
      } else {
        console.log("Firebase config: Firebase Storage service obtained.");
      }
    } else {
      console.log("Firebase config: Skipping Firebase Storage initialization (storageBucket not configured, is placeholder, or uses placeholder project ID). Current:", firebaseConfig.storageBucket);
    }

    if (firebaseConfig.measurementId && firebaseConfig.measurementId !== "YOUR_MEASUREMENT_ID" && firebaseConfig.measurementId !== "" && !firebaseConfig.measurementId.includes("YOUR_MEASUREMENT_ID")) {
      isAnalyticsSupported().then(supported => {
        if (supported) {
          console.log("Firebase config: Attempting to get Firebase Analytics service...");
          analyticsInstance = getAnalytics(appInstance!); // appInstance should be non-null here
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
    } else {
        console.log("Firebase config: Skipping Firebase Analytics initialization (measurementId not configured or is placeholder).");
    }

    console.log("Firebase config: Firebase services initialization successful.");
    firebaseInitializationSucceeded = true;
    return true;

  } catch (error: any) {
    console.error("Firebase config: CRITICAL error during Firebase services initialization:", error.message, error.code ? `(Code: ${error.code})` : '');
    appInstance = null; authInstance = null; dbInstance = null; analyticsInstance = null; storageInstance = null;
    firebaseInitializationSucceeded = false;
    return false;
  }
}

if (typeof window !== 'undefined') {
  initializeFirebaseServicesInternal();
}

export const getFirebaseApp = (): FirebaseApp => {
  if (!firebaseInitializationSucceeded || !appInstance) {
    console.error("Firebase App is not available. Initialization failed or app instance is missing. Did you replace the placeholder API key in firebaseConfig?");
    throw new Error("Firebase App not initialized. Check console for Firebase setup errors, especially the API key.");
  }
  return appInstance;
};

export const getFirebaseAuth = (): Auth => {
  if (!firebaseInitializationSucceeded || !authInstance) {
     console.error("Firebase Auth is not available. Initialization failed or auth instance is missing. Did you replace the placeholder API key in firebaseConfig?");
    throw new Error("Firebase Auth not initialized. Check console for Firebase setup errors, especially the API key.");
  }
  return authInstance;
};

export const getDb = (): Firestore => {
  if (!firebaseInitializationSucceeded || !dbInstance) {
    console.error("Firestore is not available. Initialization failed or db instance is missing. Did you replace the placeholder API key in firebaseConfig?");
    throw new Error("Firestore not initialized. Check console for Firebase setup errors, especially the API key.");
  }
  return dbInstance;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!firebaseInitializationSucceeded || !storageInstance) {
     console.error("Firebase Storage is not available. Initialization failed, storage instance is missing, or storageBucket is misconfigured. Did you replace the placeholder API key in firebaseConfig?");
    throw new Error("Firebase Storage not initialized. Check console for errors. Ensure storageBucket is like 'project-id.appspot.com'.");
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
    
