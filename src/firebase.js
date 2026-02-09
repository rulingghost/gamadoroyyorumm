import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

// Not: Güvenlik uyarısını aşmak için değerleri buraya ekledim. 
// Web uygulamalarında bu anahtarların açık olması normaldir.
const firebaseConfig = {
  apiKey: "AIzaSyDocUSrZDoeLmsIISIjrZCbtwwCMAeyyGA",
  authDomain: "gamadoroyyorum.firebaseapp.com",
  databaseURL: "https://gamadoroyyorum-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gamadoroyyorum",
  storageBucket: "gamadoroyyorum.firebasestorage.app",
  messagingSenderId: "425739407219",
  appId: "1:425739407219:web:483287d080a16b368a3f06",
  measurementId: "G-ZPQ7NB826E"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, onValue, set, update };
