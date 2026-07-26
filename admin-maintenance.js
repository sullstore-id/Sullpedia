// admin-maintenance.js
import { auth, db } from "./firebase-config.js";
import { showAlert, showConfirm } from "./ui-dialog.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const maintenanceStatusText = document.getElementById("maintenanceStatusText");
const maintenanceMessageInput = document.getElementById("maintenanceMessageInput");
const toggleMaintenanceBtn = document.getElementById("toggleMaintenanceBtn");

let currentUser = null;
let currentMode = false;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};

  if (userData.role !== "admin") {
    await showAlert("Halaman ini khusus admin.", {
      title: "Akses ditolak",
      icon: "!"
    });

    window.location.href = "index.html";
    return;
  }

  listenMaintenanceConfig();
});

function listenMaintenanceConfig() {
  const configRef = doc(db, "appConfig", "system");

  onSnapshot(configRef, (snapshot) => {
    const data = snapshot.exists() ? snapshot.data() : {};

    currentMode = data.maintenanceMode === true;

    maintenanceStatusText.textContent = currentMode ? "Maintenance Aktif" : "Website Aktif";
    maintenanceStatusText.className = currentMode ? "status-maintenance-on" : "status-maintenance-off";

    maintenanceMessageInput.value =
      data.maintenanceMessage ||
      "SullPedia sedang maintenance. Mohon tunggu sebentar ya.";

    toggleMaintenanceBtn.textContent = currentMode
      ? "Matikan Maintenance"
      : "Aktifkan Maintenance";
  });
}

toggleMaintenanceBtn.addEventListener("click", async () => {
  const nextMode = !currentMode;

  const confirmAction = await showConfirm(
    nextMode
      ? "Aktifkan maintenance? User biasa tidak akan bisa masuk ke website."
      : "Matikan maintenance? User biasa akan bisa mengakses website lagi.",
    {
      title: nextMode ? "Aktifkan Maintenance" : "Matikan Maintenance",
      icon: nextMode ? "⚙" : "✓",
      okText: nextMode ? "Aktifkan" : "Matikan",
      cancelText: "Batal"
    }
  );

  if (!confirmAction) return;

  try {
    await setDoc(
      doc(db, "appConfig", "system"),
      {
        maintenanceMode: nextMode,
        maintenanceMessage:
          maintenanceMessageInput.value.trim() ||
          "SullPedia sedang maintenance. Mohon tunggu sebentar ya.",
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      },
      { merge: true }
    );

    await showAlert(
      nextMode
        ? "Maintenance berhasil diaktifkan."
        : "Maintenance berhasil dimatikan.",
      {
        title: "Berhasil",
        icon: "✓"
      }
    );
  } catch (error) {
    console.error(error);

    await showAlert(error.message || "Gagal mengubah maintenance.", {
      title: "Gagal",
      icon: "!"
    });
  }
});