import type { DingtalkCredentialDraft } from "../lib/types.js";

export class DingtalkApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = "dingtalk_error", details?: unknown) {
    super(message);
    this.name = "DingtalkApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function mergeSettingsWithDefaults(settings: Partial<DingtalkCredentialDraft>): DingtalkCredentialDraft {
  return {
    appId: settings.appId?.trim() ?? "",
    corpId: settings.corpId?.trim() ?? "",
    clientId: settings.clientId?.trim() ?? "",
    clientSecret: settings.clientSecret?.trim() ?? "",
    operatorId: settings.operatorId?.trim() ?? "",
    apiBaseUrl: settings.apiBaseUrl?.trim() || "https://api.dingtalk.com",
    oapiBaseUrl: settings.oapiBaseUrl?.trim() || "https://oapi.dingtalk.com",
    createNodePath: settings.createNodePath?.trim() || "/v2.0/wiki/nodes"
  };
}

export function getCorpIdCandidate(settings: DingtalkCredentialDraft): string | undefined {
  return settings.corpId || settings.appId || undefined;
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await parseJsonResponse<T & { code?: string; message?: string; errmsg?: string; errcode?: number }>(response);

  if (!response.ok) {
    throw new DingtalkApiError(
      payload.message ?? payload.errmsg ?? `Request failed with status ${response.status}.`,
      response.status,
      payload.code ?? "http_error",
      payload
    );
  }

  if (typeof payload.errcode === "number" && payload.errcode !== 0) {
    throw new DingtalkApiError(payload.errmsg ?? "DingTalk API returned an error.", response.status, "dingtalk_error", payload);
  }

  return payload;
}
