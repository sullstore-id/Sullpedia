// app-detail.js
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  runTransaction,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { showAlert, showConfirm } from "./ui-dialog.js";

const appTitle = document.getElementById("appTitle");
const appSubtitle = document.getElementById("appSubtitle");
const buyerWhatsapp = document.getElementById("buyerWhatsapp");
const saldoInfo = document.getElementById("saldoInfo");
const productList = document.getElementById("productList");
const refreshBtn = document.getElementById("refreshBtn");

let currentUser = null;
let currentUserData = null;

const params = new URLSearchParams(window.location.search);
const selectedAppId = params.get("app");

const premiumCatalog = {
  "alight-motion": {
    name: "Alight Motion",
    icon: "AM",
    products: [
      {
        name: "Alight Motion Premium 1 Tahun Privat ANDROID",
        desc: "Layanan fast, proses otomatis",
        price: 1000,
        stock: 13,
  available: true
      },
      {
        name: "Alight Motion Premium 1 Tahun Privat IOS",
        desc: "Layanan fast, proses otomatis",
        price: 1000,
        stock: 10,
  available: true
      }
    ]
  },

  capcut: {
    name: "CapCut",
    icon: "CC",
    products: [
      {
        name: "CapCut Pro 1 Bulan",
        desc: "Akses fitur pro premium",
        price: 5000,
        stock: 1,
  available: true
      },
      {
        name: "CapCut Pro 1 Tahun",
        desc: "Akses fitur pro premium",
        price: 25000,
        stock: 0,
  available: false
      }
    ]
  },

  canva: {
    name: "Canva",
    icon: "CV",
    products: [
      {
        name: "Canva Premium 1b Via Invite",
        desc: "Akun desain premium",
        price: 3000,
        stock: 29,
  available: true
      },
      {
        name: "Canva Premium 1 Tahun",
        desc: "Akun desain premium",
        price: 15000,
        stock: 0,
  available: false
      }
    ]
  },

  viu: {
    name: "Viu",
    icon: "VU",
    products: [
      {
        name: "Viu Premium Life Time",
        desc: "Streaming drama dan film premium",
        price: 7000,
        stock: 36,
  available: true
      }
    ]
  },

  youtube: {
    name: "YouTube",
    icon: "YT",
    products: [
      {
        name: "YouTube Premium 1 Bulan",
        desc: "Akses premium tanpa iklan",
        price: 10000,
        stock: 0,
  available: false
      },
      {
        name: "YouTube Premium 3 Bulan",
        desc: "Akses premium tanpa iklan",
        price: 25000,
        stock: 0,
  available: false
      }
    ]
  },

  spotify: {
    name: "Spotify",
    icon: "SP",
    products: [
      {
        name: "Spotify Premium 1 Bulan",
        desc: "Akun musik premium",
        price: 8000,
        stock: 4,
  available: true
      },
      {
        name: "Spotify Premium 3 Bulan",
        desc: "Akun musik premium",
        price: 21000,
        stock: 0,
  available: false
      }
    ]
  },

  chatgpt: {
    name: "ChatGPT",
    icon: "AI",
    products: [
      {
        name: "ChatGPT Sharing 1 Bulan",
        desc: "Akses akun AI premium",
        price: 25000
      },
      {
        name: "ChatGPT Private 1 Bulan",
        desc: "Akses akun AI premium",
        price: 50000
      }
    ]
  }
};

const selectedApp = premiumCatalog[selectedAppId];

if (!selectedApp) {
  showAlert("Aplikasi tidak ditemukan.", {
    title: "Aplikasi tidak tersedia",
    icon: "!"
  }).then(() => {
    window.location.href = "app-premium.html";
  });
}

appTitle.textContent = selectedApp.name;
appSubtitle.textContent = "Pilih paket premium yang tersedia.";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;
  await loadUserData();
  renderProducts();
});

refreshBtn.addEventListener("click", async () => {
  await loadUserData();
});

async function loadUserData() {
  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await showAlert("Data user tidak ditemukan.", {
  title: "Data tidak ditemukan",
  icon: "!"
});
    return;
  }

  currentUserData = userSnap.data();
  saldoInfo.textContent = `Saldo utama: ${formatRupiah(currentUserData.saldoUtama || 0)}`;
}

function renderProducts() {
  productList.innerHTML = "";

  selectedApp.products.forEach((product, index) => {
    const isAvailable = product.available !== false && Number(product.stock || 0) > 0;

    const card = document.createElement("button");
    card.className = `product-card ${isAvailable ? "" : "product-disabled"}`;
    card.type = "button";
    card.disabled = !isAvailable;

    card.innerHTML = `
  <div class="product-main">
    <div class="product-left">
      <h3>${product.name}</h3>
      <p>${product.desc}</p>
      <strong>${formatRupiah(product.price)}</strong>
    </div>

    <div class="product-right">
      <span class="stock-badge ${isAvailable ? "available" : "empty"}">
        ${isAvailable ? "Tersedia" : "Habis"}
      </span>

      <small class="stock-text">Stok: ${Number(product.stock || 0)}</small>

      ${isAvailable ? `<span class="product-arrow">›</span>` : ``}
    </div>
  </div>
`;

    if (isAvailable) {
      card.addEventListener("click", () => {
        buyProduct(product, index);
      });
    }

    productList.appendChild(card);
  });
}

async function buyProduct(product) {
  const isAvailable = product.available !== false && Number(product.stock || 0) > 0;

  if (!isAvailable) {
    await showAlert("Produk ini sedang habis stok bre.", {
      title: "Stok habis",
      icon: "!"
    });
    return;
  }

  if (!currentUser) {
    await showAlert("Silakan login ulang.", {
      title: "Sesi berakhir",
      icon: "!"
    });
    return;
  }

  const whatsapp = buyerWhatsapp.value.trim();

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

  const userRef = doc(db, "users", currentUser.uid);
  const orderRef = doc(collection(db, "premiumOrders"));

  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists()) {
        throw new Error("Data user tidak ditemukan.");
      }

      const userData = userSnap.data();
      const saldoUtama = Number(userData.saldoUtama || 0);
      const price = Number(product.price || 0);

      if (saldoUtama < price) {
        throw new Error(
          `Saldo utama tidak cukup. Saldo kamu ${formatRupiah(saldoUtama)}, harga produk ${formatRupiah(price)}.`
        );
      }

      transaction.update(userRef, {
        saldoUtama: increment(-price)
      });

      transaction.set(orderRef, {
        id: orderRef.id,
        uid: currentUser.uid,
        username: userData.username || currentUser.displayName || "User",
        email: currentUser.email || userData.email || "-",

        orderType: "premium",

        appId: selectedAppId,
        appName: selectedApp.name,
        appIcon: selectedApp.icon,

        productId: product.id || "",
        productName: product.name,
        productDesc: product.desc,
        price: price,
        stockSnapshot: Number(product.stock || 0),

        buyerWhatsapp: whatsapp,

        status: "processing",
        paymentStatus: "paid",
        paymentMethod: "Saldo Utama",

        adminNote: "",
        refundStatus: "none",

        orderId: generateOrderId(),
        transactionId: generateTransactionId(),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await showAlert("Pembelian berhasil dibuat. Status otomatis masuk Proses.", {
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