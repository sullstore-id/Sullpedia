import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const accountUsername = document.getElementById("accountUsername");
const accountInitial = document.getElementById("accountInitial");
const accountUid = document.getElementById("accountUid");

const accountSaldoUtama = document.getElementById("accountSaldoUtama");
const accountSaldoQris = document.getElementById("accountSaldoQris");

const copyUidBtn = document.getElementById("copyUidBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUid = "";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const username = user.displayName || user.email.split("@")[0];
  const initial = username.charAt(0).toUpperCase();

  currentUid = user.uid.substring(0, 8);

  accountUsername.textContent = username;
  accountInitial.textContent = initial;
  accountUid.textContent = currentUid;

  onSnapshot(doc(db, "users", user.uid), (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();

    accountSaldoUtama.textContent = formatRupiah(data.saldoUtama || 0);
    accountSaldoQris.textContent = formatRupiah(data.saldoQris || 0);
  });
});

copyUidBtn.addEventListener("click", async () => {
  if (!currentUid) return;

  try {
    await navigator.clipboard.writeText(currentUid);
    accountUid.textContent = "Disalin";

    setTimeout(() => {
      accountUid.textContent = currentUid;
    }, 1200);
  } catch {
    alert("UID gagal disalin.");
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(number || 0));
}