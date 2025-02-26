
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAgEyYrtFLYFklvwoKlQTjgpKpVToj4zm4",
  authDomain: "shelfshare-86a27.firebaseapp.com",
  projectId: "shelfshare-86a27",
  storageBucket: "shelfshare-86a27.firebasestorage.app",
  messagingSenderId: "184667458105",
  appId: "1:184667458105:web:b7aa64907080d0ef12dbe8",
  measurementId: "G-P7EB5JS8HG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export let analytics = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}
