import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCAl50ojHbMKAwrYXkOPnZpvahc5yJamd8',
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'faceup-d022b.firebaseapp.com',
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'faceup-d022b',
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'faceup-d022b.firebasestorage.app',
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '593079427925',
	appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:593079427925:web:fc854d1b6cf3bc8146c5dc',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export { serverTimestamp, Timestamp } from 'firebase/firestore';

export default app;

