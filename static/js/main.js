// ---------- Mode switch (Satu Cangkir / Seduh Banyak) ----------

const tabSingle = document.getElementById("tab-single");
const tabBatch = document.getElementById("tab-batch");
const panelSingle = document.getElementById("panel-single");
const panelBatch = document.getElementById("panel-batch");

function setMode(mode) {
  const isSingle = mode === "single";
  tabSingle.classList.toggle("is-active", isSingle);
  tabBatch.classList.toggle("is-active", !isSingle);
  tabSingle.setAttribute("aria-selected", isSingle);
  tabBatch.setAttribute("aria-selected", !isSingle);
  panelSingle.classList.toggle("is-hidden", !isSingle);
  panelBatch.classList.toggle("is-hidden", isSingle);
}

tabSingle.addEventListener("click", () => setMode("single"));
tabBatch.addEventListener("click", () => setMode("batch"));

// ---------- Live-computed fields: Caffeine_mg and BMI ----------

const coffeeInput = document.getElementById('coffee-input') || document.querySelector('input[name="Coffee_Intake"]');
const caffeineReadout = document.getElementById("caffeine-readout");

function updateCaffeine() {
  const val = coffeeInput ? coffeeInput.value.trim() : "";
  const caffeineBadge = document.getElementById("caffeine-badge");
  if (!val) {
    if (caffeineReadout) caffeineReadout.textContent = "-";
    if (caffeineBadge) caffeineBadge.style.display = "none";
    return;
  }
  const cups = parseFloat(val);
  if (isNaN(cups) || cups < 0) {
    if (caffeineReadout) caffeineReadout.textContent = "-";
    if (caffeineBadge) caffeineBadge.style.display = "none";
    return;
  }
  const caffeine = Math.round(cups * 95);
  if (caffeineReadout) caffeineReadout.textContent = caffeine + " mg";

  if (caffeineBadge) {
    caffeineBadge.style.display = "inline-flex";
    if (caffeine <= 400) {
      caffeineBadge.className = "status-badge badge-safe";
      caffeineBadge.textContent = "Aman (<400mg)";
    } else {
      caffeineBadge.className = "status-badge badge-warn";
      caffeineBadge.textContent = "Tinggi (>400mg)";
    }
  }
}
if (coffeeInput) {
  coffeeInput.addEventListener("input", updateCaffeine);
  updateCaffeine();
}

const heightInput = document.getElementById("height-input");
const weightInput = document.getElementById("weight-input");
const bmiReadout = document.getElementById("bmi-readout");
const bmiHidden = document.getElementById("bmi-hidden");

function updateBMI() {
  const hVal = heightInput ? heightInput.value.trim() : "";
  const wVal = weightInput ? weightInput.value.trim() : "";
  const bmiBadge = document.getElementById("bmi-badge");

  if (!hVal || !wVal) {
    if (bmiReadout) bmiReadout.textContent = "-";
    if (bmiHidden) bmiHidden.value = "";
    if (bmiBadge) bmiBadge.style.display = "none";
    return;
  }

  const h = parseFloat(hVal) / 100;
  const w = parseFloat(wVal);
  if (h > 0 && w > 0) {
    const bmi = w / (h * h);
    const bmiVal = bmi.toFixed(1);
    if (bmiReadout) bmiReadout.textContent = bmiVal;
    if (bmiHidden) bmiHidden.value = bmiVal;

    if (bmiBadge) {
      bmiBadge.style.display = "inline-flex";
      const val = parseFloat(bmiVal);
      if (val < 18.5) {
        bmiBadge.className = "status-badge badge-warn";
        bmiBadge.textContent = "Underweight";
      } else if (val <= 24.9) {
        bmiBadge.className = "status-badge badge-normal";
        bmiBadge.textContent = "Normal";
      } else if (val <= 29.9) {
        bmiBadge.className = "status-badge badge-warn";
        bmiBadge.textContent = "Overweight";
      } else {
        bmiBadge.className = "status-badge badge-danger";
        bmiBadge.textContent = "Obese";
      }
    }
  } else {
    if (bmiReadout) bmiReadout.textContent = "-";
    if (bmiHidden) bmiHidden.value = "";
    if (bmiBadge) bmiBadge.style.display = "none";
  }
}
if (heightInput && weightInput) {
  heightInput.addEventListener("input", updateBMI);
  weightInput.addEventListener("input", updateBMI);
  updateBMI();
}

// ---------- Cup fill visual & Prediction result ----------

const cupLiquid = document.getElementById("cup-liquid");
const resultReadout = document.getElementById("result-readout");
const probBars = document.getElementById("prob-bars");

const LABEL_META = {
  "Sehat": {
    slug: "sehat",
    color: "var(--sehat)",
    icon: "🌿",
    desc: "Pola gaya hidupmu cenderung sejalan dengan kebiasaan minum kopi yang sehat dan seimbang."
  },
  "Cukup Sehat": {
    slug: "cukup-sehat",
    color: "var(--cukup)",
    icon: "⚠️",
    desc: "Ada beberapa kebiasaan (tidur/stres/aktivitas) yang bisa diperbaiki agar polanya lebih optimal."
  },
  "Kurang Sehat": {
    slug: "kurang-sehat",
    color: "var(--kurang)",
    icon: "🚨",
    desc: "Kombinasi kebiasaan saat ini berpola mirip kelompok berisiko lebih tinggi. Disarankan perbaiki pola istirahat & aktivitas."
  },
};

function renderResult(result) {
  const meta = LABEL_META[result.label_id] || {
    slug: "sehat",
    color: "var(--sehat)",
    icon: "☕",
    desc: "Hasil estimasi tingkat kesehatan."
  };

  cupLiquid.style.setProperty("--current-color", meta.color);
  cupLiquid.classList.add("filled");
  cupLiquid.style.height = "82%";

  resultReadout.innerHTML = `
    <div class="result-badge-wrap">
      <span class="result-icon">${meta.icon}</span>
      <p class="result-label ${meta.slug}">${result.label_id}</p>
    </div>
    <p class="result-sub">${meta.desc}</p>
  `;

  probBars.innerHTML = "";
  if (result.probabilities) {
    Object.entries(result.probabilities).forEach(([name, pct]) => {
      const m = LABEL_META[name] || { slug: "sehat" };
      const row = document.createElement("div");
      row.className = "prob-row";
      row.innerHTML = `
        <span class="prob-name">${name}</span>
        <span class="prob-track"><span class="prob-fill ${m.slug}" style="width:0%"></span></span>
        <span class="prob-val">${pct}%</span>
      `;
      probBars.appendChild(row);
      requestAnimationFrame(() => {
        row.querySelector(".prob-fill").style.width = pct + "%";
      });
    });
  }

  // Auto-scroll ke kartu hasil pada layar HP / layar kecil agar hasil langsung terlihat
  const resultCard = document.querySelector(".result-card");
  if (resultCard && window.innerWidth <= 992) {
    setTimeout(() => {
      resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }
}

// ---------- Single prediction form submit ----------

const singleForm = document.getElementById("single-form");
const singleError = document.getElementById("single-error");
const singleSubmit = document.getElementById("single-submit");

if (singleForm) {
  singleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    singleError.textContent = "";
    singleSubmit.disabled = true;
    singleSubmit.textContent = "Menyeduh…";

    const fd = new FormData(singleForm);
    const payload = Object.fromEntries(fd.entries());
    payload.Smoking = document.getElementById("smoking-input").checked ? 1 : 0;
    payload.Alcohol_Consumption = document.getElementById("alcohol-input").checked ? 1 : 0;

    if (!payload.BMI || payload.BMI === "") {
      singleError.textContent = "Silakan isi tinggi dan berat badan agar nilai BMI terhitung.";
      singleSubmit.disabled = false;
      singleSubmit.textContent = "☕ Seduh Prediksi";
      return;
    }

    try {
      const res = await fetch("/predict_single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan.");
      renderResult(data);
    } catch (err) {
      singleError.textContent = err.message;
    } finally {
      singleSubmit.disabled = false;
      singleSubmit.textContent = "☕ Seduh Prediksi";
    }
  });
}

// ---------- Reset Single Form ----------

const singleReset = document.getElementById("single-reset");
if (singleReset && singleForm) {
  singleReset.addEventListener("click", () => {
    singleForm.reset();
    updateCaffeine();
    updateBMI();
    singleError.textContent = "";

    // Reset ceramic cup & readout back to clean initial state
    cupLiquid.classList.remove("filled");
    cupLiquid.style.height = "0%";
    cupLiquid.style.removeProperty("--current-color");
    resultReadout.innerHTML = `
      <p class="result-placeholder">Lengkapi data pada formulir di sebelah kiri lalu tekan tombol &ldquo;Seduh Prediksi&rdquo; untuk melihat hasilnya di sini.</p>
    `;
    probBars.innerHTML = "";
  });
}

// ---------- Batch CSV ----------

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const dropzoneFilename = document.getElementById("dropzone-filename");
const batchSubmit = document.getElementById("batch-submit");
const batchError = document.getElementById("batch-error");
const batchResults = document.getElementById("batch-results");
const batchSummary = document.getElementById("batch-summary");
const batchTable = document.getElementById("batch-table");
const tableNote = document.getElementById("table-note");
const downloadBtn = document.getElementById("download-btn");

let selectedFile = null;
let lastCsvData = null;

if (dropzone) {
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("is-dragover"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-dragover");
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
}
if (fileInput) {
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });
}

function handleFile(file) {
  selectedFile = file;
  dropzoneFilename.textContent = file.name;
  batchSubmit.disabled = false;
  batchError.textContent = "";
}

const LABEL_SLUG_MAP = { "Sehat": "sehat", "Cukup Sehat": "cukup-sehat", "Kurang Sehat": "kurang-sehat" };

if (batchSubmit) {
  batchSubmit.addEventListener("click", async () => {
    if (!selectedFile) return;
    batchError.textContent = "";
    batchSubmit.disabled = true;
    batchSubmit.textContent = "Memproses…";

    const fd = new FormData();
    fd.append("file", selectedFile);

    try {
      const res = await fetch("/predict_batch", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan.");
      renderBatch(data);
    } catch (err) {
      batchError.textContent = err.message;
    } finally {
      batchSubmit.disabled = false;
      batchSubmit.textContent = "📊 Proses Semua Baris";
    }
  });
}

// ---------- Reset Batch Mode ----------

const batchReset = document.getElementById("batch-reset");
if (batchReset) {
  batchReset.addEventListener("click", () => {
    selectedFile = null;
    lastCsvData = null;
    if (fileInput) fileInput.value = "";
    if (dropzoneFilename) dropzoneFilename.textContent = "";
    if (batchSubmit) {
      batchSubmit.disabled = true;
      batchSubmit.textContent = "📊 Proses Semua Baris";
    }
    if (batchError) batchError.textContent = "";
    if (batchResults) batchResults.classList.add("is-hidden");
    if (batchSummary) batchSummary.innerHTML = "";
    const thead = batchTable ? batchTable.querySelector("thead") : null;
    const tbody = batchTable ? batchTable.querySelector("tbody") : null;
    if (thead) thead.innerHTML = "";
    if (tbody) tbody.innerHTML = "";
    if (tableNote) tableNote.textContent = "";
  });
}

function renderBatch(data) {
  lastCsvData = data.csv_data;
  batchResults.classList.remove("is-hidden");

  batchSummary.innerHTML = "";
  Object.entries(data.ringkasan).forEach(([name, count]) => {
    const chip = document.createElement("span");
    chip.className = "summary-chip " + (LABEL_SLUG_MAP[name] || "");
    chip.textContent = `${name}: ${count}`;
    batchSummary.appendChild(chip);
  });

  const preview = data.preview;
  const thead = batchTable.querySelector("thead");
  const tbody = batchTable.querySelector("tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (preview.length === 0) return;

  // Put Prediksi_Kesehatan at the rightmost end
  const allCols = Object.keys(preview[0]);
  const predCol = "Prediksi_Kesehatan";
  const cols = [...allCols.filter(c => c !== predCol), ...(allCols.includes(predCol) ? [predCol] : [])];

  const headRow = document.createElement("tr");
  cols.forEach((c) => {
    const th = document.createElement("th");
    th.textContent = c === predCol ? "Prediksi Kesehatan" : c;
    if (c === predCol) th.classList.add("pred-col-header");
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  preview.forEach((row) => {
    const tr = document.createElement("tr");
    cols.forEach((c) => {
      const td = document.createElement("td");
      const val = row[c];
      if (c === predCol) {
        const slug = LABEL_SLUG_MAP[val] || "";
        td.classList.add("pred-cell", slug);
        td.innerHTML = val ? `<span class="pred-pill ${slug}">${val}</span>` : "<span>-</span>";
      } else {
        td.textContent = (val === null || val === undefined) ? "-" : val;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  tableNote.textContent = `Menampilkan ${preview.length} dari ${data.total_baris} baris. Unduh CSV untuk melihat semuanya.`;

  // Auto-scroll ke tabel hasil batch
  if (batchResults) {
    setTimeout(() => {
      batchResults.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    if (!lastCsvData) return;
    const blob = new Blob([lastCsvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hasil_prediksi_kesehatan.csv";
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ---------- Mobile hamburger menu ----------

const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileNavOverlay = document.getElementById("mobile-nav-overlay");
const mobileNavClose = document.getElementById("mobile-nav-close");

function openMobileNav() {
  mobileMenuBtn.classList.add("is-open");
  mobileNavOverlay.classList.add("is-open");
  mobileMenuBtn.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function closeMobileNav() {
  mobileMenuBtn.classList.remove("is-open");
  mobileNavOverlay.classList.remove("is-open");
  mobileMenuBtn.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

if (mobileMenuBtn && mobileNavOverlay) {
  mobileMenuBtn.addEventListener("click", () => {
    mobileNavOverlay.classList.contains("is-open") ? closeMobileNav() : openMobileNav();
  });

  if (mobileNavClose) mobileNavClose.addEventListener("click", closeMobileNav);

  mobileNavOverlay.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMobileNav);
  });

  // Close when clicking backdrop (outside nav panel)
  mobileNavOverlay.addEventListener("click", (e) => {
    if (e.target === mobileNavOverlay) closeMobileNav();
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileNavOverlay.classList.contains("is-open")) closeMobileNav();
  });
}
