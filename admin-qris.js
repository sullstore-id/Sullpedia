import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  runTransaction,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { showAlert, showConfirm } from "./ui-dialog.js";

const adminList = document.getElementById("adminList");
let currentAdmin = null;

/* =========================
   CEK LOGIN DAN ROLE ADMIN
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const adminRef = doc(db, "users", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists() || adminSnap.data().role !== "admin") {
      await showAlert("Akses ditolak. Halaman ini khusus admin.", {
  title: "Akses ditolak",
  icon: "!"
});
      window.location.href = "index.html";
      return;
    }

    currentAdmin = user;
    listenPendingDeposits();
  } catch (error) {
    console.error("Gagal cek role admin:", error);
    adminList.innerHTML = `<p class="empty-text">Gagal memverifikasi admin. Cek Firestore Rules.</p>`;
  }
});

/* =========================
   AMBIL DATA DEPOSIT PENDING
========================= */
function listenPendingDeposits() {
  const q = query(
    collection(db, "qrisDeposits"),
    where("status", "==", "pending")
  );

  onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        adminList.innerHTML = `<p class="empty-text">Tidak ada konfirmasi pending.</p>`;
        return;
      }

      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));

      let html = "";

      items.forEach((data) => {
        html += `
          <article class="admin-card">
            <div>
              <h3>${escapeHTML(data.username || "User")}</h3>
              <p>${escapeHTML(data.email || "-")}</p>
              <p>${formatDate(data.createdAt)}</p>
              <h4>${formatRupiah(data.amount || 0)}</h4>
              <a href="${encodeURI(data.proofUrl || "#")}" target="_blank" rel="noopener">
                Lihat bukti transfer
              </a>
            </div>

            <div class="admin-actions">
              <button class="approve-btn" data-id="${data.id}" type="button">
                Setujui
              </button>

              <button class="reject-btn" data-id="${data.id}" type="button">
                Tolak
              </button>
            </div>
          </article>
        `;
      });

      adminList.innerHTML = html;
    },
    (error) => {
      console.error("Gagal load pending deposits:", error);
      adminList.innerHTML = `<p class="empty-text">${getFirestoreErrorMessage(error)}</p>`;
    }
  );
}

/* =========================
   TOMBOL ADMIN
========================= */
adminList.addEventListener("click", async (event) => {
  const approveBtn = event.target.closest(".approve-btn");
  const rejectBtn = event.target.closest(".reject-btn");

  if (approveBtn) {
    const depositId = approveBtn.dataset.id;
    await approveDeposit(depositId);
  }

  if (rejectBtn) {
    const depositId = rejectBtn.dataset.id;
    await rejectDeposit(depositId);
  }
});

/* =========================
   APPROVE DEPOSIT
========================= */
async function approveDeposit(depositId) {
  const confirmAction = await showConfirm(
    "Setujui transaksi ini dan masukkan saldo ke QRIS?",
    {
      title: "Setujui Deposit",
      icon: "✓",
      okText: "Setujui",
      cancelText: "Batal"
    }
  );

  if (!confirmAction) return;

  const depositRef = doc(db, "qrisDeposits", depositId);
  const mutationRef = doc(db, "qrisMutations", depositId);

  try {
    await runTransaction(db, async (transaction) => {
      const depositSnap = await transaction.get(depositRef);

      if (!depositSnap.exists()) {
        throw new Error("Data deposit tidak ditemukan.");
      }

      const depositData = depositSnap.data();

      if (depositData.status !== "pending") {
        throw new Error("Deposit ini sudah diproses.");
      }

      const uid = depositData.uid;
      const amount = Number(depositData.amount || 0);

      if (!uid) {
        throw new Error("UID pengguna tidak ditemukan.");
      }

      if (!amount || amount < 1000) {
        throw new Error("Nominal tidak valid.");
      }

      const userRef = doc(db, "users", uid);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists()) {
        throw new Error("Data user tidak ditemukan.");
      }

      transaction.update(depositRef, {
        status: "approved",
        updatedAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        approvedBy: currentAdmin.uid
      });

      transaction.set(
        mutationRef,
        {
          uid: uid,
          title: "Konfirmasi Saldo QRIS",
          amount: amount,
          status: "approved",
          direction: "in",
          depositId: depositId,
          proofUrl: depositData.proofUrl || "",
          updatedAt: serverTimestamp(),
          approvedAt: serverTimestamp()
        },
        { merge: true }
      );

      transaction.update(userRef, {
        saldoQris: increment(amount)
      });
    });

    await showAlert("Deposit berhasil disetujui dan saldo QRIS sudah masuk.", {
      title: "Deposit disetujui",
      icon: "✓"
    });
  } catch (error) {
    console.error(error);

    await showAlert(error.message || "Gagal menyetujui deposit.", {
      title: "Gagal menyetujui",
      icon: "!"
    });
  }
}

/* =========================
   REJECT DEPOSIT
========================= */
async function rejectDeposit(depositId) {
  const confirmAction = await showConfirm(
    "Tolak transaksi ini?",
    {
      title: "Tolak Deposit",
      icon: "!",
      okText: "Tolak",
      cancelText: "Batal"
    }
  );

  if (!confirmAction) return;

  const depositRef = doc(db, "qrisDeposits", depositId);
  const mutationRef = doc(db, "qrisMutations", depositId);

  try {
    await runTransaction(db, async (transaction) => {
      const depositSnap = await transaction.get(depositRef);

      if (!depositSnap.exists()) {
        throw new Error("Data deposit tidak ditemukan.");
      }

      const depositData = depositSnap.data();

      if (depositData.status !== "pending") {
        throw new Error("Deposit ini sudah diproses.");
      }

      transaction.update(depositRef, {
        status: "rejected",
        updatedAt: serverTimestamp(),
        rejectedAt: serverTimestamp(),
        rejectedBy: currentAdmin.uid
      });

      transaction.set(
        mutationRef,
        {
          uid: depositData.uid,
          title: "Konfirmasi Saldo QRIS",
          amount: Number(depositData.amount || 0),
          status: "rejected",
          direction: "in",
          depositId: depositId,
          proofUrl: depositData.proofUrl || "",
          updatedAt: serverTimestamp(),
          rejectedAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    await showAlert("Deposit berhasil ditolak.", {
      title: "Deposit ditolak",
      icon: "✓"
    });
  } catch (error) {
    console.error(error);

    await showAlert(error.message || "Gagal menolak deposit.", {
      title: "Gagal menolak",
      icon: "!"
    });
  }
}

/* =========================
   HELPER
========================= */
function getMillis(timestamp) {
  if (!timestamp) return 0;
  try {
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().getTime();
    }
    return new Date(timestamp).getTime() || 0;
  } catch {
    return 0;
  }
}

function formatDate(timestamp) {
  const ms = getMillis(timestamp);
  if (!ms) return "Baru saja";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(ms));
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(number || 0));
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFirestoreErrorMessage(error) {
  if (error?.code === "permission-denied") {
    return "Akses Firestore ditolak. Cek rules admin/qrisDeposits.";
  }

  if (error?.code === "failed-precondition") {
    return "Query Firestore butuh index. Untuk sementara file ini sudah disederhanakan. Kalau masih muncul, cek console Firebase.";
  }

  return "Gagal memuat data admin. Cek console browser.";
}