import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyArWG4ItGaJQFOrVJ1oPcbZFabstqYBw_c",
  authDomain: "fin-diao.firebaseapp.com",
  projectId: "fin-diao",
  storageBucket: "fin-diao.firebasestorage.app",
  messagingSenderId: "552571082357",
  appId: "1:552571082357:web:4a530af391ddf9ed048a3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use the project's default Firestore database.
const db = getFirestore(app);

export { app, auth, db };
