import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, get, query, orderByChild, equalTo, off, onValue, update } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyC44TAT32_FyPYifRZkztHJ1vlMHuJh1i4",
    authDomain: "electionappdemo-951a5.firebaseapp.com",
    projectId: "electionappdemo-951a5",
    storageBucket: "electionappdemo-951a5.firebasestorage.app",
    messagingSenderId: "159994830645",
    appId: "1:159994830645:web:618f895cc3698f7989f67c",
    databaseURL: "https://electionappdemo-951a5-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, set, push, get, query, orderByChild, equalTo, off, onValue, update };