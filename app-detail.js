// app-detail.js
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { showAlert, showConfirm } from "./ui-dialog.js";
import { checkMaintenanceAccess } from "./maintenance-guard.js";

const appTitle = document.getElementById("appTitle");
const appSubtitle = document.getElementById("appSubtitle");
const buyerWhatsapp = document.getElementById("buyerWhatsapp");
const saldoInfo = document.getElementById("saldoInfo");
const productList = document.getElementById("productList");
const refreshBtn = document.getElementById("refreshBtn");

let currentUser = null;
let currentUserData = null;
let products = [];
let unsubscribeUser = null;
let unsubscribeProducts = null;
let isBuying = false;

const params = new URLSearchParams(window.location.search);
const selectedAppId = params.get("app");

const premiumApps = {
  "alight-motion": {
    name: "Alight Motion",
    icon: "AM"
  },
  capcut: {
    name: "CapCut",
    icon: "CC"
  },
  canva: {
    name: "Canva",
    icon: "CV"
  },
  viu: {
    name: "Viu",
    icon: "VU"
  },
  youtube: {
    name: "YouTube",
    icon: "YT"
  },
  spotify: {
    name: "Spotify",
    icon: "SP"
  },
  chatgpt: {
    name: "ChatGPT",
    icon: "AI"
  },
  "prime-video": {
  name: "Prime Video",
  icon: "PV"
},
scribd: {
  name: "Scribd",
  icon: "SC"
},
"grok-ai": {
  name: "Grok AI",
  icon: "GK"
}
};

const selectedApp = premiumApps[selectedAppId];

if (!selectedApp) {
  showAlert("Aplikasi tidak ditemukan.", {
    title: "Aplikasi tidak tersedia",
    icon: "!"
  }).then(() => {
    window.location.href = "app-premium.html";
  });

  throw new Error("Aplikasi tidak ditemukan.");
}

appTitle.textContent = selectedApp.name;
appSubtitle.textContent = "Pilih paket premium yang tersedia.";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const access = await checkMaintenanceAccess(user);
    if (!access.allowed) return;

    currentUser = user;

    listenUserData(user.uid);
    listenProducts();
  } catch (error) {
    console.error("Gagal cek maintenance:", error);

    productList.innerHTML = `
      <div class="empty premium-empty">
        <h4>Gagal memuat produk</h4>
        <p>${error.message || "Terjadi kesalahan saat memuat halaman."}</p>
      </div>
    `;
  }
});

refreshBtn.addEventListener("click", () => {
  renderProducts();
});

function listenUserData(uid) {
  if (unsubscribeUser) unsubscribeUser();

  const userRef = doc(db, "users", uid);

  unsubscribeUser = onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        saldoInfo.textContent = "Saldo utama: Rp 0";
        return;
      }

      currentUserData = snapshot.data();
      saldoInfo.textContent = `Saldo utama: ${formatRupiah(currentUserData.saldoUtama || 0)}`;
    },
    (error) => {
      console.error("Gagal memuat saldo:", error);
      saldoInfo.textContent = "Saldo utama: Rp 0";
    }
  );
}

function listenProducts() {
  if (unsubscribeProducts) unsubscribeProducts();

  const productQuery = query(
    collection(db, "premiumProducts"),
    where("appId", "==", selectedAppId)
  );

  unsubscribeProducts = onSnapshot(
    productQuery,
    (snapshot) => {
      products = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        .sort((a, b) => {
          const sortA = Number(a.sort || 999);
          const sortB = Number(b.sort || 999);
          return sortA - sortB;
        });

      renderProducts();
    },
    (error) => {
      console.error("Gagal memuat produk:", error);

      productList.innerHTML = `
        <div class="empty premium-empty">
          <h4>Gagal memuat produk</h4>
          <p>Cek koneksi atau Firestore Rules.</p>
        </div>
      `;
    }
  );
}

function renderProducts() {
  productList.innerHTML = "";

  if (!products.length) {
    productList.innerHTML = `
      <div class="empty premium-empty">
        <h4>Produk belum tersedia</h4>
        <p>Belum ada produk untuk aplikasi ini.</p>
      </div>
    `;
    return;
  }

  products.forEach((product) => {
    const stock = Number(product.stock || 0);
    const isAvailable = product.available !== false && stock > 0;

    const card = document.createElement("button");
    card.className = `product-card ${isAvailable ? "" : "product-disabled"}`;
    card.type = "button";
    card.disabled = !isAvailable || isBuying;

    card.innerHTML = `
      <div class="product-main">
        <div class="product-left">
          <h3>${escapeHtml(product.name || "-")}</h3>
          <p>${escapeHtml(product.desc || "-")}</p>
          <strong>${formatRupiah(product.price || 0)}</strong>
        </div>

        <div class="product-right">
          <span class="stock-badge ${isAvailable ? "available" : "empty"}">
            ${isAvailable ? "Tersedia" : "Habis"}
          </span>

          <small class="stock-text">Stok: ${stock}</small>

          ${isAvailable ? `<span class="product-arrow">›</span>` : ``}
        </div>
      </div>
    `;

    if (isAvailable) {
      card.addEventListener("click", () => {
        buyProduct(product);
      });
    }

    productList.appendChild(card);
  });
}

async function buyProduct(product) {
  if (isBuying) return;

  if (!currentUser) {
    await showAlert("Silakan login ulang.", {
      title: "Sesi berakhir",
      icon: "!"
    });
    return;
  }

  const whatsapp = buyerWhatsapp.value.replace(/\D/g, "").trim();

  if (!whatsapp) {
    await showAlert("Masukkan nomor WhatsApp pembeli dulu bre.", {
      title: "Nomor kosong",
      icon: "!"
    });
    buyerWhatsapp.focus();
    return;
  }

  if (whatsapp.length < 9) {
    await showAlert("Nomor WhatsApp kurang valid.", {
      title: "Nomor tidak valid",
      icon: "!"
    });
    buyerWhatsapp.focus();
    return;
  }

  const confirmBuy = await showConfirm(
    `Beli ${product.name} seharga ${formatRupiah(product.price)}?\n\nSaldo yang dipakai hanya saldo utama.`,
    {
      title: "Konfirmasi Pembelian",
      icon: "★",
      okText: "Beli",
      cancelText: "Batal"
    }
  );

  if (!confirmBuy) return;

  isBuying = true;
  renderProducts();

  const userRef = doc(db, "users", currentUser.uid);
  const productRef = doc(db, "premiumProducts", product.id);
  const orderRef = doc(collection(db, "premiumOrders"));

  const newOrderId = generateOrderId();
  const newTransactionId = generateTransactionId();

  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const productSnap = await transaction.get(productRef);

      if (!userSnap.exists()) {
        throw new Error("Data user tidak ditemukan.");
      }

      if (!productSnap.exists()) {
        throw new Error("Produk tidak ditemukan.");
      }

      const userData = userSnap.data();
      const freshProduct = productSnap.data();

      const saldoUtama = Number(userData.saldoUtama || 0);
      const price = Number(freshProduct.price || 0);
      const stock = Number(freshProduct.stock || 0);
      const available = freshProduct.available !== false;

      if (!available || stock <= 0) {
        throw new Error("Stok produk sudah habis bre.");
      }

      if (saldoUtama < price) {
        throw new Error(
          `Saldo utama tidak cukup. Saldo kamu ${formatRupiah(saldoUtama)}, harga produk ${formatRupiah(price)}.`
        );
      }

      const stockAfter = stock - 1;

      transaction.update(userRef, {
        saldoUtama: increment(-price),
        updatedAt: serverTimestamp()
      });

      transaction.update(productRef, {
        stock: increment(-1),
        available: stockAfter > 0,
        updatedAt: serverTimestamp()
      });

      transaction.set(orderRef, {
        id: orderRef.id,
        uid: currentUser.uid,
        username: userData.username || currentUser.displayName || "User",
        email: currentUser.email || userData.email || "-",

        orderType: "premium",

        appId: selectedAppId,
        appName: freshProduct.appName || selectedApp.name,
        appIcon: freshProduct.appIcon || selectedApp.icon,

        productId: productRef.id,
        productName: freshProduct.name || "-",
        productDesc: freshProduct.desc || "-",
        price: price,

        stockBefore: stock,
        stockAfter: stockAfter,

        buyerWhatsapp: whatsapp,

        status: "processing",
        paymentStatus: "paid",
        paymentMethod: "Saldo Utama",

        adminNote: "",
        refundStatus: "none",

        orderId: newOrderId,
        transactionId: newTransactionId,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await showAlert("Pembelian berhasil dibuat. Stok otomatis berkurang bre.", {
      title: "Pesanan berhasil",
      icon: "✓"
    });

    window.location.href = "transaksi.html";
  } catch (error) {
    console.error(error);

    await showAlert(error.message || "Pembelian gagal.", {
      title: "Pembelian gagal",
      icon: "!"
    });
  } finally {
    isBuying = false;
    renderProducts();
  }
}

function generateOrderId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function generateTransactionId() {
  const time = Date.now().toString();
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `${random}${time}`;
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