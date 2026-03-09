import { AppError } from "../utils/errors.js";

interface UploadServiceConfig {
  oapiBaseUrl: string;
}

interface UploadResponse {
  errcode?: number;
  errmsg?: string;
  media_id?: string;
  mediaId?: string;
}

export class DingtalkUploadService {
  private readonly config: UploadServiceConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(config: UploadServiceConfig, fetchImpl: typeof fetch = fetch) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async uploadPdf(accessToken: string, filename: string, bytes: Buffer): Promise<string> {
    const formData = new FormData();
    formData.set("media", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), filename);

    const response = await this.fetchImpl(
      `${this.config.oapiBaseUrl}/media/upload?access_token=${encodeURIComponent(accessToken)}&type=file`,
      {
        method: "POST",
        body: formData
      }
    );

    const payload = (await response.json()) as UploadResponse;
    if (!response.ok || payload.errcode) {
      throw new AppError(
        payload.errmsg ?? "Failed to upload PDF bytes to DingTalk media API.",
        response.status || 502,
        "dingtalk_media_upload_failed",
        payload
      );
    }

    const mediaId = payload.media_id ?? payload.mediaId;
    if (!mediaId) {
      throw new AppError("DingTalk media upload did not return a media ID.", 502, "dingtalk_media_upload_invalid");
    }

    return mediaId;
  }
}
