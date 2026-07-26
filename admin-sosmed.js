// admin-sosmed.js
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  runTransaction,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const adminSosmedOrderList = document.getElementById("adminSosmedOrderList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};

  if (userData.role !== "admin") {
    alert("Halaman ini khusus admin.");
    window.location.href = "index.html";
    return;
  }

  listenSosmedOrders();
});

function listenSosmedOrders() {
  onSnapshot(
    collection(db, "premiumOrders"),
    (snapshot) => {
      let orders = snapshot.docs.map((docSnap) => ({
        docId: docSnap.id,
        ...docSnap.data()
      }));

      orders = orders.filter((order) => order.orderType === "sosmed");

      orders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      renderSosmedOrders(orders);
    },
    (error) => {
      console.error(error);

      adminSosmedOrderList.innerHTML = `
        <div class="empty">
          <h4>Gagal memuat pesanan</h4>
          <p>${error.message || "Coba cek koneksi atau Firestore Rules."}</p>
        </div>
      `;
    }
  );
}

function renderSosmedOrders(orders) {
  adminSosmedOrderList.innerHTML = "";

  if (!orders.length) {
    adminSosmedOrderList.innerHTML = `
      <div class="empty">
        <h4>Belum ada pesanan</h4>
        <p>Pesanan suntik sosmed akan muncul di sini.</p>
      </div>
    `;
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement("section");
    card.className = "admin-order-card";

    card.innerHTML = `
      <div class="admin-order-head">
        <div class="trx-icon">${order.appIcon || "SS"}</div>

        <div>
          <h3>${order.productName || "-"}</h3>
          <p>${order.username || "-"} • ${order.buyerTarget || order.buyerWhatsapp || "-"}</p>
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
        Catatan / Hasil Pesanan
        <textarea
          class="admin-note-input"
          rows="5"
          placeholder="Contoh: pesanan sudah diproses, tidak ada SN, link salah, atau catatan lainnya"
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
        await updateSosmedOrder(order.docId, newStatus, newNote);
        alert("Pesanan suntik sosmed berhasil diperbarui.");
      } catch (error) {
        console.error(error);
        alert(error.message || "Gagal menyimpan perubahan.");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan Perubahan";
      }
    });

    adminSosmedOrderList.appendChild(card);
  });
}

async function updateSosmedOrder(orderDocId, newStatus, newNote) {
  const orderRef = doc(db, "premiumOrders", orderDocId);

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);

    if (!orderSnap.exists()) {
      throw new Error("Data pesanan tidak ditemukan.");
    }

    const orderData = orderSnap.data();

    if (orderData.orderType !== "sosmed") {
      throw new Error("Pesanan ini bukan pesanan suntik sosmed.");
    }

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
      completedAt: newStatus === "success" ? serverTimestamp() : (orderData.completedAt || null),
      updatedAt: serverTimestamp()
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