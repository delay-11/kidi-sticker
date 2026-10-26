/* =========================================================
 * UV DTF 스티커 시안 - 여러 장 주문 (용지별 수량 / 같은 시안 · 장마다 다른 시안)
 * - stickerState.order: 용지별 수량 + 시안 방식
 * - stickerState.sheets: 실제로 편집하는 시안 목록 (같은 시안이면 1개, 다른 시안이면 장 수만큼)
 * - 지금 편집 중인 시안은 stickerState.paper / objects / fill 에 펼쳐두고,
 *   다른 장으로 바꿀 때 sheets에 되돌려 저장 (편집 / 렌더 코드는 그대로 현재 장 기준)
========================================================= */
stickerState.order = { qty: Object.fromEntries(Object.keys(STICKER_PAPERS).map((k) => [k, 0])), mode: "same" };
stickerState.sheets = [];
stickerState.sheetIndex = 0;

function getTotalQty() {
  return Object.values(stickerState.order.qty).reduce((a, b) => a + b, 0);
}

// 주문한 용지 목록 (A3 → A4 → A5 순서로 장 수만큼)
function getOrderedPapers() {
  return Object.keys(STICKER_PAPERS).flatMap((key) => Array(stickerState.order.qty[key] || 0).fill(key));
}

function getPaperKinds() {
  return Object.keys(STICKER_PAPERS).filter((key) => stickerState.order.qty[key] > 0);
}

// 같은 시안을 여러 장에 쓸 수 있는지 (한 종류 용지로만 2장 이상)
function canUseSameDesign() {
  return getTotalQty() > 1 && getPaperKinds().length === 1;
}

// 실제 시안 방식 - 1장이거나 용지가 섞여 있으면 장마다 따로
function isSameDesign() {
  return canUseSameDesign() && stickerState.order.mode === "same";
}

// 편집할 시안 목록 (각 시안의 용지)
function getDesignPapers() {
  const papers = getOrderedPapers();
  return isSameDesign() ? papers.slice(0, 1) : papers;
}

// 시안 하나가 몇 장으로 인쇄되는지
function getSheetCopies() {
  return isSameDesign() ? getTotalQty() : 1;
}

function sheetHasStickers(sheet) {
  return !!sheet?.objects?.length;
}

/* =========================================================
 * 현재 장 <-> sheets
========================================================= */
function commitCurrentSheet() {
  const sheet = stickerState.sheets[stickerState.sheetIndex];
  if (!sheet) return;
  sheet.paper = stickerState.paper;
  sheet.objects = stickerState.objects;
  sheet.fill = stickerState.fill;
}

function loadSheet(index) {
  const sheet = stickerState.sheets[index];
  stickerState.sheetIndex = sheet ? index : 0;
  stickerState.paper = sheet?.paper || "";
  stickerState.objects = sheet?.objects || [];
  stickerState.fill = sheet?.fill || null;
}

// 저장된 다른 장을 잠깐 현재 장처럼 펼쳐서 그릴 때 (동기 함수 안에서만)
function withSheet(sheet, fn) {
  const prev = { paper: stickerState.paper, objects: stickerState.objects, fill: stickerState.fill };
  stickerState.paper = sheet.paper;
  stickerState.objects = sheet.objects;
  stickerState.fill = sheet.fill;
  try {
    return fn();
  } finally {
    Object.assign(stickerState, prev);
  }
}

function getAllSheets() {
  commitCurrentSheet();
  return stickerState.sheets;
}

// 용지가 바뀐 장은 스티커를 용지 중앙 기준으로 같은 상대 위치에 둠
function moveSheetToPaper(sheet, key) {
  const prev = STICKER_PAPERS[sheet.paper];
  const next = STICKER_PAPERS[key];
  if (prev && next && prev.key !== next.key) {
    const dx = (next.w - prev.w) / 2;
    const dy = (next.h - prev.h) / 2;
    sheet.objects = sheet.objects.map((o) => ({ ...o, cx: o.cx + dx, cy: o.cy + dy }));
  }
  sheet.paper = key;
}

/* =========================================================
 * 수량 / 시안 방식이 바뀌면 시안 목록을 다시 맞춤 (planSheets)
 * - 기존 시안은 최대한 이어받고, 늘어난 장은 빈 용지
 * - 같은 시안 → 장마다 다른 시안: 지금 시안을 모든 장에 복사해서 시작
========================================================= */
function cloneSheet(sheet, paper = sheet.paper) {
  const copy = { paper: sheet.paper, objects: sheet.objects.map((o) => ({ ...o })), fill: sheet.fill ? { ...sheet.fill } : null };
  moveSheetToPaper(copy, paper);
  return copy;
}

// 새 용지 목록에 기존 시안을 맞춰 넣음
// - 같은 용지끼리 순서대로 이어받음 (A4를 한 장 줄여도 A5 시안은 그대로)
// - 같은 시안 하나만 있던 경우는 용지가 바뀌어도 이어받음
// - 같은 시안 → 장마다 다른 시안(spread): 그 시안을 모든 장에 복사해서 시작
function planSheets(papers, spread) {
  const old = getAllSheets();
  if (spread) {
    return { sheets: papers.map((paper, i) => (i ? cloneSheet(old[0], paper) : (moveSheetToPaper(old[0], paper), old[0]))), lost: 0 };
  }

  // 수량을 모두 0으로 줄인 동안에는 시안을 그대로 보관 (다른 용지로 바꾸는 중일 수 있음)
  if (!papers.length) return { sheets: old, lost: 0 };

  const pool = old.slice();
  const sheets = papers.map((paper) => {
    const i = pool.findIndex((s) => s.paper === paper);
    return i >= 0 ? pool.splice(i, 1)[0] : null;
  });

  // 용지가 맞는 시안이 없거나 빈 시안인 자리는, 남은 시안 중 스티커가 있는 것을 먼저 이어받음
  // (용지 중앙 기준으로 옮김 - 예: A4 1장 → A5 1장으로 바꿔도 시안 유지)
  papers.forEach((paper, i) => {
    if (sheetHasStickers(sheets[i])) return;
    const j = pool.findIndex(sheetHasStickers);
    if (j >= 0) {
      if (sheets[i]) pool.push(sheets[i]);
      sheets[i] = pool.splice(j, 1)[0];
      moveSheetToPaper(sheets[i], paper);
    } else if (!sheets[i]) {
      sheets[i] = { paper, objects: [], fill: null };
    }
  });

  return { sheets, lost: pool.filter(sheetHasStickers).length };
}

function shouldSpread(wasSame) {
  const old = getAllSheets();
  return wasSame && !isSameDesign() && old.length === 1 && sheetHasStickers(old[0]);
}

// 바꾸면 사라지는 시안 수 (스티커가 있는 시안만) - 지금 order 기준으로 계산만 함
function countSheetsLost(wasSame) {
  const backup = getAllSheets().map((s) => ({ paper: s.paper, objects: s.objects, fill: s.fill }));
  const { lost } = planSheets(getDesignPapers(), shouldSpread(wasSame));
  // planSheets가 용지를 옮길 수 있어서 원래대로 되돌림
  stickerState.sheets.forEach((s, i) => Object.assign(s, backup[i]));
  return lost;
}

function rebuildSheets({ wasSame = false } = {}) {
  const current = stickerState.sheets[stickerState.sheetIndex];
  stickerState.sheets = planSheets(getDesignPapers(), shouldSpread(wasSame)).sheets;
  const keep = stickerState.sheets.indexOf(current);
  loadSheet(keep >= 0 ? keep : 0);
}

/* =========================================================
 * 표시용 문구
========================================================= */
function getSheetLabel(index) {
  const sheet = stickerState.sheets[index];
  if (!sheet) return "-";
  if (isSameDesign()) return `${sheet.paper} × ${getTotalQty()}장`;
  return `${index + 1}장 · ${sheet.paper}`;
}

// 예: "A4 × 2장, A5 × 1장"
function getQtySummary() {
  return getPaperKinds()
    .map((key) => `${key} × ${stickerState.order.qty[key]}장`)
    .join(", ");
}
