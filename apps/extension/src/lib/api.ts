import type { DingtalkCredentialDraft, DingtalkNodeRequest, DingtalkUploadResult, KnowledgeNode, WorkspaceSummary } from "./types.js";

async function sendRuntimeMessage<T>(message: unknown): Promise<T> {
  const response = await chrome.runtime.sendMessage(message) as { ok: boolean; payload?: T; message?: string };
  if (!response.ok) {
    throw new Error(response.message ?? "Extension runtime request failed.");
  }

  return response.payload as T;
}

export async function fetchWorkspaces(settings: DingtalkCredentialDraft): Promise<WorkspaceSummary[]> {
  return sendRuntimeMessage<WorkspaceSummary[]>({
    type: "listDingtalkWorkspaces",
    settings
  });
}

export async function fetchNodes(request: DingtalkNodeRequest): Promise<KnowledgeNode[]> {
  return sendRuntimeMessage<KnowledgeNode[]>({
    type: "listDingtalkNodes",
    settings: request.settings,
    parentNodeId: request.parentNodeId
  });
}

export async function uploadCurrentPdf(filename: string): Promise<DingtalkUploadResult> {
  return sendRuntimeMessage<DingtalkUploadResult>({
    type: "uploadActivePdf",
    filename
  });
}
