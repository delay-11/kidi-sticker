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
    return safeTrim(sp.get("order") || "").replace(/[^0-9]/g, "").slice(0, STICKER_ORDER_NO_MAX);
  } catch {
    return "";
  }
}

function getOrderNo() {
  return safeTrim(orderEl?.value);
}

/* =========================================================
 * 용지별 수량 (- / + 버튼) + 시안 방식(같은 시안 / 장마다 다른 시안)
========================================================= */
const designModeBoxEl = byId("designModeBox");
const designModeNoteEl = byId("designModeNote");

function renderPaperOptions(containerEl) {
  if (!containerEl) return;

  containerEl.innerHTML = Object.values(STICKER_PAPERS)
    .map(
      (paper) => `
        <div class="stkPaperOption" data-paper="${paper.key}">
          <span class="stkPaperShape" aria-hidden="true" style="aspect-ratio:${paper.w} / ${paper.h};"></span>
          <span class="stkPaperText">
            <b>${paper.key}</b>
            <small>${mmToCmText(paper.w)} × ${mmToCmText(paper.h)}cm</small>
          </span>
          <div class="stkQty">
            <button aria-label="${paper.key} 한 장 빼기" class="stkQtyBtn" data-qty-step="-1" type="button">−</button>
            <b aria-live="polite" class="stkQtyNum">0</b>
            <button aria-label="${paper.key} 한 장 더하기" class="stkQtyBtn" data-qty-step="1" type="button">+</button>
          </div>
        </div>
      `,
    )
    .join("");
}

function syncPaperOptions() {
  const total = getTotalQty();

  paperOptionsEl?.querySelectorAll("[data-paper]").forEach((el) => {
    const n = stickerState.order.qty[el.dataset.paper] || 0;
    el.classList.toggle("is-on", n > 0);
    el.querySelector(".stkQtyNum").textContent = n;
    el.querySelector('[data-qty-step="-1"]').disabled = stickerState.locked || n <= 0;
    el.querySelector('[data-qty-step="1"]').disabled = stickerState.locked || total >= STICKER_MAX_SHEETS;
  });

  // 2장 이상일 때만 시안 방식 선택 (용지가 섞이면 장마다 다른 시안만 가능)
  if (designModeBoxEl) designModeBoxEl.hidden = total < 2;
  const sameOk = canUseSameDesign();
  designModeBoxEl?.querySelectorAll("input[name=designMode]").forEach((input) => {
    input.checked = input.value === (isSameDesign() ? "same" : "each");
    if (input.value === "same") input.disabled = stickerState.locked || !sameOk;
    else input.disabled = stickerState.locked;
  });
  if (designModeNoteEl) designModeNoteEl.hidden = sameOk || total < 2;
}

// 수량 / 시안 방식을 바꾸고 시안 목록을 다시 맞춤 (확인이 필요하면 묻고 진행)
function changeOrderOptions(nextQty, nextMode) {
  if (stickerState.locked) return;

  const prev = { qty: { ...stickerState.order.qty }, mode: stickerState.order.mode };
  const wasSame = isSameDesign();

  stickerState.order.qty = nextQty;
  stickerState.order.mode = nextMode;
  const lost = countSheetsLost(wasSame);
  stickerState.order.qty = prev.qty;
  stickerState.order.mode = prev.mode;

  const run = () => {
    stickerState.order.qty = nextQty;
    stickerState.order.mode = nextMode;
    rebuildSheets({ wasSame });
    onOrderOptionsChanged();
  };

  if (!lost) {
    run();
    return;
  }

  askConfirm(`스티커를 배치한 시안 ${lost}개가 지워집니다. 계속할까요?`, "수량 변경").then((ok) => {
    if (ok) run();
    else syncPaperOptions();
  });
}

function stepPaperQty(key, step) {
  const qty = { ...stickerState.order.qty };
  const next = Math.max(0, (qty[key] || 0) + step);
  if (step > 0 && getTotalQty() >= STICKER_MAX_SHEETS) {
    showToast(`한 번에 최대 ${STICKER_MAX_SHEETS}장까지 주문할 수 있어요.`, "warn", 2400);
    return;
  }
  qty[key] = next;
  changeOrderOptions(qty, stickerState.order.mode);
}

// 새로고침 복원용 - 묻지 않고 바로 적용
function applyOrderOptions(qty, mode) {
  Object.keys(stickerState.order.qty).forEach((key) => {
    stickerState.order.qty[key] = Math.max(0, Math.min(STICKER_MAX_SHEETS, Number(qty?.[key]) || 0));
  });
  stickerState.order.mode = mode === "each" ? "each" : "same";
  rebuildSheets();
  onOrderOptionsChanged();
}

function onOrderOptionsChanged() {
  setPaperError("");
  syncPaperOptions();
  updateDraftInfo();
  updateFormReadyState();
  onSheetsChanged?.();
  updateStepButtons();
  saveOrderInfo();
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
  const paperOk = getTotalQty() > 0;

  if (showMessage) {
    setPaperError(paperOk ? "" : "용지 사이즈와 수량을 선택해주세요.");
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
  const paperOk = getTotalQty() > 0;
  const ready = customerOk && paperOk;

  formReadyBoxEl.classList.toggle("is-ready", ready);

  if (!customerOk) {
    formReadyTitleEl.textContent = "주문자 정보 입력이 필요합니다.";
    formReadyDescEl.textContent = "주문자명, 연락처, 주문번호, 이메일을 모두 입력해주세요.";
  } else if (!paperOk) {
    formReadyTitleEl.textContent = "구매하신 용지 사이즈와 수량을 선택하세요";
    formReadyDescEl.textContent = "";
  } else {
    formReadyTitleEl.textContent = "다음을 눌러 시안을 제작해 주세요";
    formReadyDescEl.textContent = "";
  }
}

function updateDraftInfo() {
  if (orderBarNoEl) orderBarNoEl.textContent = getOrderNo() || "-";
  if (draftPaperEl) {
    draftPaperEl.textContent = getTotalQty() ? `용지 ${getQtySummary()}` : "용지 미선택";
  }
}

/* =========================================================
 * 단계 이동
========================================================= */
function hasAnySticker() {
  return getAllSheets().some(sheetHasStickers);
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

  // 시안마다 스티커 1개 이상 + 전부 안전선 안 (문제가 있는 장으로 바로 이동해서 안내)
  const sheets = getAllSheets();
  const multi = sheets.length > 1;

  for (let i = 0; i < sheets.length; i += 1) {
    const where = multi ? `${i + 1}장(${sheets[i].paper})에 ` : "";

    if (!sheetHasStickers(sheets[i])) {
      if (showMessage) {
        if (multi) switchSheet(i);
        showToast(`${where}스티커를 1개 이상 배치해주세요.`, "warn");
      }
      return false;
    }

    const outCount = withSheet(sheets[i], () => getOutOfSafeObjects().length);
    if (outCount) {
      if (showMessage) {
        if (multi) switchSheet(i);
        showToast(`${where}인쇄 안전선 밖으로 나간 스티커가 ${outCount}개 있어요. 빨간 테두리 스티커를 안쪽으로 옮겨주세요.`, "warn", 3200);
      }
      return false;
    }
  }

  return true;
}

function setDesignStep(step) {
  const nextStep = ["info", "editor", "confirm"].includes(step) ? step : "info";
  currentStep = nextStep;
  document.body.dataset.step = nextStep;
  saveDraftStep(nextStep);

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

  bindStickyStepBar();
}

/* =========================================================
 * 이전 / 다음 단계 바 - 상단에 붙었을 때만 배경 표시
 * (평소에는 페이지 배경 그대로 두어 박스가 떠 보이지 않게)
========================================================= */
const stepBarEls = Array.from(document.querySelectorAll(".stepPageHeader"));

function syncStickyStepBar() {
  const scrolled = window.scrollY > 0;
  stepBarEls.forEach((el) => {
    el.classList.toggle("is-stuck", scrolled && el.getBoundingClientRect().top <= 0.5);
  });
}

function bindStickyStepBar() {
  window.addEventListener("scroll", syncStickyStepBar, { passive: true });
  window.addEventListener("resize", syncStickyStepBar);
  syncStickyStepBar();
}

/* =========================================================
 * 이메일 도메인 추천 (@naver.com, @hanmail.net ...)
 * - 아이디만 입력해도 목록이 뜨고, @ 뒤를 일부 입력하면 맞는 도메인만 표시
========================================================= */
const emailSuggestEl = byId("emailSuggest");
let emailSuggestItems = [];
let emailSuggestIndex = -1;

function getEmailSuggestions(value) {
  const v = safeTrim(value);
  const at = v.indexOf("@");
  const local = at < 0 ? v : v.slice(0, at);
  const typed = at < 0 ? "" : v.slice(at + 1).toLowerCase();
  if (!local || /\s/.test(v) || typed.includes("@")) return [];

  return STICKER_EMAIL_DOMAINS.filter((d) => d.startsWith(typed) && d !== typed).map((d) => `${local}@${d}`);
}

function hideEmailSuggest() {
  emailSuggestItems = [];
  emailSuggestIndex = -1;
  if (emailSuggestEl) {
    emailSuggestEl.hidden = true;
    emailSuggestEl.innerHTML = "";
  }
  emailEl?.removeAttribute("aria-activedescendant");
}

function renderEmailSuggest() {
  if (!emailSuggestEl || !emailEl || stickerState.locked) return;

  emailSuggestItems = getEmailSuggestions(emailEl.value);
  emailSuggestIndex = -1;
  if (!emailSuggestItems.length || document.activeElement !== emailEl) {
    hideEmailSuggest();
    return;
  }

  emailSuggestEl.innerHTML = emailSuggestItems
    .map((item, i) => {
      const [local, domain] = item.split("@");
      return `<button class="stkEmailOption" data-index="${i}" id="emailSuggest_${i}" role="option" tabindex="-1" type="button">${escapeHtml(local)}<b>@${escapeHtml(domain)}</b></button>`;
    })
    .join("");
  emailSuggestEl.hidden = false;
}

function highlightEmailSuggest(index) {
  emailSuggestIndex = index;
  emailSuggestEl?.querySelectorAll(".stkEmailOption").forEach((el, i) => {
    el.classList.toggle("is-active", i === index);
    el.setAttribute("aria-selected", String(i === index));
  });
  if (index >= 0) emailEl?.setAttribute("aria-activedescendant", `emailSuggest_${index}`);
}

function applyEmailSuggest(index) {
  const value = emailSuggestItems[index];
  if (!value || !emailEl) return;
  emailEl.value = value;
  hideEmailSuggest();
  emailEl.dispatchEvent(new Event("input", { bubbles: true }));
}

function bindEmailSuggest() {
  if (!emailEl || !emailSuggestEl) return;

  emailEl.addEventListener("input", renderEmailSuggest);
  emailEl.addEventListener("focus", renderEmailSuggest);
  emailEl.addEventListener("blur", hideEmailSuggest);

  emailEl.addEventListener("keydown", (e) => {
    if (emailSuggestEl.hidden) return;
    const n = emailSuggestItems.length;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      highlightEmailSuggest((emailSuggestIndex + step + n) % n);
    } else if (e.key === "Enter" && emailSuggestIndex >= 0) {
      e.preventDefault();
      applyEmailSuggest(emailSuggestIndex);
    } else if (e.key === "Escape") {
      hideEmailSuggest();
    }
  });

  // 목록을 눌러도 입력칸 포커스가 빠지지 않게 (blur로 목록이 먼저 닫히는 것 방지)
  emailSuggestEl.addEventListener("mousedown", (e) => e.preventDefault());
  emailSuggestEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-index]");
    if (btn) applyEmailSuggest(Number(btn.dataset.index));
  });
}

/* =========================================================
 * 입력 이벤트
========================================================= */
function bindOrderEvents() {
  orderEl?.addEventListener("input", () => {
    if (orderEl.readOnly) return;
    orderEl.value = orderEl.value.replace(/[^0-9]/g, "").slice(0, STICKER_ORDER_NO_MAX);
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
      saveOrderInfo();
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

  paperOptionsEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-qty-step]");
    if (!btn || stickerState.locked) return;
    stepPaperQty(btn.closest("[data-paper]").dataset.paper, Number(btn.dataset.qtyStep));
  });

  designModeBoxEl?.addEventListener("change", (e) => {
    if (e.target.name !== "designMode" || stickerState.locked) return;
    changeOrderOptions({ ...stickerState.order.qty }, e.target.value);
  });

  bindEmailSuggest();
}

/* =========================================================
 * 주문정보 임시 저장 - 새로고침해도 입력한 주문정보 / 용지가 유지되도록
 * - sessionStorage라 탭을 닫으면 사라짐 (같은 기기의 다른 손님에게 남지 않게)
 * - 링크로 받은 주문번호(?order=)가 저장된 주문번호와 다르면 복원하지 않음
========================================================= */
const STICKER_ORDER_INFO_KEY = "sticker_order_info";

function saveOrderInfo() {
  try {
    sessionStorage.setItem(
      STICKER_ORDER_INFO_KEY,
      JSON.stringify({
        name: nameEl?.value || "",
        phone: phoneEl?.value || "",
        orderNo: orderEl?.value || "",
        email: emailEl?.value || "",
        qty: stickerState.order.qty,
        mode: stickerState.order.mode,
      }),
    );
  } catch {
    // 저장 실패(사생활 보호 모드 등)는 무시
  }
}

function restoreOrderInfo(orderFromUrl) {
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(STICKER_ORDER_INFO_KEY) || "null");
  } catch {
    saved = null;
  }
  if (!saved) return;
  if (orderFromUrl && saved.orderNo && saved.orderNo !== orderFromUrl) return;

  if (nameEl && saved.name) nameEl.value = saved.name;
  if (phoneEl && saved.phone) phoneEl.value = saved.phone;
  if (emailEl && saved.email) emailEl.value = saved.email;
  if (orderEl && !orderFromUrl && saved.orderNo) orderEl.value = String(saved.orderNo).slice(0, STICKER_ORDER_NO_MAX);
  // 예전 저장 형식(용지 1개)도 1장으로 복원
  if (saved.qty) applyOrderOptions(saved.qty, saved.mode);
  else if (STICKER_PAPERS[saved.paper]) applyOrderOptions({ [saved.paper]: 1 }, "same");
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
    .querySelectorAll(".stickerPage input, .stickerPage textarea, .stickerPage .stkEditorCard button, .stkQtyBtn, #btnGoEditor, #btnGoConfirm, #btnConfirm")
    .forEach((el) => {
      // 주문번호 / 장 전환 탭은 잠긴 뒤에도 사용 (다른 주문 확인 / 접수한 시안 보기)
      if (el === orderEl || el.closest("#sheetTabs")) return;
      el.disabled = stickerState.locked;
    });

  syncPaperOptions();
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
