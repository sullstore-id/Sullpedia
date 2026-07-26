from pathlib import Path
import zipfile, textwrap, json, os, shutil

base = Path("/mnt/data/firebase_dashboard_premium_portal")
if base.exists():
    shutil.rmtree(base)
base.mkdir(parents=True, exist_ok=True)

index_html = r"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Premium Portal Dashboard</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
  <main class="app-shell">
    <section id="authPage" class="auth-page">
      <div class="auth-card">
        <div class="brand-mark">PP</div>
        <h1>Premium Portal</h1>
        <p class="auth-subtitle">Masuk atau daftar untuk mengakses layanan digital.</p>

        <div class="tabs" role="tablist">
          <button id="loginTab" class="tab active" type="button">Login</button>
          <button id="registerTab" class="tab" type="button">Register</button>
        </div>

        <form id="loginForm" class="auth-form">
          <label>
            Email
            <input id="loginEmail" type="email" placeholder="email kamu" required autocomplete="email" />
          </label>
          <label>
            Password
            <input id="loginPassword" type="password" placeholder="password" required autocomplete="current-password" />
          </label>
          <button class="primary-btn" type="submit">Masuk</button>
        </form>

        <form id="registerForm" class="auth-form hidden">
          <label>
            Username
            <input id="registerUsername" type="text" placeholder="contoh: PremiumUser" required minlength="3" />
          </label>
          <label>
            Email
            <input id="registerEmail" type="email" placeholder="email kamu" required autocomplete="email" />
          </label>
          <label>
            Password
            <input id="registerPassword" type="password" placeholder="minimal 6 karakter" required minlength="6" autocomplete="new-password" />
          </label>
          <button class="primary-btn" type="submit">Buat Akun</button>
        </form>

        <p id="authMessage" class="message"></p>
      </div>
    </section>

    <section id="dashboardPage" class="dashboard-page hidden">
      <header class="top-header">
        <div>
          <p id="greetingText" class="greeting">Selamat datang,</p>
          <h2 id="usernameText">User</h2>
        </div>
        <button id="logoutBtn" class="icon-button" type="button" aria-label="Logout">
          <span>↗</span>
        </button>
      </header>

      <section class="summary-panel">
        <div class="summary-grid">
          <article class="summary-card">
            <div class="summary-icon">◆</div>
            <p>Saldo</p>
            <h3>Rp 0</h3>
          </article>
          <article class="summary-card">
            <div class="summary-icon">●</div>
            <p>Poin</p>
            <h3>0</h3>
          </article>
        </div>

        <div class="notice">
          <span>!</span>
          <p>Transaksi diproses otomatis. Hindari jam maintenance 23:30 sampai 00:30.</p>
        </div>

        <div class="quick-actions">
          <button type="button">
            <span>＋</span>
            Isi Saldo
          </button>
          <button type="button">
            <span>◎</span>
            Akun Saya
          </button>
          <button type="button">
            <span>⇄</span>
            Cek Mutasi
          </button>
        </div>
      </section>

      <section class="hero-banner">
        <div>
          <span class="banner-label">Promo Digital</span>
          <h2>Layanan premium dan sosial media dalam satu portal.</h2>
          <p>Pilih menu favorit, cek transaksi, lalu kelola pesanan secara praktis.</p>
        </div>
        <div class="banner-bubble">PP</div>
      </section>

      <section id="homeSection" class="content-section">
        <div class="section-title">
          <h3>Menu Favorit</h3>
          <span>1/1</span>
        </div>

        <div class="favorite-grid">
          <button class="favorite-card" type="button">
            <div class="favorite-icon">★</div>
            <h4>App Premium</h4>
            <p>Netflix, Canva, Spotify, dan layanan digital lain.</p>
          </button>

          <button class="favorite-card" type="button">
            <div class="favorite-icon">↗</div>
            <h4>Suntik Sosmed</h4>
            <p>Followers, likes, views, dan kebutuhan sosial media.</p>
          </button>
        </div>
      </section>

      <section id="transactionSection" class="content-section hidden">
        <div class="section-title">
          <h3>Transaksi</h3>
          <span>Riwayat</span>
        </div>
        <div class="empty-state">
          <div>▦</div>
          <h4>Belum ada transaksi</h4>
          <p>Transaksi yang berhasil dibuat akan muncul di halaman ini.</p>
        </div>
      </section>

      <section id="accountSection" class="content-section hidden">
        <div class="section-title">
          <h3>Akun</h3>
          <span>Profil</span>
        </div>
        <article class="profile-card">
          <div class="profile-avatar" id="profileInitial">U</div>
          <div>
            <h4 id="profileName">User</h4>
            <p id="profileEmail">email@example.com</p>
          </div>
        </article>
      </section>

      <nav class="bottom-nav">
        <button class="nav-btn active" data-target="homeSection" type="button">
          <span>⌂</span>
          Home
        </button>
        <button class="nav-btn" data-target="transactionSection" type="button">
          <span>☰</span>
          Transaksi
        </button>
        <button class="nav-btn" data-target="accountSection" type="button">
          <span>●</span>
          Akun
        </button>
      </nav>
    </section>
  </main>

  <script type="module" src="app.js"></script>
</body>
</html>
"""

style_css = r""":root {
  --bg: #f5f2fb;
  --surface: #ffffff;
  --surface-soft: #f2ecff;
  --purple: #7c3aed;
  --purple-dark: #2d114d;
  --purple-2: #a855f7;
  --black: #15121c;
  --muted: #6d657c;
  --line: #e8ddfa;
  --danger: #d92d20;
  --success: #039855;
  --shadow: 0 18px 45px rgba(45, 17, 77, 0.14);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--black);
  background:
    radial-gradient(circle at top right, rgba(124, 58, 237, 0.20), transparent 28rem),
    linear-gradient(180deg, #fbfaff 0%, var(--bg) 100%);
  min-height: 100vh;
}

button,
input {
  font: inherit;
}

button {
  border: 0;
  cursor: pointer;
}

.hidden {
  display: none !important;
}

.app-shell {
  width: 100%;
  min-height: 100vh;
}

.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.auth-card {
  width: min(440px, 100%);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line);
  border-radius: 28px;
  padding: 28px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.brand-mark {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--black), var(--purple));
  font-weight: 800;
  letter-spacing: -0.04em;
  margin-bottom: 18px;
}

.auth-card h1 {
  margin: 0 0 8px;
  letter-spacing: -0.04em;
  font-size: 30px;
}

.auth-subtitle {
  margin: 0 0 22px;
  color: var(--muted);
  line-height: 1.5;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 6px;
  background: var(--surface-soft);
  border-radius: 16px;
  margin-bottom: 18px;
}

.tab {
  padding: 12px;
  border-radius: 12px;
  background: transparent;
  color: var(--muted);
  font-weight: 700;
}

.tab.active {
  background: var(--surface);
  color: var(--purple-dark);
  box-shadow: 0 8px 20px rgba(45, 17, 77, 0.08);
}

.auth-form {
  display: grid;
  gap: 14px;
}

.auth-form label {
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: var(--purple-dark);
  font-weight: 700;
}

.auth-form input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px 15px;
  outline: none;
  background: #fff;
  color: var(--black);
}

.auth-form input:focus {
  border-color: var(--purple);
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.12);
}

.primary-btn {
  width: 100%;
  margin-top: 4px;
  padding: 15px 18px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--purple), var(--black));
  font-weight: 800;
  box-shadow: 0 16px 28px rgba(124, 58, 237, 0.24);
}

.message {
  min-height: 22px;
  margin: 14px 0 0;
  font-size: 14px;
  color: var(--danger);
}

.message.success {
  color: var(--success);
}

.dashboard-page {
  width: min(520px, 100%);
  margin: 0 auto;
  min-height: 100vh;
  background: #faf8ff;
  padding-bottom: 96px;
  position: relative;
  box-shadow: 0 0 0 1px rgba(45, 17, 77, 0.06);
}

.top-header {
  min-height: 190px;
  padding: 34px 24px 78px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  color: #fff;
  background:
    radial-gradient(circle at 88% 24%, rgba(255, 255, 255, 0.22), transparent 10rem),
    linear-gradient(135deg, var(--black) 0%, var(--purple-dark) 48%, var(--purple) 100%);
  border-bottom-left-radius: 34px;
  border-bottom-right-radius: 34px;
}

.greeting {
  margin: 0 0 4px;
  opacity: 0.84;
  font-weight: 600;
}

.top-header h2 {
  margin: 0;
  font-size: 24px;
  letter-spacing: -0.04em;
}

.icon-button {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  display: grid;
  place-items: center;
  font-weight: 900;
}

.summary-panel {
  margin: -58px 18px 18px;
  padding: 18px;
  background: var(--surface);
  border-radius: 28px;
  box-shadow: var(--shadow);
  position: relative;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.summary-card {
  position: relative;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 18px 16px;
  background: linear-gradient(180deg, #fff, #fbf8ff);
}

.summary-card p {
  margin: 0 0 12px;
  color: var(--muted);
  font-weight: 700;
}

.summary-card h3 {
  margin: 0;
  font-size: 24px;
}

.summary-icon {
  position: absolute;
  right: 14px;
  top: 14px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  color: var(--purple);
  background: var(--surface-soft);
  border-radius: 12px;
}

.notice {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #f4efff;
  border: 1px solid var(--line);
  color: var(--purple-dark);
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 13px;
}

.notice span {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: #fff;
  background: var(--purple);
  border-radius: 999px;
  font-weight: 900;
}

.notice p {
  margin: 0;
  line-height: 1.45;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  padding-top: 18px;
}

.quick-actions button {
  background: transparent;
  color: var(--purple-dark);
  font-weight: 800;
  font-size: 13px;
  display: grid;
  gap: 8px;
  place-items: center;
}

.quick-actions span {
  width: 54px;
  height: 54px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--purple-2), var(--black));
  box-shadow: 0 12px 24px rgba(124, 58, 237, 0.22);
  font-size: 22px;
}

.hero-banner {
  margin: 0 18px 24px;
  padding: 22px;
  border-radius: 28px;
  color: #fff;
  background:
    radial-gradient(circle at 92% 50%, rgba(255, 255, 255, 0.18), transparent 8rem),
    linear-gradient(135deg, var(--purple), #12071f);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 18px;
  min-height: 148px;
  overflow: hidden;
}

.banner-label {
  display: inline-flex;
  width: max-content;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 10px;
}

.hero-banner h2 {
  margin: 0 0 8px;
  font-size: 21px;
  line-height: 1.16;
  letter-spacing: -0.04em;
}

.hero-banner p {
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.45;
  font-size: 13px;
}

.banner-bubble {
  width: 82px;
  height: 82px;
  display: grid;
  place-items: center;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-weight: 900;
  font-size: 27px;
  letter-spacing: -0.06em;
}

.content-section {
  margin: 0 18px 18px;
  padding: 20px 18px;
  background: var(--surface);
  border-radius: 28px;
  box-shadow: 0 12px 34px rgba(45, 17, 77, 0.08);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.section-title h3 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.04em;
}

.section-title span {
  color: var(--muted);
  font-size: 13px;
  background: var(--surface-soft);
  border-radius: 999px;
  padding: 6px 10px;
  font-weight: 700;
}

.favorite-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.favorite-card {
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 18px;
  background: #fff;
  min-height: 160px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.favorite-card:active {
  transform: scale(0.98);
}

.favorite-card:hover {
  box-shadow: 0 12px 26px rgba(45, 17, 77, 0.10);
}

.favorite-icon {
  width: 56px;
  height: 56px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--black), var(--purple));
  box-shadow: 0 12px 24px rgba(124, 58, 237, 0.22);
  margin-bottom: 14px;
  font-size: 24px;
}

.favorite-card h4 {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--black);
}

.favorite-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.45;
  font-size: 13px;
}

.empty-state {
  border: 1px dashed var(--line);
  border-radius: 24px;
  padding: 34px 18px;
  text-align: center;
  color: var(--muted);
}

.empty-state div {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
  border-radius: 18px;
  background: var(--surface-soft);
  color: var(--purple);
  font-size: 24px;
}

.empty-state h4 {
  color: var(--black);
  margin: 0 0 8px;
}

.empty-state p {
  margin: 0;
  line-height: 1.5;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 16px;
  background: #fff;
}

.profile-avatar {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--purple), var(--black));
  color: #fff;
  font-weight: 900;
  font-size: 23px;
}

.profile-card h4 {
  margin: 0 0 4px;
}

.profile-card p {
  margin: 0;
  color: var(--muted);
  word-break: break-word;
}

.bottom-nav {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: min(520px, 100%);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid var(--line);
  backdrop-filter: blur(16px);
  padding: 8px 10px 12px;
  z-index: 10;
}

.nav-btn {
  background: transparent;
  color: var(--muted);
  display: grid;
  place-items: center;
  gap: 3px;
  padding: 8px;
  font-weight: 700;
  font-size: 12px;
}

.nav-btn span {
  font-size: 23px;
  line-height: 1;
}

.nav-btn.active {
  color: var(--purple);
}

@media (min-width: 760px) {
  body {
    padding: 28px 0;
  }

  .dashboard-page {
    border-radius: 32px;
    overflow: hidden;
    min-height: calc(100vh - 56px);
  }

  .bottom-nav {
    bottom: 28px;
    border-bottom-left-radius: 32px;
    border-bottom-right-radius: 32px;
  }
}

@media (max-width: 390px) {
  .summary-grid,
  .favorite-grid {
    grid-template-columns: 1fr;
  }

  .hero-banner {
    grid-template-columns: 1fr;
  }

  .banner-bubble {
    display: none;
  }
}
"""

app_js = r"""import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/*
  Ganti konfigurasi di bawah dengan data dari Firebase Console:
  Project settings > General > Your apps > Firebase SDK snippet > Config.
*/
const firebaseConfig = {
  apiKey: "ISI_API_KEY_KAMU",
  authDomain: "ISI_PROJECT_ID.firebaseapp.com",
  projectId: "ISI_PROJECT_ID",
  storageBucket: "ISI_PROJECT_ID.appspot.com",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authPage = document.getElementById("authPage");
const dashboardPage = document.getElementById("dashboardPage");

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

const usernameText = document.getElementById("usernameText");
const greetingText = document.getElementById("greetingText");
const profileInitial = document.getElementById("profileInitial");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const logoutBtn = document.getElementById("logoutBtn");

const navButtons = document.querySelectorAll(".nav-btn");
const sections = ["homeSection", "transactionSection", "accountSection"];

function setMessage(text = "", type = "error") {
  authMessage.textContent = text;
  authMessage.classList.toggle("success", type === "success");
}

function showLogin() {
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  setMessage("");
}

function showRegister() {
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  setMessage("");
}

function getFriendlyError(error) {
  const code = error?.code || "";

  const messages = {
    "auth/invalid-email": "Format email tidak valid.",
    "auth/email-already-in-use": "Email ini sudah terdaftar.",
    "auth/weak-password": "Password minimal 6 karakter.",
    "auth/invalid-credential": "Email atau password salah.",
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Password salah.",
    "auth/network-request-failed": "Koneksi internet bermasalah."
  };

  return messages[code] || "Terjadi kesalahan. Periksa Firebase config dan coba lagi.";
}

function displayNameFromUser(user) {
  return user.displayName || user.email?.split("@")[0] || "User";
}

function updateDashboard(user) {
  const name = displayNameFromUser(user);
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  usernameText.textContent = name;
  profileName.textContent = name;
  profileEmail.textContent = user.email || "-";
  profileInitial.textContent = initial;

  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) greetingText.textContent = "Selamat pagi,";
  else if (hour >= 11 && hour < 15) greetingText.textContent = "Selamat siang,";
  else if (hour >= 15 && hour < 18) greetingText.textContent = "Selamat sore,";
  else greetingText.textContent = "Selamat malam,";
}

loginTab.addEventListener("click", showLogin);
registerTab.addEventListener("click", showRegister);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (error) {
    setMessage(getFriendlyError(error));
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: username });
    setMessage("Akun berhasil dibuat. Dashboard sedang disiapkan.", "success");
    registerForm.reset();
  } catch (error) {
    setMessage(getFriendlyError(error));
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;

    navButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    sections.forEach((sectionId) => {
      document.getElementById(sectionId).classList.toggle("hidden", sectionId !== target);
    });
  });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    updateDashboard(user);
    authPage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");
  } else {
    authPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
  }
});
"""

readme = r"""# Premium Portal Firebase Dashboard

Isi paket:
- `index.html`
- `style.css`
- `app.js`

Fitur awal:
- Form login dan register.
- Firebase Authentication email dan password.
- Username saat register disimpan sebagai `displayName`.
- Nama pada dashboard otomatis mengikuti username akun yang login.
- Tampilan dashboard mobile dengan warna putih, ungu, dan hitam.
- Menu favorit awal: App Premium dan Suntik Sosmed.
- Bottom navigation: Home, Transaksi, Akun.

Cara pakai:
1. Buka Firebase Console.
2. Buat project baru.
3. Masuk ke Authentication, lalu aktifkan metode Email/Password.
4. Masuk ke Project Settings, buat Web App.
5. Salin Firebase config.
6. Buka `app.js`, lalu ganti isi `firebaseConfig` dengan config dari Firebase.
7. Jalankan project memakai Live Server atau hosting statis.

Catatan:
- Jangan buka langsung file `index.html` dengan mode `file://` jika Firebase module gagal dimuat.
- Untuk lokal, gunakan VS Code extension Live Server, Firebase Hosting, Vercel, atau Netlify.
"""

(base / "index.html").write_text(index_html, encoding="utf-8")
(base / "style.css").write_text(style_css, encoding="utf-8")
(base / "app.js").write_text(app_js, encoding="utf-8")
(base / "README.md").write_text(readme, encoding="utf-8")

zip_path = Path("/mnt/data/firebase_dashboard_premium_portal.zip")
if zip_path.exists():
    zip_path.unlink()

with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for file in base.rglob("*"):
        zf.write(file, file.relative_to(base.parent))

print(f"File siap: {zip_path}")
