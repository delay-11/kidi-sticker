/* =========================================================
 * UV DTF 스티커 시안 - 제작 화면 (캔버스 편집)
========================================================= */
const stickerCanvas = byId("stickerCanvas");
const stickerCtx = stickerCanvas?.getContext("2d");
const canvasWrapEl = byId("canvasWrap");

const undoBtn = byId("undoBtn");
const resetBtn = byId("resetBtn");

const selTitleEl = byId("selTitle");
const selEmptyTextEl = byId("selEmptyText");
const selBodyEl = byId("selBody");
const selSizeAreaEl = byId("selSizeArea");
const selWEl = byId("selW");
const selHEl = byId("selH");
const selLockRatioEl = byId("selLockRatio");
const selDpiWarnEl = byId("selDpiWarn");
const selDupBtn = byId("selDupBtn");
const selDelBtn = byId("selDelBtn");

const toolTabEls = Array.from(document.querySelectorAll("[data-tool-target]"));
const toolPanelEls = Array.from(document.querySelectorAll(".stkToolPanel"));

const fileEl = byId("file");
const fileBtn = byId("fileBtn");
const libraryGridEl = byId("libraryGrid");

const textInputEl = byId("textInput");
const textFontRowEl = byId("textFontRow");
const textHeightCmEl = byId("textHeightCm");
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

  const maxH = Math.max(320, Math.min(window.innerHeight * 0.74, 980));
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
 * - 스티커 배치(objects)와 꽉 채우기 설정을 통째로 저장해두고 되돌림
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
      addObjectFromSource(src, getAddWidthMm());
    } catch (err) {
      console.error(err);
      showToast(`${file.name}: 이미지를 불러오지 못했어요.`, "error", 2600);
    }
  }
}

/* =========================================================
 * 기본 스티커 (메뉴에서 눌러서 추가)
========================================================= */
function renderLibrary() {
  if (!libraryGridEl) return;

  libraryGridEl.innerHTML = STICKER_LIBRARY.map(
    (item) => `
      <button class="stkLibraryItem" data-library-id="${escapeHtml(item.id)}" type="button" title="${escapeHtml(item.name)}">
        <img alt="" src="${escapeHtml(item.src)}" loading="lazy" />
        <span>${escapeHtml(item.name)}</span>
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

function getTextHeightMm() {
  const cm = parseFloat(textHeightCmEl?.value);
  return (Number.isFinite(cm) && cm > 0 ? cm : 1.5) * 10;
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

  const src = createTextSource(value, textFontId, textColor);
  const mmPerPx = getTextHeightMm() / TEXT_FONT_PX;

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
        style="font-family:'${font.family}',Pretendard,sans-serif;font-weight:${font.weight};" type="button">Aa ${escapeHtml(font.label)}</button>
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
  if (textHeightCmEl && document.activeElement !== textHeightCmEl) {
    textHeightCmEl.value = mmToCmText((obj.h / src.pxH) * TEXT_FONT_PX);
  }
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
 * 꽉 채우기 - 선택한 스티커를 같은 크기로 안전선 안에 바둑판 배치
 * - 채운 뒤에는 stickerState.fill에 설정을 보관하고, 크기/간격을 바꾸면
 *   채운 스티커(fillGroup)만 다시 배치함
========================================================= */
function hasActiveFill() {
  return !!stickerState.fill && stickerState.objects.some((o) => o.fillGroup);
}

// 채우기 대상: 선택한 스티커가 있으면 그 스티커, 없으면 이미 채운 배치
function getFillTarget() {
  const obj = getSelectedObject();
  if (obj) {
    return {
      sourceId: obj.sourceId,
      isActiveFill: !!obj.fillGroup && hasActiveFill() && stickerState.fill.sourceId === obj.sourceId,
      w: obj.w,
    };
  }
  if (hasActiveFill()) return { sourceId: stickerState.fill.sourceId, isActiveFill: true, w: stickerState.fill.w };
  return null;
}

function getFillLayout(target = getFillTarget()) {
  if (!target) return null;

  const src = stickerState.sources.get(target.sourceId);
  if (!src) return null;

  const ratio = src.pxH / src.pxW;
  const wCm = parseFloat(fillWEl?.value);
  const gapCm = parseFloat(fillGapEl?.value);
  const w = Number.isFinite(wCm) && wCm > 0 ? wCm * 10 : target.w;
  const h = w * ratio;
  const gap = Number.isFinite(gapCm) && gapCm >= 0 ? gapCm * 10 : STICKER_DEFAULT_GAP_MM;
  const safe = getSafeRect();

  const cols = Math.max(0, Math.floor((safe.w + gap + 0.001) / (w + gap)));
  const rows = Math.max(0, Math.floor((safe.h + gap + 0.001) / (h + gap)));

  return { sourceId: target.sourceId, w, h, gap, ratio, cols, rows, count: cols * rows, safe };
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
    if (fillInfoEl) fillInfoEl.textContent = "먼저 캔버스에서 채울 스티커를 선택해 주세요.";
    return;
  }

  // 대상이 바뀌었을 때만 입력칸 값을 새로 채움 (입력 중인 값은 유지)
  const targetKey = target.isActiveFill ? `fill:${target.sourceId}` : `obj:${stickerState.selectedId}`;
  if (targetKey !== lastFillTargetKey) {
    lastFillTargetKey = targetKey;
    if (fillWEl) fillWEl.value = mmToCmText(target.w);
    if (target.isActiveFill && fillGapEl) fillGapEl.value = mmToCmText(stickerState.fill.gap);
  }

  const layout = getFillLayout(target);
  if (fillHEl && document.activeElement !== fillHEl) fillHEl.value = mmToCmText(layout.h);

  if (fillBtn) {
    fillBtn.hidden = target.isActiveFill;
    fillBtn.disabled = !layout.count || layout.count > STICKER_MAX_OBJECTS || stickerState.locked;
  }

  if (!fillInfoEl) return;
  if (!layout.count) {
    fillInfoEl.textContent = "스티커가 안전선보다 커서 채울 수 없어요. 크기를 줄여주세요.";
  } else if (layout.count > STICKER_MAX_OBJECTS) {
    fillInfoEl.textContent = `한 번에 최대 ${STICKER_MAX_OBJECTS}개까지 채울 수 있어요. 크기를 키워주세요.`;
  } else {
    const grid = `가로 <b>${layout.cols}개</b> × 세로 <b>${layout.rows}개</b> = 총 <b>${layout.count}개</b>`;
    fillInfoEl.innerHTML = target.isActiveFill ? `${grid} 배치됨 · 값을 바꾸면 바로 반영돼요` : `${grid} 배치`;
  }
}

function buildFillObjects(layout) {
  const { w, h, gap, cols, rows, safe, sourceId } = layout;
  const gridW = cols * w + (cols - 1) * gap;
  const gridH = rows * h + (rows - 1) * gap;
  const startX = safe.x + (safe.w - gridW) / 2;
  const startY = safe.y + (safe.h - gridH) / 2;

  const out = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      out.push({
        id: nextStickerId(),
        sourceId,
        cx: startX + c * (w + gap) + w / 2,
        cy: startY + r * (h + gap) + h / 2,
        w,
        h,
        rot: 0,
        fillGroup: true,
      });
    }
  }
  return out;
}

// 처음 채우기 - 기존 배치를 지우고 선택한 스티커로 채움
function fillSafeArea() {
  if (stickerState.locked) return;

  const layout = getFillLayout();
  if (!layout?.count || layout.count > STICKER_MAX_OBJECTS) return;

  const others = stickerState.objects.filter((o) => o.id !== stickerState.selectedId).length;
  const run = () => {
    pushHistory();
    stickerState.objects = buildFillObjects(layout);
    stickerState.fill = { sourceId: layout.sourceId, w: layout.w, gap: layout.gap };
    clearSelection();
    lastFillTargetKey = `fill:${layout.sourceId}`;
    refreshEditor();
    showToast(`안전선 안에 ${layout.count}개를 꽉 채웠어요. 크기와 간격은 계속 바꿀 수 있어요.`, "ok", 2600);
  };

  if (!others) {
    run();
    return;
  }

  askConfirm(`기존에 배치한 스티커 ${others}개가 지워지고 선택한 스티커로 채워집니다. 계속할까요?`, "꽉 채우기").then(
    (ok) => ok && run(),
  );
}

// 채운 뒤 크기/간격 수정 - 채운 스티커만 다시 배치 (나중에 추가한 스티커는 유지)
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
  stickerState.fill = { sourceId: layout.sourceId, w: layout.w, gap: layout.gap };
  clearSelection();
  lastFillTargetKey = `fill:${layout.sourceId}`;
  refreshEditor();
}

function onFillInput(field) {
  // 세로를 바꾸면 비율에 맞춰 가로를 계산 (계산은 가로 기준으로 통일)
  if (field === "h") {
    const target = getFillTarget();
    const src = target && stickerState.sources.get(target.sourceId);
    const hCm = parseFloat(fillHEl?.value);
    if (src && Number.isFinite(hCm) && hCm > 0 && fillWEl) {
      fillWEl.value = mmToCmText((hCm * 10 * src.pxW) / src.pxH);
    }
  }

  if (getFillTarget()?.isActiveFill) relayoutActiveFill();
  else syncFillPanel();
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

function duplicateSelected() {
  const obj = getSelectedObject();
  if (!obj || stickerState.locked || !canAddObjects(1)) return;

  pushHistory();
  const copy = { ...obj, id: nextStickerId() };
  delete copy.fillGroup;

  if (Math.abs(Math.sin(copy.rot || 0)) > 0.01) {
    copy.cx += 5;
    copy.cy += 5;
  } else {
    Object.assign(copy, findFreeSpot(copy.w, copy.h));
  }
  nudgeObjectIntoSafe(copy);

  stickerState.objects.push(copy);
  selectObject(copy.id);
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

  if (selBodyEl) selBodyEl.hidden = !objs.length;
  if (selEmptyTextEl) {
    selEmptyTextEl.hidden = !!objs.length;
    selEmptyTextEl.textContent = "캔버스에서 스티커를 누르거나, 빈 곳을 드래그해서 여러 개를 선택하세요";
  }
  if (selTitleEl) selTitleEl.textContent = objs.length > 1 ? `스티커 ${objs.length}개 선택됨` : "선택한 스티커";
  if (selSizeAreaEl) selSizeAreaEl.hidden = !single;
  if (selDupBtn) selDupBtn.hidden = !single;
  if (selDelBtn) selDelBtn.textContent = objs.length > 1 ? `${objs.length}개 삭제` : "삭제";

  if (!single) {
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
      startW: selected.w,
      startH: selected.h,
    };
    return;
  }

  const target = hitObject(p);

  if (!target) {
    // 마우스로 빈 곳을 드래그하면 영역 선택, 터치는 선택 해제만
    clearSelection();
    dragState = e.pointerType === "touch" ? null : { mode: "marquee", start: p };
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
    resizeAroundCenter(obj, Math.hypot(local.x, local.y) / dragState.startDist, dragState.startW, dragState.startH);
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
  if (selDupBtn) selDupBtn.disabled = stickerState.locked || objs.length !== 1;
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
  if (targetId === "toolFill") syncFillPanel();
}

function bindEditorEvents() {
  renderLibrary();
  renderTextFontButtons();
  renderTextColorButtons();

  toolTabEls.forEach((tab) => {
    tab.addEventListener("click", () => setActiveToolTab(tab.dataset.toolTarget));
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

  textHeightCmEl?.addEventListener("input", () => {
    if (!getSelectedTextObject()) return;
    pushHistoryOnce();
    applyTextFromPanel({ create: false });
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

  [selWEl, selHEl, fillWEl, fillHEl, fillGapEl, textInputEl, textHeightCmEl].forEach((el) => {
    el?.addEventListener("blur", () => {
      endInputHistory();
      syncSelectionPanel();
      syncFillPanel();
    });
  });

  selDupBtn?.addEventListener("click", duplicateSelected);
  selDelBtn?.addEventListener("click", deleteSelected);

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
