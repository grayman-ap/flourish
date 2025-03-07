// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase, enableLogging } from "firebase/database";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAToN2y2XPIf7pIAmhe22wl3_9ALMP9i14",
  authDomain: "flourish-7c7f3.firebaseapp.com",
  projectId: "flourish-7c7f3",
  storageBucket: "flourish-7c7f3.firebasestorage.app",
  messagingSenderId: "798349871933",
  appId: "1:798349871933:web:a8d5030d3454d92f601354",
  measurementId: "G-M3BMM89CMT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app)
const auth = getAuth(app)
export {database, auth}
enableLogging(true);