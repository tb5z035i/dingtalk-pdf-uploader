import type { ExtensionSettings, TokenCache } from "./types.js";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  appId: "",
  corpId: "",
  clientId: "",
  clientSecret: "",
  operatorId: "",
  workspaceId: "",
  workspaceName: "",
  parentNodeId: "",
  parentNodeName: "",
  apiBaseUrl: "https://api.dingtalk.com",
  oapiBaseUrl: "https://oapi.dingtalk.com",
  createNodePath: "/v2.0/wiki/nodes"
};

const STORAGE_KEY = "settings";
const TOKEN_CACHE_KEY = "tokenCache";

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(result[STORAGE_KEY] as Partial<ExtensionSettings> | undefined)
  };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEY]: settings
  });
  await clearTokenCache();
}

export function hasSavedCredentials(settings: ExtensionSettings): boolean {
  return Boolean(settings.clientId && settings.clientSecret && settings.operatorId);
}

export function hasSavedDestination(settings: ExtensionSettings): boolean {
  return Boolean(settings.workspaceId && settings.parentNodeId);
}

export async function getTokenCache(): Promise<TokenCache | undefined> {
  const result = await chrome.storage.local.get(TOKEN_CACHE_KEY);
  return result[TOKEN_CACHE_KEY] as TokenCache | undefined;
}

export async function saveTokenCache(tokenCache: TokenCache): Promise<void> {
  await chrome.storage.local.set({
    [TOKEN_CACHE_KEY]: tokenCache
  });
}

export async function clearTokenCache(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_CACHE_KEY);
}
