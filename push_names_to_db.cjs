const { initializeApp } = require("firebase/app");
const { getDatabase, ref, update } = require("firebase/database");
const fs = require('fs');

// Firebase Config
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

// Data from residents script
const residents = JSON.parse(fs.readFileSync('resident_data.json', 'utf8'));

async function pushNames() {
    console.log("Pushing names to Firebase...");
    const updates = {};
    for (const [id, name] of Object.entries(residents)) {
        updates[`daireler/${id}/name`] = name;
    }

    try {
        await update(ref(db), updates);
        console.log("Successfully pushed all names to Firebase.");
        process.exit(0);
    } catch (error) {
        console.error("Error pushing names:", error);
        process.exit(1);
    }
}

pushNames();
