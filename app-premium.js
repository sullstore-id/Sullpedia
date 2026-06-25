// app-premium.js
import { auth } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const appGrid = document.getElementById("appGrid");
const searchAppInput = document.getElementById("searchAppInput");

const premiumApps = [
  {
    id: "alight-motion",
    name: "Alight Motion",
    icon: "AM",
    desc: "Akun premium editing video."
  },
  {
    id: "capcut",
    name: "CapCut",
    icon: "CC",
    desc: "Template, pro tools, dan fitur premium."
  },
  {
    id: "canva",
    name: "Canva",
    icon: "CV",
    desc: "Canva premium untuk desain."
  },
  {
    id: "viu",
    name: "Viu",
    icon: "VU",
    desc: "Streaming film dan drama premium."
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "YT",
    desc: "YouTube premium."
  },
  {
    id: "spotify",
    name: "Spotify",
    icon: "SP",
    desc: "Akun musik premium."
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    icon: "AI",
    desc: "Layanan AI premium."
  }
];

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  renderApps(premiumApps);
});

searchAppInput.addEventListener("input", () => {
  const keyword = searchAppInput.value.toLowerCase().trim();

  const filteredApps = premiumApps.filter((app) =>
    app.name.toLowerCase().includes(keyword)
  );

  renderApps(filteredApps);
});

function renderApps(apps) {
  appGrid.innerHTML = "";

  if (!apps.length) {
    appGrid.innerHTML = `
      <div class="empty premium-empty">
        <h4>Aplikasi tidak ditemukan</h4>
        <p>Coba cari dengan kata kunci lain.</p>
      </div>
    `;
    return;
  }

  apps.forEach((app) => {
    const card = document.createElement("a");
    card.href = `app-detail.html?app=${app.id}`;
    card.className = "premium-app-card";

    card.innerHTML = `
      <div class="app-card-top"></div>
      <div class="premium-app-icon">${app.icon}</div>
      <h3>${app.name}</h3>
      <p>${app.desc}</p>
    `;

    appGrid.appendChild(card);
  });
}