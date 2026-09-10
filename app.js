// PixelBatch - 사진 일괄 편집 앱
// 모든 이미지 처리는 이 기기(브라우저) 안에서만 이루어집니다. 서버로 전송되지 않습니다.

/* ---------------------------------------------------------------------
 * 설정: Gumroad에서 상품을 만든 뒤, 아래 값을 상품의 permalink로 바꿔주세요.
 * 예: https://gumroad.com/l/abcde  ->  'abcde'
 * ------------------------------------------------------------------- */
const GUMROAD_PRODUCT_PERMALINK = "pixelbatch-pro";
const GUMROAD_BUY_URL = "https://blackhole26.gumroad.com/l/pixelbatch-pro";

const MAX_FREE_BATCH = 5;
const STORAGE_KEY_PRO = "pixelbatch_pro";
const STORAGE_KEY_LICENSE = "pixelbatch_license";
const STORAGE_KEY_CUSTOM_PRESETS = "pixelbatch_custom_presets";

const BUILT_IN_PRESETS = [
  { name: "기본값(초기화)", maxSize: 1080, format: "jpeg", quality: 85, watermarkMode: "none", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "인스타그램용", maxSize: 1080, format: "jpeg", quality: 90, watermarkMode: "none", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "스마트스토어 상품용", maxSize: 1000, format: "jpeg", quality: 92, watermarkMode: "none", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "블로그용", maxSize: 800, format: "jpeg", quality: 80, watermarkMode: "text", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "저작권 보호용", maxSize: 1600, format: "jpeg", quality: 85, watermarkMode: "tile", wmOpacity: 45, wmPosition: "bottom-right" },
  { name: "카카오톡 전송용", maxSize: 1280, format: "jpeg", quality: 55, watermarkMode: "none", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "프로필 사진용", maxSize: 500, format: "jpeg", quality: 85, watermarkMode: "none", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "유튜브 썸네일용", maxSize: 1280, format: "jpeg", quality: 88, watermarkMode: "text", wmOpacity: 55, wmPosition: "top-right" },
  { name: "고화질 인쇄용", maxSize: 3000, format: "png", quality: 100, watermarkMode: "none", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "원본 크기 + 워터마크만", maxSize: 8000, format: "jpeg", quality: 95, watermarkMode: "text", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "중고거래 판매용", maxSize: 1200, format: "jpeg", quality: 75, watermarkMode: "text", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "이력서/증명사진용", maxSize: 413, format: "jpeg", quality: 95, watermarkMode: "none", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "페이스북/트위터용", maxSize: 1200, format: "jpeg", quality: 85, watermarkMode: "none", wmOpacity: 55, wmPosition: "bottom-right" },
  { name: "웹사이트 배너용", maxSize: 1920, format: "jpeg", quality: 88, watermarkMode: "none", wmOpacity: 55, wmPosition: "bottom-right" },
];

// -------------------------------------------------------------------------
// 상태
// -------------------------------------------------------------------------
let selectedFiles = []; // { file, url }
let results = [];       // { name, blob, url }
let isPro = localStorage.getItem(STORAGE_KEY_PRO) === "true";

// -------------------------------------------------------------------------
// DOM 참조
// -------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

const el = {
  proBadge: $("proBadge"),
  pickSection: $("pickSection"),
  fileInput: $("fileInput"),
  dropzone: $("dropzone"),
  thumbGrid: $("thumbGrid"),
  presetRow: $("presetRow"),
  presetStatus: $("presetStatus"),
  advancedDetails: $("advancedDetails"),
  formatSelect: $("formatSelect"),
  maxSizeInput: $("maxSizeInput"),
  qualityRange: $("qualityRange"),
  qualityVal: $("qualityVal"),
  watermarkMode: $("watermarkMode"),
  wmTextField: $("wmTextField"),
  watermarkText: $("watermarkText"),
  wmOpacity: $("wmOpacity"),
  wmOpacityVal: $("wmOpacityVal"),
  wmPositionField: $("wmPositionField"),
  wmPosition: $("wmPosition"),
  renamePattern: $("renamePattern"),
  presetNameInput: $("presetNameInput"),
  savePresetBtn: $("savePresetBtn"),
  processBtn: $("processBtn"),
  progressWrap: $("progressWrap"),
  progressBar: $("progressBar"),
  progressLabel: $("progressLabel"),
  resultSection: $("resultSection"),
  downloadZipBtn: $("downloadZipBtn"),
  resultGrid: $("resultGrid"),
  proModal: $("proModal"),
  buyLink: $("buyLink"),
  licenseInput: $("licenseInput"),
  verifyLicenseBtn: $("verifyLicenseBtn"),
  licenseMsg: $("licenseMsg"),
  closeModalBtn: $("closeModalBtn"),
};

// -------------------------------------------------------------------------
// 초기화
// -------------------------------------------------------------------------
function init() {
  updateProBadge();
  el.buyLink.href = GUMROAD_BUY_URL;
  renderPresets();
  bindEvents();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function updateProBadge() {
  el.proBadge.textContent = isPro ? "Pro" : "무료";
  el.proBadge.classList.toggle("is-pro", isPro);
}

function bindEvents() {
  el.fileInput.addEventListener("change", (e) => addFiles(e.target.files));

  ["dragenter", "dragover"].forEach((evt) =>
    el.pickSection.addEventListener(evt, (e) => {
      e.preventDefault();
      el.dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    el.pickSection.addEventListener(evt, (e) => {
      e.preventDefault();
      el.dropzone.classList.remove("dragover");
    })
  );
  el.pickSection.addEventListener("drop", (e) => {
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  el.qualityRange.addEventListener("input", () => {
    el.qualityVal.textContent = el.qualityRange.value;
  });
  el.wmOpacity.addEventListener("input", () => {
    el.wmOpacityVal.textContent = el.wmOpacity.value;
  });
  el.watermarkMode.addEventListener("change", updateWatermarkFieldVisibility);
  updateWatermarkFieldVisibility();

  el.savePresetBtn.addEventListener("click", saveCurrentAsPreset);
  el.processBtn.addEventListener("click", handleProcessClick);
  el.downloadZipBtn.addEventListener("click", downloadAllAsZip);

  el.buyLink.addEventListener("click", () => {}); // 새 탭에서 열림
  el.verifyLicenseBtn.addEventListener("click", onVerifyLicense);
  el.closeModalBtn.addEventListener("click", () => (el.proModal.hidden = true));
  el.proBadge.addEventListener("click", () => {
    if (!isPro) el.proModal.hidden = false;
  });
}

function updateWatermarkFieldVisibility() {
  const mode = el.watermarkMode.value;
  el.wmTextField.style.display = mode === "none" ? "none" : "block";
  el.wmPositionField.style.display = mode === "tile" ? "none" : "block";
}

// -------------------------------------------------------------------------
// 파일 선택 / 썸네일
// -------------------------------------------------------------------------
function addFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    selectedFiles.push({ file, url });
  });
  el.fileInput.value = "";
  renderThumbs();
}

function renderThumbs() {
  el.thumbGrid.innerHTML = "";

  // 사진이 1장이라도 있으면 큰 안내 박스는 숨기고, 썸네일과 같은 크기의
  // "+" 타일을 목록 맨 앞에 넣어서 자연스럽게 이어지도록 합니다.
  const hasFiles = selectedFiles.length > 0;
  el.dropzone.hidden = hasFiles;

  if (hasFiles) {
    const addTile = document.createElement("button");
    addTile.type = "button";
    addTile.className = "thumb add-tile";
    addTile.innerHTML = '<span class="dz-icon">＋</span><span>추가</span>';
    addTile.addEventListener("click", () => el.fileInput.click());
    el.thumbGrid.appendChild(addTile);
  }

  selectedFiles.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "thumb";
    const img = document.createElement("img");
    img.src = item.url;
    div.appendChild(img);

    const sizeTag = document.createElement("div");
    sizeTag.className = "size-tag";
    sizeTag.textContent = formatBytes(item.file.size);
    div.appendChild(sizeTag);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      URL.revokeObjectURL(item.url);
      selectedFiles.splice(idx, 1);
      renderThumbs();
    });
    div.appendChild(removeBtn);

    el.thumbGrid.appendChild(div);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

// -------------------------------------------------------------------------
// 프리셋
// -------------------------------------------------------------------------
function getCustomPresets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS)) || [];
  } catch (e) {
    return [];
  }
}

let activePresetName = null;

function formatLabelOf(format) {
  return { jpeg: "JPG", png: "PNG", webp: "WEBP" }[format] || format;
}

function watermarkLabelOf(mode) {
  return (
    { none: "워터마크 없음", text: "텍스트 워터마크", tile: "워터마크 반복(도배)" }[mode] || mode
  );
}

function presetSummary(preset) {
  return `최대 ${preset.maxSize}px · ${formatLabelOf(preset.format)} · 품질 ${preset.quality}% · ${watermarkLabelOf(preset.watermarkMode)}`;
}

function renderPresets() {
  el.presetRow.innerHTML = "";
  const customPresets = getCustomPresets();
  const all = [...BUILT_IN_PRESETS, ...customPresets];

  all.forEach((preset, idx) => {
    const isCustom = idx >= BUILT_IN_PRESETS.length;

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "preset-chip" + (isCustom ? " custom" : "");
    chip.title = presetSummary(preset); // 눌러보기 전에도 무슨 설정인지 미리 알 수 있음
    chip.dataset.name = preset.name;
    if (preset.name === activePresetName) chip.classList.add("active");

    const label = document.createElement("span");
    label.textContent = preset.name;
    chip.appendChild(label);
    chip.addEventListener("click", () => applyPreset(preset));

    if (isCustom) {
      const delBtn = document.createElement("span");
      delBtn.className = "preset-chip-delete";
      delBtn.textContent = "×";
      delBtn.title = "이 프리셋 삭제";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCustomPreset(idx - BUILT_IN_PRESETS.length);
      });
      chip.appendChild(delBtn);
    }

    el.presetRow.appendChild(chip);
  });
}

function applyPreset(preset) {
  el.formatSelect.value = preset.format;
  el.maxSizeInput.value = preset.maxSize;
  el.qualityRange.value = preset.quality;
  el.qualityVal.textContent = preset.quality;
  el.watermarkMode.value = preset.watermarkMode;
  el.wmOpacity.value = preset.wmOpacity;
  el.wmOpacityVal.textContent = preset.wmOpacity;
  el.wmPosition.value = preset.wmPosition;
  updateWatermarkFieldVisibility();

  activePresetName = preset.name;
  Array.from(el.presetRow.children).forEach((c) => {
    c.classList.toggle("active", c.dataset.name === preset.name);
  });

  // 프리셋을 눌렀을 때 뭐가 바뀌었는지 바로 눈에 보이도록 요약을 보여주고,
  // 아래 세부 설정 값들이 실제로 바뀌는 것도 같이 확인할 수 있게 펼쳐줍니다.
  el.presetStatus.textContent = `✓ "${preset.name}" 적용됨 — ${presetSummary(preset)}`;
  el.presetStatus.hidden = false;
  el.advancedDetails.open = true;
}

function saveCurrentAsPreset() {
  const name = el.presetNameInput.value.trim();
  if (!name) {
    alert("프리셋 이름을 입력해주세요.");
    return;
  }
  if (!isPro && getCustomPresets().length >= 1) {
    el.proModal.hidden = false;
    return;
  }
  const preset = readSettingsFromForm();
  preset.name = name;
  const list = getCustomPresets();
  list.push(preset);
  localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(list));
  el.presetNameInput.value = "";
  activePresetName = name;
  renderPresets();
}

function deleteCustomPreset(customIndex) {
  const list = getCustomPresets();
  if (customIndex < 0 || customIndex >= list.length) return;
  const removed = list[customIndex];
  if (!confirm(`"${removed.name}" 프리셋을 삭제할까요?`)) return;
  list.splice(customIndex, 1);
  localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(list));
  if (activePresetName === removed.name) activePresetName = null;
  renderPresets();
}

// -------------------------------------------------------------------------
// 설정 읽기
// -------------------------------------------------------------------------
function readSettingsFromForm() {
  return {
    format: el.formatSelect.value,
    maxSize: parseInt(el.maxSizeInput.value, 10) || 1080,
    quality: parseInt(el.qualityRange.value, 10),
    watermarkMode: el.watermarkMode.value,
    watermarkText: el.watermarkText.value || "© My Shop",
    wmOpacity: parseInt(el.wmOpacity.value, 10),
    wmPosition: el.wmPosition.value,
    renamePattern: el.renamePattern.value.trim(),
  };
}

// -------------------------------------------------------------------------
// 처리 시작
// -------------------------------------------------------------------------
function handleProcessClick() {
  if (selectedFiles.length === 0) {
    alert("먼저 사진을 선택해주세요.");
    return;
  }
  if (!isPro && selectedFiles.length > MAX_FREE_BATCH) {
    el.proModal.hidden = false;
    return;
  }

  const settings = readSettingsFromForm();
  if (!isPro && settings.watermarkMode === "none") {
    // 무료 버전은 워터마크를 끌 수 없습니다 (Pro 전용 기능)
    // 눈에 확실히 보이도록 투명도도 최소 65% 이상으로 강제합니다.
    settings.watermarkMode = "text";
    settings.watermarkText = "PixelBatch (무료 버전)";
    settings.wmOpacity = Math.max(settings.wmOpacity, 65);
  }

  runBatch(settings);
}

async function runBatch(settings) {
  el.processBtn.disabled = true;
  el.progressWrap.hidden = false;
  el.resultSection.hidden = true;
  results.forEach((r) => URL.revokeObjectURL(r.url));
  results = [];

  const total = selectedFiles.length;
  for (let i = 0; i < total; i++) {
    const { file } = selectedFiles[i];
    el.progressLabel.textContent = `처리 중... (${i + 1}/${total}) ${file.name}`;
    try {
      const blob = await processImage(file, settings);
      const outName = buildOutputName(file.name, i + 1, settings.renamePattern, settings.format);
      results.push({ name: outName, blob, url: URL.createObjectURL(blob) });
    } catch (err) {
      console.error("처리 실패:", file.name, err);
    }
    el.progressBar.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
  }

  el.progressLabel.textContent = `완료: ${results.length}/${total}장`;
  el.processBtn.disabled = false;
  renderResults();
}

function buildOutputName(originalName, index, pattern, format) {
  const ext = { jpeg: "jpg", png: "png", webp: "webp" }[format] || "jpg";
  const stem = originalName.replace(/\.[^/.]+$/, "");
  let base = stem;
  if (pattern) {
    base = pattern
      .replace("{name}", stem)
      .replace("{n3}", String(index).padStart(3, "0"))
      .replace("{n}", String(index));
  }
  return `${base}.${ext}`;
}

// -------------------------------------------------------------------------
// 이미지 처리 (캔버스)
// -------------------------------------------------------------------------
function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function processImage(file, settings) {
  const img = await loadImageElement(file);
  const { width, height } = fitWithin(img.width, img.height, settings.maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  if (settings.watermarkMode === "text") {
    drawTextWatermark(ctx, width, height, settings);
  } else if (settings.watermarkMode === "tile") {
    drawTileWatermark(ctx, width, height, settings);
  }

  const mime = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[settings.format];
  const quality = settings.format === "png" ? undefined : settings.quality / 100;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 변환 실패"))),
      mime,
      quality
    );
  });
}

function fitWithin(w, h, maxSize) {
  if (w <= maxSize && h <= maxSize) return { width: w, height: h };
  const scale = w > h ? maxSize / w : maxSize / h;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function drawTextWatermark(ctx, width, height, settings) {
  const text = settings.watermarkText;
  const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.045));
  ctx.font = `bold ${fontSize}px sans-serif`;
  const metrics = ctx.measureText(text);
  const margin = Math.round(fontSize * 0.6);

  const positions = {
    "bottom-right": [width - metrics.width - margin, height - margin],
    "bottom-left": [margin, height - margin],
    "top-right": [width - metrics.width - margin, margin + fontSize],
    "top-left": [margin, margin + fontSize],
    center: [(width - metrics.width) / 2, height / 2],
  };
  const [x, y] = positions[settings.wmPosition] || positions["bottom-right"];

  ctx.save();
  ctx.globalAlpha = settings.wmOpacity / 100;
  ctx.lineWidth = Math.max(2, fontSize * 0.08);
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawTileWatermark(ctx, width, height, settings) {
  const text = settings.watermarkText;
  const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.035));
  ctx.save();
  ctx.globalAlpha = settings.wmOpacity / 100;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = Math.max(1, fontSize * 0.06);
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.translate(-width / 2, -height / 2);

  const stepX = fontSize * (text.length * 0.6 + 4);
  const stepY = fontSize * 4;
  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

// -------------------------------------------------------------------------
// 결과 표시 / 다운로드
// -------------------------------------------------------------------------
function renderResults() {
  el.resultSection.hidden = results.length === 0;
  el.resultGrid.innerHTML = "";
  results.forEach((r) => {
    const div = document.createElement("div");
    div.className = "thumb";
    const img = document.createElement("img");
    img.src = r.url;
    div.appendChild(img);

    const link = document.createElement("a");
    link.href = r.url;
    link.download = r.name;
    link.className = "size-tag";
    link.textContent = `${formatBytes(r.blob.size)} · 다운로드`;
    div.appendChild(link);

    el.resultGrid.appendChild(div);
  });
}

async function downloadAllAsZip() {
  if (results.length === 0) return;
  const zip = new JSZip();
  results.forEach((r) => zip.file(r.name, r.blob));
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pixelbatch_result.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// -------------------------------------------------------------------------
// Pro 라이선스 (Gumroad 라이선스 키 검증 - 별도 서버 불필요)
// -------------------------------------------------------------------------
async function onVerifyLicense() {
  const key = el.licenseInput.value.trim();
  if (!key) {
    el.licenseMsg.textContent = "라이선스 키를 입력해주세요.";
    return;
  }
  el.verifyLicenseBtn.disabled = true;
  el.licenseMsg.textContent = "확인 중...";

  try {
    const ok = await verifyGumroadLicense(key);
    if (ok) {
      isPro = true;
      localStorage.setItem(STORAGE_KEY_PRO, "true");
      localStorage.setItem(STORAGE_KEY_LICENSE, key);
      updateProBadge();
      el.licenseMsg.textContent = "인증 완료! Pro가 활성화되었습니다.";
      setTimeout(() => (el.proModal.hidden = true), 1200);
    } else {
      el.licenseMsg.textContent = "유효하지 않은 라이선스 키입니다.";
    }
  } catch (err) {
    el.licenseMsg.textContent = "인증 중 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
  } finally {
    el.verifyLicenseBtn.disabled = false;
  }
}

async function verifyGumroadLicense(key) {
  const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      product_permalink: GUMROAD_PRODUCT_PERMALINK,
      license_key: key,
    }),
  });
  const data = await res.json();
  return !!data.success;
}

init();
