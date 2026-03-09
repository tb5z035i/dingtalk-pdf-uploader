import type { DingtalkCredentialDraft } from "../lib/types.js";
import { DingtalkApiError, mergeSettingsWithDefaults, requestJson } from "./dingtalkApi.js";
import { getDingtalkAccessToken } from "./dingtalkAuth.js";

interface UploadResponse {
  media_id?: string;
  mediaId?: string;
}

export async function uploadPdfMedia(
  draft: Partial<DingtalkCredentialDraft>,
  filename: string,
  fileBytes: ArrayBuffer
): Promise<string> {
  const settings = mergeSettingsWithDefaults(draft);
  const accessToken = await getDingtalkAccessToken(settings);
  const formData = new FormData();
  formData.set("media", new Blob([fileBytes], { type: "application/pdf" }), filename);

  const payload = await requestJson<UploadResponse>(
    `${settings.oapiBaseUrl}/media/upload?access_token=${encodeURIComponent(accessToken)}&type=file`,
    {
      method: "POST",
      body: formData
    }
  );

  const mediaId = payload.media_id ?? payload.mediaId;
  if (!mediaId) {
    throw new DingtalkApiError("DingTalk media upload did not return media_id.", 502, "media_id_missing");
  }

  return mediaId;
}
