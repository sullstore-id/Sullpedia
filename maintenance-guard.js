// maintenance-guard.js
import { db } from "./firebase-config.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export async function checkMaintenanceAccess(user) {
  if (!user) {
    return {
      allowed: false,
      isAdmin: false,
      maintenanceMode: false
    };
  }

  const userRef = doc(db, "users", user.uid);
  const configRef = doc(db, "appConfig", "system");

  const [userSnap, configSnap] = await Promise.all([
    getDoc(userRef),
    getDoc(configRef)
  ]);

  const userData = userSnap.exists() ? userSnap.data() : {};
  const configData = configSnap.exists() ? configSnap.data() : {};

  const isAdmin = userData.role === "admin";
  const maintenanceMode = configData.maintenanceMode === true;

  if (maintenanceMode && !isAdmin) {
    window.location.href = "maintenance.html";
    return {
      allowed: false,
      isAdmin: false,
      maintenanceMode: true
    };
  }

  return {
    allowed: true,
    isAdmin,
    maintenanceMode,
    userData,
    configData
  };
}