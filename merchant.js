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
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { showAlert, showConfirm } from "./ui-dialog.js";

import { checkMaintenanceAccess } from "./maintenance-guard.js";

/* =========================
   KONFIGURASI CLOUDINARY
========================= */
const CLOUDINARY_CLOUD_NAME = "dofp6odkt";
const CLOUDINARY_UPLOAD_PRESET = "sullstore_bukti";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/* =========================
   ELEMENT HTML
========================= */
const saldoQrisText = document.getElementById("saldoQrisText");
const merchantName = document.getElementById("merchantName");

const openConfirmBtn = document.getElementById("openConfirmBtn");
const moveToMainBtn = document.getElementById("moveToMainBtn");
const refreshBtn = document.getElementById("refreshBtn");

const overlay = document.getElementById("overlay");

const legalModal = document.getElementById("legalModal");
const closeLegalBtn = document.getElementById("closeLegalBtn");
const agreeCheck = document.getElementById("agreeCheck");
const continueUploadBtn = document.getElementById("continueUploadBtn");

const uploadModal = document.getElementById("uploadModal");
const closeUploadBtn = document.getElementById("closeUploadBtn");
const uploadProofForm = document.getElementById("uploadProofForm");
const amountInput = document.getElementById("amountInput");
const proofInput = document.getElementById("proofInput");

const zoomQrisBtn = document.getElementById("zoomQrisBtn");
const zoomModal = document.getElementById("zoomModal");
const closeZoomBtn = document.getElementById("closeZoomBtn");

let currentUser = null;
let currentUserData = null;

/* =========================
   CEK LOGIN USER
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  
  const access = await checkMaintenanceAccess(user);
if (!access.allowed) return;

  currentUser = user;
  const userRef = doc(db, "users", user.uid);

  onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) return;

      currentUserData = snapshot.data();
      saldoQrisText.textContent = formatRupiah(currentUserData.saldoQris || 0);
      merchantName.textContent =
        currentUserData.username ||
        user.displayName ||
        "SullPedia";
    },
    (error) => {
      console.error("Gagal listen user data:", error);
      showAlert("Gagal memuat data user. Cek Firestore Rules.", {
  title: "Data gagal dimuat",
  icon: "!"
});
    }
  );
});

/* =========================
   MODAL UPLOAD BUKTI
========================= */
openConfirmBtn.addEventListener("click", () => {
  showModal(legalModal);
});

closeLegalBtn.addEventListener("click", closeAllModals);
closeUploadBtn.addEventListener("click", closeAllModals);
overlay.addEventListener("click", closeAllModals);

continueUploadBtn.addEventListener("click", async () => {
  if (!agreeCheck.checked) {
    await showAlert("Centang persetujuan terlebih dahulu.", {
      title: "Persetujuan belum dicentang",
      icon: "!"
    });
    return;
  }

  hideModal(legalModal);
  showModal(uploadModal);
});

/* =========================
   SUBMIT UPLOAD BUKTI
========================= */
uploadProofForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    await showAlert("Silakan login ulang.", {
  title: "Sesi berakhir",
  icon: "!"
});
    return;
  }

  const amount = Number(amountInput.value);
  const file = proofInput.files?.[0];
  const submitBtn =
    uploadProofForm.querySelector('button[type="submit"]') ||
    uploadProofForm.querySelector("button");

  if (!amount || amount < 1000) {
    await showAlert("Nominal minimal Rp 1.000.", {
  title: "Nominal tidak valid",
  icon: "!"
});
    return;
  }

  if (!file) {
    await showAlert("Bukti pembayaran wajib diupload.", {
  title: "Bukti belum ada",
  icon: "☁"
});
    return;
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    await showAlert("Format file harus JPG, PNG, atau WEBP.", {
  title: "Format file salah",
  icon: "!"
});
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    await showAlert("Ukuran file maksimal 5MB.", {
  title: "File terlalu besar",
  icon: "!"
});
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Mengirim...";

  try {
    const proofUrl = await uploadToCloudinary(file);

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    const depositRef = doc(collection(db, "qrisDeposits"));
    const mutationRef = doc(db, "qrisMutations", depositRef.id);

    const batch = writeBatch(db);

    batch.set(depositRef, {
      id: depositRef.id,
      uid: currentUser.uid,
      username: userData.username || currentUser.displayName || "User",
      email: currentUser.email || userData.email || "-",
      amount: amount,
      proofUrl: proofUrl,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch.set(mutationRef, {
      id: depositRef.id,
      uid: currentUser.uid,
      title: "Konfirmasi Saldo QRIS",
      amount: amount,
      status: "pending",
      direction: "in",
      depositId: depositRef.id,
      proofUrl: proofUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    await showAlert("Konfirmasi berhasil dikirim. Tunggu admin menyetujui transaksi.", {
  title: "Konfirmasi terkirim",
  icon: "✓"
});

    uploadProofForm.reset();
    agreeCheck.checked = false;
    closeAllModals();
  } catch (error) {
    console.error("Gagal kirim konfirmasi:", error);
    await showAlert(error.message || "Gagal mengirim konfirmasi.", {
  title: "Gagal mengirim",
  icon: "!"
});
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Kirim Konfirmasi";
  }
});

/* =========================
   UPLOAD KE CLOUDINARY
========================= */
async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Config Cloudinary belum lengkap.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "bukti-qris");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    throw new Error(text || "Upload Cloudinary gagal.");
  }

  if (!response.ok) {
    console.error("Cloudinary error:", data);
    throw new Error(
      data?.error?.message ||
      "Upload Cloudinary gagal. Cek preset apakah masih unsigned."
    );
  }

  if (!data.secure_url) {
    throw new Error("Cloudinary tidak mengembalikan URL file.");
  }

  return data.secure_url;
}

/* =========================
   PINDAH QRIS KE SALDO UTAMA
========================= */
moveToMainBtn.addEventListener("click", async () => {
  if (!currentUser) {
    await showAlert("Silakan login ulang.", {
      title: "Sesi berakhir",
      icon: "!"
    });
    return;
  }

  const confirmAction = await showConfirm(
    "Pindahkan semua saldo QRIS ke saldo utama?",
    {
      title: "Pindahkan Saldo",
      icon: "⇄",
      okText: "Pindahkan",
      cancelText: "Batal"
    }
  );

  if (!confirmAction) return;

  const userRef = doc(db, "users", currentUser.uid);
  const mutationRef = doc(collection(db, "qrisMutations"));

  try {
    const movedAmount = await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists()) {
        throw new Error("Data user tidak ditemukan.");
      }

      const userData = userSnap.data();
      const saldoQris = Number(userData.saldoQris || 0);

      if (saldoQris <= 0) {
        throw new Error("Saldo QRIS masih kosong.");
      }

      transaction.update(userRef, {
        saldoQris: increment(-saldoQris),
        saldoUtama: increment(saldoQris)
      });

      transaction.set(mutationRef, {
        uid: currentUser.uid,
        title: "Pindah QRIS ke Saldo Utama",
        amount: saldoQris,
        status: "approved",
        direction: "out",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return saldoQris;
    });

    await showAlert(`Berhasil memindahkan ${formatRupiah(movedAmount)} ke saldo utama.`, {
      title: "Saldo berhasil dipindahkan",
      icon: "✓"
    });
  } catch (error) {
    console.error(error);

    await showAlert(error.message || "Gagal memindahkan saldo.", {
      title: "Gagal memindahkan",
      icon: "!"
    });
  }
});

/* =========================
   QRIS ZOOM DAN REFRESH
========================= */
refreshBtn.addEventListener("click", () => {
  location.reload();
});

zoomQrisBtn.addEventListener("click", () => {
  zoomModal.classList.remove("hidden");
});

closeZoomBtn.addEventListener("click", () => {
  zoomModal.classList.add("hidden");
});

/* =========================
   HELPER
========================= */
function showModal(modal) {
  overlay.classList.remove("hidden");
  modal.classList.remove("hidden");
}

function hideModal(modal) {
  modal.classList.add("hidden");
}

function closeAllModals() {
  overlay.classList.add("hidden");
  legalModal.classList.add("hidden");
  uploadModal.classList.add("hidden");
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(number || 0));
}