import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcaA0lFPVhWrdWTUxe2gUEOB-yGtbInSQ",
  authDomain: "sullpdei.firebaseapp.com",
  projectId: "sullpdei",
  storageBucket: "sullpdei.firebasestorage.app",
  messagingSenderId: "539166248699",
  appId: "1:539166248699:web:74e9c230c975630f0eaa5e"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };