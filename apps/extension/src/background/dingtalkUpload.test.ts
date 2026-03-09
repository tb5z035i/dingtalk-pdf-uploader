import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadPdfMedia } from "./dingtalkUpload.js";

const getMock = vi.fn();
const setMock = vi.fn();
const removeMock = vi.fn();

describe("uploadPdfMedia", () => {
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

  it("uploads PDF bytes to the DingTalk media endpoint", async () => {
    getMock.mockResolvedValue({
      tokenCache: {
        accessToken: "cached_token",
        expiresAt: Date.now() + 10 * 60 * 1000,
        strategy: "legacy"
      }
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ errcode: 0, media_id: "media_001" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(
      uploadPdfMedia(
        {
          clientId: "ding123",
          clientSecret: "secret_123",
          operatorId: "union_123"
        },
        "guide.pdf",
        new TextEncoder().encode("%PDF-1.4").buffer
      )
    ).resolves.toBe("media_001");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://oapi.dingtalk.com/media/upload?access_token=cached_token&type=file");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    fetchMock.mockRestore();
  });
});
