// Firebase config and initialization
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Replace with your Firebase project config (local only, do not commit real keys)


// Prevent duplicate app initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

export { db };
