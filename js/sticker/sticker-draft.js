/* =========================================================
 * UV DTF 스티커 시안 - 작업 중 임시 저장 (새로고침해도 이어서 작업)
 * - 보고 있던 단계(시안 제작 / 시안 확인)와 배치한 스티커를 그대로 복원
 * - 업로드 이미지는 용량이 커서 IndexedDB에 저장 (배치 정보와 따로, 처음 한 번만)
 * - 주문번호가 있으면 주문번호 기준으로 저장해서, 창을 닫거나 링크를 다시 열어도 이어서 작업
 *   (주문번호를 넣기 전에는 탭마다 따로 저장)
 * - 오래된 임시 저장(2일)은 페이지를 열 때 정리
========================================================= */
const STICKER_DRAFT_DB = "kidi_sticker_draft";
const STICKER_DRAFT_ID_KEY = "sticker_draft_id";
const STICKER_STEP_KEY = "sticker_step";
const STICKER_LAYOUT_KEY = "sticker_draft_layout";
const STICKER_DRAFT_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

let draftDbPromise = null;
let draftSaveTimer = null;
// 페이지를 열고 복원이 끝나기 전에는 저장하지 않음 (빈 화면으로 덮어쓰지 않게)
let draftRestoring = true;
const draftSavedFiles = new Set();
let lastDraftId = null;
// 주문번호 기준 저장에서 불러온 '보고 있던 단계' (sticker-order.js의 restoreOrderInfo에서 채움)
let pendingResumeStep = null;

function getDraftId() {
  const orderNo = getOrderNo();
  const id = orderNo ? `o_${orderNo}` : getTabDraftId();
  // 저장 위치가 바뀌면 이미지도 새 위치에 다시 저장
  if (id !== lastDraftId) {
    draftSavedFiles.clear();
    lastDraftId = id;
  }
  return id;
}

function getTabDraftId() {
  try {
    let id = sessionStorage.getItem(STICKER_DRAFT_ID_KEY);
    if (!id) {
      id = `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(STICKER_DRAFT_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function openDraftDb() {
  if (draftDbPromise) return draftDbPromise;

  draftDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB 없음"));
      return;
    }
    const req = indexedDB.open(STICKER_DRAFT_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("drafts");
      req.result.createObjectStore("files");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((err) => {
    console.warn("[임시 저장 사용 불가]", err);
    return null;
  });

  return draftDbPromise;
}

function draftRequest(db, store, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = run(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/* =========================================================
 * 단계 저장 (sessionStorage - 가벼워서 바로 저장)
========================================================= */
function saveDraftStep(step) {
  if (draftRestoring) return;
  try {
    sessionStorage.setItem(STICKER_STEP_KEY, step);
  } catch {
    // 저장 실패(사생활 보호 모드 등)는 무시
  }
  saveOrderRecord();
}

function getSavedDraftStep() {
  try {
    return sessionStorage.getItem(STICKER_STEP_KEY) || pendingResumeStep || "info";
  } catch {
    return "info";
  }
}

/* =========================================================
 * 배치 저장 - 바뀔 때마다 부르되, 드래그 중에는 잠깐 모아서 저장
========================================================= */
function scheduleDraftSave() {
  if (draftRestoring) return;
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(saveDraft, 400);
}

// 배치 정보 (이미지 파일 제외) - 배치에 쓰인 원본만 (뒤로가기용으로 남아있는 원본은 빼고)
// 여러 장이면 장마다 배치 / 자동 배치 설정을 따로 저장
function buildDraftLayout() {
  const sheets = getAllSheets();
  const usedIds = new Set(sheets.flatMap((s) => s.objects.map((o) => o.sourceId)));
  return {
    orderNo: getOrderNo(),
    papers: sheets.map((s) => s.paper),
    sheetIndex: stickerState.sheetIndex,
    sheets: sheets.map((s) => ({ paper: s.paper, objects: s.objects.map((o) => ({ ...o })), fill: s.fill })),
    sources: [...stickerState.sources.values()]
      .filter((src) => usedIds.has(src.id))
      .map((src) => ({ id: src.id, kind: src.kind, name: src.name, pxW: src.pxW, pxH: src.pxH, text: src.text || null })),
    savedAt: Date.now(),
  };
}

// 저장 대기 중에 새로고침 / 페이지를 떠나면 배치 정보를 sessionStorage에 바로 저장
// (IndexedDB 저장은 비동기라 페이지가 닫히기 전에 끝나지 않을 수 있음)
window.addEventListener("pagehide", () => {
  if (!draftSaveTimer) return;
  clearTimeout(draftSaveTimer);
  draftSaveTimer = null;
  try {
    sessionStorage.setItem(STICKER_LAYOUT_KEY, JSON.stringify(buildDraftLayout()));
  } catch {
    // 저장 실패는 무시 (마지막 IndexedDB 저장본으로 복원)
  }
});

async function saveDraft() {
  draftSaveTimer = null;
  const draftId = getDraftId();
  const db = draftId && (await openDraftDb());
  if (!db) return;

  const layout = buildDraftLayout();
  const usedIds = new Set(layout.sheets.flatMap((s) => s.objects.map((o) => o.sourceId)));

  try {
    for (const src of stickerState.sources.values()) {
      if (src.kind !== "upload" || !usedIds.has(src.id) || draftSavedFiles.has(src.id) || !src.file) continue;
      await draftRequest(db, "files", "readwrite", (store) => store.put(src.file, `${draftId}:${src.id}`));
      draftSavedFiles.add(src.id);
    }

    await draftRequest(db, "drafts", "readwrite", (store) => store.put(layout, draftId));
    try {
      sessionStorage.removeItem(STICKER_LAYOUT_KEY);
    } catch {
      // 무시
    }
  } catch (err) {
    console.warn("[임시 저장 실패]", err);
  }
}

/* =========================================================
 * 복원
========================================================= */
async function restoreDraftSource(db, draftId, saved) {
  if (saved.kind === "library") {
    const item = STICKER_LIBRARY.find((x) => `lib_${x.id}` === saved.id);
    return item ? getLibrarySource(item) : null;
  }

  if (saved.kind === "text" && saved.text) {
    const font = getTextFont(saved.text.fontId);
    try {
      await document.fonts?.load?.(getFontCss(font), saved.text.value || "A");
    } catch {
      // 폰트를 못 불러와도 대체 폰트로 그림
    }
    const c = buildTextCanvas(saved.text.value, font, saved.text.color);
    const src = { ...saved, file: null, img: c, pxW: c.width, pxH: c.height };
    stickerState.sources.set(src.id, src);
    return src;
  }

  if (saved.kind === "upload") {
    const file = await draftRequest(db, "files", "readonly", (store) => store.get(`${draftId}:${saved.id}`));
    if (!file) return null;
    const img = await loadImage(URL.createObjectURL(file));
    const src = { ...saved, file, img, pxW: img.naturalWidth, pxH: img.naturalHeight };
    stickerState.sources.set(src.id, src);
    // 지금 저장 위치에서 불러온 이미지만 '저장됨'으로 표시 (예전 위치에서 불러왔으면 다음 저장 때 옮김)
    if (draftId === lastDraftId) draftSavedFiles.add(src.id);
    return src;
  }

  return null;
}

async function restoreDraftObjects() {
  let draftId = getDraftId();
  const db = draftId && (await openDraftDb());
  if (!db) return false;

  let draft = await draftRequest(db, "drafts", "readonly", (store) => store.get(draftId));
  // 탭 기준으로 저장하던 예전 방식의 작업이 남아 있으면 그걸 불러옴 (이미지는 다음 저장 때 주문번호 기준으로 옮겨짐)
  if (!draft && draftId.startsWith("o_")) {
    const tabId = getTabDraftId();
    const old = tabId && (await draftRequest(db, "drafts", "readonly", (store) => store.get(tabId)));
    if (old) {
      draft = old;
      draftId = tabId;
    }
  }
  // 페이지를 떠나기 직전에 저장한 배치가 더 최신이면 그걸 사용
  try {
    const quick = JSON.parse(sessionStorage.getItem(STICKER_LAYOUT_KEY) || "null");
    if (quick && (!draft || quick.savedAt > draft.savedAt)) draft = quick;
  } catch {
    // 무시
  }
  // 예전 저장 형식(용지 1장)
  if (draft && !draft.sheets && draft.objects) {
    draft = { ...draft, papers: [draft.paper], sheetIndex: 0, sheets: [{ paper: draft.paper, objects: draft.objects, fill: draft.fill }] };
  }
  if (!draft?.sheets?.some((s) => s.objects?.length)) return false;
  // 다른 주문번호로 들어왔거나 용지 / 수량이 바뀌었으면 복원하지 않음
  const papers = stickerState.sheets.map((s) => s.paper);
  if (draft.orderNo !== getOrderNo() || draft.papers.join(",") !== papers.join(",")) return false;

  const ok = new Set();
  for (const saved of draft.sources || []) {
    try {
      if (await restoreDraftSource(db, draftId, saved)) ok.add(saved.id);
    } catch (err) {
      console.warn("[임시 저장 이미지 복원 실패]", saved.name, err);
    }
  }

  stickerState.sheets = draft.sheets.map((s) => {
    const objects = (s.objects || []).filter((o) => ok.has(o.sourceId));
    return { paper: s.paper, objects, fill: objects.some((o) => o.fillGroup) ? s.fill : null };
  });
  loadSheet(Math.min(draft.sheetIndex || 0, stickerState.sheets.length - 1));
  return stickerState.sheets.some(sheetHasStickers);
}

// 오래된 임시 저장 정리 (다른 탭에서 쓰던 것 중 기간이 지난 것)
async function cleanupOldDrafts() {
  const db = await openDraftDb();
  if (!db) return;

  const now = Date.now();
  const current = getDraftId();

  try {
    const keys = await draftRequest(db, "drafts", "readonly", (store) => store.getAllKeys());
    for (const key of keys || []) {
      if (key === current) continue;
      const d = await draftRequest(db, "drafts", "readonly", (store) => store.get(key));
      if (d && now - (d.savedAt || 0) < STICKER_DRAFT_MAX_AGE_MS) continue;
      await draftRequest(db, "drafts", "readwrite", (store) => store.delete(key));
      await draftRequest(db, "files", "readwrite", (store) =>
        store.delete(IDBKeyRange.bound(`${key}:`, `${key}:\uffff`)),
      );
    }
  } catch (err) {
    console.warn("[임시 저장 정리 실패]", err);
  }
}

// 페이지를 열 때: 배치 복원 → 보고 있던 단계로 이동
async function restoreDraft(stepOverride = null) {
  draftRestoring = true;
  const step = stepOverride || getSavedDraftStep();
  pendingResumeStep = null;

  try {
    const restored = await restoreDraftObjects();
    if (restored) onSheetsChanged();
  } catch (err) {
    console.warn("[임시 저장 복원 실패]", err);
  }

  draftRestoring = false;

  if (!stickerState.locked && step !== "info" && validateOrderInfo(false)) {
    setDesignStep(step === "confirm" && validateCanConfirm(false) ? "confirm" : "editor");
  }
  reconcileStepHistory();

  cleanupOldDrafts();
  cleanupOldOrderRecords();
}
