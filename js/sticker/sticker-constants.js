/* =========================================================
 * UV DTF 스티커 시안 - 상수
 * - EmailJS 계정/서비스, 회사 메일 주소는 js/constants.js 공용 값을 사용
========================================================= */

/* =========================================================
 * 주문 확정 저장 키 (키캡 시안과 겹치지 않도록 별도 prefix)
========================================================= */
const STICKER_CONFIRM_KEY_PREFIX = "sticker_confirmed_";

/* =========================================================
 * EmailJS 템플릿
 * - 우선 키캡 시안과 같은 템플릿을 사용 (변수명 호환)
 * - 스티커 전용 템플릿을 만들면 여기 ID만 바꾸면 됨
========================================================= */
const STICKER_EMAILJS_COMPANY_TEMPLATE_ID = EMAILJS_DESIGN_COMPANY_TEMPLATE_ID;
const STICKER_EMAILJS_CUSTOMER_TEMPLATE_ID = EMAILJS_DESIGN_CUSTOMER_TEMPLATE_ID;

/* =========================================================
 * 용지 사이즈 (mm)
========================================================= */
const STICKER_PAPERS = {
  A3: { key: "A3", w: 297, h: 420 },
  A4: { key: "A4", w: 210, h: 297 },
  A5: { key: "A5", w: 148, h: 210 },
};

/* =========================================================
 * 인쇄 안전선 - 용지 사이즈와 무관하게 사방 2cm
========================================================= */
const STICKER_SAFE_MARGIN_MM = 20;

/* =========================================================
 * 스티커 크기 / 간격 기본값 (mm)
========================================================= */
const STICKER_DEFAULT_SIZE_MM = 50;
const STICKER_MIN_SIZE_MM = 5;
const STICKER_DEFAULT_GAP_MM = 3;

/* =========================================================
 * 업로드 제한
========================================================= */
const STICKER_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const STICKER_MAX_OBJECTS = 400;
const STICKER_HISTORY_LIMIT = 50;

/* =========================================================
 * 인쇄 해상도 안내 기준 (이보다 낮으면 흐릴 수 있다고 안내)
========================================================= */
const STICKER_LOW_DPI = 150;

/* =========================================================
 * 기본 스티커 그림
 * - image/stickers/ 폴더에 파일을 넣고 여기 한 줄 추가하면 메뉴에 표시됨
 * - sizeMm: 메뉴에서 눌렀을 때 배치되는 기본 가로 크기 (생략 시 STICKER_DEFAULT_SIZE_MM)
========================================================= */
const STICKER_LIBRARY = [
  { id: "heart", name: "하트", src: "./image/stickers/heart.svg" },
  { id: "star", name: "별", src: "./image/stickers/star.svg" },
  { id: "smile", name: "스마일", src: "./image/stickers/smile.svg" },
  { id: "cloud", name: "구름", src: "./image/stickers/cloud.svg" },
  { id: "flower", name: "꽃", src: "./image/stickers/flower.svg" },
  { id: "bolt", name: "번개", src: "./image/stickers/bolt.svg" },
];

/* =========================================================
 * 텍스트 폰트
 * - 폰트를 추가하려면 css/sticker.css에 @font-face를 넣고 여기 한 줄 추가
========================================================= */
const STICKER_TEXT_FONTS = [
  { id: "basic", label: "기본", family: "Pretendard", weight: 700 },
  { id: "bold", label: "굵게", family: "JalnanGothic", weight: 400 },
  { id: "round", label: "둥근", family: "Cafe24 Ssurround", weight: 400 },
  { id: "hand", label: "손글씨", family: "GriunMongtori", weight: 400 },
];

/* =========================================================
 * 텍스트 색상 (스포이드 없이 고르는 기본 팔레트)
========================================================= */
const STICKER_TEXT_COLORS = [
  "#111827", "#ffffff", "#6b7280", "#e5484d", "#ff8a3d", "#fdcc63",
  "#30a46c", "#0ea5e9", "#2563eb", "#7c5cff", "#ff5c9a", "#8b5a2b",
];

/* =========================================================
 * 메일 첨부 기준
 * - EmailJS 첨부 한도(2MB)보다 여유 있게 (js/email-send.js와 동일 기준)
 * - 미리보기 썸네일은 첨부가 아닌 본문 변수(50KB 제한)에 들어가므로 작게
========================================================= */
const STICKER_ATTACHMENT_MAX_BYTES = 1_600_000;
const STICKER_PREVIEW_MAX_BYTES = 30_000;
const STICKER_EXPORT_DPI_STEPS = [300, 240, 200, 150, 120, 100, 72, 50];
const STICKER_EXPORT_MAX_PIXELS = 16_000_000;
