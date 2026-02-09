const { initializeApp } = require("firebase/app");
const { getDatabase, ref, update } = require("firebase/database");

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

const aBlockTenants = [1, 4, 5, 7, 9, 14, 19, 21, 22, 39, 40, 46, 55, 60, 61, 65, 67, 69, 70, 71, 75, 77];

async function updateTenants() {
    console.log("Updating A block tenants in Firebase...");
    const updates = {};
    
    aBlockTenants.forEach(num => {
        const id = `A${num}`;
        updates[`daireler/${id}/residencyType`] = 'tenant';
        updates[`daireler/${id}/updatedAt`] = Date.now();
    });

    try {
        await update(ref(db), updates);
        console.log("Successfully marked A block tenants.");
        process.exit(0);
    } catch (error) {
        console.error("Error updating tenants:", error);
        process.exit(1);
    }
}

updateTenants();
