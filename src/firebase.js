// Firebase config and initialization
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Replace with your Firebase project config (local only, do not commit real keys)
const firebaseConfig = {
   apiKey: "AIzaSyDRFq4BCUEjTdNmRj_-m7vCvkv7mJMMzrY",
  authDomain: "result-db-2026.firebaseapp.com",
  databaseURL: "https://result-db-2026-default-rtdb.firebaseio.com",
  projectId: "result-db-2026",
  storageBucket: "result-db-2026.appspot.com",
  messagingSenderId: "135433757278",
  appId: "1:135433757278:web:1f0712daffdd97efd34acf",
  measurementId: "G-WSGC3THYJD"
};

// Prevent duplicate app initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

export { db };
