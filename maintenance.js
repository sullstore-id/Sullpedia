// maintenance.js
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const maintenanceMessage = document.getElementById("maintenanceMessage");
const refreshMaintenanceBtn = document.getElementById("refreshMaintenanceBtn");
const logoutMaintenanceBtn = document.getElementById("logoutMaintenanceBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};

  if (userData.role === "admin") {
    window.location.href = "index.html";
    return;
  }

  const configSnap = await getDoc(doc(db, "appConfig", "system"));

  if (configSnap.exists()) {
    const config = configSnap.data();

    if (config.maintenanceMode !== true) {
      window.location.href = "index.html";
      return;
    }

    if (config.maintenanceMessage) {
      maintenanceMessage.textContent = config.maintenanceMessage;
    }
  }
});

refreshMaintenanceBtn.addEventListener("click", () => {
  window.location.reload();
});

logoutMaintenanceBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});