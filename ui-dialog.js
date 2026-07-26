// ui-dialog.js

function ensureDialogRoot() {
  let root = document.getElementById("customDialogRoot");

  if (!root) {
    root = document.createElement("div");
    root.id = "customDialogRoot";
    root.className = "custom-dialog-root hidden";

    root.innerHTML = `
      <div class="custom-dialog-overlay"></div>

      <section class="custom-dialog-box">
        <div class="custom-dialog-icon" id="customDialogIcon">?</div>

        <div class="custom-dialog-content">
          <h3 id="customDialogTitle">Konfirmasi</h3>
          <p id="customDialogMessage">Apakah kamu yakin?</p>
        </div>

        <div class="custom-dialog-actions">
          <button id="customDialogCancel" class="dialog-btn dialog-cancel" type="button">
            Batal
          </button>

          <button id="customDialogOk" class="dialog-btn dialog-ok" type="button">
            Oke
          </button>
        </div>
      </section>
    `;

    document.body.appendChild(root);
  }

  return root;
}

export function showAlert(message, options = {}) {
  return new Promise((resolve) => {
    const root = ensureDialogRoot();

    const titleEl = document.getElementById("customDialogTitle");
    const messageEl = document.getElementById("customDialogMessage");
    const iconEl = document.getElementById("customDialogIcon");
    const cancelBtn = document.getElementById("customDialogCancel");
    const okBtn = document.getElementById("customDialogOk");

    titleEl.textContent = options.title || "Informasi";
    messageEl.textContent = message || "";
    iconEl.textContent = options.icon || "ℹ";
    okBtn.textContent = options.okText || "Mengerti";

    cancelBtn.classList.add("hidden");
    root.classList.remove("hidden");

    const close = () => {
      root.classList.add("hidden");
      cancelBtn.classList.remove("hidden");
      okBtn.removeEventListener("click", close);
      resolve(true);
    };

    okBtn.addEventListener("click", close);
  });
}

export function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    const root = ensureDialogRoot();

    const titleEl = document.getElementById("customDialogTitle");
    const messageEl = document.getElementById("customDialogMessage");
    const iconEl = document.getElementById("customDialogIcon");
    const cancelBtn = document.getElementById("customDialogCancel");
    const okBtn = document.getElementById("customDialogOk");

    titleEl.textContent = options.title || "Konfirmasi";
    messageEl.textContent = message || "";
    iconEl.textContent = options.icon || "✓";
    cancelBtn.textContent = options.cancelText || "Batal";
    okBtn.textContent = options.okText || "Oke";

    cancelBtn.classList.remove("hidden");
    root.classList.remove("hidden");

    const cleanup = () => {
      root.classList.add("hidden");
      cancelBtn.removeEventListener("click", onCancel);
      okBtn.removeEventListener("click", onOk);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onOk = () => {
      cleanup();
      resolve(true);
    };

    cancelBtn.addEventListener("click", onCancel);
    okBtn.addEventListener("click", onOk);
  });
}