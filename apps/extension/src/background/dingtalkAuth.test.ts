import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDingtalkAccessToken } from "./dingtalkAuth.js";

const getMock = vi.fn();
const setMock = vi.fn();
const removeMock = vi.fn();

describe("getDingtalkAccessToken", () => {
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

  it("uses a cached token when still valid", async () => {
    getMock.mockResolvedValue({
      tokenCache: {
        accessToken: "cached_token",
        expiresAt: Date.now() + 10 * 60 * 1000,
        strategy: "legacy"
      }
    });

    await expect(
      getDingtalkAccessToken({
        clientId: "ding123",
        clientSecret: "secret_123",
        operatorId: "union_123"
      })
    ).resolves.toBe("cached_token");
  });

  it("prefers the modern token endpoint when corpId is available", async () => {
    getMock.mockResolvedValue({});
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "modern_token", expires_in: 7200 }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(
      getDingtalkAccessToken({
        corpId: "corp_001",
        clientId: "ding123",
        clientSecret: "secret_123",
        operatorId: "union_123"
      })
    ).resolves.toBe("modern_token");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://api.dingtalk.com/v1.0/oauth2/corp_001/token");
    fetchMock.mockRestore();
  });

  it("falls back to the legacy endpoint when modern auth fails", async () => {
    getMock.mockResolvedValue({});
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "invalid", message: "modern failed" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: "legacy_token", expireIn: 7200 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    await expect(
      getDingtalkAccessToken({
        appId: "app_like_corp",
        clientId: "ding123",
        clientSecret: "secret_123",
        operatorId: "union_123"
      })
    ).resolves.toBe("legacy_token");

    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://api.dingtalk.com/v1.0/oauth2/accessToken");
    fetchMock.mockRestore();
  });
});
