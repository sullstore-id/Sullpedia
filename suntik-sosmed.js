// suntik-sosmed.js
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const sosmedSaldoText = document.getElementById("sosmedSaldoText");
const sosmedServiceList = document.getElementById("sosmedServiceList");

const sosmedServices = [
  {
    id: "instagram-followers",
    platform: "Instagram",
    name: "Instagram Followers Permanen",
    icon: "IG",
    type: "Suntik Manual",
    desc: "Followers Instagram real permanen."
  },
  {
    id: "instagram-follwers-nogar",
    platform: "Instagram",
    name: "Instagram Followers No Garansi",
    icon: "IG",
    type: "Suntik Manual",
    desc: "Followers Intagram No Garansi."
  },
  {
    id: "instagram-views",
    platform: "Instagram",
    name: "Instagram Views",
    icon: "IG",
    type: "Suntik Manual",
    desc: "Tambah views reels atau video Instagram."
  },
  {
    id: "tiktok-followers",
    platform: "TikTok",
    name: "TikTok Followers Permanen",
    icon: "TT",
    type: "Suntik Manual",
    desc: "Followers TikTok permanen."
  },
  {
    id: "tiktok-views",
    platform: "TikTok",
    name: "TikTok Views",
    icon: "TT",
    type: "Suntik Manual",
    desc: "Tambah views video TikTok."
  },
  {
    id: "tiktok-likes",
    platform: "TikTok",
    name: "TikTok Likes",
    icon: "TT",
    type: "Suntik Manual",
    desc: "Tambah likes video TikTok."
  }
];

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  listenSaldo(user.uid);
  renderServices();
});

function listenSaldo(uid) {
  onSnapshot(doc(db, "users", uid), (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();
    sosmedSaldoText.textContent = formatRupiah(data.saldoUtama || 0);
  });
}

function renderServices() {
  sosmedServiceList.innerHTML = "";

  sosmedServices.forEach((service) => {
    const card = document.createElement("a");
    card.href = `sosmed-detail.html?service=${service.id}`;
    card.className = "sosmed-service-card";

    card.innerHTML = `
      <div class="sosmed-service-icon ${service.platform.toLowerCase()}">
        ${service.icon}
      </div>

      <div class="sosmed-service-info">
        <h3>${service.name}</h3>
        <p>${service.desc}</p>
      </div>

      <span>${service.type}</span>
    `;

    sosmedServiceList.appendChild(card);
  });
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(number || 0));
}