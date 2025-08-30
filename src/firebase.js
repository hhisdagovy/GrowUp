import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCOYgmj0SvbSjje_2YxnHJDrvcZTClx8wg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'growup-a0e8a.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'growup-a0e8a',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'growup-a0e8a.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '24564415447',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:24564415447:web:2f684f105fd7fae513e992',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const listenToAuth = (cb) => onAuthStateChanged(auth, cb);


