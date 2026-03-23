// Firebase config and initialization
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Firebase config for vtu-result-7
const firebaseConfig = {
  apiKey: "AIzaSyBqGVOLjkOtx-d3xmZv35pzbqE9Pj3i1hI",
  authDomain: "vtu-result-7.firebaseapp.com",
  databaseURL: "https://vtu-result-7-default-rtdb.firebaseio.com",
  projectId: "vtu-result-7",
  storageBucket: "vtu-result-7.firebasestorage.app",
  messagingSenderId: "511271831552",
  appId: "1:511271831552:web:217f2547792ae4399b30e5",
  measurementId: "G-LYJX21ZXHS"
};

// Prevent duplicate app initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const analytics = getAnalytics(app);

export { db };
