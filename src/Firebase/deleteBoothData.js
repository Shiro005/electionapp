import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, remove } from "firebase/database";

// 🔐 Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAjWIDIXvYg83EDH09I-1ef_TRlgoVJnWA",
  authDomain: "jannetaa-2bc82.firebaseapp.com",
  databaseURL: "https://jannetaa-2bc82-default-rtdb.firebaseio.com",
  projectId: "jannetaa-2bc82",
  storageBucket: "jannetaa-2bc82.firebasestorage.app",
  messagingSenderId: "839872960195",
  appId: "1:839872960195:web:c840f64a1007fee235b476",
  databaseURL:"https://jannetaa-2bc82-default-rtdb.firebaseio.com/"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🗑️ Booth to delete
const targetBooth = "299 Akola Kaulkhed"; // match exactly what is in DB

async function deleteBoothVoters() {
  console.log(`🔍 Checking voters for booth: ${targetBooth}`);
  const votersRef = ref(db, "voters");
  const snapshot = await get(votersRef);

  if (!snapshot.exists()) {
    console.log("❌ No voters found in the database.");
    return;
  }

  const voters = snapshot.val();
  let deletedCount = 0;
  let totalCount = 0;

  for (const [key, voter] of Object.entries(voters)) {
    totalCount++;
    if (voter.boothNumber === targetBooth) {
      await remove(ref(db, `voters/${key}`));
      deletedCount++;
      console.log(`🗑️ Deleted voter: ${voter.name || key}`);
    }
  }

  console.log(`✅ Deleted ${deletedCount} out of ${totalCount} voters from booth "${targetBooth}"`);
}

deleteBoothVoters().catch(console.error);
