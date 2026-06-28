// transaksi.js
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { checkMaintenanceAccess } from "./maintenance-guard.js";

const transactionList = document.getElementById("transactionList");
const successCount = document.getElementById("successCount");
const processCount = document.getElementById("processCount");
const failedCount = document.getElementById("failedCount");
const tabs = document.querySelectorAll(".trx-tab");

let allOrders = [];
let activeFilter = "all";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const access = await checkMaintenanceAccess(user);
    if (!access.allowed) return;

    listenOrders(user.uid);
  } catch (error) {
    console.error("Gagal cek maintenance:", error);

    transactionList.innerHTML = `
      <div class="empty">
        <h4>Gagal memuat transaksi</h4>
        <p>${error.message || "Terjadi kesalahan saat memuat halaman transaksi."}</p>
      </div>
    `;
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    activeFilter = tab.dataset.filter;
    renderOrders();
  });
});

function listenOrders(uid) {
  const orderQuery = query(
    collection(db, "premiumOrders"),
    where("uid", "==", uid)
  );

  onSnapshot(
    orderQuery,
    (snapshot) => {
      allOrders = snapshot.docs.map((docSnap) => ({
        docId: docSnap.id,
        ...docSnap.data()
      }));

      allOrders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      updateCounts();
      renderOrders();
    },
    (error) => {
      console.error("Gagal memuat transaksi:", error);

      transactionList.innerHTML = `
        <div class="empty">
          <h4>Gagal memuat transaksi</h4>
          <p>${error.message || "Coba cek koneksi atau Firestore Rules."}</p>
        </div>
      `;
    }
  );
}

function updateCounts() {
  const sukses = allOrders.filter((item) => item.status === "success").length;
  const proses = allOrders.filter((item) => item.status === "processing").length;
  const gagal = allOrders.filter((item) => item.status === "failed").length;

  successCount.textContent = sukses;
  processCount.textContent = proses;
  failedCount.textContent = gagal;
}

function renderOrders() {
  transactionList.innerHTML = "";

  let orders = [...allOrders];

  if (activeFilter !== "all") {
    orders = orders.filter((item) => item.status === activeFilter);
  }

  if (!orders.length) {
    transactionList.innerHTML = `
      <div class="empty">
        <h4>Belum ada transaksi</h4>
        <p>Riwayat pembelian app premium dan suntik sosmed akan muncul di sini.</p>
      </div>
    `;
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement("a");
    card.href = `detail-transaksi.html?id=${order.docId}`;
    card.className = "trx-card";

    card.innerHTML = `
      <div class="trx-icon">${order.appIcon || "PP"}</div>

      <div class="trx-info">
        <h3>${order.productName || "-"}</h3>
        <p>#${order.transactionId || order.orderId || order.docId}</p>
        <strong>${order.paymentStatus === "paid" ? "Lunas" : "Belum dibayar"}</strong>
      </div>

      <span class="status-badge ${order.status}">
        ${getStatusLabel(order.status)}
      </span>
    `;

    transactionList.appendChild(card);
  });
}

function getStatusLabel(status) {
  if (status === "success") return "Sukses";
  if (status === "failed") return "Gagal";
  return "Proses";
}
