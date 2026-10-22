/* =========================================================
 * UV DTF 스티커 시안 - 주문정보 / 용지 선택 / 단계 이동
========================================================= */
function byId(id) {
  return document.getElementById(id);
}

/* =========================================================
 * 주문자 정보
========================================================= */
const nameEl = byId("name");
const phoneEl = byId("phone");
const orderEl = byId("orderNo");
const emailEl = byId("email");
const paperOptionsEl = byId("paperOptions");
const paperErrEl = byId("paperErr");

// js/utils.js 공용 함수(setFormNotice / setCanvasNotice / setMsg)가 참조하는 요소
const formNoticeEl = byId("formNotice");
const canvasNoticeEl = null;
const msgEl = null;
const okEl = null;

const formReadyBoxEl = byId("formReadyBox");
const formReadyTitleEl = byId("formReadyTitle");
const formReadyDescEl = byId("formReadyDesc");

/* =========================================================
 * 상단 오더바 / 단계 버튼
========================================================= */
const orderBarNoEl = byId("orderBarNo");
const draftPaperEl = byId("draftPaper");
const btnGoEditorEl = byId("btnGoEditor");
const btnBackInfoEl = byId("btnBackInfo");
const btnGoConfirmEl = byId("btnGoConfirm");
const btnBackEditorEl = byId("btnBackEditor");
const btnConfirmEl = byId("btnConfirm");
const stepChipEls = Array.from(document.querySelectorAll("[data-step-chip]"));

let currentStep = "info";

/* =========================================================
 * URL 주문번호 고정 (?order=123)
========================================================= */
function getOrderFromUrl() {
  try {
    const sp = new URLSearchParams(location.search);
    return safeTrim(sp.get("order") || "").replace(/[^0-9]/g, "");
  } catch {
    return "";
  }
}

function getOrderNo() {
  return safeTrim(orderEl?.value);
}

/* =========================================================
 * 용지 선택 라디오 (원형 체크)
 * - 1단계 주문정보 / 제작 화면 용지 변경 모달에서 같은 마크업 사용
========================================================= */
function renderPaperOptions(containerEl, name, selectedKey) {
  if (!containerEl) return;

  containerEl.innerHTML = Object.values(STICKER_PAPERS)
    .map((paper) => {
      const checked = paper.key === selectedKey ? "checked" : "";
      return `
        <label class="stkPaperOption">
          <input type="radio" name="${name}" value="${paper.key}" ${checked} />
          <span class="stkRadioDot" aria-hidden="true"></span>
          <span class="stkPaperShape" aria-hidden="true" style="aspect-ratio:${paper.w} / ${paper.h};"></span>
          <span class="stkPaperText">
            <b>${paper.key}</b>
            <small>${mmToCmText(paper.w)} × ${mmToCmText(paper.h)}cm</small>
          </span>
        </label>
      `;
    })
    .join("");
}

function getCheckedPaper(containerEl) {
  return containerEl?.querySelector("input[type=radio]:checked")?.value || "";
}

function setPaperError(message = "") {
  if (!paperErrEl) return;
  paperErrEl.textContent = message;
  paperErrEl.classList.toggle("show", !!message);
  paperOptionsEl?.classList.toggle("isInvalid", !!message);
}

/* =========================================================
 * 필드 에러 표시 (키캡 페이지와 같은 .fieldErr 스타일)
========================================================= */
function ensureFieldErrorBox(inputEl, key) {
  const wrap = inputEl?.parentElement;
  if (!wrap) return null;

  let box = wrap.querySelector(`.fieldErr[data-err="${key}"]`);
  if (box) return box;

  box = document.createElement("div");
  box.className = "fieldErr";
  box.dataset.err = key;
  wrap.appendChild(box);
  return box;
}

const orderFields = {
  name: nameEl,
  phone: phoneEl,
  order: orderEl,
  email: emailEl,
};

const fieldErrBoxes = Object.fromEntries(
  Object.entries(orderFields).map(([key, el]) => [key, ensureFieldErrorBox(el, key)]),
);

function setFieldError(key, message) {
  const box = fieldErrBoxes[key];
  const inputEl = orderFields[key];
  if (!box) return;

  box.textContent = message || "";
  box.classList.toggle("show", !!message);
  inputEl?.classList.toggle("inputInvalid", !!message);
}

/* =========================================================
 * 주문정보 검증
========================================================= */
function validateCustomerInfo(showMessage = false) {
  const name = safeTrim(nameEl?.value);
  const phone = safeTrim(phoneEl?.value);
  const orderNo = getOrderNo();
  const email = safeTrim(emailEl?.value);

  const errors = {
    name: name ? "" : "주문자명을 입력해주세요.",
    phone: PHONE_RE.test(phone) ? "" : "핸드폰 번호 형식이 올바르지 않습니다. (예: 01012345678)",
    order: orderNo ? "" : "주문번호를 입력해주세요.",
    email: EMAIL_RE.test(email) ? "" : "이메일 형식이 올바르지 않습니다.",
  };

  const ok = Object.values(errors).every((v) => !v);

  if (showMessage) {
    Object.entries(errors).forEach(([key, message]) => setFieldError(key, message));
  }

  return ok;
}

function validateOrderInfo(showMessage = false) {
  const customerOk = validateCustomerInfo(showMessage);
  const paperOk = !!STICKER_PAPERS[stickerState.paper];

  if (showMessage) {
    setPaperError(paperOk ? "" : "용지 사이즈를 선택해주세요.");
    setFormNotice(customerOk && paperOk ? "" : "필수 정보를 입력해주세요.", customerOk && paperOk ? "" : "error");
  }

  return customerOk && paperOk;
}

/* =========================================================
 * 안내 박스 / 오더바 갱신
========================================================= */
function updateFormReadyState() {
  if (!formReadyBoxEl || !formReadyTitleEl || !formReadyDescEl) return;

  const customerOk = validateCustomerInfo(false);
  const paperOk = !!STICKER_PAPERS[stickerState.paper];
  const ready = customerOk && paperOk;

  formReadyBoxEl.classList.toggle("is-ready", ready);

  if (!customerOk) {
    formReadyTitleEl.textContent = "주문자 정보 입력이 필요합니다.";
    formReadyDescEl.textContent = "주문자명, 연락처, 주문번호, 이메일을 모두 입력해주세요.";
  } else if (!paperOk) {
    formReadyTitleEl.textContent = "구매하신 용지 사이즈를 선택하세요";
    formReadyDescEl.textContent = "";
  } else {
    formReadyTitleEl.textContent = "다음을 눌러 시안을 제작해 주세요";
    formReadyDescEl.textContent = "";
  }
}

function updateDraftInfo() {
  if (orderBarNoEl) orderBarNoEl.textContent = getOrderNo() || "-";
  if (draftPaperEl) {
    draftPaperEl.textContent = STICKER_PAPERS[stickerState.paper]
      ? `용지 ${getPaperLabel()}`
      : "용지 미선택";
  }
}

/* =========================================================
 * 단계 이동
========================================================= */
function hasAnySticker() {
  return stickerState.objects.length > 0;
}

function updateStepButtons() {
  const infoOk = validateOrderInfo(false);
  if (btnGoEditorEl) btnGoEditorEl.disabled = stickerState.locked || !infoOk;
  if (btnGoConfirmEl) btnGoConfirmEl.disabled = stickerState.locked || !hasAnySticker();
  if (btnConfirmEl) btnConfirmEl.disabled = stickerState.locked || !hasAnySticker() || !infoOk;
}

// 시안 확인 단계로 넘어갈 수 있는지 (스티커 1개 이상 + 전부 안전선 안)
function validateCanConfirm(showMessage = false) {
  if (!validateOrderInfo(showMessage)) {
    if (showMessage) setDesignStep("info");
    return false;
  }

  if (!hasAnySticker()) {
    if (showMessage) showToast("스티커를 1개 이상 배치해주세요.", "warn");
    return false;
  }

  const outCount = getOutOfSafeObjects().length;
  if (outCount) {
    if (showMessage) {
      showToast(`인쇄 안전선 밖으로 나간 스티커가 ${outCount}개 있어요. 빨간 테두리 스티커를 안쪽으로 옮겨주세요.`, "warn", 3200);
    }
    return false;
  }

  return true;
}

function setDesignStep(step) {
  const nextStep = ["info", "editor", "confirm"].includes(step) ? step : "info";
  currentStep = nextStep;
  document.body.dataset.step = nextStep;

  stepChipEls.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.stepChip === nextStep);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (nextStep === "editor") onEditorShown?.();
  if (nextStep === "confirm") renderConfirmStep?.();

  updateStepButtons();
}

function goToStep(step) {
  if (stickerState.locked) return;

  if (step === "info") {
    setDesignStep("info");
    return;
  }

  if (!validateOrderInfo(true)) {
    setDesignStep("info");
    return;
  }

  if (step === "editor") {
    setDesignStep("editor");
    return;
  }

  if (step === "confirm" && validateCanConfirm(true)) {
    stickerState.selectedId = null;
    setDesignStep("confirm");
  }
}

function bindStepEvents() {
  btnGoEditorEl?.addEventListener("click", () => goToStep("editor"));
  btnBackInfoEl?.addEventListener("click", () => goToStep("info"));
  btnGoConfirmEl?.addEventListener("click", () => goToStep("confirm"));
  btnBackEditorEl?.addEventListener("click", () => goToStep("editor"));

  stepChipEls.forEach((chip) => {
    chip.addEventListener("click", () => goToStep(chip.dataset.stepChip));
  });
}

/* =========================================================
 * 용지 사이즈 변경
 * - 배치한 스티커는 용지 중앙 기준으로 같은 상대 위치를 유지
========================================================= */
function applyPaper(key) {
  if (!STICKER_PAPERS[key]) return;

  const prev = STICKER_PAPERS[stickerState.paper];
  const next = STICKER_PAPERS[key];

  if (prev && prev.key !== next.key) {
    const dx = (next.w - prev.w) / 2;
    const dy = (next.h - prev.h) / 2;
    stickerState.objects.forEach((obj) => {
      obj.cx += dx;
      obj.cy += dy;
    });
  }

  stickerState.paper = key;

  paperOptionsEl?.querySelectorAll("input[type=radio]").forEach((input) => {
    input.checked = input.value === key;
  });

  setPaperError("");
  updateDraftInfo();
  updateFormReadyState();
  onPaperChanged?.();
  updateStepButtons();
}

/* =========================================================
 * 입력 이벤트
========================================================= */
function bindOrderEvents() {
  orderEl?.addEventListener("input", () => {
    if (orderEl.readOnly) return;
    orderEl.value = orderEl.value.replace(/[^0-9]/g, "");
  });

  phoneEl?.addEventListener("input", () => {
    phoneEl.value = phoneEl.value.replace(/[^0-9]/g, "").slice(0, 11);
  });

  Object.entries(orderFields).forEach(([key, el]) => {
    el?.addEventListener("input", () => {
      if (stickerState.locked && el !== orderEl) return;
      setFieldError(key, "");
      clearFormNotice();
      updateFormReadyState();
      updateDraftInfo();
      updateStepButtons();
    });

    // 입력한 값이 있을 때만 형식 오류를 바로 보여줌 (빈 칸은 다음 버튼에서 안내)
    el?.addEventListener("blur", () => {
      if (el === orderEl) applyConfirmedLockIfNeeded(true);
      if (!safeTrim(el.value)) return;

      if (key === "phone" && !PHONE_RE.test(safeTrim(el.value))) {
        setFieldError(key, "핸드폰 번호 형식이 올바르지 않습니다. (예: 01012345678)");
      }
      if (key === "email" && !EMAIL_RE.test(safeTrim(el.value))) {
        setFieldError(key, "이메일 형식이 올바르지 않습니다.");
      }
    });
  });

  paperOptionsEl?.addEventListener("change", () => {
    if (stickerState.locked) return;
    applyPaper(getCheckedPaper(paperOptionsEl));
  });
}

/* =========================================================
 * 접수 완료 주문 잠금 (주문번호 기준, 키캡 시안과 별도 저장)
========================================================= */
function stickerConfirmKey(orderNo) {
  return STICKER_CONFIRM_KEY_PREFIX + safeTrim(orderNo);
}

function isStickerOrderConfirmed(orderNo) {
  if (!safeTrim(orderNo)) return false;
  try {
    return localStorage.getItem(stickerConfirmKey(orderNo)) === "true";
  } catch {
    return false;
  }
}

function markStickerOrderConfirmed(orderNo) {
  if (!safeTrim(orderNo)) return;
  try {
    localStorage.setItem(stickerConfirmKey(orderNo), "true");
  } catch {
    // 저장 실패는 접수 자체에는 영향 없음
  }
}

function setAllLocked(locked) {
  stickerState.locked = !!locked;
  document.body.classList.toggle("isStickerLocked", stickerState.locked);

  document
    .querySelectorAll(".stickerPage input, .stickerPage textarea, .stickerPage .stkEditorCard button, #btnGoEditor, #btnGoConfirm, #btnConfirm")
    .forEach((el) => {
      if (el === orderEl) return;
      el.disabled = stickerState.locked;
    });

  if (!stickerState.locked) {
    syncEditorControls?.();
    updateStepButtons();
  }
}

let didConfirmedPopup = false;

function applyConfirmedLockIfNeeded(showPopup = false) {
  const locked = isStickerOrderConfirmed(getOrderNo());

  if (!locked) {
    if (stickerState.locked) setAllLocked(false);
    didConfirmedPopup = false;
    return false;
  }

  setAllLocked(true);

  if (showPopup && !didConfirmedPopup) {
    didConfirmedPopup = true;
    openNoticeModal(
      `시안 접수가 완료되었습니다.

이메일을 확인하시면 확정 안내 메일과
접수된 시안을 확인하실 수 있습니다.`,
      "접수 완료 주문",
    );
  }

  return true;
}
