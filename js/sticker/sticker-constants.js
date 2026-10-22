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
 * 이메일 입력 시 추천하는 도메인 (아이디를 입력하면 아래에 목록 표시)
========================================================= */
const STICKER_EMAIL_DOMAINS = ["naver.com", "hanmail.net", "daum.net", "gmail.com", "kakao.com", "nate.com"];

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
 * 기본 스티커 카테고리 (스티커 탭 위 버튼 순서)
========================================================= */
const STICKER_LIBRARY_CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "heart", label: "하트·표정" },
  { id: "animal", label: "동물" },
  { id: "fruit", label: "과일" },
  { id: "nature", label: "꽃·자연" },
  { id: "sports", label: "스포츠" },
  { id: "etc", label: "축하·기타" },
  { id: "shape", label: "선·도형" },
];

/* =========================================================
 * 기본 스티커 그림
 * - image/stickers/ 폴더에 파일을 넣고 여기 한 줄 추가하면 메뉴에 표시됨
 * - category: STICKER_LIBRARY_CATEGORIES의 id
 * - sizeMm: 메뉴에서 눌렀을 때 배치되는 기본 가로 크기 (생략 시 STICKER_DEFAULT_SIZE_MM)
 * - icons/ 폴더 PNG(512px)는 Flaticon 아이콘 - 출처/라이선스는 푸터와 files/flaticon-license.pdf
========================================================= */
const STICKER_LIBRARY = [
  { id: "hearts-pink", name: "하트 셋", category: "heart", src: "./image/stickers/icons/hearts-pink.png" },
  { id: "hearts-double", name: "겹하트", category: "heart", src: "./image/stickers/icons/hearts-double.png" },
  { id: "heart", name: "하트", category: "heart", src: "./image/stickers/icons/heart.png" },
  { id: "face-smile", name: "미소", category: "heart", src: "./image/stickers/icons/face-smile.png" },
  { id: "face-wink", name: "윙크", category: "heart", src: "./image/stickers/icons/face-wink.png" },
  { id: "face-delight", name: "신남", category: "heart", src: "./image/stickers/icons/face-delight.png" },
  { id: "face-happy", name: "활짝", category: "heart", src: "./image/stickers/icons/face-happy.png" },
  { id: "face-love", name: "하트 눈", category: "heart", src: "./image/stickers/icons/face-love.png" },
  { id: "like", name: "좋아요", category: "heart", src: "./image/stickers/icons/like.png" },
  { id: "dino-pink", name: "분홍 공룡", category: "animal", src: "./image/stickers/icons/dino-pink.png" },
  { id: "dino-longneck", name: "목긴 공룡", category: "animal", src: "./image/stickers/icons/dino-longneck.png" },
  { id: "elasmosaurus", name: "수장룡", category: "animal", src: "./image/stickers/icons/elasmosaurus.png" },
  { id: "giraffe", name: "기린", category: "animal", src: "./image/stickers/icons/giraffe.png" },
  { id: "dolphin", name: "돌고래", category: "animal", src: "./image/stickers/icons/dolphin.png" },
  { id: "monkey", name: "원숭이", category: "animal", src: "./image/stickers/icons/monkey.png" },
  { id: "sheep", name: "양", category: "animal", src: "./image/stickers/icons/sheep.png" },
  { id: "elephant", name: "코끼리", category: "animal", src: "./image/stickers/icons/elephant.png" },
  { id: "paw", name: "발바닥", category: "animal", src: "./image/stickers/icons/paw.png" },
  { id: "bear", name: "곰", category: "animal", src: "./image/stickers/icons/bear.png" },
  { id: "rabbit", name: "토끼", category: "animal", src: "./image/stickers/icons/rabbit.png" },
  { id: "corgi", name: "강아지", category: "animal", src: "./image/stickers/icons/corgi.png" },
  { id: "penguin", name: "펭귄", category: "animal", src: "./image/stickers/icons/penguin.png" },
  { id: "cat", name: "고양이", category: "animal", src: "./image/stickers/icons/cat.png" },
  { id: "orange", name: "오렌지", category: "fruit", src: "./image/stickers/icons/orange.png" },
  { id: "cherry", name: "체리", category: "fruit", src: "./image/stickers/icons/cherry.png" },
  { id: "grapes", name: "포도", category: "fruit", src: "./image/stickers/icons/grapes.png" },
  { id: "tomato", name: "토마토", category: "fruit", src: "./image/stickers/icons/tomato.png" },
  { id: "apple", name: "사과", category: "fruit", src: "./image/stickers/icons/apple.png" },
  { id: "blueberry", name: "블루베리", category: "fruit", src: "./image/stickers/icons/blueberry.png" },
  { id: "lemon", name: "레몬", category: "fruit", src: "./image/stickers/icons/lemon.png" },
  { id: "banana", name: "바나나", category: "fruit", src: "./image/stickers/icons/banana.png" },
  { id: "strawberry", name: "딸기", category: "fruit", src: "./image/stickers/icons/strawberry.png" },
  { id: "moon-cloud", name: "달과 구름", category: "nature", src: "./image/stickers/icons/moon-cloud.png" },
  { id: "mountain", name: "산", category: "nature", src: "./image/stickers/icons/mountain.png" },
  { id: "flower-yellow", name: "노란 꽃", category: "nature", src: "./image/stickers/icons/flower-yellow.png" },
  { id: "flower-pink", name: "분홍 꽃", category: "nature", src: "./image/stickers/icons/flower-pink.png" },
  { id: "daisy", name: "데이지", category: "nature", src: "./image/stickers/icons/daisy.png" },
  { id: "sprout", name: "새싹", category: "nature", src: "./image/stickers/icons/sprout.png" },
  { id: "cloud", name: "구름", category: "nature", src: "./image/stickers/icons/cloud.png" },
  { id: "moon", name: "달", category: "nature", src: "./image/stickers/icons/moon.png" },
  { id: "sun", name: "해", category: "nature", src: "./image/stickers/icons/sun.png" },
  { id: "star", name: "별", category: "nature", src: "./image/stickers/icons/star.png" },
  { id: "shooting-star", name: "별똥별", category: "nature", src: "./image/stickers/icons/shooting-star.png" },
  { id: "clover", name: "네잎클로버", category: "nature", src: "./image/stickers/icons/clover.png" },
  { id: "clover-green", name: "초록 클로버", category: "nature", src: "./image/stickers/icons/clover-green.png" },
  { id: "tulip", name: "튤립", category: "nature", src: "./image/stickers/icons/tulip.png" },
  { id: "soccer", name: "축구", category: "sports", src: "./image/stickers/icons/soccer.png" },
  { id: "basketball", name: "농구", category: "sports", src: "./image/stickers/icons/basketball.png" },
  { id: "baseball", name: "야구", category: "sports", src: "./image/stickers/icons/baseball.png" },
  { id: "badminton", name: "배드민턴", category: "sports", src: "./image/stickers/icons/badminton.png" },
  { id: "tennis", name: "테니스", category: "sports", src: "./image/stickers/icons/tennis.png" },
  { id: "volleyball", name: "배구", category: "sports", src: "./image/stickers/icons/volleyball.png" },
  { id: "running", name: "달리기", category: "sports", src: "./image/stickers/icons/running.png" },
  { id: "dumbbell", name: "아령", category: "sports", src: "./image/stickers/icons/dumbbell.png" },
  { id: "yoga", name: "요가", category: "sports", src: "./image/stickers/icons/yoga.png" },
  { id: "swimming", name: "수영", category: "sports", src: "./image/stickers/icons/swimming.png" },
  { id: "pingpong", name: "탁구", category: "sports", src: "./image/stickers/icons/pingpong.png" },
  { id: "boxing", name: "복싱 글러브", category: "sports", src: "./image/stickers/icons/boxing.png" },
  { id: "ski", name: "스키", category: "sports", src: "./image/stickers/icons/ski.png" },
  { id: "billiards", name: "당구", category: "sports", src: "./image/stickers/icons/billiards.png" },
  { id: "golf", name: "골프", category: "sports", src: "./image/stickers/icons/golf.png" },
  { id: "car-red", name: "빨간 자동차", category: "etc", src: "./image/stickers/icons/car-red.png" },
  { id: "car-blue", name: "파란 자동차", category: "etc", src: "./image/stickers/icons/car-blue.png" },
  { id: "fireworks", name: "불꽃놀이", category: "etc", src: "./image/stickers/icons/fireworks.png" },
  { id: "confetti", name: "컨페티", category: "etc", src: "./image/stickers/icons/confetti.png" },
  { id: "party-popper", name: "폭죽", category: "etc", src: "./image/stickers/icons/party-popper.png" },
  { id: "sparkles", name: "반짝이", category: "etc", src: "./image/stickers/icons/sparkles.png" },
  { id: "flag-korea", name: "태극기", category: "etc", src: "./image/stickers/icons/flag-korea.png" },
  { id: "ribbon-red", name: "빨간 리본", category: "etc", src: "./image/stickers/icons/ribbon-red.png" },
  { id: "ribbon-pink", name: "분홍 리본", category: "etc", src: "./image/stickers/icons/ribbon-pink.png" },
  { id: "line-solid", name: "실선", category: "shape", src: "./image/stickers/line-solid.svg", sizeMm: 100 },
  { id: "line-dashed", name: "점선", category: "shape", src: "./image/stickers/line-dashed.svg", sizeMm: 100 },
  { id: "line-dotted", name: "도트 점선", category: "shape", src: "./image/stickers/line-dotted.svg", sizeMm: 100 },
  { id: "arrow", name: "화살표", category: "shape", src: "./image/stickers/arrow.svg", sizeMm: 100 },
  { id: "circle", name: "원", category: "shape", src: "./image/stickers/circle.svg" },
  { id: "square", name: "네모", category: "shape", src: "./image/stickers/square.svg" },
];

/* =========================================================
 * 텍스트 폰트
 * - 폰트를 추가하려면 css/sticker.css에 @font-face를 넣고 여기 한 줄 추가
========================================================= */
const STICKER_TEXT_FONTS = [
  { id: "basic", label: "기본", family: "StkPretendardMedium", weight: 400 },
  { id: "bold", label: "굵게", family: "KOHIBaeum", weight: 400 },
  { id: "round", label: "둥근", family: "BMJUA", weight: 400 },
  { id: "hand", label: "손글씨", family: "GriunCocochoitoon", weight: 400 },
];

/* =========================================================
 * 새 텍스트 기본 글자 높이 (mm) - 추가한 뒤에는 캔버스에서 크기 조절
========================================================= */
const STICKER_TEXT_HEIGHT_MM = 15;

/* =========================================================
 * 텍스트 색상 (스포이드 없이 고르는 기본 팔레트)
========================================================= */
const STICKER_TEXT_COLORS = [
  "#111827", "#ffffff", "#6b7280", "#e5484d", "#9f1239", "#ff8a3d", "#fdcc63",
  "#30a46c", "#14b8a6", "#0ea5e9", "#2563eb", "#7c5cff", "#ff5c9a", "#8b5a2b",
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
