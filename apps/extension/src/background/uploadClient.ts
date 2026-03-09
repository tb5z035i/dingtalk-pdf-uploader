import type { ExtensionSettings, UploadResponse } from "../lib/types.js";

interface UploadPayload {
  fileBytes: ArrayBuffer;
  filename: string;
  settings: ExtensionSettings;
}

export async function uploadPdfToBackend({ fileBytes, filename, settings }: UploadPayload): Promise<UploadResponse> {
  const formData = new FormData();
  formData.set("file", new Blob([fileBytes], { type: "application/pdf" }), filename);
  formData.set("workspaceId", settings.workspaceId);
  formData.set("parentNodeId", settings.parentNodeId);
  formData.set("filename", filename);

  const response = await fetch(`${settings.backendBaseUrl}/api/upload`, {
    method: "POST",
    body: formData
  });

  const payload = (await response.json().catch(() => ({}))) as UploadResponse;
  if (!response.ok) {
    throw new Error(payload.message ?? `Upload failed with status ${response.status}`);
  }

  return payload;
}
