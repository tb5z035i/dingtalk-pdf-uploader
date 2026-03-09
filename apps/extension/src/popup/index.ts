import { getSettings } from "../lib/storage.js";
import type { ActivePdfContext } from "../lib/types.js";

const statusEl = document.querySelector<HTMLDivElement>("#status");
const pdfDetailsEl = document.querySelector<HTMLDivElement>("#pdf-details");
const destinationEl = document.querySelector<HTMLDivElement>("#destination");
const filenameInput = document.querySelector<HTMLInputElement>("#filename");
const uploadButton = document.querySelector<HTMLButtonElement>("#upload-button");
const openOptionsButton = document.querySelector<HTMLButtonElement>("#open-options-button");

function setStatus(message: string, tone: "neutral" | "success" | "error" = "neutral") {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function renderPdfContext(context: ActivePdfContext) {
  if (!pdfDetailsEl || !filenameInput) {
    return;
  }

  if (!context.isPdf || !context.sourceUrl || !context.filename) {
    pdfDetailsEl.innerHTML = `<p>${context.message ?? "No PDF detected."}</p>`;
    filenameInput.value = "document.pdf";
    return;
  }

  filenameInput.value = context.filename;
  pdfDetailsEl.innerHTML = `
    <p><strong>Detected:</strong> ${context.filename}</p>
    <p><strong>Source:</strong> ${context.isLocalFile ? "Local file" : "Remote URL"}</p>
    <p><strong>Detection:</strong> ${context.detectionMethod ?? "unknown"}</p>
    <p class="muted url">${context.sourceUrl}</p>
  `;
}

async function renderDestination() {
  const settings = await getSettings();
  if (!destinationEl) {
    return;
  }

  destinationEl.innerHTML = settings.workspaceId && settings.parentNodeId
    ? `
        <p><strong>Knowledge base:</strong> ${settings.workspaceName || settings.workspaceId}</p>
        <p><strong>Folder:</strong> ${settings.parentNodeName || settings.parentNodeId}</p>
        <p class="muted">${settings.backendBaseUrl}</p>
      `
    : `<p class="muted">Set the backend URL and destination folder in Options before uploading.</p>`;
}

async function requestActivePdfContext(): Promise<ActivePdfContext> {
  return chrome.runtime.sendMessage({ type: "getActivePdfContext" }) as Promise<ActivePdfContext>;
}

async function uploadCurrentPdf() {
  setStatus("Uploading PDF to DingTalk…");
  const payload = await chrome.runtime.sendMessage({
    type: "uploadActivePdf",
    filename: filenameInput?.value.trim()
  }) as { ok: boolean; payload?: { item?: { name: string } }; message?: string };

  if (!payload.ok) {
    throw new Error(payload.message ?? "Upload failed.");
  }

  setStatus(`Uploaded ${payload.payload?.item?.name ?? "PDF"} successfully.`, "success");
}

async function init() {
  openOptionsButton?.addEventListener("click", () => chrome.runtime.openOptionsPage());
  uploadButton?.addEventListener("click", async () => {
    uploadButton.disabled = true;
    try {
      await uploadCurrentPdf();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.", "error");
    } finally {
      uploadButton.disabled = false;
    }
  });

  await renderDestination();
  const context = await requestActivePdfContext();
  renderPdfContext(context);
  setStatus(
    context.isPdf
      ? "Ready to upload the current PDF."
      : context.message ?? "Open a PDF in the current tab to enable upload."
  );
}

void init();
