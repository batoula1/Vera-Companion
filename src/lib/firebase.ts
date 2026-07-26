import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp
} from 'firebase/firestore';

import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = firebaseConfigJson;

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
};
export type { User };
