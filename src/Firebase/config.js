import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, get, query, orderByChild, equalTo, off, onValue, update, remove } from 'firebase/database';

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

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, set, push, get, query, orderByChild, equalTo, off, onValue, update, remove };