import { AppError } from "../utils/errors.js";

interface TokenResponse {
  accessToken?: string;
  expireIn?: number;
  access_token?: string;
  expires_in?: number;
  code?: string;
  message?: string;
}

interface AuthConfig {
  appKey: string;
  appSecret: string;
  apiBaseUrl: string;
}

export class DingtalkAuthService {
  private readonly config: AuthConfig;
  private readonly fetchImpl: typeof fetch;
  private cachedToken?: { value: string; expiresAt: number };

  constructor(config: AuthConfig, fetchImpl: typeof fetch = fetch) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt - now > 60_000) {
      return this.cachedToken.value;
    }

    const response = await this.fetchImpl(`${this.config.apiBaseUrl}/v1.0/oauth2/accessToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        appKey: this.config.appKey,
        appSecret: this.config.appSecret
      })
    });

    const payload = (await response.json()) as TokenResponse;
    if (!response.ok) {
      throw new AppError(
        payload.message ?? "Failed to obtain DingTalk access token.",
        response.status,
        payload.code ?? "dingtalk_auth_failed",
        payload
      );
    }

    const accessToken = payload.accessToken ?? payload.access_token;
    const expiresIn = payload.expireIn ?? payload.expires_in ?? 7200;
    if (!accessToken) {
      throw new AppError("DingTalk token response did not contain an access token.", 502, "dingtalk_auth_invalid");
    }

    this.cachedToken = {
      value: accessToken,
      expiresAt: now + expiresIn * 1000
    };

    return accessToken;
  }
}
