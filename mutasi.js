import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const historyList = document.getElementById("historyList");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const q = query(
    collection(db, "qrisMutations"),
    where("uid", "==", user.uid)
  );

  onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        historyList.innerHTML = `<p class="empty-text">Belum ada riwayat transaksi.</p>`;
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
          <article class="history-card">
            <div class="history-info">
              <h3>${escapeHTML(data.title || "Konfirmasi Saldo QRIS")}</h3>
              <p>${formatDate(data.createdAt)}</p>
            </div>

            <div class="history-amount">
              <span class="status ${data.status || "pending"}">
                ${statusText(data.status)}
              </span>
              <h4 class="${data.status === "rejected" ? "rejected-text" : ""}">
                ${data.direction === "out" ? "-" : "+"} ${formatRupiah(data.amount || 0)}
              </h4>
            </div>
          </article>
        `;
      });

      historyList.innerHTML = html;
    },
    (error) => {
      console.error("Gagal load mutasi:", error);
      historyList.innerHTML = `<p class="empty-text">${getFirestoreErrorMessage(error)}</p>`;
    }
  );
});

function statusText(status) {
  if (status === "approved") return "LUNAS";
  if (status === "rejected") return "DITOLAK";
  return "MENUNGGU";
}

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
    return "Akses riwayat ditolak. Cek Firestore Rules untuk qrisMutations.";
  }

  if (error?.code === "failed-precondition") {
    return "Query butuh index Firestore.";
  }

  return "Gagal memuat riwayat transaksi.";
}