import type { ExtensionSettings } from "./types.js";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendBaseUrl: "http://localhost:8787",
  workspaceId: "",
  workspaceName: "",
  parentNodeId: "",
  parentNodeName: ""
};

const STORAGE_KEY = "settings";

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(result[STORAGE_KEY] as Partial<ExtensionSettings> | undefined)
  };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.sync.set({
    [STORAGE_KEY]: settings
  });
}
