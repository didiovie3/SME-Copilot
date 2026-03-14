'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  Firestore,
  getFirestore
} from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';

let firestoreInstance: Firestore | null = null;
let databaseInstance: Database | null = null;
let storageInstance: FirebaseStorage | null = null;

/**
 * Isolated initialization logic to prevent circular dependencies.
 * Ensures Firebase is only initialized in a browser environment.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    return {
      firebaseApp: null,
      auth: null,
      firestore: null,
      database: null,
      storage: null
    };
  }

  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.error('Firebase initialization failed', e);
      return { firebaseApp: null, auth: null, firestore: null, database: null, storage: null };
    }
  } else {
    firebaseApp = getApp();
  }

  if (!firestoreInstance) {
    try {
      firestoreInstance = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({ 
          tabManager: persistentMultipleTabManager() 
        })
      });
    } catch (e) {
      firestoreInstance = getFirestore(firebaseApp);
    }
  }

  if (!databaseInstance) {
    databaseInstance = getDatabase(firebaseApp);
  }

  if (!storageInstance) {
    storageInstance = getStorage(firebaseApp);
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestoreInstance,
    database: databaseInstance,
    storage: storageInstance
  };
}
