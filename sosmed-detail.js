// sosmed-detail.js
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

const serviceTitle = document.getElementById("serviceTitle");
const serviceSubtitle = document.getElementById("serviceSubtitle");
const targetInput = document.getElementById("targetInput");
const sosmedSaldoInfo = document.getElementById("sosmedSaldoInfo");
const sosmedProductList = document.getElementById("sosmedProductList");
const refreshBtn = document.getElementById("refreshBtn");

let currentUser = null;
let currentUserData = null;

const params = new URLSearchParams(window.location.search);
const selectedServiceId = params.get("service");

const sosmedCatalog = {
  "instagram-followers": {
    platform: "Instagram",
    name: "Instagram Followers Permanen",
    icon: "IG",
    targetPlaceholder: "Contoh: https://instagram.com/username",
    products: [
      {
        id: "ig-followers-100",
        name: "100 Followers Instagram Real Permanen ❗",
        desc: "Fast proses 1-30 detik",
        price: 5300,
        available: true
      },
      {
        id: "ig-followers-200",
        name: "200 Followers Instagram Real Permanen ❗",
        desc: "Fast proses 1-30 detik",
        price: 9500,
        available: true
      },
      {
        id: "ig-followers-300",
        name: "300 Followers Instagram Real Permanen ❗",
        desc: "Fast proses 1-30 detik",
        price: 14000,
        available: true
      },
      {
        id: "ig-followers-500",
        name: "500 Followers Instagram Real Permanen",
        desc: "Fast proses 1-30 detik",
        price: 23500,
        available: true
      },
      {
        id: "ig-followers-600",
        name: "600 Followers Instagram Real Permanen",
        desc: "Fast proses 1-30 detik",
        price: 26500,
        available: true
      },
            {
        id: "ig-followers-700",
        name: "700 Followers Instagram Real Permanen",
        desc: "Fast proses 1-30 detik",
        price: 3200,
        available: true
      },
      {
        id: "ig-followers-800",
        name: "800 Followers Instagram Real Permanen",
        desc: "Fast proses 1-30 detik",
        price: 36700,
        available: true
      },
      {
        id: "ig-followers-900",
        name: "900 Followers Instagram Real Permanen",
        desc: "Fast proses 1-30 detik",
        price: 40800,
        available: true
      },
      {
        id: "ig-followers-1000",
        name: "1000 Followers Instagram Real Permanen",
        desc: "Fast proses 1-30 detik",
        price: 47000,
        available: true
      },
      {
        id: "ig-followers-2000",
        name: "2K Followers Instagram Real Permanen",
        desc: "Fast proses 1-30 detik",
        price: 88300,
        available: true
      },
      {
        id: "ig-followers-3000",
        name: "3K Followers Instagram Real Permanen",
        desc: "Fast proses 1-30 detik",
        price: 133000,
        available: true
      }
    ]
  },

  "instagram-follwers-nogar": {
    platform: "Instagram",
    name: "Instagram Followers No Garansi",
    icon: "IG",
    targetPlaceholder: "Contoh: link https://instagram.com/username",
    products: [
      {
        id: "ig-followers-100",
        name: "100 Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 3500,
        available: true
      },
      {
        id: "ig-followers-200",
        name: "200 Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 6000,
        available: true
      },
      {
        id: "ig-followers-300",
        name: "300 Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 8000,
        available: true
      },
      {
        id: "ig-followers-400",
        name: "400 Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 10500,
        available: true
      },
      {
        id: "ig-followers-500",
        name: "500 Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 11300,
        available: true
      },
      {
        id: "ig-followers-600",
        name: "600 Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 13800,
        available: true
      },
      {
        id: "ig-followers-700",
        name: "700 Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 16000,
        available: true
      },
      {
        id: "ig-followers-800",
        name: "800 Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 19000,
        available: true
      },
      {
        id: "ig-followers-900",
        name: "900 Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 22100,
        available: true
      },
      {
        id: "ig-likes-1000",
        name: "1K Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 23000,
        available: true
      },
      {
        id: "ig-followers-2000",
        name: "2K Followers Instagram",
        desc: "Fast proses 1-30 detik",
        price: 35000,
        available: true
      }
    ]
  },

  "instagram-views": {
    platform: "Instagram",
    name: "Instagram Views",
    icon: "IG",
    targetPlaceholder: "Contoh: link reels/video Instagram",
    products: [
      {
        id: "ig-views-1000",
        name: "1000 Views Instagram",
        desc: "Fast proses 1-30 detik",
        price: 1500,
        available: true
      },
      {
        id: "ig-views-5000",
        name: "5000 Views Instagram",
        desc: "Fast proses 1-30 detik",
        price: 6000,
        available: true
      }
    ]
  },

  "tiktok-followers": {
    platform: "TikTok",
    name: "TikTok Followers Permanen",
    icon: "TT",
    targetPlaceholder: "Contoh: https://tiktok.com/@username",
    products: [
      {
        id: "tt-followers-100",
        name: "100 Followers TikTok Permanen",
        desc: "Proses cepat dan aman",
        price: 26200,
        available: true
      },
      {
        id: "tt-followers-200",
        name: "200 Followers TikTok Permanen",
        desc: "Proses cepat dan aman",
        price: 51400,
        available: true
      },
      {
        id: "tt-followers-300",
        name: "300 Followers TikTok Permanen",
        desc: "Proses cepat dan aman",
        price: 77000,
        available: true
      },
      {
        id: "tt-followers-500",
        name: "500 Followers TikTok Permanen",
        desc: "Proses cepat dan aman",
        price: 127000,
        available: true
      },
      {
        id: "tt-followers-600",
        name: "600 Followers TikTok Permanen",
        desc: "Proses cepat dan aman",
        price: 153000,
        available: true
      },
      {
        id: "tt-followers-700",
        name: "700 Followers TikTok Permanen",
        desc: "Proses cepat dan aman",
        price: 17800,
        available: true
      },
      {
        id: "tt-followers-800",
        name: "800 Followers TikTok Permanen",
        desc: "Proses cepat dan aman",
        price: 203500,
        available: true
      },
      {
        id: "tt-followers-900",
        name: "900 Followers TikTok Permanen",
        desc: "Proses cepat dan aman",
        price: 228700,
        available: true
      },
      {
        id: "tt-followers-1000",
        name: "1000 Followers TikTok Permanen",
        desc: "Proses cepat dan aman",
        price: 259000,
        available: true
      },
      {
        id: "tt-followers-100",
        name: "2K Followers TikTok Permanen",
        desc: "Proses cepat dan aman",
        price: 510000,
        available: true
      }
    ]
  },

  "tiktok-views": {
    platform: "TikTok",
    name: "TikTok Views",
    icon: "TT",
    targetPlaceholder: "Contoh: link video TikTok",
    products: [
      {
        id: "tt-views-1000",
        name: "1000 Views TikTok",
        desc: "Fast proses 1-30 detik",
        price: 1000,
        available: true
      },
      {
        id: "tt-views-10000",
        name: "10000 Views TikTok",
        desc: "Fast proses 1-30 detik",
        price: 7500,
        available: true
      },
      {
        id: "tt-views-50000",
        name: "50000 Views TikTok",
        desc: "Fast proses 1-30 detik",
        price: 30000,
        available: true
      }
    ]
  },

  "tiktok-likes": {
    platform: "TikTok",
    name: "TikTok Likes",
    icon: "TT",
    targetPlaceholder: "Contoh: link video TikTok",
    products: [
      {
        id: "tt-likes-100",
        name: "100 Likes TikTok",
        desc: "Fast proses 1-30 detik",
        price: 2500,
        available: true
      },
      {
        id: "tt-likes-500",
        name: "500 Likes TikTok",
        desc: "Fast proses 1-30 detik",
        price: 9500,
        available: true
      },
      {
        id: "tt-likes-1000",
        name: "1000 Likes TikTok",
        desc: "Fast proses 1-30 detik",
        price: 18000,
        available: true
      }
    ]
  }
};

const selectedService = sosmedCatalog[selectedServiceId];

if (!selectedService) {
  showAlert("Layanan tidak ditemukan.", {
    title: "Layanan tidak tersedia",
    icon: "!"
  }).then(() => {
    window.location.href = "suntik-sosmed.html";
  });
}

serviceTitle.textContent = selectedService.name;
serviceSubtitle.textContent = `${selectedService.platform} • Pilih paket layanan.`;
targetInput.placeholder = selectedService.targetPlaceholder || "Masukkan link atau username target";

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
  sosmedSaldoInfo.textContent = `Saldo utama: ${formatRupiah(currentUserData.saldoUtama || 0)}`;
}

function renderProducts() {
  sosmedProductList.innerHTML = "";

  selectedService.products.forEach((product) => {
    const isAvailable = product.available !== false;

    const card = document.createElement("button");
    card.className = `sosmed-product-card ${isAvailable ? "" : "sosmed-product-disabled"}`;
    card.type = "button";
    card.disabled = !isAvailable;

    card.innerHTML = `
      <div class="sosmed-product-main">
        <div>
          <h3>${product.name}</h3>
          <p>${product.desc}</p>
          <strong>${formatRupiah(product.price)}</strong>
        </div>

        <div class="sosmed-product-side">
          <span class="sosmed-product-badge ${isAvailable ? "ready" : "empty"}">
            ${isAvailable ? "Tersedia" : "Habis"}
          </span>

          ${isAvailable ? `<span class="sosmed-product-arrow">›</span>` : ``}
        </div>
      </div>
    `;

    if (isAvailable) {
      card.addEventListener("click", () => {
        buySosmedProduct(product);
      });
    }

    sosmedProductList.appendChild(card);
  });
}

async function buySosmedProduct(product) {
  if (!currentUser) {
    await showAlert("Silakan login ulang.", {
      title: "Sesi berakhir",
      icon: "!"
    });
    return;
  }

  const target = targetInput.value.trim();

  if (!target) {
    await showAlert("Masukkan link atau username target dulu bre.", {
      title: "Target kosong",
      icon: "↗"
    });
    targetInput.focus();
    return;
  }

  if (target.length < 3) {
    await showAlert("Target kurang valid.", {
      title: "Target tidak valid",
      icon: "!"
    });
    targetInput.focus();
    return;
  }

  const confirmBuy = await showConfirm(
    `Beli ${product.name} seharga ${formatRupiah(product.price)}?\n\nSaldo yang dipakai hanya saldo utama.`,
    {
      title: "Konfirmasi Pembelian",
      icon: "↗",
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

        orderType: "sosmed",
        serviceId: selectedServiceId,
        appId: selectedServiceId,
        appName: selectedService.name,
        appIcon: selectedService.icon,

        platform: selectedService.platform,
        productId: product.id || "",
        productName: product.name,
        productDesc: product.desc,
        price: price,

        buyerTarget: target,
        buyerWhatsapp: target,

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

    await showAlert("Pembelian berhasil dibuat. Pesanan masuk ke riwayat transaksi.", {
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