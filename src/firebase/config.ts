import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup as fbSignInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use custom firestore databaseId specified in config
const customDbId = firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
  ? firebaseConfigJson.firestoreDatabaseId
  : undefined;

export const db = customDbId 
  ? getFirestore(app, customDbId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Safe wrapper around signInWithPopup to prevent concurrent popup requests and handle cancelled/internal assertion states
let activePopupPromise: Promise<any> | null = null;

export const signInWithPopup: typeof fbSignInWithPopup = async (...args) => {
  if (activePopupPromise) {
    return activePopupPromise;
  }

  try {
    activePopupPromise = fbSignInWithPopup(...args);
    const res = await activePopupPromise;
    return res;
  } catch (err: any) {
    if (
      err?.message?.includes('Pending promise was never set') ||
      err?.code === 'auth/cancelled-popup-request'
    ) {
      console.warn('Firebase popup cancelled or duplicate operation prevented:', err?.message || err);
      const gracefulError: any = new Error('Popup request cancelled');
      gracefulError.code = 'auth/cancelled-popup-request';
      throw gracefulError;
    }
    throw err;
  } finally {
    // Provide a small cooldown so quick double-clicks don't re-trigger overlapping popup managers
    setTimeout(() => {
      activePopupPromise = null;
    }, 500);
  }
};

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  fbSignOut, 
  onAuthStateChanged, 
  updateProfile 
};
export type { FirebaseUser };
