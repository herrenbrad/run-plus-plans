import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8w8BevGoG5L5n5wSU5TrVyYe1qi008Do",
  authDomain: "run-plus-plans.firebaseapp.com",
  projectId: "run-plus-plans",
  storageBucket: "run-plus-plans.firebasestorage.app",
  messagingSenderId: "426458481793",
  appId: "1:426458481793:web:dbcb81b021501d94e7f980",
  measurementId: "G-HFHB0GWKCC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
