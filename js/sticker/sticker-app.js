/* =========================================================
 * UV DTF 스티커 시안 - 시안 확인 / 확정 / 초기화
========================================================= */
const confirmCanvas = byId("confirmCanvas");
const confirmOrderNoEl = byId("confirmOrderNo");
const confirmPaperEl = byId("confirmPaper");
const confirmCountEl = byId("confirmCount");

const confirmModalEl = byId("confirmModal");
const confirmModalTitleEl = byId("confirmModalTitle");
const confirmModalBodyEl = byId("confirmModalBody");
const confirmModalCancelEl = byId("confirmModalCancel");
const confirmModalOkEl = byId("confirmModalOk");

/* =========================================================
 * 시안 확인 - 배치한 용지 그대로 한 화면에 표시
========================================================= */
function renderConfirmStep() {
  if (confirmOrderNoEl) confirmOrderNoEl.textContent = getOrderNo() || "-";
  if (confirmPaperEl) confirmPaperEl.textContent = getPaperLabel();
  if (confirmCountEl) confirmCountEl.textContent = `${stickerState.objects.length}개`;

  requestAnimationFrame(drawConfirmPreview);
}

function drawConfirmPreview() {
  if (!confirmCanvas || currentStep !== "confirm") return;

  const paper = getPaper();
  const wrapW = confirmCanvas.parentElement?.clientWidth || 0;
  if (!wrapW) return;

  const maxH = Math.max(320, window.innerHeight * 0.7);
  const pxPerMm = Math.min(wrapW / paper.w, maxH / paper.h);
  const cssW = Math.floor(paper.w * pxPerMm);
  const cssH = Math.floor(paper.h * pxPerMm);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  confirmCanvas.style.width = `${cssW}px`;
  confirmCanvas.style.height = `${cssH}px`;
  confirmCanvas.width = Math.round(cssW * dpr);
  confirmCanvas.height = Math.round(cssH * dpr);

  const c = confirmCanvas.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderStickerSheet(c, pxPerMm, { checker: true, guides: true });
}

/* =========================================================
 * 확정 모달
========================================================= */
function resetConfirmModal() {
  if (confirmModalTitleEl) confirmModalTitleEl.textContent = "시안 최종 확정";
  if (confirmModalBodyEl) confirmModalBodyEl.innerHTML = "";

  if (confirmModalCancelEl) {
    confirmModalCancelEl.style.display = "";
    confirmModalCancelEl.disabled = false;
  }

  if (confirmModalOkEl) {
    confirmModalOkEl.disabled = false;
    confirmModalOkEl.textContent = "확정하기";
  }

  confirmModalEl?.classList.remove("single", "loading");
}

function showConfirmModal(extraClass = "") {
  confirmModalEl?.classList.add("show");
  if (extraClass) confirmModalEl?.classList.add(extraClass);
  confirmModalEl?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function openConfirmModal() {
  resetConfirmModal();

  if (confirmModalBodyEl) {
    confirmModalBodyEl.textContent = `시안을 최종 확정하시겠습니까?

용지: ${getPaperLabel()}
배치한 스티커: ${stickerState.objects.length}개

시안 확정 후에는 수정이 어려울 수 있습니다.
배치한 위치와 크기(cm)를 다시 한 번 확인해주세요.

확정을 누르면 시안이 접수됩니다.
접수된 시안은 담당자가 검토 후 이메일로 안내드릴 예정입니다.

※ 해당 시안은 추후 상세페이지 내 예시 이미지로 활용될 수 있습니다.
※ 확인에는 일정 시간이 소요될 수 있습니다.`;
  }

  showConfirmModal();
}

function showConfirmModalLoading() {
  if (confirmModalTitleEl) confirmModalTitleEl.textContent = "시안 접수 중";
  if (confirmModalBodyEl) {
    confirmModalBodyEl.innerHTML = `
      <div class="confirmModalLoading">
        <span aria-hidden="true" class="confirmModalSpinner"></span>
        <p>잠시만 기다려주세요.<br />시안을 접수하고 있습니다.</p>
      </div>
    `;
  }
  showConfirmModal("loading");
}

function openNoticeModal(message, title = "시안 접수 완료") {
  resetConfirmModal();
  if (confirmModalTitleEl) confirmModalTitleEl.textContent = title;
  if (confirmModalBodyEl) confirmModalBodyEl.textContent = message;
  if (confirmModalCancelEl) confirmModalCancelEl.style.display = "none";
  if (confirmModalOkEl) confirmModalOkEl.textContent = "확인";
  showConfirmModal("single");
}

function closeConfirmModal() {
  confirmModalEl?.classList.remove("show");
  confirmModalEl?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  resetConfirmModal();
}

/* =========================================================
 * 시안 확정 → 메일 발송
========================================================= */
let isSubmitting = false;

async function confirmStickerOrder() {
  if (isSubmitting || stickerState.locked) return;
  if (!validateCanConfirm(true)) {
    closeConfirmModal();
    return;
  }

  isSubmitting = true;
  showConfirmModalLoading();

  try {
    const result = await sendStickerOrderEmails();

    if (!result.ok) {
      if (result.systemIssue) {
        openNoticeModal(result.message, "시스템 오류");
      } else {
        openConfirmModal();
        showToast(result.message, "error", Math.min(3200 + result.message.length * 25, 7000));
      }
      return;
    }

    markStickerOrderConfirmed(getOrderNo());
    closeConfirmModal();
    applyConfirmedLockIfNeeded(true);

    if (result.warning) {
      showToast(result.warning, "warn", Math.min(2600 + result.warning.length * 25, 7000));
    }
  } catch (err) {
    console.error(err);
    openConfirmModal();
    showToast(`시안 접수 중 오류가 발생했습니다.${err?.message ? ` (오류 상세: ${err.message})` : ""}`, "error", 3200);
  } finally {
    isSubmitting = false;
  }
}

function bindConfirmEvents() {
  btnConfirmEl?.addEventListener("click", () => {
    if (stickerState.locked || !validateCanConfirm(true)) return;
    openConfirmModal();
  });

  confirmModalCancelEl?.addEventListener("click", () => {
    if (!isSubmitting) closeConfirmModal();
  });

  confirmModalEl?.addEventListener("click", (e) => {
    if (isSubmitting) return;
    if (e.target === confirmModalEl || e.target.classList.contains("confirmModalDim")) closeConfirmModal();
  });

  confirmModalOkEl?.addEventListener("click", () => {
    if (confirmModalEl?.classList.contains("single")) {
      closeConfirmModal();
      return;
    }
    confirmStickerOrder();
  });

  window.addEventListener("resize", () => {
    if (currentStep === "confirm") drawConfirmPreview();
  });
}

/* =========================================================
 * 초기화
========================================================= */
function initStickerPage() {
  const orderFromUrl = getOrderFromUrl();
  if (orderEl && orderFromUrl) {
    orderEl.value = orderFromUrl;
    orderEl.readOnly = true;
    orderEl.classList.add("isLockedOrder");
  }

  renderPaperOptions(paperOptionsEl, "paper", stickerState.paper);

  bindOrderEvents();
  bindStepEvents();
  bindEditorEvents();
  bindConfirmEvents();

  updateFormReadyState();
  updateDraftInfo();
  syncEditorControls();
  syncSelectionPanel();
  setDesignStep("info");

  applyConfirmedLockIfNeeded(true);
}

document.addEventListener("DOMContentLoaded", initStickerPage);
