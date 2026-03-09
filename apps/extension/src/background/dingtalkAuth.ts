import { getTokenCache, saveTokenCache } from "../lib/storage.js";
import type { DingtalkCredentialDraft, TokenCache } from "../lib/types.js";
import { DingtalkApiError, getCorpIdCandidate, mergeSettingsWithDefaults, requestJson } from "./dingtalkApi.js";

interface ModernTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface LegacyTokenResponse {
  accessToken?: string;
  expireIn?: number;
  access_token?: string;
  expires_in?: number;
}

function assertCredentialFields(settings: DingtalkCredentialDraft) {
  if (!settings.clientId || !settings.clientSecret) {
    throw new DingtalkApiError("App Key / Client ID and App Secret / Client Secret are required.", 400, "credentials_missing");
  }
}

function isTokenCacheValid(tokenCache: TokenCache | undefined): tokenCache is TokenCache {
  return Boolean(tokenCache && tokenCache.expiresAt - Date.now() > 60_000);
}

async function fetchModernAccessToken(settings: DingtalkCredentialDraft): Promise<TokenCache> {
  const corpId = getCorpIdCandidate(settings);
  if (!corpId) {
    throw new DingtalkApiError("Corp ID is required for the modern DingTalk token endpoint.", 400, "corp_id_required");
  }

  const payload = await requestJson<ModernTokenResponse>(`${settings.apiBaseUrl}/v1.0/oauth2/${encodeURIComponent(corpId)}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      grant_type: "client_credentials"
    })
  });

  if (!payload.access_token) {
    throw new DingtalkApiError("Modern DingTalk token response did not include access_token.", 502, "token_missing");
  }

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 7200) * 1000,
    strategy: "modern"
  };
}

async function fetchLegacyAccessToken(settings: DingtalkCredentialDraft): Promise<TokenCache> {
  const payload = await requestJson<LegacyTokenResponse>(`${settings.apiBaseUrl}/v1.0/oauth2/accessToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      appKey: settings.clientId,
      appSecret: settings.clientSecret
    })
  });

  const accessToken = payload.accessToken ?? payload.access_token;
  if (!accessToken) {
    throw new DingtalkApiError("Legacy DingTalk token response did not include an access token.", 502, "token_missing");
  }

  return {
    accessToken,
    expiresAt: Date.now() + (payload.expireIn ?? payload.expires_in ?? 7200) * 1000,
    strategy: "legacy"
  };
}

export async function getDingtalkAccessToken(draft: Partial<DingtalkCredentialDraft>): Promise<string> {
  const settings = mergeSettingsWithDefaults(draft);
  assertCredentialFields(settings);

  const cachedToken = await getTokenCache();
  if (isTokenCacheValid(cachedToken)) {
    return cachedToken.accessToken;
  }

  let tokenCache: TokenCache | undefined;
  const modernCandidate = getCorpIdCandidate(settings);

  if (modernCandidate) {
    try {
      tokenCache = await fetchModernAccessToken(settings);
    } catch (error) {
      if (!(error instanceof DingtalkApiError) || error.statusCode < 500) {
        tokenCache = undefined;
      }
    }
  }

  if (!tokenCache) {
    tokenCache = await fetchLegacyAccessToken(settings);
  }

  await saveTokenCache(tokenCache);
  return tokenCache.accessToken;
}
