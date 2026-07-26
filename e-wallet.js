import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { checkMaintenanceAccess } from "./maintenance-guard.js";

const ewalletSaldoText = document.getElementById("ewalletSaldoText");
const ewalletSearchInput = document.getElementById("ewalletSearchInput");
const ewalletServiceList = document.getElementById("ewalletServiceList");

const ewalletServices = [
  {
    id: "dana",
    name: "Dana",
    logo: "assets/ewallet/dana.png",
    desc: "Top up Dana cepat & aman.",
    placeholder: "Nomor HP DANA"
  },
  {
    id: "gopay",
    name: "Gopay",
    logo: "assets/ewallet/gopay.png",
    desc: "Isi saldo GoPay tanpa ribet.",
    placeholder: "Nomor HP GoPay"
  },
  {
    id: "ovo",
    name: "OVO",
    logo: "assets/ewallet/ovo.png",
    desc: "Top up OVO instan dari saldo utama.",
    placeholder: "Nomor HP OVO"
  },
  {
    id: "shopeepay",
    name: "ShopeePay",
    logo: "assets/ewallet/shopeepay.png",
    desc: "Isi ShopeePay langsung dari aplikasi.",
    placeholder: "Nomor HP ShopeePay"
  }
];

let currentKeyword = "";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const access = await checkMaintenanceAccess(user);
    if (!access.allowed) return;

    listenSaldo(user.uid);
    renderServices();
  } catch (error) {
    console.error("Gagal buka halaman e-wallet:", error);
    ewalletServiceList.innerHTML = `
      <div class="admin-empty-state">
        <h4>Gagal memuat layanan</h4>
        <p>${escapeHtml(error.message || "Terjadi kesalahan saat memuat halaman.")}</p>
      </div>
    `;
  }
});

ewalletSearchInput?.addEventListener("input", (event) => {
  currentKeyword = event.target.value.trim().toLowerCase();
  renderServices();
});

function listenSaldo(uid) {
  onSnapshot(
    doc(db, "users", uid),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      ewalletSaldoText.textContent = formatRupiah(data.saldoUtama || 0);
    },
    (error) => {
      console.error("Gagal memuat saldo:", error);
      ewalletSaldoText.textContent = "Rp 0";
    }
  );
}

function renderServices() {
  const filteredServices = ewalletServices.filter((service) => {
    const target = `${service.name} ${service.desc}`.toLowerCase();
    return target.includes(currentKeyword);
  });

  if (!filteredServices.length) {
    ewalletServiceList.innerHTML = `
      <div class="admin-empty-state">
        <h4>Layanan tidak ditemukan</h4>
        <p>Coba kata kunci lain.</p>
      </div>
    `;
    return;
  }

  ewalletServiceList.innerHTML = filteredServices
  .map(
    (service) => `
      <a href="ewallet-produk.html?service=${service.id}" class="ewallet-service-card">
        <div class="ewallet-service-left">
          <div class="ewallet-service-icon logo-image">
            <img src="${service.logo}" alt="${service.name}" loading="lazy" />
          </div>
          <div class="ewallet-service-text">
            <h3>${service.name}</h3>
            <p>${service.desc}</p>
          </div>
        </div>
        <div class="ewallet-service-arrow">›</div>
      </a>
    `
  )
  .join("");
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