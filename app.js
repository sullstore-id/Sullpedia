// app.js
import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { checkMaintenanceAccess } from "./maintenance-guard.js";

/* ELEMENT LOGIN REGISTER */
const authPage = document.getElementById("authPage");
const dashboardPage = document.getElementById("dashboardPage");

const btnLoginTab = document.getElementById("btnLoginTab");
const btnRegisterTab = document.getElementById("btnRegisterTab");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const authMessage = document.getElementById("authMessage");

/* ELEMENT DASHBOARD */
const greeting = document.getElementById("greeting");
const usernameText = document.getElementById("usernameText");

const profileInitial = document.getElementById("profileInitial");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");

const logoutBtn = document.getElementById("logoutBtn");

const navButtons = document.querySelectorAll(".nav-btn");

const pageSections = ["homeSection", "transactionSection", "accountSection"];

/* TAB LOGIN REGISTER */
btnLoginTab.addEventListener("click", () => {
  btnLoginTab.classList.add("active");
  btnRegisterTab.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  setMessage("");
});

btnRegisterTab.addEventListener("click", () => {
  btnRegisterTab.classList.add("active");
  btnLoginTab.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  setMessage("");
});

/* PESAN ERROR */
function setMessage(text, type = "error") {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.classList.toggle("success", type === "success");
}

function getErrorMessage(error) {
  const code = error.code;

  if (code === "auth/invalid-email") return "Format email tidak valid.";
  if (code === "auth/email-already-in-use") return "Email ini sudah terdaftar.";
  if (code === "auth/weak-password") return "Password minimal 6 karakter.";
  if (code === "auth/invalid-credential") return "Email atau password salah.";
  if (code === "auth/network-request-failed") return "Koneksi internet bermasalah.";

  return "Terjadi kesalahan. Coba lagi.";
}

/* REGISTER */
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  if (!username || !email || !password) {
    setMessage("Semua field harus diisi.");
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(result.user, { displayName: username });

    await setDoc(doc(db, "users", result.user.uid), {
      username: username,
      email: email,
      saldoUtama: 0,
      saldoQris: 0,
      role: "user",
      createdAt: serverTimestamp()
    });

    setMessage("Akun berhasil dibuat! Silakan login.", "success");
    registerForm.reset();

    // Auto switch ke tab login
    btnLoginTab.click();
  } catch (error) {
    console.error(error);
    setMessage(getErrorMessage(error));
  }
});

/* LOGIN */
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (error) {
    console.error(error);
    setMessage(getErrorMessage(error));
  }
});

/* LOGOUT */
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
});

/* CEK USER LOGIN */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const access = await checkMaintenanceAccess(user);

    if (!access.allowed) return;

    showDashboard(user);
  } else {
    showAuthPage();
  }
});

function showDashboard(user) {
  authPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");

  const username = user.displayName || user.email?.split("@")[0] || "User";
  const email = user.email;

  usernameText.textContent = username;
  profileName.textContent = username;
  profileEmail.textContent = email;
  profileInitial.textContent = username.charAt(0).toUpperCase();

  setGreeting();
  listenUserBalance(user.uid);
}

function showAuthPage() {
  dashboardPage.classList.add("hidden");
  authPage.classList.remove("hidden");
}

function listenUserBalance(uid) {
  const saldoUtamaText = document.getElementById("saldoUtamaText");
  const saldoQrisText = document.getElementById("saldoQrisText");

  const adminQrisLink = document.getElementById("adminQrisLink");
const adminPremiumLink = document.getElementById("adminPremiumLink");
const adminSosmedLink = document.getElementById("adminSosmedLink");
const adminMaintenanceLink = document.getElementById("adminMaintenanceLink");

  if (!saldoUtamaText || !saldoQrisText) return;

  onSnapshot(doc(db, "users", uid), (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();

    saldoUtamaText.textContent = formatRupiah(data.saldoUtama || 0);
    saldoQrisText.textContent = formatRupiah(data.saldoQris || 0);

    if (adminQrisLink) {
      if (data.role === "admin") {
        adminQrisLink.classList.remove("hidden");
      } else {
        adminQrisLink.classList.add("hidden");
      }
    }

    if (adminPremiumLink) {
      if (data.role === "admin") {
        adminPremiumLink.classList.remove("hidden");
      } else {
        adminPremiumLink.classList.add("hidden");
      }
    }
    
    if (adminSosmedLink) {
  if (data.role === "admin") {
    adminSosmedLink.classList.remove("hidden");
  } else {
    adminSosmedLink.classList.add("hidden");
  }
}

if (adminMaintenanceLink) {
  if (data.role === "admin") {
    adminMaintenanceLink.classList.remove("hidden");
  } else {
    adminMaintenanceLink.classList.add("hidden");
  }
}
  });
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number);
}

function setGreeting() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) greeting.textContent = "Selamat pagi,";
  else if (hour >= 11 && hour < 15) greeting.textContent = "Selamat siang,";
  else if (hour >= 15 && hour < 18) greeting.textContent = "Selamat sore,";
  else greeting.textContent = "Selamat malam,";
}

/* BOTTOM NAVIGATION */
navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;

    navButtons.forEach(nav => nav.classList.remove("active"));
    button.classList.add("active");

    pageSections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.toggle("hidden", sectionId !== target);
      }
    });
  });
});
