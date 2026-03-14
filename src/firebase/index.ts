'use client';

/**
 * @fileOverview Standard barrel file for Firebase functionality.
 * This simplifies imports throughout the application.
 */

export { initializeFirebase } from './init';
export {
  FirebaseContext,
  FirebaseProvider,
  useFirebase,
  useAuth,
  useFirestore,
  useDatabase,
  useStorage,
  useFirebaseApp,
  useMemoFirebase,
  useUser,
} from './provider';

export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { 
  setDocumentNonBlocking, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from './non-blocking-updates';
export { 
  initiateAnonymousSignIn, 
  initiateEmailSignUp, 
  initiateEmailSignIn 
} from './non-blocking-login';
export { FirestorePermissionError } from './errors';
export { errorEmitter } from './error-emitter';
