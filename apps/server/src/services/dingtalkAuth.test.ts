import { describe, expect, it, vi } from "vitest";
import { DingtalkAuthService } from "./dingtalkAuth.js";

describe("DingtalkAuthService", () => {
  it("reuses a cached token before expiry", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: "token_123", expireIn: 7200 }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    const authService = new DingtalkAuthService(
      {
        appKey: "app-key",
        appSecret: "app-secret",
        apiBaseUrl: "https://api.example.com"
      },
      fetchImpl
    );

    await expect(authService.getAccessToken()).resolves.toBe("token_123");
    await expect(authService.getAccessToken()).resolves.toBe("token_123");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
