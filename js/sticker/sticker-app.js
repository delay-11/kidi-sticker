/* =========================================================
 * UV DTF 스티커 시안 - 시안 확인 / 확정 / 초기화
========================================================= */
const confirmSheetsEl = byId("confirmSheets");
const confirmDotsEl = byId("confirmDots");
const confirmOrderNoEl = byId("confirmOrderNo");
const confirmPaperEl = byId("confirmPaper");
const confirmCountEl = byId("confirmCount");

const confirmModalEl = byId("confirmModal");
const confirmModalTitleEl = byId("confirmModalTitle");
const confirmModalBodyEl = byId("confirmModalBody");
const confirmModalCancelEl = byId("confirmModalCancel");
const confirmModalOkEl = byId("confirmModalOk");

/* =========================================================
 * 시안 확인 - 배치한 용지 그대로 표시
 * - 여러 장: PC는 한 줄에 모두, 모바일은 옆으로 넘겨보기 (아래 점으로 위치 표시)
 * - 같은 시안이면 1장만 보여주고 "× n장" 표시
========================================================= */
const confirmMq = window.matchMedia("(max-width: 768px)");

function getTotalStickerCount() {
  return getAllSheets().reduce((sum, s) => sum + s.objects.length, 0);
}

function renderConfirmStep() {
  const sheets = getAllSheets();

  if (confirmOrderNoEl) confirmOrderNoEl.textContent = getOrderNo() || "-";
  if (confirmPaperEl) {
    // 모바일에서는 용지 이름(A3)만 보이고 크기는 숨겨서 한 줄에 들어가게
    const paper = STICKER_PAPERS[sheets[0]?.paper];
    confirmPaperEl.innerHTML =
      getTotalQty() > 1
        ? escapeHtml(getQtySummary())
        : paper
          ? `${paper.key}<span class="stkConfirmSub"> (${mmToCmText(paper.w)} × ${mmToCmText(paper.h)}cm)</span>`
          : "-";
  }
  if (confirmCountEl) confirmCountEl.textContent = `${getTotalStickerCount()}개`;

  if (confirmSheetsEl) {
    confirmSheetsEl.classList.toggle("is-multi", sheets.length > 1);
    confirmSheetsEl.innerHTML = sheets
      .map(
        (sheet, i) => `
          <figure class="stkConfirmSheet">
            <canvas data-confirm-sheet="${i}"></canvas>
            ${sheets.length > 1 || getSheetCopies() > 1 ? `<figcaption>${escapeHtml(getSheetLabel(i))}</figcaption>` : ""}
          </figure>
        `,
      )
      .join("");
    confirmSheetsEl.scrollLeft = 0;
  }

  if (confirmDotsEl) {
    confirmDotsEl.hidden = sheets.length < 2;
    confirmDotsEl.innerHTML = sheets.map((_, i) => `<span class="${i ? "" : "is-active"}"></span>`).join("");
  }

  requestAnimationFrame(drawConfirmPreview);
}

function drawConfirmPreview() {
  if (!confirmSheetsEl || currentStep !== "confirm") return;

  const sheets = getAllSheets();
  const wrapW = confirmSheetsEl.clientWidth;
  if (!wrapW || !sheets.length) return;

  // PC 여러 장: 한 줄을 장 수만큼 나눔 / 모바일: 한 장이 화면 너비 전체 (옆으로 넘김)
  const gap = 16;
  const slider = confirmMq.matches;
  const slotW = slider || sheets.length === 1 ? wrapW : (wrapW - gap * (sheets.length - 1)) / sheets.length;
  const maxH = Math.max(320, window.innerHeight * 0.7);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  sheets.forEach((sheet, i) => {
    const canvas = confirmSheetsEl.querySelector(`[data-confirm-sheet="${i}"]`);
    if (!canvas) return;

    const paper = getPaper(sheet.paper);
    const pxPerMm = Math.min(slotW / paper.w, maxH / paper.h);
    const cssW = Math.floor(paper.w * pxPerMm);
    const cssH = Math.floor(paper.h * pxPerMm);

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    withSheet(sheet, () => renderStickerSheet(c, pxPerMm, { checker: true, guides: true }));
  });
}

// 모바일에서 넘길 때 아래 점 위치 갱신
function syncConfirmDots() {
  if (!confirmDotsEl || confirmDotsEl.hidden || !confirmSheetsEl) return;
  const index = Math.round(confirmSheetsEl.scrollLeft / Math.max(1, confirmSheetsEl.clientWidth));
  confirmDotsEl.querySelectorAll("span").forEach((dot, i) => dot.classList.toggle("is-active", i === index));
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

function getConfirmSummaryText() {
  const sheets = getAllSheets();
  const lines = [`용지: ${getTotalQty() > 1 ? getQtySummary() : getPaperLabel(sheets[0]?.paper)}`];
  if (getTotalQty() > 1) lines.push(`시안: ${isSameDesign() ? "모든 장 같은 시안" : `장마다 다른 시안 ${sheets.length}개`}`);
  lines.push(`배치한 스티커: ${getTotalStickerCount()}개`);
  return lines.join("\n");
}

function openConfirmModal() {
  resetConfirmModal();

  if (confirmModalBodyEl) {
    confirmModalBodyEl.textContent = `시안을 최종 확정하시겠습니까?

${getConfirmSummaryText()}

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

  confirmSheetsEl?.addEventListener("scroll", syncConfirmDots, { passive: true });
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

  renderPaperOptions(paperOptionsEl);

  bindOrderEvents();
  bindStepEvents();
  bindEditorEvents();
  bindConfirmEvents();

  restoreOrderInfo(orderFromUrl);
  syncPaperOptions();
  updateFormReadyState();
  updateDraftInfo();
  syncEditorControls();
  syncSelectionPanel();
  setDesignStep("info");

  applyConfirmedLockIfNeeded(true);

  // 새로고침 전에 작업하던 배치 / 단계로 돌아감
  restoreDraft();
}

document.addEventListener("DOMContentLoaded", initStickerPage);
