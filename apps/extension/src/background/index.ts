import { sanitizePdfFilename } from "../lib/filename.js";
import { getSettings, hasSavedCredentials } from "../lib/storage.js";
import type { ActivePdfContext, DingtalkCredentialDraft, DingtalkUploadResult, ExtensionSettings } from "../lib/types.js";
import { createDingtalkKnowledgeNode, listDingtalkNodes, listDingtalkWorkspaces } from "./dingtalkKnowledgeBase.js";
import { resolvePdfContext } from "./pdfSourceResolver.js";
import { uploadPdfMedia } from "./dingtalkUpload.js";

const observedPdfUrlsByTabId = new Map<number, string>();

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getActivePdfContext(): Promise<ActivePdfContext> {
  const tab = await getActiveTab();
  return resolvePdfContext(tab?.url, tab?.id ? observedPdfUrlsByTabId.get(tab.id) : undefined);
}

async function fetchPdfBytes(url: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(url, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }

    return response.arrayBuffer();
  } catch (error) {
    if (url.startsWith("file://")) {
      throw new Error(
        "Reading local PDFs requires the extension's file URL access permission. Enable 'Allow access to file URLs' in chrome://extensions."
      );
    }

    throw error instanceof Error ? error : new Error("Unable to fetch the current PDF.");
  }
}

function getCredentialDraftFromSettings(settings: ExtensionSettings): DingtalkCredentialDraft {
  return {
    appId: settings.appId,
    corpId: settings.corpId,
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    operatorId: settings.operatorId,
    apiBaseUrl: settings.apiBaseUrl,
    oapiBaseUrl: settings.oapiBaseUrl,
    createNodePath: settings.createNodePath
  };
}

async function performDirectDingtalkUpload(filenameOverride?: string): Promise<DingtalkUploadResult> {
  const settings = await getSettings();
  if (!hasSavedCredentials(settings)) {
    throw new Error("Save your DingTalk credentials in Options before uploading.");
  }

  if (!settings.workspaceId || !settings.parentNodeId) {
    throw new Error("Select and save the target knowledge base folder in Options before uploading.");
  }

  const context = await getActivePdfContext();
  if (!context.isPdf || !context.sourceUrl || !context.filename) {
    throw new Error(context.message ?? "The active tab is not a PDF.");
  }

  const fileBytes = await fetchPdfBytes(context.sourceUrl);
  const filename = sanitizePdfFilename(filenameOverride ?? context.filename);
  const draft = getCredentialDraftFromSettings(settings);
  const mediaId = await uploadPdfMedia(draft, filename, fileBytes);
  const nodeId = await createDingtalkKnowledgeNode(draft, {
    workspaceId: settings.workspaceId,
    parentNodeId: settings.parentNodeId,
    filename,
    mediaId
  });

  if (!nodeId) {
    throw new Error("DingTalk did not return a node identifier after creating the PDF entry.");
  }

  return {
    workspaceId: settings.workspaceId,
    parentNodeId: settings.parentNodeId,
    nodeId,
    name: filename,
    mediaId,
    uploadedAt: new Date().toISOString()
  };
}

async function refreshBadge(tabId?: number): Promise<void> {
  if (!tabId) {
    return;
  }

  const tab = await chrome.tabs.get(tabId).catch(() => undefined);
  const context = resolvePdfContext(tab?.url, observedPdfUrlsByTabId.get(tabId));
  await chrome.action.setBadgeBackgroundColor({ color: context.isPdf ? "#0f766e" : "#64748b", tabId });
  await chrome.action.setBadgeText({ text: context.isPdf ? "PDF" : "", tabId });
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  if (!hasSavedCredentials(settings)) {
    await chrome.runtime.openOptionsPage();
  }
});

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const contentTypeHeader = details.responseHeaders?.find((header) => header.name.toLowerCase() === "content-type");
    const contentTypeValue = contentTypeHeader?.value?.toLowerCase() ?? "";
    if (details.tabId >= 0 && contentTypeValue.includes("application/pdf")) {
      observedPdfUrlsByTabId.set(details.tabId, details.url);
      void refreshBadge(details.tabId);
    }
    return undefined;
  },
  { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] },
  ["responseHeaders"]
);

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void refreshBadge(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    void refreshBadge(tabId);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "getActivePdfContext") {
    void getActivePdfContext()
      .then((context) => sendResponse(context))
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          isPdf: false,
          message: error instanceof Error ? error.message : "Failed to inspect the active tab."
        } satisfies ActivePdfContext);
      });
    return true;
  }

  if (message?.type === "listDingtalkWorkspaces") {
    void listDingtalkWorkspaces(message.settings as Partial<DingtalkCredentialDraft>)
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          message: error instanceof Error ? error.message : "Failed to load DingTalk workspaces."
        })
      );
    return true;
  }

  if (message?.type === "listDingtalkNodes") {
    void listDingtalkNodes(message.settings as Partial<DingtalkCredentialDraft>, String(message.parentNodeId ?? ""))
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          message: error instanceof Error ? error.message : "Failed to load DingTalk folders."
        })
      );
    return true;
  }

  if (message?.type === "uploadActivePdf") {
    void performDirectDingtalkUpload(typeof message.filename === "string" ? message.filename : undefined)
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          message: error instanceof Error ? error.message : "Failed to upload PDF."
        })
      );
    return true;
  }

  return false;
});
