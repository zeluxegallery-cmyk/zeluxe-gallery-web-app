import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCtetUx_l1qh2-m4E-5VVLFFGKyJypdAwo",
  authDomain: "zeluxe-gallery-reseller.firebaseapp.com",
  projectId: "zeluxe-gallery-reseller",
  storageBucket: "zeluxe-gallery-reseller.firebasestorage.app",
  messagingSenderId: "796123709361",
  appId: "1:796123709361:web:6759869363c7ebd1e98790"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export default app;
