// detail-transaksi.js
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const receiptCard = document.getElementById("receiptCard");

const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  if (!orderId) {
    receiptCard.innerHTML = `
      <div class="empty">
        <h4>Transaksi tidak ditemukan</h4>
        <p>ID transaksi kosong.</p>
      </div>
    `;
    return;
  }

  await loadOrder(user.uid);
});

async function loadOrder(uid) {
  try {
    const orderRef = doc(db, "premiumOrders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      receiptCard.innerHTML = `
        <div class="empty">
          <h4>Transaksi tidak ditemukan</h4>
          <p>Data transaksi tidak tersedia.</p>
        </div>
      `;
      return;
    }

    const order = orderSnap.data();

    if (order.uid !== uid) {
      receiptCard.innerHTML = `
        <div class="empty">
          <h4>Akses ditolak</h4>
          <p>Transaksi ini bukan milik akun kamu.</p>
        </div>
      `;
      return;
    }

    renderReceipt(order);
  } catch (error) {
    console.error(error);
    receiptCard.innerHTML = `
      <div class="empty">
        <h4>Gagal memuat transaksi</h4>
        <p>Coba lagi beberapa saat.</p>
      </div>
    `;
  }
}

function renderReceipt(order) {
  const createdAt = order.createdAt?.toDate
    ? formatDateTime(order.createdAt.toDate())
    : "-";

  const adminNote = order.adminNote?.trim()
    ? order.adminNote
    : "Pesanan sedang diproses. Detail akun akan muncul di sini setelah admin menyelesaikan transaksi.";

  receiptCard.innerHTML = `
    <div class="receipt-logo">${order.appIcon || "PP"}</div>

    <h2>${formatRupiah(order.price || 0)}</h2>

    <p class="receipt-product">
  ${order.productName || "-"} - ${order.buyerTarget || order.buyerWhatsapp || "-"}
  <br />
  #${order.transactionId || order.orderId || "-"}
</p>

    <div class="receipt-divider"></div>

    <div class="receipt-section-title">Rincian transaksi</div>

    <div class="receipt-row">
      <span>Status</span>
      <strong class="${order.status}">
        ${getStatusLabel(order.status)}
      </strong>
    </div>
    
    <div class="receipt-row">
  <span>Refund</span>
  <strong>
    ${order.refundStatus === "refunded" ? "Sudah dikembalikan" : "-"}
  </strong>
</div>

    <div class="receipt-row">
      <span>Metode Pembayaran</span>
      <strong>${order.paymentMethod || "Saldo Utama"}</strong>
    </div>

    <div class="receipt-row">
      <span>Tanggal/Waktu</span>
      <strong>${createdAt}</strong>
    </div>

    <div class="receipt-row">
      <span>Order ID</span>
      <strong>${order.orderId || "-"}</strong>
    </div>

    <div class="receipt-row">
      <span>ID Transaksi</span>
      <strong>${order.transactionId || "-"}</strong>
    </div>

    <div class="receipt-row">
      <span>Biaya Admin</span>
      <strong>Rp0</strong>
    </div>

    <div class="receipt-divider"></div>

    <div class="admin-note-box">
      ${escapeHtml(adminNote).replace(/\n/g, "<br />")}
    </div>

    <div class="receipt-divider"></div>

    <div class="receipt-row">
      <span>Jumlah</span>
      <strong>${formatRupiah(order.price || 0)}</strong>
    </div>

    <div class="receipt-divider"></div>

    <div class="receipt-total">
      <span>Total</span>
      <strong>${formatRupiah(order.price || 0)}</strong>
    </div>

    <button class="print-btn" type="button" onclick="window.print()">
      Cetak Struk
    </button>
  `;
}

function getStatusLabel(status) {
  if (status === "success") return "Sukses";
  if (status === "failed") return "Gagal";
  return "Proses";
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(number || 0));
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}