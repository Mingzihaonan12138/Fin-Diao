import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEgZbkvcGL0iCSYdMD-_8YpWevPH7o5wU",
  authDomain: "formidable-rain-1rr5c.firebaseapp.com",
  projectId: "formidable-rain-1rr5c",
  storageBucket: "formidable-rain-1rr5c.firebasestorage.app",
  messagingSenderId: "1004524044088",
  appId: "1:1004524044088:web:701e9784f5ac84fbd24bcd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore targeting the specific applet database ID
const db = getFirestore(app, "ai-studio-3beb53d9-57f0-42af-9269-1e83a49947a5");

export { app, auth, db };
