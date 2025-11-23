import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// These values are safe to expose in frontend (Firebase security rules protect data)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyD8w8BevGoG5L5n5wSU5TrVyYe1qi008Do",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "run-plus-plans.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "run-plus-plans",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "run-plus-plans.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "426458481793",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:426458481793:web:dbcb81b021501d94e7f980",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-HFHB0GWKCC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
