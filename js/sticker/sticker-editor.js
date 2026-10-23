/* =========================================================
 * UV DTF 스티커 시안 - 제작 화면 (캔버스 편집)
========================================================= */
const stickerCanvas = byId("stickerCanvas");
const stickerCtx = stickerCanvas?.getContext("2d");
const canvasWrapEl = byId("canvasWrap");

const canvasPillEl = byId("canvasPill");
const canvasColEl = canvasPillEl?.parentElement;
const toolDockEl = byId("toolDock");
const toolTabRowEl = toolDockEl?.querySelector(".stkTabRow");
const toolToggleBtn = byId("toolToggleBtn");

// 모바일에서 접었다 폈다 할 수 있는 패널 (자동 배치는 항상 펼침)
const COLLAPSIBLE_TOOL_IDS = ["toolUpload", "toolLibrary", "toolText"];

// 모바일 레이아웃 기준 (css/sticker.css의 768px 미디어쿼리와 같은 값)
const mobileMq = window.matchMedia("(max-width: 768px)");

const undoBtn = byId("undoBtn");
const resetBtn = byId("resetBtn");

const selPanelEl = byId("selPanel");
const selTitleEl = byId("selTitle");
const selBodyEl = byId("selBody");
const selSizeAreaEl = byId("selSizeArea");
const selWEl = byId("selW");
const selHEl = byId("selH");
const selLockRatioEl = byId("selLockRatio");
const selDpiWarnEl = byId("selDpiWarn");
const selDupBtn = byId("selDupBtn");
const selDelBtn = byId("selDelBtn");
const selAlignRowEl = byId("selAlignRow");
const alignBtnEls = Array.from(document.querySelectorAll("[data-align]"));

const toolTabEls = Array.from(document.querySelectorAll("[data-tool-target]"));
const toolPanelEls = Array.from(document.querySelectorAll(".stkToolPanel"));

const fileEl = byId("file");
const fileBtn = byId("fileBtn");
const libraryGridEl = byId("libraryGrid");
const libraryCatsEl = byId("libraryCats");

const textInputEl = byId("textInput");
const textFontRowEl = byId("textFontRow");
const textColorRowEl = byId("textColorRow");
const textNewBtn = byId("textNewBtn");

const fillWEl = byId("fillW");
const fillHEl = byId("fillH");
const fillGapEl = byId("fillGap");
const fillInfoEl = byId("fillInfo");
const fillBtn = byId("fillBtn");

const askModalEl = byId("askModal");

// 화면 표시 배율 (CSS px / mm) - 캔버스 실제 해상도는 devicePixelRatio를 곱해서 사용
let editorPxPerMm = 1;

// 텍스트 도구 현재 설정 (선택한 텍스트가 있으면 그 텍스트에 바로 적용)
let textFontId = STICKER_TEXT_FONTS[0].id;
let textColor = STICKER_TEXT_COLORS[0];
const TEXT_FONT_PX = 200;

/* =========================================================
 * 캔버스 크기 / 다시 그리기
========================================================= */
function resizeEditorCanvas() {
  if (!stickerCanvas || !canvasWrapEl) return;

  const paper = getPaper();
  const wrapW = canvasWrapEl.clientWidth;
  if (!wrapW) return;

  // 현재 용지 기준 배율 - A4 / A5도 A3와 같은 크기로 크게 보여서 작업하기 쉽게
  // (화면 표시만 커지고, 실제 크기 / 시안 파일은 용지 사이즈 그대로)
  let maxH = Math.max(320, Math.min(window.innerHeight * 0.74, 980));

  // 모바일: 상단 고정 영역(단계 바 + 접힌 도구 영역) 아래에 용지 전체가 한 화면에 들어오게
  if (mobileMq.matches) {
    maxH = Math.max(240, window.innerHeight - getMobileReservedHeight());
  }

  editorPxPerMm = Math.min(wrapW / paper.w, maxH / paper.h);

  const cssW = Math.floor(paper.w * editorPxPerMm);
  const cssH = Math.floor(paper.h * editorPxPerMm);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  stickerCanvas.style.width = `${cssW}px`;
  stickerCanvas.style.height = `${cssH}px`;
  stickerCanvas.width = Math.round(cssW * dpr);
  stickerCanvas.height = Math.round(cssH * dpr);

  redrawEditor();
}

function getMobileReservedHeight() {
  const stepBarH = 56;
  const dockH =
    (canvasPillEl?.offsetHeight || 0) +
    (toolTabRowEl?.offsetHeight || 0) +
    (selPanelEl?.offsetHeight || 0) +
    (toolToggleBtn?.offsetHeight || 0) +
    8 * 3 + // 도구 영역 안 간격
    8 * 2; // 도구 영역 위아래 여백
  const canvasPad = 8 * 2 + 8;
  return stepBarH + dockH + canvasPad;
}

/* =========================================================
 * 모바일 도구 영역
 * - 용지 / 뒤로가기 / 초기화 줄을 상단 고정 도구 영역 안(선택한 스티커 줄 아래)으로 옮겨서 항상 보이게
 * - 이미지 / 스티커 / 텍스트 패널은 접기 버튼으로 접었다 폈다 (캔버스를 만져도 자동으로 접힘)
========================================================= */
function placeCanvasPill() {
  if (!canvasPillEl || !canvasColEl || !toolDockEl) return;
  if (mobileMq.matches) {
    if (canvasPillEl.parentElement !== toolDockEl) toolDockEl.prepend(canvasPillEl);
  } else if (canvasPillEl.parentElement !== canvasColEl) {
    canvasColEl.prepend(canvasPillEl);
    setToolPanelCollapsed(false);
  }
}

function getActiveToolId() {
  return toolPanelEls.find((panel) => panel.classList.contains("is-active"))?.id || "";
}

function isToolPanelCollapsible() {
  return COLLAPSIBLE_TOOL_IDS.includes(getActiveToolId());
}

function setToolPanelCollapsed(collapsed) {
  toolDockEl?.classList.toggle("is-collapsed", !!collapsed);
  syncToolToggle();
}

function syncToolToggle() {
  if (!toolToggleBtn) return;
  const collapsed = !!toolDockEl?.classList.contains("is-collapsed");
  toolToggleBtn.hidden = !isToolPanelCollapsible();
  toolToggleBtn.textContent = collapsed ? "펼치기 ▼" : "접기 ▲";
  toolToggleBtn.setAttribute("aria-expanded", String(!collapsed));
}

// 캔버스 윗부분이 고정 도구 영역 밑에 가려져 있으면, 도구 영역 바로 아래로 맞춰서 용지 전체가 보이게
function revealCanvasBelowDock() {
  if (!canvasWrapEl || !toolDockEl) return;
  const dockBottom = toolDockEl.getBoundingClientRect().bottom;
  const wrapTop = canvasWrapEl.getBoundingClientRect().top;
  if (wrapTop < dockBottom) window.scrollBy(0, wrapTop - dockBottom);
}

function redrawEditor() {
  if (!stickerCtx || !stickerCanvas.width) return;

  const dpr = stickerCanvas.width / (parseFloat(stickerCanvas.style.width) || stickerCanvas.width);
  stickerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  renderStickerSheet(stickerCtx, editorPxPerMm, {
    checker: true,
    guides: true,
    guideLabel: true,
    highlightOutOfSafe: true,
    selection: !stickerState.locked,
  });
}

function refreshEditor() {
  syncEditorControls();
  syncSelectionPanel();
  syncTextPanel();
  updateStepButtons();
}

/* =========================================================
 * 뒤로가기 / 초기화
 * - 스티커 배치(objects)와 자동 배치 설정을 통째로 저장해두고 되돌림
 * - 이미지 원본(sources)은 지우지 않고 남겨두므로 되돌려도 그림이 사라지지 않음
========================================================= */
const editHistory = [];

function pushHistory() {
  editHistory.push({
    objects: stickerState.objects.map((o) => ({ ...o })),
    fill: stickerState.fill ? { ...stickerState.fill } : null,
  });
  if (editHistory.length > STICKER_HISTORY_LIMIT) editHistory.shift();
  syncHistoryButtons();
}

// 연속 입력(타이핑, 숫자 조절)은 한 번의 뒤로가기로 묶음 - 입력칸을 벗어나면 다시 기록
let inputHistoryPushed = false;

function pushHistoryOnce() {
  if (inputHistoryPushed) return;
  inputHistoryPushed = true;
  pushHistory();
}

function endInputHistory() {
  inputHistoryPushed = false;
}

function clearHistory() {
  editHistory.length = 0;
  syncHistoryButtons();
}

function syncHistoryButtons() {
  if (undoBtn) undoBtn.disabled = stickerState.locked || !editHistory.length;
  if (resetBtn) resetBtn.disabled = stickerState.locked || !stickerState.objects.length;
}

function undo() {
  if (stickerState.locked) return;
  const prev = editHistory.pop();
  if (!prev) return;

  stickerState.objects = prev.objects;
  stickerState.fill = prev.fill;
  endInputHistory();
  clearSelection();
  refreshEditor();
}

function resetAll() {
  if (stickerState.locked || !stickerState.objects.length) return;

  askConfirm("배치한 스티커를 모두 지울까요? 뒤로가기로 되돌릴 수 있어요.", "초기화").then((ok) => {
    if (!ok) return;
    pushHistory();
    stickerState.objects = [];
    stickerState.fill = null;
    clearSelection();
    refreshEditor();
  });
}

/* =========================================================
 * 확인 질문 모달 (window.confirm은 일부 환경에서 표시되지 않아 직접 구현)
========================================================= */
let askResolve = null;

function askConfirm(message, title = "확인") {
  if (!askModalEl) return Promise.resolve(true);

  byId("askModalTitle").textContent = title;
  byId("askModalText").textContent = message;
  askModalEl.classList.add("is-open");
  askModalEl.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    askResolve = resolve;
  });
}

function closeAskModal(result) {
  askModalEl?.classList.remove("is-open");
  askModalEl?.setAttribute("aria-hidden", "true");
  askResolve?.(result);
  askResolve = null;
}

/* =========================================================
 * 선택 (1개: selectedId / 드래그로 여러 개: multiIds)
========================================================= */
function getSelectedObjects() {
  if (stickerState.multiIds.length) {
    const ids = new Set(stickerState.multiIds);
    return stickerState.objects.filter((o) => ids.has(o.id));
  }
  const obj = getSelectedObject();
  return obj ? [obj] : [];
}

function clearSelection() {
  stickerState.selectedId = null;
  stickerState.multiIds = [];
  stickerState.marquee = null;
}

function selectObject(id) {
  clearSelection();
  stickerState.selectedId = id;
  endInputHistory();
  refreshEditor();
}

function selectObjects(ids) {
  clearSelection();
  if (ids.length === 1) stickerState.selectedId = ids[0];
  else stickerState.multiIds = ids;
  endInputHistory();
  refreshEditor();
}

/* =========================================================
 * 스티커 추가
========================================================= */
function getAddWidthMm() {
  return STICKER_DEFAULT_SIZE_MM;
}

// 안전선 안에서 기존 스티커와 겹치지 않는 첫 위치 (위→아래, 왼→오른쪽)
function findFreeSpot(w, h, gap = 2) {
  const safe = getSafeRect();
  const boxes = stickerState.objects.map(getObjectBounds);
  const step = 2;

  for (let y = safe.y; y + h <= safe.y + safe.h + 0.001; y += step) {
    for (let x = safe.x; x + w <= safe.x + safe.w + 0.001; x += step) {
      const hit = boxes.some(
        (b) => x < b.maxX + gap && x + w + gap > b.minX && y < b.maxY + gap && y + h + gap > b.minY,
      );
      if (!hit) return { cx: x + w / 2, cy: y + h / 2 };
    }
  }

  return { cx: safe.x + safe.w / 2, cy: safe.y + safe.h / 2 };
}

function canAddObjects(count = 1) {
  if (stickerState.objects.length + count > STICKER_MAX_OBJECTS) {
    showToast(`스티커는 용지 1장에 최대 ${STICKER_MAX_OBJECTS}개까지 배치할 수 있어요.`, "warn", 2600);
    return false;
  }
  return true;
}

function addObjectFromSource(src, widthMm) {
  if (!src?.img || !canAddObjects(1)) return null;

  const safe = getSafeRect();
  const ratio = src.pxH / src.pxW;
  let w = Math.max(STICKER_MIN_SIZE_MM, widthMm);
  let h = w * ratio;

  // 안전선보다 크면 안전선 안에 들어오도록 줄임
  const fit = Math.min(1, safe.w / w, safe.h / h);
  w *= fit;
  h *= fit;

  pushHistory();

  const spot = findFreeSpot(w, h);
  const obj = { id: nextStickerId(), sourceId: src.id, cx: spot.cx, cy: spot.cy, w, h, rot: 0 };

  stickerState.objects.push(obj);
  selectObject(obj.id);

  if (fit < 1) showToast("안전선보다 커서 안쪽에 맞게 크기를 줄였어요.", "info", 2200);
  return obj;
}

/* =========================================================
 * 이미지 업로드
========================================================= */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = src;
  });
}

/* =========================================================
 * 업로드 이미지 DPI 읽기 (PNG pHYs / JPEG JFIF · EXIF)
 * - 정보가 없으면 null
========================================================= */
async function readImageDpi(file) {
  try {
    const bytes = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
    const view = new DataView(bytes.buffer);
    const dpi = file.type === "image/png" ? readPngDpi(view) : file.type === "image/jpeg" ? readJpegDpi(view) : null;
    return dpi && dpi >= 10 && dpi <= 4800 ? dpi : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

function readPngDpi(view) {
  let pos = 8;
  while (pos + 12 <= view.byteLength) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(view.getUint8(pos + 4), view.getUint8(pos + 5), view.getUint8(pos + 6), view.getUint8(pos + 7));
    if (type === "pHYs" && pos + 17 <= view.byteLength) {
      // 단위 1 = 미터당 픽셀
      return view.getUint8(pos + 16) === 1 ? view.getUint32(pos + 8) * 0.0254 : null;
    }
    if (type === "IDAT" || type === "IEND") return null;
    pos += 12 + len;
  }
  return null;
}

function readJpegDpi(view) {
  let pos = 2;
  let jfif = null;

  while (pos + 4 <= view.byteLength && view.getUint8(pos) === 0xff) {
    const marker = view.getUint8(pos + 1);
    const len = view.getUint16(pos + 2);
    const start = pos + 4;
    if (marker === 0xda || start + len - 2 > view.byteLength) break;

    if (marker === 0xe1 && view.getUint32(start) === 0x45786966) {
      const exif = readExifDpi(view, start + 6);
      if (exif) return exif;
    } else if (marker === 0xe0 && view.getUint32(start) === 0x4a464946) {
      // 단위 1 = 인치당, 2 = cm당
      const unit = view.getUint8(start + 7);
      const density = view.getUint16(start + 8);
      if (unit === 1) jfif = density;
      else if (unit === 2) jfif = density * 2.54;
    }
    pos = start + len - 2;
  }
  return jfif;
}

function readExifDpi(view, tiff) {
  const little = view.getUint16(tiff) === 0x4949;
  const ifd = tiff + view.getUint32(tiff + 4, little);
  const count = view.getUint16(ifd, little);
  let res = null;
  let unit = 2;

  for (let i = 0; i < count; i += 1) {
    const entry = ifd + 2 + i * 12;
    const tag = view.getUint16(entry, little);
    if (tag === 0x011a) {
      const off = tiff + view.getUint32(entry + 8, little);
      const den = view.getUint32(off + 4, little);
      res = den ? view.getUint32(off, little) / den : null;
    } else if (tag === 0x0128) {
      unit = view.getUint16(entry + 8, little);
    }
  }
  if (!res) return null;
  if (unit === 3) return res * 2.54;
  return unit === 2 ? res : null;
}

async function handleUploadFiles(files) {
  const list = Array.from(files || []);

  for (const file of list) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      showToast(`${file.name}: PNG / JPG / WEBP 파일만 올릴 수 있어요.`, "warn", 2600);
      continue;
    }

    if (file.size > STICKER_MAX_UPLOAD_BYTES) {
      showToast(`${file.name}: 20MB 이하 파일만 올릴 수 있어요.`, "warn", 2600);
      continue;
    }

    try {
      const img = await loadImage(URL.createObjectURL(file));
      const src = {
        id: nextStickerId("src"),
        kind: "upload",
        name: file.name,
        file,
        img,
        pxW: img.naturalWidth,
        pxH: img.naturalHeight,
      };
      stickerState.sources.set(src.id, src);
      const dpi = (await readImageDpi(file)) || STICKER_UPLOAD_FALLBACK_DPI;
      addObjectFromSource(src, (img.naturalWidth / dpi) * 25.4);
    } catch (err) {
      console.error(err);
      showToast(`${file.name}: 이미지를 불러오지 못했어요.`, "error", 2600);
    }
  }
}

/* =========================================================
 * 기본 스티커 (메뉴에서 눌러서 추가)
========================================================= */
let libraryCategory = "all";

function renderLibraryCats() {
  if (!libraryCatsEl) return;

  libraryCatsEl.innerHTML = STICKER_LIBRARY_CATEGORIES.map(
    (cat) => `
      <button aria-selected="${cat.id === libraryCategory}" class="stkCatBtn${cat.id === libraryCategory ? " is-active" : ""}"
        data-library-cat="${cat.id}" role="tab" type="button">${escapeHtml(cat.label)}</button>
    `,
  ).join("");
}

function renderLibrary() {
  if (!libraryGridEl) return;

  const items = libraryCategory === "all" ? STICKER_LIBRARY : STICKER_LIBRARY.filter((item) => item.category === libraryCategory);

  libraryGridEl.scrollTop = 0;
  libraryGridEl.innerHTML = items.map(
    (item) => `
      <button class="stkLibraryItem" data-library-id="${escapeHtml(item.id)}" type="button" title="${escapeHtml(item.name)}">
        <img alt="${escapeHtml(item.name)}" src="${escapeHtml(item.src)}" loading="lazy" />
      </button>
    `,
  ).join("");
}

async function getLibrarySource(item) {
  const id = `lib_${item.id}`;
  const cached = stickerState.sources.get(id);
  if (cached) return cached;

  const img = await loadImage(item.src);
  const src = {
    id,
    kind: "library",
    name: item.name,
    file: null,
    img,
    pxW: img.naturalWidth || 400,
    pxH: img.naturalHeight || 400,
  };
  stickerState.sources.set(id, src);
  return src;
}

async function addLibrarySticker(libraryId) {
  const item = STICKER_LIBRARY.find((x) => x.id === libraryId);
  if (!item) return;

  try {
    const src = await getLibrarySource(item);
    addObjectFromSource(src, item.sizeMm || getAddWidthMm());
  } catch (err) {
    console.error(err);
    showToast("기본 스티커를 불러오지 못했어요.", "error");
  }
}

/* =========================================================
 * 텍스트 - 입력하면 캔버스에 바로 표시
 * - 텍스트는 고해상도 이미지로 만들어서 다른 스티커와 똑같이 이동/크기/회전
 * - 글자/폰트/색을 바꾸면 이미지를 새로 만들고, 위치와 글자 높이는 유지
========================================================= */
function getTextFont(fontId) {
  return STICKER_TEXT_FONTS.find((f) => f.id === fontId) || STICKER_TEXT_FONTS[0];
}

function getFontCss(font) {
  return `${font.weight} ${TEXT_FONT_PX}px "${font.family}", Pretendard, "Noto Sans KR", sans-serif`;
}

function buildTextCanvas(value, font, color) {
  const fontCss = getFontCss(font);
  const lines = value.split(/\r?\n/);
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = fontCss;

  const lineH = TEXT_FONT_PX * 1.25;
  const pad = Math.round(TEXT_FONT_PX * 0.2);
  const textW = Math.max(...lines.map((line) => measure.measureText(line).width), TEXT_FONT_PX * 0.3);

  const c = document.createElement("canvas");
  c.width = Math.ceil(textW + pad * 2);
  c.height = Math.ceil(lineH * lines.length + pad * 2);

  const tctx = c.getContext("2d");
  tctx.font = fontCss;
  tctx.fillStyle = color;
  tctx.textAlign = "center";
  tctx.textBaseline = "middle";
  lines.forEach((line, i) => tctx.fillText(line, c.width / 2, pad + lineH * i + lineH / 2));

  return c;
}

function getSelectedTextObject() {
  const obj = getSelectedObject();
  const src = obj && stickerState.sources.get(obj.sourceId);
  return src?.kind === "text" ? obj : null;
}

function createTextSource(value, fontId, color) {
  const c = buildTextCanvas(value, getTextFont(fontId), color);
  const src = {
    id: nextStickerId("src"),
    kind: "text",
    name: `텍스트 "${value.replace(/\s+/g, " ").slice(0, 20)}"`,
    file: null,
    img: c,
    pxW: c.width,
    pxH: c.height,
    text: { value, fontId, color },
  };
  stickerState.sources.set(src.id, src);
  return src;
}

// 선택한 텍스트에 현재 텍스트 도구 값을 적용 (없으면 새로 만듦)
let textRenderToken = 0;

async function applyTextFromPanel({ create = true } = {}) {
  const value = String(textInputEl?.value || "").replace(/\s+$/, "");
  const font = getTextFont(textFontId);
  const token = ++textRenderToken;

  try {
    await document.fonts?.load?.(getFontCss(font), value || "A");
  } catch {
    // 폰트를 못 불러와도 대체 폰트로 그림
  }
  if (token !== textRenderToken) return;

  const obj = getSelectedTextObject();

  if (!safeTrim(value)) {
    // 글자를 모두 지우면 그 텍스트 스티커도 지움
    if (obj) {
      stickerState.objects = stickerState.objects.filter((o) => o.id !== obj.id);
      clearSelection();
      refreshEditor();
    }
    return;
  }

  // 이미 있는 텍스트는 지금 크기(배율)를 유지, 새 텍스트는 기본 글자 높이로 추가
  const prevSrc = obj && stickerState.sources.get(obj.sourceId);
  const mmPerPx = prevSrc ? obj.h / prevSrc.pxH : STICKER_TEXT_HEIGHT_MM / TEXT_FONT_PX;
  const src = createTextSource(value, textFontId, textColor);

  if (obj) {
    obj.sourceId = src.id;
    obj.w = src.pxW * mmPerPx;
    obj.h = src.pxH * mmPerPx;
    // 글자가 길어져도 안전선 밖으로 밀려나지 않게 안쪽으로 옮김
    nudgeObjectIntoSafe(obj);
    refreshEditor();
    return;
  }

  if (!create || !canAddObjects(1)) return;

  const w = src.pxW * mmPerPx;
  const h = src.pxH * mmPerPx;
  const spot = findFreeSpot(w, h);
  const newObj = { id: nextStickerId(), sourceId: src.id, cx: spot.cx, cy: spot.cy, w, h, rot: 0 };
  stickerState.objects.push(newObj);
  stickerState.selectedId = newObj.id;
  stickerState.multiIds = [];
  refreshEditor();
}

function renderTextFontButtons() {
  if (!textFontRowEl) return;

  textFontRowEl.innerHTML = STICKER_TEXT_FONTS.map(
    (font) => `
      <button class="stkFontBtn${font.id === textFontId ? " is-active" : ""}" data-font-id="${font.id}"
        style="--stk-font-family:'${font.family}',Pretendard,sans-serif;--stk-font-weight:${font.weight};" type="button">Aa ${escapeHtml(font.label)}</button>
    `,
  ).join("");
}

function renderTextColorButtons() {
  if (!textColorRowEl) return;

  textColorRowEl.innerHTML = STICKER_TEXT_COLORS.map(
    (color) => `
      <button aria-label="${color}" aria-checked="${color === textColor}" class="stkColorBtn${color === textColor ? " is-active" : ""}"
        data-color="${color}" role="radio" style="--swatch:${color};" type="button"></button>
    `,
  ).join("");
}

// 캔버스에서 텍스트를 선택하면 그 텍스트의 설정을 패널에 불러옴
let lastTextPanelObjId = null;

function syncTextPanel() {
  const obj = getSelectedTextObject();
  const objId = obj?.id || null;
  if (objId === lastTextPanelObjId) return;
  lastTextPanelObjId = objId;

  if (!obj) return;

  const src = stickerState.sources.get(obj.sourceId);
  if (textInputEl && document.activeElement !== textInputEl) textInputEl.value = src.text.value;
  textFontId = src.text.fontId;
  textColor = src.text.color;
  renderTextFontButtons();
  renderTextColorButtons();
}

function startNewText() {
  clearSelection();
  lastTextPanelObjId = null;
  if (textInputEl) {
    textInputEl.value = "";
    textInputEl.focus();
  }
  endInputHistory();
  refreshEditor();
}

/* =========================================================
 * 자동 배치 - 스티커(또는 직접 만든 세트)를 복사해서 안전선 안에 바둑판 배치
 * - 스티커 1개: 그 스티커를 같은 크기로 바둑판 배치
 * - 여러 개 (선택했거나, 용지에 여러 종류가 있으면): 놓은 모양 그대로를 한 세트로 묶어서
 *   세트 단위로 바둑판 배치 (예: 스마일 + 이름 → 스마일 + 이름 세트 반복)
 * - 가로/세로 입력은 세트 전체 크기 (바꾸면 세트 안 스티커가 같은 비율로 커지고 작아짐)
 * - 배치한 뒤에는 stickerState.fill에 세트 모양을 보관하고, 크기/여백을 바꾸면
 *   배치한 스티커(fillGroup)만 다시 배치함
 * - 대상 스티커 말고 다른 스티커가 없으면 탭을 열거나 값을 바꾸는 즉시 배치
========================================================= */
function hasActiveFill() {
  return !!stickerState.fill && stickerState.objects.some((o) => o.fillGroup);
}

// 세트 모양: 각 스티커의 위치를 세트 왼쪽 위 기준으로 저장 (회전 포함)
function makeFillTemplate(objs) {
  if (objs.length === 1) {
    const o = objs[0];
    return { items: [{ sourceId: o.sourceId, dx: o.w / 2, dy: o.h / 2, w: o.w, h: o.h, rot: 0 }], w: o.w, h: o.h };
  }

  const boxes = objs.map(getObjectBounds);
  const minX = Math.min(...boxes.map((b) => b.minX));
  const minY = Math.min(...boxes.map((b) => b.minY));
  const maxX = Math.max(...boxes.map((b) => b.maxX));
  const maxY = Math.max(...boxes.map((b) => b.maxY));

  return {
    items: objs.map((o) => ({ sourceId: o.sourceId, dx: o.cx - minX, dy: o.cy - minY, w: o.w, h: o.h, rot: o.rot || 0 })),
    w: maxX - minX,
    h: maxY - minY,
  };
}

function getFillKey(template) {
  return template.items.map((it) => `${it.sourceId}@${it.dx.toFixed(1)},${it.dy.toFixed(1)}`).join("|");
}

function makeFillTarget(template, isActiveFill) {
  return { key: getFillKey(template), template, multi: template.items.length > 1, isActiveFill, w: template.w };
}

// 배치 대상
// - 선택한 스티커 (2개 이상이면 선택한 스티커 모양 그대로 한 세트)
// - 선택이 없으면: 이미 배치한 묶음 → 용지에 여러 종류가 있으면 용지 전체를 한 세트 → 마지막에 추가한 스티커
function getFillTarget() {
  const selected = getSelectedObjects();
  const active = hasActiveFill() ? stickerState.fill : null;

  if (selected.length) {
    if (active && selected.every((o) => o.fillGroup)) return makeFillTarget(active.template, true);
    return makeFillTarget(makeFillTemplate(selected), false);
  }
  if (active) return makeFillTarget(active.template, true);

  const objs = stickerState.objects;
  if (!objs.length) return null;
  const kinds = new Set(objs.map((o) => o.sourceId));
  return makeFillTarget(makeFillTemplate(kinds.size > 1 ? objs : [objs.at(-1)]), false);
}

// 배치하면 지워지는 다른 종류의 스티커 개수
function countOtherStickers(template) {
  const ids = new Set(template.items.map((it) => it.sourceId));
  return stickerState.objects.filter((o) => !ids.has(o.sourceId)).length;
}

function readFillGap() {
  const gapCm = parseFloat(fillGapEl?.value);
  return Number.isFinite(gapCm) && gapCm >= 0 ? gapCm * 10 : STICKER_DEFAULT_GAP_MM;
}

// 세트 세로/가로 비율 (스티커 1개면 원본 이미지 비율)
function getTemplateRatio(template) {
  if (template.items.length === 1) {
    const src = stickerState.sources.get(template.items[0].sourceId);
    if (src) return src.pxH / src.pxW;
  }
  return template.h / template.w;
}

function getFillLayout(target = getFillTarget()) {
  if (!target) return null;

  const { template } = target;
  if (!template.items.every((it) => stickerState.sources.has(it.sourceId))) return null;

  const ratio = getTemplateRatio(template);
  const wCm = parseFloat(fillWEl?.value);
  const w = Number.isFinite(wCm) && wCm > 0 ? wCm * 10 : template.w;
  const h = w * ratio;
  const s = w / template.w;
  const sy = h / template.h;
  const gap = readFillGap();
  const safe = getSafeRect();

  const cols = Math.max(0, Math.floor((safe.w + gap + 0.001) / (w + gap)));
  const rows = Math.max(0, Math.floor((safe.h + gap + 0.001) / (h + gap)));

  const gridW = cols * w + (cols - 1) * gap;
  const gridH = rows * h + (rows - 1) * gap;
  const startX = safe.x + (safe.w - gridW) / 2;
  const startY = safe.y + (safe.h - gridH) / 2;

  const placements = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = startX + c * (w + gap);
      const y = startY + r * (h + gap);
      template.items.forEach((it) => {
        placements.push({ sourceId: it.sourceId, cx: x + it.dx * s, cy: y + it.dy * sy, w: it.w * s, h: it.h * sy, rot: it.rot });
      });
    }
  }

  // 다시 배치할 때 기준이 되는 세트 모양 (지금 크기로)
  const scaled = {
    items: template.items.map((it) => ({ ...it, dx: it.dx * s, dy: it.dy * sy, w: it.w * s, h: it.h * sy })),
    w,
    h,
  };

  return { multi: target.multi, template: scaled, w, h, gap, safe, cols, rows, sets: cols * rows, placements, count: placements.length };
}

let lastFillTargetKey = null;

function syncFillPanel() {
  const target = getFillTarget();
  const enabled = !!target && !stickerState.locked;

  if (fillWEl) fillWEl.disabled = !enabled;
  if (fillHEl) fillHEl.disabled = !enabled;
  if (fillGapEl) fillGapEl.disabled = !enabled;

  if (!target) {
    lastFillTargetKey = null;
    if (fillWEl) fillWEl.value = "";
    if (fillHEl) fillHEl.value = "";
    if (fillBtn) fillBtn.disabled = true;
    if (fillInfoEl) fillInfoEl.textContent = "먼저 스티커를 추가해 주세요.";
    return;
  }

  // 대상이 바뀌었을 때만 입력칸 값을 새로 채움 (입력 중인 값은 유지)
  const targetKey = `${target.isActiveFill ? "fill" : "obj"}:${target.key}`;
  if (targetKey !== lastFillTargetKey) {
    lastFillTargetKey = targetKey;
    if (fillWEl) fillWEl.value = mmToCmText(target.w);
    if (target.isActiveFill && fillGapEl) fillGapEl.value = mmToCmText(stickerState.fill.gap);
  }

  const layout = getFillLayout(target);
  if (!layout) return;
  if (fillHEl && document.activeElement !== fillHEl) fillHEl.value = mmToCmText(layout.h);

  if (fillBtn) {
    fillBtn.hidden = target.isActiveFill;
    fillBtn.disabled = !layout.count || layout.count > STICKER_MAX_OBJECTS || stickerState.locked;
  }

  if (!fillInfoEl) return;
  if (!layout.count) {
    fillInfoEl.textContent = "스티커가 안전선보다 커서 배치할 수 없어요. 크기를 줄여주세요.";
  } else if (layout.count > STICKER_MAX_OBJECTS) {
    fillInfoEl.textContent = `한 번에 최대 ${STICKER_MAX_OBJECTS}개까지 배치할 수 있어요. 크기를 키워주세요.`;
  } else {
    const unit = layout.multi ? "세트" : "개";
    const grid = `가로 <b>${layout.cols}${unit}</b> × 세로 <b>${layout.rows}${unit}</b> = 총 <b class="stkFillTotal">${layout.sets}${unit}</b>`;
    const extra = layout.multi ? ` (스티커 ${layout.count}개)` : "";
    fillInfoEl.innerHTML = `${grid}${extra} ${target.isActiveFill ? "배치됨" : "배치"}`;
  }
}

function buildFillObjects(layout) {
  return layout.placements.map((p) => ({ id: nextStickerId(), ...p, fillGroup: true }));
}

function saveFillState(layout) {
  stickerState.fill = { template: layout.template, gap: layout.gap };
  lastFillTargetKey = `fill:${getFillKey(layout.template)}`;
}

// 처음 배치 - 기존 배치를 지우고 대상 스티커로 채움
// - auto: 탭을 열거나 값을 바꿔서 자동으로 부른 경우. 다른 종류의 스티커가 지워질 때는
//   묻지 않고 그냥 멈춤 (이때는 '자동 배치하기' 버튼으로 확인 후 진행)
function fillSafeArea({ auto = false } = {}) {
  if (stickerState.locked) return;

  const target = getFillTarget();
  const layout = getFillLayout(target);
  if (!layout?.count || layout.count > STICKER_MAX_OBJECTS) return;

  const others = countOtherStickers(target.template);
  if (auto && others) return;

  const run = () => {
    pushHistory();
    stickerState.objects = buildFillObjects(layout);
    saveFillState(layout);
    clearSelection();
    refreshEditor();
    if (!auto) showToast(`안전선 안에 ${layout.count}개를 자동 배치했어요. 크기와 여백은 계속 바꿀 수 있어요.`, "ok", 2600);
  };

  if (!others) {
    run();
    return;
  }

  askConfirm(`기존에 배치한 다른 스티커 ${others}개가 지워지고 선택한 스티커로 배치됩니다. 계속할까요?`, "자동 배치").then(
    (ok) => ok && run(),
  );
}

// 배치한 뒤 크기/여백 수정 - 배치한 스티커만 다시 배치 (나중에 추가한 스티커는 유지)
function relayoutActiveFill() {
  const target = getFillTarget();
  if (!target?.isActiveFill) return;

  const layout = getFillLayout(target);
  if (!layout?.count || layout.count > STICKER_MAX_OBJECTS) return;

  pushHistoryOnce();
  stickerState.objects = [
    ...stickerState.objects.filter((o) => !o.fillGroup),
    ...buildFillObjects(layout),
  ];
  saveFillState(layout);
  clearSelection();
  refreshEditor();
}

function onFillInput(field) {
  // 세로를 바꾸면 비율에 맞춰 가로를 계산 (계산은 가로 기준으로 통일)
  if (field === "h") {
    const target = getFillTarget();
    const hCm = parseFloat(fillHEl?.value);
    if (target && Number.isFinite(hCm) && hCm > 0 && fillWEl) {
      fillWEl.value = mmToCmText((hCm * 10) / getTemplateRatio(target.template));
    }
  }

  if (getFillTarget()?.isActiveFill) {
    relayoutActiveFill();
    return;
  }

  syncFillPanel();
  fillSafeArea({ auto: true });
}

/* =========================================================
 * 복제 / 삭제
========================================================= */
function deleteSelected() {
  const targets = getSelectedObjects();
  if (!targets.length || stickerState.locked) return;

  pushHistory();
  const ids = new Set(targets.map((o) => o.id));
  stickerState.objects = stickerState.objects.filter((o) => !ids.has(o.id));
  clearSelection();
  refreshEditor();
}

// 여러 개를 선택했으면 서로의 위치를 그대로 유지한 묶음으로 복제
function duplicateSelected() {
  const objs = getSelectedObjects();
  if (!objs.length || stickerState.locked || !canAddObjects(objs.length)) return;

  pushHistory();
  const copies = objs.map((o) => {
    const copy = { ...o, id: nextStickerId() };
    delete copy.fillGroup;
    return copy;
  });

  // 묶음 전체 영역 기준으로 빈자리를 찾고, 없으면 살짝 비켜서 놓음
  const boxes = copies.map(getObjectBounds);
  const minX = Math.min(...boxes.map((b) => b.minX));
  const minY = Math.min(...boxes.map((b) => b.minY));
  const bw = Math.max(...boxes.map((b) => b.maxX)) - minX;
  const bh = Math.max(...boxes.map((b) => b.maxY)) - minY;
  const rotated = copies.length === 1 && Math.abs(Math.sin(copies[0].rot || 0)) > 0.01;
  const spot = rotated ? null : findFreeSpot(bw, bh);
  const dx = spot ? spot.cx - (minX + bw / 2) : 5;
  const dy = spot ? spot.cy - (minY + bh / 2) : 5;

  copies.forEach((c) => {
    c.cx += dx;
    c.cy += dy;
    nudgeObjectIntoSafe(c);
  });

  stickerState.objects.push(...copies);
  if (copies.length === 1) selectObject(copies[0].id);
  else selectObjects(copies.map((c) => c.id));
}

/* =========================================================
 * 정렬 - 여러 개 선택한 스티커를 선택 영역 기준으로 맞춤
 * - 회전한 스티커는 회전된 외곽 기준
 * - distX / distY: 양 끝 스티커는 그대로 두고 사이 간격을 똑같이 (3개 이상)
========================================================= */
function alignSelected(mode) {
  const objs = getSelectedObjects();
  if (objs.length < 2 || stickerState.locked) return;
  if (mode.startsWith("dist") && objs.length < 3) return;

  const items = objs.map((o) => ({ o, b: getObjectBounds(o) }));
  const minX = Math.min(...items.map((it) => it.b.minX));
  const maxX = Math.max(...items.map((it) => it.b.maxX));
  const minY = Math.min(...items.map((it) => it.b.minY));
  const maxY = Math.max(...items.map((it) => it.b.maxY));

  pushHistory();

  if (mode === "distX" || mode === "distY") {
    const isX = mode === "distX";
    const lo = isX ? "minX" : "minY";
    const hi = isX ? "maxX" : "maxY";
    const key = isX ? "cx" : "cy";
    items.sort((a, b) => a.b[lo] - b.b[lo]);
    const total = items.reduce((sum, it) => sum + (it.b[hi] - it.b[lo]), 0);
    const space = ((isX ? maxX - minX : maxY - minY) - total) / (items.length - 1);
    let pos = isX ? minX : minY;
    items.forEach((it) => {
      it.o[key] += pos - it.b[lo];
      pos += it.b[hi] - it.b[lo] + space;
    });
  } else {
    items.forEach(({ o, b }) => {
      if (mode === "left") o.cx += minX - b.minX;
      if (mode === "right") o.cx += maxX - b.maxX;
      if (mode === "centerX") o.cx += (minX + maxX) / 2 - (b.minX + b.maxX) / 2;
      if (mode === "top") o.cy += minY - b.minY;
      if (mode === "bottom") o.cy += maxY - b.maxY;
      if (mode === "centerY") o.cy += (minY + maxY) / 2 - (b.minY + b.maxY) / 2;
    });
  }

  refreshEditor();
}

/* =========================================================
 * 선택한 스티커 크기 패널 (cm)
========================================================= */
function setFieldValue(el, value) {
  if (!el || document.activeElement === el) return;
  el.value = value;
}

function syncSelectionPanel() {
  const objs = getSelectedObjects();
  const single = objs.length === 1 ? objs[0] : null;

  // 선택한 스티커가 없으면 칸 자체를 숨김
  if (selPanelEl) selPanelEl.hidden = !objs.length;
  if (selBodyEl) selBodyEl.hidden = !objs.length;
  if (selTitleEl) selTitleEl.textContent = objs.length > 1 ? `스티커 ${objs.length}개 선택됨` : "선택한 스티커";
  // 여러 개 선택일 때는 크기 칸만 숨김 (선택 없음은 모바일 고정 줄에서 비활성으로 표시)
  if (selSizeAreaEl) selSizeAreaEl.hidden = objs.length > 1;
  if (selAlignRowEl) selAlignRowEl.hidden = objs.length < 2;
  alignBtnEls.forEach((btn) => {
    btn.disabled = stickerState.locked || (btn.dataset.align.startsWith("dist") && objs.length < 3);
  });
  if (selDupBtn) selDupBtn.textContent = objs.length > 1 ? `${objs.length}개 복제` : "복제";
  [selWEl, selHEl].forEach((el) => {
    if (el) el.disabled = !single || stickerState.locked;
  });
  if (selDelBtn) selDelBtn.textContent = objs.length > 1 ? `${objs.length}개 삭제` : "삭제";

  if (!single) {
    if (selWEl) selWEl.value = "";
    if (selHEl) selHEl.value = "";
    if (selDpiWarnEl) selDpiWarnEl.hidden = true;
    return;
  }

  setFieldValue(selWEl, mmToCmText(single.w));
  setFieldValue(selHEl, mmToCmText(single.h));

  const src = stickerState.sources.get(single.sourceId);
  const dpi = src?.kind === "upload" ? Math.round(src.pxW / (single.w / 25.4)) : null;
  if (selDpiWarnEl) {
    const low = dpi !== null && dpi < STICKER_LOW_DPI;
    selDpiWarnEl.hidden = !low;
    selDpiWarnEl.textContent = low
      ? `이미지 해상도에 비해 크게 배치되어 인쇄 시 흐리게 보일 수 있어요. (약 ${dpi}dpi, ${STICKER_LOW_DPI}dpi 이상 권장)`
      : "";
  }
}

function applySizeInput(field) {
  const obj = getSelectedObject();
  if (!obj || stickerState.locked) return;

  const v = parseFloat((field === "w" ? selWEl : selHEl)?.value) * 10;
  if (!Number.isFinite(v) || v < STICKER_MIN_SIZE_MM / 2) return;

  pushHistoryOnce();
  const ratio = obj.h / obj.w;
  const lock = !!selLockRatioEl?.checked;

  if (field === "w") {
    obj.w = v;
    if (lock) obj.h = v * ratio;
  } else {
    obj.h = v;
    if (lock) obj.w = v / ratio;
  }

  lastFillTargetKey = null;
  refreshEditor();
}

/* =========================================================
 * 캔버스 포인터 조작
 * - 스티커 드래그: 이동 / 모서리: 크기 / 위쪽 점: 회전 / 빨간 X: 삭제
 * - 빈 곳 드래그(마우스): 영역 안 스티커 여러 개 선택
 * - 두 손가락(모바일): 선택한 스티커 확대/축소 + 회전
========================================================= */
const activePointers = new Map();
let dragState = null;

function eventToMm(e) {
  const rect = stickerCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / editorPxPerMm,
    y: (e.clientY - rect.top) / editorPxPerMm,
  };
}

function hitHandle(obj, p, pointerType) {
  const local = toObjectLocal(obj, p.x, p.y);
  const handles = getHandleLocalPositions(obj, editorPxPerMm);
  const tol = (pointerType === "touch" ? 20 : 12) / editorPxPerMm;
  const near = (h) => Math.hypot(local.x - h.x, local.y - h.y) <= tol;

  if (near(handles.del)) return "del";
  if (near(handles.rot)) return "rot";
  return ["nw", "ne", "se", "sw"].find((key) => near(handles[key])) || null;
}

function hitObject(p) {
  for (let i = stickerState.objects.length - 1; i >= 0; i -= 1) {
    if (isPointInObject(stickerState.objects[i], p.x, p.y)) return stickerState.objects[i];
  }
  return null;
}

// 드래그가 실제로 움직였을 때 한 번만 뒤로가기 기록
function markDragChanged() {
  if (dragState && !dragState.pushed) {
    dragState.pushed = true;
    pushHistory();
  }
}

function startPinch() {
  const obj = getSelectedObject();
  const pts = Array.from(activePointers.values());
  if (!obj || pts.length < 2) return;

  dragState = {
    mode: "pinch",
    obj,
    startDist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1,
    startAngle: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x),
    startW: obj.w,
    startH: obj.h,
    startRot: obj.rot || 0,
  };
}

function onCanvasPointerDown(e) {
  if (stickerState.locked || currentStep !== "editor") return;

  const p = eventToMm(e);
  activePointers.set(e.pointerId, p);
  stickerCanvas.setPointerCapture?.(e.pointerId);
  stickerCanvas.focus({ preventScroll: true });
  e.preventDefault();
  endInputHistory();

  if (activePointers.size >= 2) {
    startPinch();
    return;
  }

  const selected = getSelectedObject();
  const handle = selected ? hitHandle(selected, p, e.pointerType) : null;

  if (handle === "del") {
    dragState = null;
    deleteSelected();
    return;
  }

  if (handle === "rot") {
    dragState = {
      mode: "rotate",
      obj: selected,
      startAngle: Math.atan2(p.y - selected.cy, p.x - selected.cx),
      startRot: selected.rot || 0,
    };
    return;
  }

  if (handle) {
    const local = toObjectLocal(selected, p.x, p.y);
    dragState = {
      mode: "resize",
      obj: selected,
      startDist: Math.hypot(local.x, local.y) || 1,
      startLocal: { x: Math.abs(local.x) || 1, y: Math.abs(local.y) || 1 },
      startW: selected.w,
      startH: selected.h,
    };
    return;
  }

  const target = hitObject(p);

  if (!target) {
    // 마우스로 빈 곳을 드래그하면 영역 선택
    // 터치는 선택 해제 + 손가락을 따라 페이지 스크롤 (캔버스가 touch-action: none이라 직접 처리)
    clearSelection();
    dragState = e.pointerType === "touch" ? { mode: "scroll", lastY: e.clientY } : { mode: "marquee", start: p };
    refreshEditor();
    return;
  }

  // 여러 개 선택된 상태에서 그중 하나를 잡으면 함께 이동
  if (stickerState.multiIds.includes(target.id)) {
    dragState = {
      mode: "moveGroup",
      start: p,
      items: getSelectedObjects().map((o) => ({ obj: o, cx: o.cx, cy: o.cy })),
    };
    return;
  }

  if (target.id !== stickerState.selectedId) selectObject(target.id);
  dragState = { mode: "move", obj: target, start: p, startCx: target.cx, startCy: target.cy };
}

function snapAngle(rad) {
  const step = Math.PI / 2;
  const nearest = Math.round(rad / step) * step;
  return Math.abs(rad - nearest) < (5 * Math.PI) / 180 ? nearest : rad;
}

function resizeAroundCenter(obj, scale, startW, startH) {
  const s = Math.max(scale, STICKER_MIN_SIZE_MM / Math.min(startW, startH));
  obj.w = startW * s;
  obj.h = startH * s;
}

function onCanvasPointerMove(e) {
  if (!activePointers.has(e.pointerId)) return;

  const p = eventToMm(e);
  activePointers.set(e.pointerId, p);
  if (!dragState) return;
  e.preventDefault();

  const { obj } = dragState;

  if (dragState.mode === "scroll") {
    window.scrollBy(0, dragState.lastY - e.clientY);
    dragState.lastY = e.clientY;
    return;
  }

  if (dragState.mode === "marquee") {
    stickerState.marquee = { x1: dragState.start.x, y1: dragState.start.y, x2: p.x, y2: p.y };
    redrawEditor();
    return;
  }

  markDragChanged();

  if (dragState.mode === "moveGroup") {
    const dx = p.x - dragState.start.x;
    const dy = p.y - dragState.start.y;
    dragState.items.forEach((it) => {
      it.obj.cx = it.cx + dx;
      it.obj.cy = it.cy + dy;
    });
  } else if (dragState.mode === "pinch") {
    const pts = Array.from(activePointers.values());
    if (pts.length < 2) return;
    const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    resizeAroundCenter(obj, dist / dragState.startDist, dragState.startW, dragState.startH);
    obj.rot = snapAngle(dragState.startRot + angle - dragState.startAngle);
  } else if (dragState.mode === "move") {
    obj.cx = dragState.startCx + (p.x - dragState.start.x);
    obj.cy = dragState.startCy + (p.y - dragState.start.y);
  } else if (dragState.mode === "resize") {
    const local = toObjectLocal(obj, p.x, p.y);
    if (selLockRatioEl?.checked) {
      resizeAroundCenter(obj, Math.hypot(local.x, local.y) / dragState.startDist, dragState.startW, dragState.startH);
    } else {
      // 비율 고정을 풀면 모서리를 끄는 방향대로 가로 / 세로를 따로 조절
      obj.w = Math.max(STICKER_MIN_SIZE_MM, (dragState.startW * Math.abs(local.x)) / dragState.startLocal.x);
      obj.h = Math.max(STICKER_MIN_SIZE_MM, (dragState.startH * Math.abs(local.y)) / dragState.startLocal.y);
    }
  } else if (dragState.mode === "rotate") {
    const angle = Math.atan2(p.y - obj.cy, p.x - obj.cx);
    let rot = dragState.startRot + angle - dragState.startAngle;
    if (e.shiftKey) rot = Math.round(rot / (Math.PI / 12)) * (Math.PI / 12);
    obj.rot = snapAngle(rot);
  }

  lastFillTargetKey = null;
  redrawEditor();
  syncSelectionPanel();
}

function finishMarquee() {
  const m = stickerState.marquee;
  stickerState.marquee = null;

  if (!m || Math.abs(m.x2 - m.x1) < 1 || Math.abs(m.y2 - m.y1) < 1) {
    refreshEditor();
    return;
  }

  const minX = Math.min(m.x1, m.x2);
  const maxX = Math.max(m.x1, m.x2);
  const minY = Math.min(m.y1, m.y2);
  const maxY = Math.max(m.y1, m.y2);

  // 영역에 조금이라도 걸친 스티커를 선택
  const ids = stickerState.objects
    .filter((o) => {
      const b = getObjectBounds(o);
      return b.maxX >= minX && b.minX <= maxX && b.maxY >= minY && b.minY <= maxY;
    })
    .map((o) => o.id);

  selectObjects(ids);
}

function onCanvasPointerUp(e) {
  activePointers.delete(e.pointerId);
  stickerCanvas.releasePointerCapture?.(e.pointerId);

  if (activePointers.size >= 2) {
    startPinch();
    return;
  }

  if (dragState?.mode === "marquee") finishMarquee();
  else if (dragState) refreshEditor();
  dragState = null;

  // 모바일: 캔버스 작업을 시작하면 도구 패널을 접어서 캔버스를 넓게
  if (mobileMq.matches && isToolPanelCollapsible() && !toolDockEl?.classList.contains("is-collapsed")) {
    setToolPanelCollapsed(true);
    requestAnimationFrame(revealCanvasBelowDock);
  }
}

function onEditorKeyDown(e) {
  if (currentStep !== "editor" || stickerState.locked) return;
  if (e.target.closest?.("input, textarea, select")) return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    undo();
    return;
  }

  const objs = getSelectedObjects();
  if (!objs.length) return;

  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    deleteSelected();
    return;
  }

  if (e.key === "Escape") {
    clearSelection();
    refreshEditor();
    return;
  }

  const step = e.shiftKey ? 10 : 1;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const move = moves[e.key];
  if (!move) return;

  e.preventDefault();
  pushHistory();
  objs.forEach((o) => {
    o.cx += move[0];
    o.cy += move[1];
  });
  refreshEditor();
}

/* =========================================================
 * 외부(sticker-order.js)에서 부르는 훅
========================================================= */
function syncPaperText() {
  const el = byId("paperText");
  if (el) el.textContent = getPaperLabel();
}

function onPaperChanged() {
  syncPaperText();
  // 용지가 바뀌면 이전 용지 기준 기록은 의미가 없으므로 비움
  clearHistory();
  resizeEditorCanvas();
  refreshEditor();
}

function onEditorShown() {
  syncPaperText();
  requestAnimationFrame(resizeEditorCanvas);
}

function syncEditorControls() {
  const objs = getSelectedObjects();
  if (selDupBtn) selDupBtn.disabled = stickerState.locked || !objs.length;
  if (selDelBtn) selDelBtn.disabled = stickerState.locked || !objs.length;
  syncHistoryButtons();
  syncFillPanel();
  redrawEditor();
}

/* =========================================================
 * 이벤트 바인딩
========================================================= */
function setActiveToolTab(targetId) {
  toolTabEls.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.toolTarget === targetId));
  toolPanelEls.forEach((panel) => panel.classList.toggle("is-active", panel.id === targetId));
  syncToolToggle();
  if (targetId === "toolFill") {
    syncFillPanel();
    if (!getFillTarget()?.isActiveFill) fillSafeArea({ auto: true });
  }
}

function bindEditorEvents() {
  renderLibraryCats();
  renderLibrary();
  renderTextFontButtons();
  renderTextColorButtons();

  toolTabEls.forEach((tab) => {
    tab.addEventListener("click", () => {
      // 모바일에서 이미 열린 탭을 다시 누르면 패널 접기
      const isOpen = tab.classList.contains("is-active") && !toolDockEl?.classList.contains("is-collapsed");
      if (mobileMq.matches && isOpen && isToolPanelCollapsible()) {
        setToolPanelCollapsed(true);
        return;
      }
      setToolPanelCollapsed(false);
      setActiveToolTab(tab.dataset.toolTarget);
    });
  });

  toolToggleBtn?.addEventListener("click", () => {
    setToolPanelCollapsed(!toolDockEl?.classList.contains("is-collapsed"));
  });

  placeCanvasPill();
  syncToolToggle();
  mobileMq.addEventListener?.("change", () => {
    placeCanvasPill();
    if (currentStep === "editor") resizeEditorCanvas();
  });

  undoBtn?.addEventListener("click", undo);
  resetBtn?.addEventListener("click", resetAll);

  fileBtn?.addEventListener("click", () => {
    if (!stickerState.locked) fileEl?.click();
  });

  fileEl?.addEventListener("change", async () => {
    await handleUploadFiles(fileEl.files);
    fileEl.value = "";
  });

  libraryCatsEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-library-cat]");
    if (!btn || btn.dataset.libraryCat === libraryCategory) return;
    libraryCategory = btn.dataset.libraryCat;
    renderLibraryCats();
    renderLibrary();
  });

  // 썸네일이 일시적으로 못 불러와지면 (네트워크 / 캐시 문제) 한 번만 다시 불러옴
  libraryGridEl?.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (img.tagName !== "IMG" || img.dataset.retried) return;
      img.dataset.retried = "1";
      img.src = `${img.getAttribute("src")}?retry=${Date.now()}`;
    },
    true,
  );

  libraryGridEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-library-id]");
    if (btn && !stickerState.locked) addLibrarySticker(btn.dataset.libraryId);
  });

  // 텍스트: 입력하는 즉시 캔버스에 반영
  textInputEl?.addEventListener("input", () => {
    if (stickerState.locked) return;
    pushHistoryOnce();
    applyTextFromPanel();
  });

  textFontRowEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-font-id]");
    if (!btn) return;
    textFontId = btn.dataset.fontId;
    renderTextFontButtons();
    if (getSelectedTextObject()) {
      pushHistory();
      applyTextFromPanel({ create: false });
    }
  });

  textColorRowEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-color]");
    if (!btn) return;
    textColor = btn.dataset.color;
    renderTextColorButtons();
    if (getSelectedTextObject()) {
      pushHistory();
      applyTextFromPanel({ create: false });
    }
  });

  textNewBtn?.addEventListener("click", startNewText);

  fillWEl?.addEventListener("input", () => onFillInput("w"));
  fillHEl?.addEventListener("input", () => onFillInput("h"));
  fillGapEl?.addEventListener("input", () => onFillInput("gap"));
  fillBtn?.addEventListener("click", fillSafeArea);

  selWEl?.addEventListener("input", () => applySizeInput("w"));
  selHEl?.addEventListener("input", () => applySizeInput("h"));

  [selWEl, selHEl, fillWEl, fillHEl, fillGapEl, textInputEl].forEach((el) => {
    el?.addEventListener("blur", () => {
      endInputHistory();
      syncSelectionPanel();
      syncFillPanel();
    });
  });

  selDupBtn?.addEventListener("click", duplicateSelected);
  selDelBtn?.addEventListener("click", deleteSelected);
  alignBtnEls.forEach((btn) => btn.addEventListener("click", () => alignSelected(btn.dataset.align)));

  stickerCanvas?.addEventListener("pointerdown", onCanvasPointerDown);
  stickerCanvas?.addEventListener("pointermove", onCanvasPointerMove);
  stickerCanvas?.addEventListener("pointerup", onCanvasPointerUp);
  stickerCanvas?.addEventListener("pointercancel", onCanvasPointerUp);
  document.addEventListener("keydown", onEditorKeyDown);

  byId("askModalOk")?.addEventListener("click", () => closeAskModal(true));
  byId("askModalCancel")?.addEventListener("click", () => closeAskModal(false));
  askModalEl?.addEventListener("click", (e) => {
    if (e.target === askModalEl || e.target.classList.contains("stkPaperModalDim")) closeAskModal(false);
  });

  if (typeof ResizeObserver === "function" && canvasWrapEl) {
    new ResizeObserver(() => {
      if (currentStep === "editor") resizeEditorCanvas();
    }).observe(canvasWrapEl);
  } else {
    window.addEventListener("resize", () => {
      if (currentStep === "editor") resizeEditorCanvas();
    });
  }
}
