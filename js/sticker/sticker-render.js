/* =========================================================
 * UV DTF 스티커 시안 - 상태 / 기하 계산 / 렌더링
 * - 모든 좌표와 크기는 mm 단위 (용지 왼쪽 위 = 0,0)
 * - 같은 렌더 함수를 제작 캔버스 / 확인 미리보기 / 메일 첨부에 공용으로 사용
========================================================= */

/* =========================================================
 * 시안 상태
 * - sources: 이미지 원본 (복사/채우기로 여러 개를 배치해도 원본은 1개)
 * - objects: 용지 위에 배치된 스티커 (중심 cx/cy, 크기 w/h, 회전 rot(rad))
========================================================= */
const stickerState = {
  paper: "",
  sources: new Map(),
  objects: [],
  selectedId: null,
  // 드래그로 여러 개 선택했을 때 (2개 이상)
  multiIds: [],
  // 드래그 선택 중인 영역 (mm)
  marquee: null,
  // 꽉 채우기 설정 - 채운 뒤에도 크기/간격을 바꾸면 다시 배치하기 위해 보관
  fill: null,
  locked: false,
};

let stickerIdSeq = 0;

function nextStickerId(prefix = "obj") {
  stickerIdSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${stickerIdSeq}`;
}

/* =========================================================
 * 용지 / 안전선
========================================================= */
function getPaper(key = stickerState.paper) {
  return STICKER_PAPERS[key] || STICKER_PAPERS.A4;
}

function getSafeRect(key = stickerState.paper) {
  const paper = getPaper(key);
  const m = STICKER_SAFE_MARGIN_MM;
  return { x: m, y: m, w: paper.w - m * 2, h: paper.h - m * 2 };
}

function mmToCmText(mm, digits = 1) {
  return (Math.round((mm / 10) * 10 ** digits) / 10 ** digits).toFixed(digits);
}

function getPaperLabel(key = stickerState.paper) {
  if (!STICKER_PAPERS[key]) return "-";
  const paper = getPaper(key);
  return `${key} (${mmToCmText(paper.w)} × ${mmToCmText(paper.h)}cm)`;
}

/* =========================================================
 * 스티커 기하 계산
========================================================= */
function getObjectCorners(obj) {
  const cos = Math.cos(obj.rot || 0);
  const sin = Math.sin(obj.rot || 0);
  const hw = obj.w / 2;
  const hh = obj.h / 2;

  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([x, y]) => ({
    x: obj.cx + x * cos - y * sin,
    y: obj.cy + x * sin + y * cos,
  }));
}

// 점(mm)을 스티커 기준 로컬 좌표(회전 해제)로 변환
function toObjectLocal(obj, x, y) {
  const dx = x - obj.cx;
  const dy = y - obj.cy;
  const cos = Math.cos(-(obj.rot || 0));
  const sin = Math.sin(-(obj.rot || 0));
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

function isPointInObject(obj, x, y) {
  const p = toObjectLocal(obj, x, y);
  return Math.abs(p.x) <= obj.w / 2 && Math.abs(p.y) <= obj.h / 2;
}

// 스티커가 인쇄 안전선 안에 완전히 들어있는지 (회전 포함)
function isObjectInsideSafe(obj, key = stickerState.paper) {
  const safe = getSafeRect(key);
  const eps = 0.01;
  return getObjectCorners(obj).every(
    (p) =>
      p.x >= safe.x - eps &&
      p.y >= safe.y - eps &&
      p.x <= safe.x + safe.w + eps &&
      p.y <= safe.y + safe.h + eps,
  );
}

function getOutOfSafeObjects() {
  return stickerState.objects.filter((obj) => !isObjectInsideSafe(obj));
}

function getObjectBounds(obj) {
  const pts = getObjectCorners(obj);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

// 회전한 스티커가 안전선 밖으로 나가지 않도록 위치만 안쪽으로 밀어 넣음
function nudgeObjectIntoSafe(obj) {
  const safe = getSafeRect();
  const b = getObjectBounds(obj);
  const bw = b.maxX - b.minX;
  const bh = b.maxY - b.minY;

  if (bw <= safe.w) {
    if (b.minX < safe.x) obj.cx += safe.x - b.minX;
    else if (b.maxX > safe.x + safe.w) obj.cx -= b.maxX - (safe.x + safe.w);
  }

  if (bh <= safe.h) {
    if (b.minY < safe.y) obj.cy += safe.y - b.minY;
    else if (b.maxY > safe.y + safe.h) obj.cy -= b.maxY - (safe.y + safe.h);
  }
}

/* =========================================================
 * 투명 영역 체크무늬 패턴
========================================================= */
let checkerPatternCanvas = null;

function getCheckerPattern(targetCtx, cell = 8) {
  if (!checkerPatternCanvas || checkerPatternCanvas.width !== cell * 2) {
    checkerPatternCanvas = document.createElement("canvas");
    checkerPatternCanvas.width = cell * 2;
    checkerPatternCanvas.height = cell * 2;
    const c = checkerPatternCanvas.getContext("2d");
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, cell * 2, cell * 2);
    c.fillStyle = "#e9ecf2";
    c.fillRect(0, 0, cell, cell);
    c.fillRect(cell, cell, cell, cell);
  }
  return targetCtx.createPattern(checkerPatternCanvas, "repeat");
}

/* =========================================================
 * 용지 렌더링
 * - pxPerMm: 1mm당 픽셀 수
 * - opts.checker: 투명 영역 체크무늬 표시 (화면용)
 * - opts.background: 단색 바탕 (메일 미리보기 JPEG용)
 * - opts.guides: 용지 외곽 / 인쇄 안전선 표시
 * - opts.selection: 선택 박스 / 핸들 표시 (제작 화면 전용)
 * - 첨부(인쇄용)는 옵션 없이 호출해서 완전 투명 배경으로 만든다
========================================================= */
function renderStickerSheet(targetCtx, pxPerMm, opts = {}) {
  const paper = getPaper();
  const pw = paper.w * pxPerMm;
  const ph = paper.h * pxPerMm;

  targetCtx.save();
  targetCtx.clearRect(0, 0, pw, ph);

  if (opts.background) {
    targetCtx.fillStyle = opts.background;
    targetCtx.fillRect(0, 0, pw, ph);
  } else if (opts.checker) {
    targetCtx.fillStyle = getCheckerPattern(targetCtx);
    targetCtx.fillRect(0, 0, pw, ph);
  }

  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = "high";

  stickerState.objects.forEach((obj) => {
    const src = stickerState.sources.get(obj.sourceId);
    if (!src?.img) return;

    targetCtx.save();
    targetCtx.translate(obj.cx * pxPerMm, obj.cy * pxPerMm);
    targetCtx.rotate(obj.rot || 0);
    targetCtx.drawImage(
      src.img,
      (-obj.w / 2) * pxPerMm,
      (-obj.h / 2) * pxPerMm,
      obj.w * pxPerMm,
      obj.h * pxPerMm,
    );
    targetCtx.restore();
  });

  if (opts.guides) drawSheetGuides(targetCtx, pxPerMm, opts);
  if (opts.selection) drawSelection(targetCtx, pxPerMm, opts);

  targetCtx.restore();
}

function drawSheetGuides(targetCtx, pxPerMm, opts = {}) {
  const paper = getPaper();
  const safe = getSafeRect();
  const lw = opts.lineScale || 1;

  // 안전선 밖으로 나간 스티커는 빨간 외곽선으로 표시
  if (opts.highlightOutOfSafe) {
    targetCtx.save();
    targetCtx.strokeStyle = "rgba(217, 45, 32, 0.9)";
    targetCtx.lineWidth = 2 * lw;
    getOutOfSafeObjects().forEach((obj) => {
      const pts = getObjectCorners(obj);
      targetCtx.beginPath();
      pts.forEach((p, i) => {
        const fn = i ? "lineTo" : "moveTo";
        targetCtx[fn](p.x * pxPerMm, p.y * pxPerMm);
      });
      targetCtx.closePath();
      targetCtx.stroke();
    });
    targetCtx.restore();
  }

  targetCtx.save();
  targetCtx.strokeStyle = "#c5cad6";
  targetCtx.lineWidth = 1 * lw;
  targetCtx.strokeRect(0.5 * lw, 0.5 * lw, paper.w * pxPerMm - lw, paper.h * pxPerMm - lw);

  targetCtx.strokeStyle = "#e5484d";
  targetCtx.lineWidth = 1.5 * lw;
  targetCtx.setLineDash([6 * lw, 4 * lw]);
  targetCtx.strokeRect(
    safe.x * pxPerMm,
    safe.y * pxPerMm,
    safe.w * pxPerMm,
    safe.h * pxPerMm,
  );
  targetCtx.setLineDash([]);

  if (opts.guideLabel) {
    targetCtx.fillStyle = "#e5484d";
    targetCtx.font = `600 ${11 * lw}px Pretendard, system-ui, sans-serif`;
    targetCtx.textBaseline = "bottom";
    targetCtx.fillText("인쇄 안전선", safe.x * pxPerMm + 2 * lw, safe.y * pxPerMm - 4 * lw);
  }
  targetCtx.restore();
}

/* =========================================================
 * 선택 박스 / 핸들 (화면 픽셀 기준 크기)
========================================================= */
const SELECTION_HANDLE_PX = 12;
const SELECTION_ROTATE_OFFSET_PX = 28;
const SELECTION_DELETE_PX = 22;

function getSelectedObject() {
  return stickerState.objects.find((obj) => obj.id === stickerState.selectedId) || null;
}

// 선택 핸들 위치 (mm, 스티커 로컬 좌표)
function getHandleLocalPositions(obj, pxPerMm) {
  const hw = obj.w / 2;
  const hh = obj.h / 2;
  const rotOffset = SELECTION_ROTATE_OFFSET_PX / pxPerMm;
  const delOffset = (SELECTION_DELETE_PX * 0.9) / pxPerMm;

  return {
    nw: { x: -hw, y: -hh },
    ne: { x: hw, y: -hh },
    se: { x: hw, y: hh },
    sw: { x: -hw, y: hh },
    rot: { x: 0, y: -hh - rotOffset },
    del: { x: hw + delOffset, y: -hh - delOffset },
  };
}

function drawMultiSelection(targetCtx, pxPerMm, lw = 1) {
  const ids = new Set(stickerState.multiIds);

  targetCtx.save();
  targetCtx.strokeStyle = "#2563eb";
  targetCtx.lineWidth = 1.5 * lw;
  stickerState.objects.forEach((obj) => {
    if (!ids.has(obj.id)) return;
    const pts = getObjectCorners(obj);
    targetCtx.beginPath();
    pts.forEach((p, i) => targetCtx[i ? "lineTo" : "moveTo"](p.x * pxPerMm, p.y * pxPerMm));
    targetCtx.closePath();
    targetCtx.stroke();
  });

  const m = stickerState.marquee;
  if (m) {
    const x = Math.min(m.x1, m.x2) * pxPerMm;
    const y = Math.min(m.y1, m.y2) * pxPerMm;
    const w = Math.abs(m.x2 - m.x1) * pxPerMm;
    const h = Math.abs(m.y2 - m.y1) * pxPerMm;
    targetCtx.fillStyle = "rgba(37, 99, 235, 0.08)";
    targetCtx.fillRect(x, y, w, h);
    targetCtx.setLineDash([4 * lw, 3 * lw]);
    targetCtx.lineWidth = 1 * lw;
    targetCtx.strokeRect(x, y, w, h);
  }
  targetCtx.restore();
}

function drawSelection(targetCtx, pxPerMm, opts = {}) {
  drawMultiSelection(targetCtx, pxPerMm, opts.lineScale || 1);

  const obj = getSelectedObject();
  if (!obj) return;

  const lw = opts.lineScale || 1;
  const handles = getHandleLocalPositions(obj, pxPerMm / lw);
  const s = pxPerMm;

  targetCtx.save();
  targetCtx.translate(obj.cx * s, obj.cy * s);
  targetCtx.rotate(obj.rot || 0);

  targetCtx.strokeStyle = "#2563eb";
  targetCtx.lineWidth = 1.5 * lw;
  targetCtx.strokeRect((-obj.w / 2) * s, (-obj.h / 2) * s, obj.w * s, obj.h * s);

  // 회전 핸들 연결선
  targetCtx.beginPath();
  targetCtx.moveTo(0, (-obj.h / 2) * s);
  targetCtx.lineTo(0, handles.rot.y * s);
  targetCtx.stroke();

  const hs = SELECTION_HANDLE_PX * lw;
  targetCtx.fillStyle = "#ffffff";
  ["nw", "ne", "se", "sw"].forEach((key) => {
    const h = handles[key];
    targetCtx.fillRect(h.x * s - hs / 2, h.y * s - hs / 2, hs, hs);
    targetCtx.strokeRect(h.x * s - hs / 2, h.y * s - hs / 2, hs, hs);
  });

  // 회전 핸들
  targetCtx.beginPath();
  targetCtx.arc(handles.rot.x * s, handles.rot.y * s, hs * 0.65, 0, Math.PI * 2);
  targetCtx.fillStyle = "#2563eb";
  targetCtx.fill();

  // 삭제 핸들
  const dr = (SELECTION_DELETE_PX / 2) * lw;
  const dx = handles.del.x * s;
  const dy = handles.del.y * s;
  targetCtx.beginPath();
  targetCtx.arc(dx, dy, dr, 0, Math.PI * 2);
  targetCtx.fillStyle = "#d92d20";
  targetCtx.fill();
  targetCtx.strokeStyle = "#ffffff";
  targetCtx.lineWidth = 2 * lw;
  const x = dr * 0.42;
  targetCtx.beginPath();
  targetCtx.moveTo(dx - x, dy - x);
  targetCtx.lineTo(dx + x, dy + x);
  targetCtx.moveTo(dx + x, dy - x);
  targetCtx.lineTo(dx - x, dy + x);
  targetCtx.stroke();

  targetCtx.restore();

  // 크기 라벨 (회전과 무관하게 항상 수평으로, 스티커 아래쪽에 표시)
  const b = getObjectBounds(obj);
  const label = `${mmToCmText(obj.w)} × ${mmToCmText(obj.h)} cm`;
  targetCtx.save();
  targetCtx.font = `700 ${12 * lw}px Pretendard, system-ui, sans-serif`;
  const tw = targetCtx.measureText(label).width;
  const padX = 7 * lw;
  const boxH = 20 * lw;
  const paperPxW = getPaper().w * s;
  const paperPxH = getPaper().h * s;
  let lx = ((b.minX + b.maxX) / 2) * s - tw / 2 - padX;
  let ly = b.maxY * s + 8 * lw;
  if (ly + boxH > paperPxH) ly = b.minY * s - boxH - 8 * lw;
  lx = clamp(lx, 2 * lw, paperPxW - tw - padX * 2 - 2 * lw);
  ly = clamp(ly, 2 * lw, paperPxH - boxH - 2 * lw);

  targetCtx.fillStyle = "rgba(17, 24, 39, 0.88)";
  if (typeof targetCtx.roundRect === "function") {
    targetCtx.beginPath();
    targetCtx.roundRect(lx, ly, tw + padX * 2, boxH, 6 * lw);
    targetCtx.fill();
  } else {
    targetCtx.fillRect(lx, ly, tw + padX * 2, boxH);
  }
  targetCtx.fillStyle = "#ffffff";
  targetCtx.textBaseline = "middle";
  targetCtx.fillText(label, lx + padX, ly + boxH / 2 + 0.5 * lw);
  targetCtx.restore();
}
