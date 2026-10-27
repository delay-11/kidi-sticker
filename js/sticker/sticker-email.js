/* =========================================================
 * UV DTF 스티커 시안 - 메일 첨부 생성 / 발송
 * - 첨부: 배치한 용지 그대로의 투명 배경 PNG 1장 (회사/고객 동일)
 * - 여러 장(장마다 다른 시안)이면 장마다 메일 1통씩 (첨부 용량 한도 때문)
 * - 본문: 시안 요약 대신, 배치한 용지 전체를 한 번에 볼 수 있는 미리보기 1장
 * - 키캡 시안과 같은 EmailJS 템플릿 변수명을 사용 (items_summary_html 등)
========================================================= */

/* =========================================================
 * 바이너리 / base64 변환
========================================================= */
function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("캔버스 이미지 생성에 실패했습니다."))),
      type,
      quality,
    );
  });
}

/* =========================================================
 * PNG에 인쇄 해상도(DPI) 정보 기록 (pHYs 청크)
 * - 포토샵 등에서 열었을 때 실제 용지 크기(cm)로 바로 열리도록 함
========================================================= */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function withPngDpi(pngBytes, dpi) {
  // PNG 시그니처(8) + IHDR 청크(25) 바로 뒤에 pHYs 청크를 끼워 넣음
  const insertAt = 33;
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);

  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // 단위: 미터
  view.setUint32(17, crc32(chunk.subarray(4, 17)));

  const out = new Uint8Array(pngBytes.length + chunk.length);
  out.set(pngBytes.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(pngBytes.subarray(insertAt), insertAt + chunk.length);
  return out;
}

/* =========================================================
 * 인쇄용 시안 PNG (투명 배경, 안내선 없음)
 * - 첨부 용량 한도 안에 들어올 때까지 해상도를 단계적으로 낮춤
========================================================= */
async function renderSheetPng(maxBytes, target = getAllSheets()[stickerState.sheetIndex]) {
  const paper = getPaper(target.paper);

  for (const dpi of STICKER_EXPORT_DPI_STEPS) {
    const pxPerMm = dpi / 25.4;
    const w = Math.round(paper.w * pxPerMm);
    const h = Math.round(paper.h * pxPerMm);
    if (w * h > STICKER_EXPORT_MAX_PIXELS) continue;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    withSheet(target, () => renderStickerSheet(canvas.getContext("2d"), pxPerMm));

    const blob = await canvasToBlob(canvas, "image/png");
    const bytes = withPngDpi(new Uint8Array(await blob.arrayBuffer()), dpi);
    const base64 = bytesToBase64(bytes);

    canvas.width = 0;
    canvas.height = 0;

    if (base64.length <= maxBytes || dpi === STICKER_EXPORT_DPI_STEPS.at(-1)) {
      return { base64, dpi, w, h, fits: base64.length <= maxBytes };
    }
  }

  throw new Error("시안 이미지 생성에 실패했습니다.");
}

/* =========================================================
 * 메일 본문용 미리보기 (JPEG, 본문 변수 50KB 제한 안에 들어오게 작게)
 * - 시안 확정 화면 캔버스와 같은 모습
========================================================= */
async function renderSheetPreviewDataUrl(target) {
  const paper = getPaper(target.paper);

  for (const longSide of [560, 460, 380, 300]) {
    const pxPerMm = longSide / Math.max(paper.w, paper.h);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(paper.w * pxPerMm);
    canvas.height = Math.round(paper.h * pxPerMm);
    // 시안 확정 화면과 같은 모습(투명 영역 체크무늬 + 인쇄 안전선)으로 렌더링
    withSheet(target, () => renderStickerSheet(canvas.getContext("2d"), pxPerMm, { checker: true, guides: true }));

    for (const quality of [0.82, 0.7, 0.58, 0.46]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= STICKER_PREVIEW_MAX_BYTES) return dataUrl;
    }
  }

  return "";
}

/* =========================================================
 * 첨부 / 본문 데이터 한 번만 생성해서 회사/고객 메일에 재사용
========================================================= */
// index: 몇 번째 시안인지 / total: 시안 수 (장마다 다른 시안일 때 메일 1통씩)
async function buildStickerMailData(target, index = 0, total = 1) {
  const orderNo = getOrderNo() || "order";
  const paper = getPaper(target.paper);
  const copies = getSheetCopies();

  const sheet = await renderSheetPng(STICKER_ATTACHMENT_MAX_BYTES, target);
  if (!sheet.fits) {
    throw new Error("시안 이미지 용량이 너무 커서 첨부할 수 없습니다.");
  }

  const part = total > 1 ? `_${index + 1}of${total}` : copies > 1 ? `_x${copies}` : "";
  const sheetFile = {
    filename: `${safeFilePart(orderNo)}_UVDTF_${paper.key}${part}.png`,
    file: sheet.base64,
  };

  return {
    orderNo,
    paper,
    index,
    total,
    copies,
    stickerCount: target.objects.length,
    sheet,
    sheetFile,
    previewDataUrl: await renderSheetPreviewDataUrl(target),
  };
}

// 메일 제목 / 본문에 붙는 장 표시 (예: "2/3장 · A4", "A4 × 3장")
function getMailSheetLabel(data) {
  if (data.total > 1) return `${data.index + 1}/${data.total}장 · ${data.paper.key}`;
  if (data.copies > 1) return `${data.paper.key} × ${data.copies}장 (모두 같은 시안)`;
  return "";
}

/* =========================================================
 * 메일 본문 HTML
========================================================= */
function buildSheetPreviewHtml(data) {
  const image = data.previewDataUrl
    ? `<img src="${data.previewDataUrl}" alt="배치한 용지 미리보기" style="display:block;max-width:100%;width:360px;height:auto;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;" />`
    : `<p style="color:#667085;">미리보기 이미지는 첨부된 PNG 파일에서 확인해주세요.</p>`;

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
      <h2 style="margin:0 0 12px;">UV DTF 스티커 시안${getMailSheetLabel(data) ? ` · ${escapeHtml(getMailSheetLabel(data))}` : ""}</h2>
      <div style="padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;text-align:center;">
        ${image}
      </div>
    </div>
  `;
}

function buildSheetPreviewText(data) {
  return [
    `[UV DTF 스티커 시안${getMailSheetLabel(data) ? ` · ${getMailSheetLabel(data)}` : ""}]`,
    `첨부 파일: ${data.sheetFile.filename}`,
  ].join("\n");
}

function buildStickerAttachmentHtml(data, files) {
  const esc = (v) => escapeHtml(String(v ?? "-"));
  const { sheet, paper } = data;

  const rows = files
    .map((f) => `<div>${esc(f.filename)}</div>`)
    .join("");

  const sizeNote = `<div style="color:#667085;">시안 PNG: ${esc(paper.key)} ${esc(mmToCmText(paper.w))}×${esc(mmToCmText(paper.h))}cm · ${esc(sheet.dpi)}dpi (${esc(sheet.w)}×${esc(sheet.h)}px) · 투명 배경</div>`;

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
      ${rows}
      ${sizeNote}
    </div>
  `;
}

function createStickerAttachmentParams(files) {
  const params = { zip_filename: "", zip_file: "" };

  for (let i = 1; i <= 9; i += 1) {
    params[`design_${i}_filename`] = files[i - 1]?.filename || "";
    params[`design_${i}_file`] = files[i - 1]?.file || "";
  }

  return params;
}

/* =========================================================
 * 회사 / 고객 메일 파라미터
========================================================= */
// 용지 칸 - 여러 장이면 이 메일의 장 + 전체 수량
function getMailPaperText(data) {
  const label = getPaperLabel(data.paper.key);
  if (data.total > 1) return `${label} · ${data.index + 1}/${data.total}장 (전체 ${getQtySummary()})`;
  if (data.copies > 1) return `${label} × ${data.copies}장 (모두 같은 시안)`;
  return label;
}

function buildStickerEmailParams(data, audience) {
  const isCompany = audience === "company";
  const files = [data.sheetFile];
  const email = safeTrim(emailEl?.value);

  return {
    to_email: isCompany ? COMPANY_EMAIL : email,
    customer_name: safeTrim(nameEl?.value) || "고객",
    customer_order_no: data.orderNo,
    customer_email: email || "-",
    customer_phone: safeTrim(phoneEl?.value) || "-",
    reply_to: isCompany ? email || COMPANY_EMAIL : COMPANY_EMAIL,
    product_type: "UV DTF 스티커",
    paper_size: getMailPaperText(data),

    batch_label: data.total > 1 ? `${data.index + 1}/${data.total}장` : "",
    batch_index: String(data.index + 1),
    batch_total: String(data.total),
    batch_notice_html:
      data.total > 1
        ? `<p style="margin:0 0 12px;color:#667085;">장마다 다른 시안이라 메일이 장마다 1통씩 발송됩니다. (${data.index + 1}/${data.total})</p>`
        : "",

    design_type_count: String(data.total),
    total_qty: String(getTotalQty()),
    items_summary_text: buildSheetPreviewText(data),
    items_summary_html: buildSheetPreviewHtml(data),
    attachment_summary_html: buildStickerAttachmentHtml(data, files),

    ...createStickerAttachmentParams(files),
  };
}

/* =========================================================
 * 발송 실패 문구 (키캡 시안과 같은 기준, 오류 상세 포함)
========================================================= */
function getStickerSubmitFailMessage(err) {
  console.error("[스티커 시안 접수 상세 오류]", err);

  const joined = `${err?.message || ""} ${err?.text || ""} ${err?.status || ""}`.toLowerCase();
  const detail = safeTrim(err?.message || err?.text || "");
  const withDetail = (guide) => (detail && detail !== "[object Object]" ? `${guide} (오류 상세: ${detail.slice(0, 160)})` : guide);

  if (isStickerEmailSystemIssue(err)) {
    return withDetail("사이트 시스템 오류로 시안 접수가 되지 않았습니다. 관리자에게 문의해주세요.");
  }
  if (/network|failed to fetch|timeout|load failed|네트워크/.test(joined)) {
    return withDetail("네트워크 연결 문제로 시안 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (/too large|payload|413|용량/.test(joined)) {
    return withDetail("첨부 용량이 너무 커서 접수에 실패했습니다. 이미지 개수나 용량을 줄인 뒤 다시 시도해주세요.");
  }
  return withDetail("시안 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
}

function isStickerEmailSystemIssue(err) {
  const joined = `${err?.message || ""} ${err?.text || ""} ${err?.status || ""}`.toLowerCase();
  return (
    String(err?.status || "") === "402" ||
    /insufficient|balance|quota|plan limit|monthly limit|account|suspended|blocked|exceeded the|reached the limit|한도|잔액/.test(joined)
  );
}

/* =========================================================
 * 시안 접수 메일 발송 (회사 + 고객)
========================================================= */
// onProgress({ percent, text, count }) - 확정 모달 진행 링 갱신용
// 장마다 [첨부 시안 준비 1칸 + 메일 발송 통수만큼] 칸을 두고, 끝난 칸 비율을 진행률로 표시
async function sendStickerOrderEmails(onProgress = null) {
  const sheets = getAllSheets();
  const total = sheets.length;
  const needsCustomer = !!STICKER_EMAILJS_CUSTOMER_TEMPLATE_ID && EMAIL_RE.test(safeTrim(emailEl?.value));
  const warnings = [];

  const sendsPerSheet = needsCustomer ? 2 : 1;
  const totalSends = total * sendsPerSheet;
  const totalUnits = total * (1 + sendsPerSheet);
  let doneUnits = 0;
  let sentCount = 0;
  let lastText = "";
  let lastCount = "";
  const report = (text = lastText, count = lastCount) => {
    lastText = text;
    lastCount = count;
    onProgress?.({ percent: (doneUnits / totalUnits) * 100, text, count });
  };

  ensureEmailJsInit();

  // 장마다 메일 1통씩 순서대로 (첨부 용량 한도 / 발송 간격 때문에 동시에 보내지 않음)
  for (let i = 0; i < total; i += 1) {
    const where = total > 1 ? `${i + 1}/${total}장 ` : "";
    let data;

    report("메일에 첨부할 시안 준비 중", total > 1 ? `${i + 1} / ${total}장` : "");
    try {
      data = await buildStickerMailData(sheets[i], i, total);
      doneUnits += 1;
    } catch (err) {
      return { ok: false, message: `${where}${getStickerSubmitFailMessage(err)}`, systemIssue: false };
    }

    // 회사 / 고객 메일을 같이 보냄 - 예: "1~2 / 4"
    const last = Math.min(sentCount + sendsPerSheet, totalSends);
    const range = last > sentCount + 1 ? `${sentCount + 1}~${last}` : `${last}`;
    report("메일 보내는 중", totalSends > 1 ? `${range} / ${totalSends}` : "");
    const sendTo = (templateId, audience) =>
      emailjs.send(EMAILJS_SERVICE_ID, templateId, buildStickerEmailParams(data, audience), EMAILJS_PUBLIC_KEY).finally(() => {
        // 한 통 끝날 때마다 진행률만 올림 (문구는 그대로)
        doneUnits += 1;
        sentCount += 1;
        if (sentCount < totalSends) report();
      });

    const [companyResult, customerResult] = await Promise.allSettled([
      sendTo(STICKER_EMAILJS_COMPANY_TEMPLATE_ID, "company"),
      needsCustomer ? sendTo(STICKER_EMAILJS_CUSTOMER_TEMPLATE_ID, "customer") : Promise.resolve(true),
    ]);

    if (companyResult.status === "rejected") {
      const err = companyResult.reason;
      return { ok: false, message: `${where}${getStickerSubmitFailMessage(err)}`, systemIssue: isStickerEmailSystemIssue(err) };
    }

    if (customerResult.status === "rejected") {
      console.error("[고객 메일 발송 실패]", customerResult.reason);
      warnings.push(`${where}고객 확인 메일 발송은 실패했습니다.`.trim());
    }

    if (i < total - 1) await wait(1200);
  }

  if (warnings.length) warnings.unshift("시안은 정상 접수되었지만");
  return { ok: true, warning: warnings.join(" ") };
}
