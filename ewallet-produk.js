import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  collection,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { showAlert, showConfirm } from "./ui-dialog.js";
import { checkMaintenanceAccess } from "./maintenance-guard.js";

const serviceTitle = document.getElementById("serviceTitle");
const serviceSubtitle = document.getElementById("serviceSubtitle");
const serviceHeroIcon = document.getElementById("serviceHeroIcon");
const serviceHeroName = document.getElementById("serviceHeroName");
const serviceHeroDesc = document.getElementById("serviceHeroDesc");
const saldoInfoText = document.getElementById("saldoInfoText");
const buyerPhoneInput = document.getElementById("buyerPhoneInput");
const buyerPhoneHelp = document.getElementById("buyerPhoneHelp");
const productSummaryText = document.getElementById("productSummaryText");
const productGrid = document.getElementById("productGrid");
const buySummary = document.getElementById("buySummary");
const buyNowBtn = document.getElementById("buyNowBtn");

const params = new URLSearchParams(window.location.search);
const selectedServiceId = params.get("service");

const services = {
  dana: {
    id: "dana",
    name: "Dana",
    logo: "assets/ewallet/dana.png",
    desc: "Top up DANA cepat & aman.",
    placeholder: "Nomor HP DANA",
    help: "Contoh: 081234567890"
  },
  gopay: {
    id: "gopay",
    name: "Gopay",
    logo: "assets/ewallet/gopay.png",
    desc: "Isi saldo GoPay tanpa ribet.",
    placeholder: "Nomor HP GoPay",
    help: "Contoh: 081234567890"
  },
  ovo: {
    id: "ovo",
    name: "OVO",
    logo: "assets/ewallet/ovo.png",
    desc: "Top up OVO instan dari saldo utama.",
    placeholder: "Nomor HP OVO",
    help: "Contoh: 081234567890"
  },
  shopeepay: {
    id: "shopeepay",
    name: "ShopeePay",
    logo: "assets/ewallet/shopeepay.png",
    desc: "Isi ShopeePay langsung dari aplikasi.",
    placeholder: "Nomor HP ShopeePay",
    help: "Contoh: 081234567890"
  }
};

const productCatalog = {
  dana: [1000, 2000, 3000, 4000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000],
  gopay: [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000],
  ovo: [10000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 150000, 200000],
  shopeepay: [10000, 20000, 30000, 50000, 75000, 100000, 150000, 200000]
};

const fixedAdminFee = {
  dana: 350,
  gopay: 500,
  ovo: 500,
  shopeepay: 500
};

let currentUser = null;
let currentUserData = null;
let selectedProduct = null;
let isBuying = false;

const selectedService = services[selectedServiceId];

if (!selectedService) {
  window.location.href = "e-wallet.html";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  try {
    const access = await checkMaintenanceAccess(user);
    if (!access.allowed) return;

    listenUserData(user.uid);
    renderHeader();
    renderProducts();
  } catch (error) {
    console.error("Gagal buka detail e-wallet:", error);
    await showAlert(error.message || "Gagal memuat halaman produk.", {
      title: "Gagal memuat",
      icon: "!"
    });
  }
});

buyNowBtn?.addEventListener("click", async () => {
  await handleBuy();
});

function renderHeader() {
  serviceTitle.textContent = `Top Up ${selectedService.name}`;
  serviceSubtitle.textContent = "Isi nomor tujuan lalu pilih nominal top up.";
  serviceHeroName.textContent = `Top Up ${selectedService.name}`;
  serviceHeroDesc.textContent = selectedService.desc;

  serviceHeroIcon.className = "ewallet-service-icon hero-wallet-logo";
  serviceHeroIcon.innerHTML = `<img src="${selectedService.logo}" alt="${selectedService.name}" loading="lazy" />`;

  buyerPhoneInput.placeholder = selectedService.placeholder;
  buyerPhoneHelp.textContent = selectedService.help;
}

function listenUserData(uid) {
  onSnapshot(
    doc(db, "users", uid),
    (snapshot) => {
      if (!snapshot.exists()) return;

      currentUserData = snapshot.data();
      saldoInfoText.textContent = formatRupiah(currentUserData.saldoUtama || 0);
      updateSummary();
    },
    (error) => {
      console.error("Gagal memuat user:", error);
      saldoInfoText.textContent = "Rp 0";
    }
  );
}

function renderProducts() {
  const nominals = productCatalog[selectedService.id] || [];
  const fee = fixedAdminFee[selectedService.id] || 0;

  productGrid.innerHTML = nominals
    .map((nominal) => {
      const totalPrice = nominal + fee;
      const productId = `${selectedService.id}-${nominal}`;
      const isActive = selectedProduct?.productId === productId;

      return `
        <button class="product-card ${isActive ? "active" : ""}" type="button" data-product-id="${productId}" data-nominal="${nominal}" data-price="${totalPrice}">
          <h3>${selectedService.name} ${formatNominal(nominal)}</h3>
          <span class="product-id">ID: ${buildProductCode(selectedService.id, nominal)}</span>
          <div class="product-price">${formatRupiah(totalPrice)}</div>
        </button>
      `;
    })
    .join("");

  productGrid.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedProduct = {
        productId: card.dataset.productId,
        nominal: Number(card.dataset.nominal),
        price: Number(card.dataset.price),
        adminFee: fee
      };

      renderProducts();
      updateSummary();
    });
  });
}

function updateSummary() {
  if (!selectedProduct) {
    productSummaryText.textContent = "Belum ada nominal dipilih.";
    buySummary.textContent = "Pilih nominal dulu bre.";
    return;
  }

  productSummaryText.textContent = `${selectedService.name} ${formatNominal(selectedProduct.nominal)} • Total ${formatRupiah(selectedProduct.price)}`;
  buySummary.textContent = `Total bayar ${formatRupiah(selectedProduct.price)}`;
}

async function handleBuy() {
  if (isBuying) return;

  const target = sanitizePhone(buyerPhoneInput.value);

  if (!target) {
    await showAlert("Nomor HP wajib diisi.", {
      title: "Nomor belum diisi",
      icon: "!"
    });
    buyerPhoneInput.focus();
    return;
  }

  if (!/^08\d{8,13}$/.test(target)) {
    await showAlert("Nomor HP tidak valid. Awali dengan 08 ya bre.", {
      title: "Nomor tidak valid",
      icon: "!"
    });
    buyerPhoneInput.focus();
    return;
  }

  if (!selectedProduct) {
    await showAlert("Pilih nominal dulu sebelum beli.", {
      title: "Nominal belum dipilih",
      icon: "!"
    });
    return;
  }

  const saldo = Number(currentUserData?.saldoUtama || 0);
  const total = Number(selectedProduct.price || 0);

  if (saldo < total) {
    await showAlert("Saldo utama kamu kurang buat transaksi ini.", {
      title: "Saldo tidak cukup",
      icon: "!"
    });
    return;
  }

  const confirmBuy = await showConfirm(
    `Nomor: ${target}\nProduk: ${selectedService.name} ${formatNominal(selectedProduct.nominal)}\nTotal: ${formatRupiah(total)}\n\nLanjutkan pembelian?`,
    {
      title: "Konfirmasi pembelian",
      confirmText: "Beli sekarang",
      cancelText: "Batal"
    }
  );

  if (!confirmBuy) return;

  isBuying = true;
  buyNowBtn.disabled = true;
  buyNowBtn.textContent = "Memproses...";

  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists()) {
        throw new Error("Data user tidak ditemukan.");
      }

      const userData = userSnap.data();
      const freshSaldo = Number(userData.saldoUtama || 0);

      if (freshSaldo < total) {
        throw new Error("Saldo utama kamu sudah tidak cukup.");
      }

      const orderRef = doc(collection(db, "premiumOrders"));

      transaction.update(userRef, {
        saldoUtama: freshSaldo - total,
        updatedAt: serverTimestamp()
      });

      transaction.set(orderRef, {
        id: orderRef.id,
        uid: currentUser.uid,
        username: userData.username || currentUser.displayName || "User",
        email: currentUser.email || userData.email || "-",

        orderType: "ewallet",
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        appId: selectedService.id,
        appName: selectedService.name,
        appIcon: selectedService.icon,

        productId: selectedProduct.productId,
        productName: `${selectedService.name} ${formatNominal(selectedProduct.nominal)}`,
        productDesc: `Top up ${selectedService.name} nominal ${formatNominal(selectedProduct.nominal)}`,
        price: total,
        nominal: selectedProduct.nominal,
        adminFee: selectedProduct.adminFee,

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

    await showAlert("Pembelian berhasil dibuat. Status transaksi langsung masuk Menunggu.", {
      title: "Pesanan berhasil",
      icon: "✓"
    });

    window.location.href = "transaksi.html";
  } catch (error) {
    console.error("Gagal beli e-wallet:", error);
    await showAlert(error.message || "Pembelian gagal diproses.", {
      title: "Pembelian gagal",
      icon: "!"
    });
  } finally {
    isBuying = false;
    buyNowBtn.disabled = false;
    buyNowBtn.textContent = "Beli Sekarang";
  }
}

function buildProductCode(serviceId, nominal) {
  const prefixMap = {
    dana: "D",
    gopay: "GP",
    ovo: "OV",
    shopeepay: "SP"
  };

  return `${prefixMap[serviceId] || "EW"}${nominal}`;
}

function formatNominal(number) {
  return new Intl.NumberFormat("id-ID").format(Number(number || 0));
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(number || 0));
}

function sanitizePhone(value) {
  return String(value || "").replace(/[^0-9]/g, "").trim();
}

function generateOrderId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function generateTransactionId() {
  const time = Date.now().toString();
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `${random}${time}`;
}