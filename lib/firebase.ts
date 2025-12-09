// FILE: src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Konfigurasi MJM CREW
const firebaseConfig = {
  apiKey: "AIzaSyAG3CPRjBmVDCWQX72QyRWYXNhNJAgrSQo",
  authDomain: "mjm-crew-85df8.firebaseapp.com",
  projectId: "mjm-crew-85df8",
  storageBucket: "mjm-crew-85df8.firebasestorage.app",
  messagingSenderId: "673359026558",
  appId: "1:673359026558:web:193e28e7219907b516fb2f",
  measurementId: "G-XNEX8CMTQD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (Database)
export const db = getFirestore(app);