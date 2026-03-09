import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, clearTokenCache, getSettings, getTokenCache, hasSavedCredentials, hasSavedDestination, saveSettings, saveTokenCache } from "./storage.js";

const getMock = vi.fn();
const setMock = vi.fn();
const removeMock = vi.fn();

describe("extension storage helpers", () => {
  beforeEach(() => {
    getMock.mockReset();
    setMock.mockReset();
    removeMock.mockReset();
    globalThis.chrome = {
      storage: {
        local: {
          get: getMock,
          set: setMock,
          remove: removeMock
        }
      }
    } as unknown as typeof chrome;
  });

  it("merges persisted values with defaults", async () => {
    getMock.mockResolvedValue({
      settings: {
        clientId: "ding123",
        workspaceId: "wk_001"
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      clientId: "ding123",
      workspaceId: "wk_001"
    });
  });

  it("saves settings under the expected key", async () => {
    setMock.mockResolvedValue(undefined);
    removeMock.mockResolvedValue(undefined);

    await saveSettings({
      ...DEFAULT_SETTINGS,
      appId: "app_001",
      corpId: "corp_001",
      clientId: "ding123",
      clientSecret: "secret_123",
      operatorId: "union_123",
      workspaceId: "wk_001",
      workspaceName: "Docs",
      parentNodeId: "folder_001",
      parentNodeName: "Specs"
    });

    expect(setMock).toHaveBeenCalledWith({
      settings: {
        ...DEFAULT_SETTINGS,
        appId: "app_001",
        corpId: "corp_001",
        clientId: "ding123",
        clientSecret: "secret_123",
        operatorId: "union_123",
        workspaceId: "wk_001",
        workspaceName: "Docs",
        parentNodeId: "folder_001",
        parentNodeName: "Specs"
      }
    });
    expect(removeMock).toHaveBeenCalledWith("tokenCache");
  });

  it("stores and retrieves token cache", async () => {
    setMock.mockResolvedValue(undefined);
    getMock.mockResolvedValue({
      tokenCache: {
        accessToken: "token_123",
        expiresAt: 12345,
        strategy: "legacy"
      }
    });

    await saveTokenCache({
      accessToken: "token_123",
      expiresAt: 12345,
      strategy: "legacy"
    });

    expect(setMock).toHaveBeenCalledWith({
      tokenCache: {
        accessToken: "token_123",
        expiresAt: 12345,
        strategy: "legacy"
      }
    });
    await expect(getTokenCache()).resolves.toEqual({
      accessToken: "token_123",
      expiresAt: 12345,
      strategy: "legacy"
    });
  });

  it("clears token cache explicitly", async () => {
    removeMock.mockResolvedValue(undefined);
    await clearTokenCache();
    expect(removeMock).toHaveBeenCalledWith("tokenCache");
  });

  it("detects saved credentials and destination", () => {
    expect(hasSavedCredentials(DEFAULT_SETTINGS)).toBe(false);
    expect(hasSavedDestination(DEFAULT_SETTINGS)).toBe(false);

    expect(
      hasSavedCredentials({
        ...DEFAULT_SETTINGS,
        clientId: "ding123",
        clientSecret: "secret_123",
        operatorId: "union_123"
      })
    ).toBe(true);
    expect(
      hasSavedDestination({
        ...DEFAULT_SETTINGS,
        workspaceId: "wk_001",
        parentNodeId: "folder_001"
      })
    ).toBe(true);
  });
});
