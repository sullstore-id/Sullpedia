// admin-premium.js
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  runTransaction,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { showAlert } from "./ui-dialog.js";

const adminOrderList = document.getElementById("adminOrderList");

let currentUser = null;

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

  listenAllOrders();
});

function listenAllOrders() {
  const orderQuery = query(
    collection(db, "premiumOrders"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    orderQuery,
    (snapshot) => {
      const orders = snapshot.docs.map((docSnap) => ({
  docId: docSnap.id,
  ...docSnap.data()
}));

const premiumOnly = orders.filter((order) => order.orderType !== "sosmed");

renderAdminOrders(premiumOnly);
    },
    (error) => {
      console.error(error);
      adminOrderList.innerHTML = `
        <div class="empty">
          <h4>Gagal memuat pesanan</h4>
          <p>Cek koneksi atau Firestore Index.</p>
        </div>
      `;
    }
  );
}

function renderAdminOrders(orders) {
  adminOrderList.innerHTML = "";

  if (!orders.length) {
    adminOrderList.innerHTML = `
      <div class="empty">
        <h4>Belum ada pesanan</h4>
        <p>Order app premium akan muncul di sini.</p>
      </div>
    `;
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement("section");
    card.className = "admin-order-card";

    card.innerHTML = `
      <div class="admin-order-head">
        <div class="trx-icon">${order.appIcon || "PP"}</div>

        <div>
          <h3>${order.productName || "-"}</h3>
          <p>${order.username || "-"} • ${order.buyerWhatsapp || "-"}</p>
          <strong>${formatRupiah(order.price || 0)}</strong>
        </div>

        <span class="status-badge ${order.status}">
          ${getStatusLabel(order.status)}
        </span>
      </div>

      <label>
        Status Pesanan
        <select class="admin-status-input">
          <option value="processing" ${order.status === "processing" ? "selected" : ""}>Proses</option>
          <option value="success" ${order.status === "success" ? "selected" : ""}>Sukses</option>
          <option value="failed" ${order.status === "failed" ? "selected" : ""}>Gagal</option>
        </select>
      </label>

      <label>
        Catatan / Data Akun
        <textarea
          class="admin-note-input"
          rows="5"
          placeholder="Contoh: email akun, password, link akses, atau catatan lainnya"
        >${order.adminNote || ""}</textarea>
      </label>

      <button class="main-btn admin-save-btn" type="button">
        Simpan Perubahan
      </button>
    `;

    const statusInput = card.querySelector(".admin-status-input");
    const noteInput = card.querySelector(".admin-note-input");
    const saveBtn = card.querySelector(".admin-save-btn");

    saveBtn.addEventListener("click", async () => {
  saveBtn.disabled = true;
  saveBtn.textContent = "Menyimpan...";

  const newStatus = statusInput.value;
  const newNote = noteInput.value.trim();

  try {
    await updateOrderWithRefund(order.docId, newStatus, newNote);
    await showAlert("Pesanan berhasil diperbarui.", {
  title: "Berhasil disimpan",
  icon: "✓"
});
  } catch (error) {
    console.error(error);
   await showAlert(error.message || "Gagal menyimpan perubahan.", {
  title: "Gagal menyimpan",
  icon: "!"
});
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Simpan Perubahan";
  }
});

    adminOrderList.appendChild(card);
  });
}

async function updateOrderWithRefund(orderDocId, newStatus, newNote) {
  const orderRef = doc(db, "premiumOrders", orderDocId);

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);

    if (!orderSnap.exists()) {
      throw new Error("Data pesanan tidak ditemukan.");
    }

    const orderData = orderSnap.data();
    const userRef = doc(db, "users", orderData.uid);

    const oldStatus = orderData.status;
    const price = Number(orderData.price || 0);
    const alreadyRefunded = orderData.refundStatus === "refunded";

    const shouldRefund =
      newStatus === "failed" &&
      oldStatus !== "failed" &&
      !alreadyRefunded &&
      price > 0;

    if (shouldRefund) {
      transaction.update(userRef, {
        saldoUtama: increment(price)
      });
    }

    transaction.update(orderRef, {
      status: newStatus,
      adminNote: newNote,
      refundStatus: shouldRefund ? "refunded" : (orderData.refundStatus || "none"),
      refundedAt: shouldRefund ? serverTimestamp() : (orderData.refundedAt || null),
      updatedAt: serverTimestamp(),
      completedAt: newStatus === "success" ? serverTimestamp() : (orderData.completedAt || null)
    });
  });
}

function getStatusLabel(status) {
  if (status === "success") return "Sukses";
  if (status === "failed") return "Gagal";
  return "Proses";
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(number || 0));
}