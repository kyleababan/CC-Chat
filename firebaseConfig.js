// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCyayUZ0lCbGb7tLFLbxBNU8_QEU3YPvSg",
  authDomain: "cc-chat-3d19d.firebaseapp.com",
  databaseURL: "https://cc-chat-3d19d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cc-chat-3d19d",
  storageBucket: "cc-chat-3d19d.firebasestorage.app",
  messagingSenderId: "618368993973",
  appId: "1:618368993973:web:06e24ad31146203f1a8cfc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getDatabase(app);
