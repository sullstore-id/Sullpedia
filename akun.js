import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { checkMaintenanceAccess } from "./maintenance-guard.js";
import { showAlert, showConfirm } from "./ui-dialog.js";

const accountUsername = document.getElementById("accountUsername");
const accountInitial = document.getElementById("accountInitial");
const accountUid = document.getElementById("accountUid");

const accountSaldoUtama = document.getElementById("accountSaldoUtama");
const accountSaldoQris = document.getElementById("accountSaldoQris");

const copyUidBtn = document.getElementById("copyUidBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUid = "";
let unsubscribeUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const access = await checkMaintenanceAccess(user);
    if (!access.allowed) return;

    currentUid = user.uid.substring(0, 8);
    accountUid.textContent = currentUid;

    const fallbackUsername =
      user.displayName ||
      user.email?.split("@")[0] ||
      "User";

    setProfileName(fallbackUsername);

    if (unsubscribeUser) {
      unsubscribeUser();
    }

    unsubscribeUser = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          setProfileName(fallbackUsername);
          accountSaldoUtama.textContent = formatRupiah(0);
          accountSaldoQris.textContent = formatRupiah(0);
          return;
        }

        const data = snapshot.data();

        const username =
          data.username ||
          user.displayName ||
          user.email?.split("@")[0] ||
          "User";

        setProfileName(username);

        accountSaldoUtama.textContent = formatRupiah(data.saldoUtama || 0);
        accountSaldoQris.textContent = formatRupiah(data.saldoQris || 0);
      },
      async (error) => {
        console.error("Gagal memuat data akun:", error);

        await showAlert("Gagal memuat data akun. Cek koneksi atau Firestore Rules.", {
          title: "Data akun gagal dimuat",
          icon: "!"
        });
      }
    );
  } catch (error) {
    console.error("Gagal cek akun:", error);

    await showAlert(error.message || "Gagal memuat halaman akun.", {
      title: "Terjadi kesalahan",
      icon: "!"
    });
  }
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
    await showAlert("UID gagal disalin.", {
      title: "Gagal menyalin",
      icon: "!"
    });
  }
});

logoutBtn.addEventListener("click", async () => {
  const confirmLogout = await showConfirm("Keluar dari akun sekarang?", {
    title: "Keluar Akun",
    icon: "↪",
    okText: "Keluar",
    cancelText: "Batal"
  });

  if (!confirmLogout) return;

  await signOut(auth);
  window.location.href = "index.html";
});

function setProfileName(username) {
  const safeUsername = username || "User";

  accountUsername.textContent = safeUsername;
  accountInitial.textContent = safeUsername.charAt(0).toUpperCase();
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(number || 0));
}