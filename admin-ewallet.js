import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { showAlert } from "./ui-dialog.js";
import { checkMaintenanceAccess } from "./maintenance-guard.js";

const adminTotalOrderText = document.getElementById("adminTotalOrderText");
const adminProcessingText = document.getElementById("adminProcessingText");
const adminSuccessText = document.getElementById("adminSuccessText");
const adminFailedText = document.getElementById("adminFailedText");
const adminOrderList = document.getElementById("adminOrderList");
const adminStatusSelect = document.getElementById("adminStatusSelect");
const adminNoteInput = document.getElementById("adminNoteInput");
const adminSelectedInfo = document.getElementById("adminSelectedInfo");
const adminSaveBtn = document.getElementById("adminSaveBtn");
const filterButtons = document.querySelectorAll(".admin-filter-btn");

let currentUser = null;
let allOrders = [];
let activeFilter = "all";
let selectedOrder = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  try {
    const access = await checkMaintenanceAccess(user);
    if (!access.allowed) return;

    const userRole = await loadUserRole(user.uid);
    if (userRole !== "admin") {
      await showAlert("Halaman ini khusus admin.", {
        title: "Akses ditolak",
        icon: "!"
      });
      window.location.href = "index.html";
      return;
    }

    listenOrders();
  } catch (error) {
    console.error("Gagal buka admin e-wallet:", error);
    adminOrderList.innerHTML = `
      <div class="admin-empty-state">
        <h4>Gagal memuat order</h4>
        <p>${escapeHtml(error.message || "Terjadi kesalahan saat memuat data.")}</p>
      </div>
    `;
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderOrders();
  });
});

adminSaveBtn?.addEventListener("click", async () => {
  if (!selectedOrder) {
    await showAlert("Pilih order dulu di list sebelah atas.", {
      title: "Belum ada order",
      icon: "!"
    });
    return;
  }

  try {
    adminSaveBtn.disabled = true;
    adminSaveBtn.textContent = "Menyimpan...";

    await updateDoc(doc(db, "premiumOrders", selectedOrder.docId), {
      status: adminStatusSelect.value,
      adminNote: adminNoteInput.value.trim(),
      updatedAt: serverTimestamp()
    });

    await showAlert("Perubahan order berhasil disimpan.", {
      title: "Berhasil",
      icon: "✓"
    });
  } catch (error) {
    console.error("Gagal update order:", error);
    await showAlert(error.message || "Gagal menyimpan perubahan.", {
      title: "Gagal menyimpan",
      icon: "!"
    });
  } finally {
    adminSaveBtn.disabled = false;
    adminSaveBtn.textContent = "Simpan Perubahan";
  }
});

async function loadUserRole(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return "user";
  return snapshot.data().role || "user";
}

function listenOrders() {
  const ordersQuery = query(collection(db, "premiumOrders"), where("orderType", "==", "ewallet"));

  onSnapshot(
    ordersQuery,
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
      preserveSelectedOrder();
      renderOrders();
    },
    (error) => {
      console.error("Gagal listen order:", error);
      adminOrderList.innerHTML = `
        <div class="admin-empty-state">
          <h4>Gagal memuat order</h4>
          <p>${escapeHtml(error.message || "Cek Firestore Rules atau koneksi internet.")}</p>
        </div>
      `;
    }
  );
}

function updateCounts() {
  adminTotalOrderText.textContent = allOrders.length;
  adminProcessingText.textContent = allOrders.filter((item) => item.status === "processing").length;
  adminSuccessText.textContent = allOrders.filter((item) => item.status === "success").length;
  adminFailedText.textContent = allOrders.filter((item) => item.status === "failed").length;
}

function preserveSelectedOrder() {
  if (!selectedOrder) return;

  const fresh = allOrders.find((item) => item.docId === selectedOrder.docId);
  if (!fresh) return;

  selectedOrder = fresh;
  fillEditor(selectedOrder);
}

function renderOrders() {
  let orders = [...allOrders];

  if (activeFilter !== "all") {
    orders = orders.filter((item) => item.status === activeFilter);
  }

  if (!orders.length) {
    adminOrderList.innerHTML = `
      <div class="admin-empty-state">
        <h4>Belum ada order</h4>
        <p>Order e-wallet dengan filter ini masih kosong.</p>
      </div>
    `;
    return;
  }

  adminOrderList.innerHTML = orders
    .map((order) => {
      const iconClass = getIconClass(order.serviceId);
      const isActive = selectedOrder?.docId === order.docId;

      return `
        <button class="admin-order-card ${isActive ? "active" : ""}" type="button" data-id="${order.docId}" style="text-align:left; width:100%;">
          <div class="order-logo ${iconClass}">${order.appIcon || "EW"}</div>
          <div class="admin-order-main">
            <div class="admin-order-topline">
              <h3>${escapeHtml(order.productName || "-")}</h3>
              <span class="status-chip ${order.status || "processing"}">${getStatusLabel(order.status)}</span>
            </div>

            <p>${escapeHtml(order.buyerTarget || "-")}</p>
            <p class="admin-order-meta">#${escapeHtml(order.transactionId || order.orderId || order.docId)} • ${formatRupiah(order.price || 0)}</p>
          </div>
        </button>
      `;
    })
    .join("");

  adminOrderList.querySelectorAll(".admin-order-card").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.id;
      const order = allOrders.find((item) => item.docId === targetId);
      if (!order) return;

      selectedOrder = order;
      fillEditor(order);
      renderOrders();
    });
  });
}

function fillEditor(order) {
  adminStatusSelect.value = order.status || "processing";
  adminNoteInput.value = order.adminNote || "";
  adminSelectedInfo.textContent = `${order.productName || "-"} • ${order.buyerTarget || "-"} • ${formatRupiah(order.price || 0)}`;
}

function getStatusLabel(status) {
  if (status === "success") return "Sukses";
  if (status === "failed") return "Gagal";
  return "Menunggu";
}

function getIconClass(serviceId) {
  if (serviceId === "dana") return "bg-dana";
  if (serviceId === "gopay") return "bg-gopay";
  if (serviceId === "ovo") return "bg-ovo";
  if (serviceId === "shopeepay") return "bg-shopeepay";
  return "bg-ovo";
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