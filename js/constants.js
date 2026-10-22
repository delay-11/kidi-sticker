/* moved from js/common/constants.js */
/* =========================================================
 * 주문 확정 저장 키
========================================================= */
const CONFIRM_KEY_PREFIX = "design_confirmed_";

/* =========================================================
 * EmailJS 설정
========================================================= */
const COMPANY_EMAIL = "bbolcat@naver.com";
const EMAILJS_PUBLIC_KEY = "rzyGqBY1HaHCNyQCK";
const EMAILJS_SERVICE_ID = "service_kp5nyyt";

// 회사용 (시안 접수)
const EMAILJS_DESIGN_COMPANY_TEMPLATE_ID = "template_ndnu8z3";
// 고객용 (시안 접수 확인)
const EMAILJS_DESIGN_CUSTOMER_TEMPLATE_ID = "template_1mv0p2j";

/* =========================================================
 * 프로파일별 규격 옵션
========================================================= */
const CAP_OPTIONS = {
  OEM: [
    { value: "R4-1U", label: "R4-1U" },
    { value: "R4-2U", label: "R4-2U (Backspace)" },

    { value: "R1-1U", label: "R1-1U" },
    { value: "R1-1.25U", label: "R1-1.25U (Ctrl/Alt 등)" },
    { value: "R1-2.25U", label: "R1-2.25U (좌측 쉬프트)" },
    { value: "R1-2.75U", label: "R1-2.75U (우측 쉬프트)" },
    { value: "R1-6.25U", label: "R1-6.25U (스페이스바)" },

    { value: "R2-1U", label: "R2-1U" },
    { value: "R2-1U_HOMING", label: "R2-1U 돌기" },
    { value: "R2-1.75U", label: "R2-1.75U (Caps Lock)" },
    { value: "R2-2.25U", label: "R2-2.25U (Enter)" },

    { value: "R3-1U", label: "R3-1U" },
    { value: "R3-1.5U", label: "R3-1.5U (Tab/₩)" },

    { value: "NUM_0", label: "넘버패드 0" },
    { value: "NUM_PLUS", label: "넘버패드 +" },
    { value: "NUM_ENTER", label: "넘버패드 Enter" },
  ],
  XDA: [{ value: "XDA", label: "XDA" }],
  MAO: [{ value: "MAO", label: "MAO" }],
};

/* =========================================================
 * 품절 규격
========================================================= */
const SOLD_OUT_OPTIONS = {
  OEM: [],
  XDA: [],
  MAO: [],
};

/* =========================================================
 * 캔버스 크기
========================================================= */
const CANVAS_SIZE_MAP = {
  "R4-1U": { w: 330, h: 330 },
  "R4-2U": { w: 580, h: 367 },

  "R3-1U": { w: 330, h: 330 },
  "R3-1.5U": { w: 500, h: 355 },

  "R2-1U": { w: 330, h: 330 },
  "R2-1U_HOMING": { w: 330, h: 330 },
  "R2-1.75U": { w: 520, h: 332 },
  "R2-2.25U": { w: 640, h: 330 },

  "R1-1U": { w: 330, h: 330 },
  "R1-1.25U": { w: 396, h: 330 },
  "R1-2.25U": { w: 620, h: 360 },
  "R1-2.75U": { w: 752, h: 365 },
  "R1-6.25U": { w: 1559, h: 368 },

  "NUM_0": { w: 629, h: 364 },
  "NUM_PLUS": { w: 364, h: 629 },
  "NUM_ENTER": { w: 364, h: 629 },

  XDA: { w: 330, h: 330 },
  MAO: { w: 330, h: 330 },
  STD: { w: 330, h: 330 },
};

/* =========================================================
 * 가이드 크기
 * outer = 바깥 가이드선
 * inner = 안쪽 가이드선
 * safe  = 인쇄 안전선
========================================================= */
const GUIDE_SIZE_MAP = {
  "R4-1U": { outer: { w: 177, h: 175 }, inner: { w: 130, h: 140 }, safe: { w: 115, h: 125 } },
  "R4-2U": { outer: { w: 400, h: 175 }, inner: { w: 348, h: 140 }, safe: { w: 333, h: 125 } },

  "R3-1U": { outer: { w: 177, h: 175 }, inner: { w: 133, h: 145 }, safe: { w: 118, h: 130 } },
  "R3-1.5U": { outer: { w: 288, h: 174 }, inner: { w: 242, h: 144 }, safe: { w: 227, h: 129 } },

  "R2-1U": { outer: { w: 178, h: 175 }, inner: { w: 130, h: 147 }, safe: { w: 115, h: 132 } },
  "R2-1U_HOMING": { outer: { w: 178, h: 175 }, inner: { w: 130, h: 147 }, safe: { w: 115, h: 132 } },
  "R2-1.75U": { outer: { w: 343, h: 173 }, inner: { w: 297, h: 147 }, safe: { w: 282, h: 132 } },
  "R2-2.25U": { outer: { w: 453, h: 175 }, inner: { w: 409, h: 145 }, safe: { w: 394, h: 130 } },

  "R1-1U": { outer: { w: 176, h: 172 }, inner: { w: 130, h: 145 }, safe: { w: 115, h: 130 } },
  "R1-1.25U": { outer: { w: 232, h: 173 }, inner: { w: 187, h: 143 }, safe: { w: 172, h: 128 } },
  "R1-2.25U": { outer: { w: 455, h: 175 }, inner: { w: 407, h: 144 }, safe: { w: 392, h: 129 } },
  "R1-2.75U": { outer: { w: 564, h: 174 }, inner: { w: 514, h: 144 }, safe: { w: 499, h: 129 } },
  "R1-6.25U": { outer: { w: 1336, h: 177 }, inner: { w: 1282, h: 140 }, safe: { w: 1267, h: 125 } },

  "NUM_0": { outer: { w: 396, h: 173 }, inner: { w: 345, h: 142 }, safe: { w: 330, h: 127 } },
  "NUM_PLUS": { outer: { w: 175, h: 397 }, inner: { w: 132, h: 366 }, safe: { w: 117, h: 351 } },
  "NUM_ENTER": { outer: { w: 176, h: 395 }, inner: { w: 132, h: 365 }, safe: { w: 117, h: 350 } },

  XDA: { outer: { w: 180, h: 180 }, inner: { w: 150, h: 150 }, safe: { w: 135, h: 135 } },
  MAO: { outer: { w: 180, h: 180 }, inner: { w: 150, h: 150 }, safe: { w: 149.5, h: 149.5 } },
  STD: { outer: { w: 180, h: 180 }, inner: { w: 150, h: 150 }, safe: { w: 149.5, h: 149.5 } },
};
