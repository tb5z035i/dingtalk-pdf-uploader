import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { MockDingtalkProvider } from "./services/dingtalkKnowledgeBase.js";
import type { AppConfig } from "./types.js";

const config: AppConfig = {
  port: 8787,
  mockMode: true,
  maxUploadBytes: 1024 * 1024,
  backendAllowedOrigins: "*",
  defaultWorkspaceId: "wk_mock_001",
  defaultParentNodeId: "node_specs_001",
  dingtalkApiBaseUrl: "https://api.dingtalk.com",
  dingtalkOapiBaseUrl: "https://oapi.dingtalk.com",
  dingtalkCreateNodePath: "/v2.0/wiki/nodes"
};

describe("createApp", () => {
  const app = createApp({
    config,
    provider: new MockDingtalkProvider(config)
  });

  it("returns health data", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.mode).toBe("mock");
  });

  it("lists workspaces", async () => {
    const response = await request(app).get("/api/workspaces");
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
  });

  it("rejects non-pdf uploads", async () => {
    const response = await request(app)
      .post("/api/upload")
      .attach("file", Buffer.from("hello"), { filename: "hello.txt", contentType: "text/plain" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("pdf_required");
  });

  it("uploads pdfs using configured defaults", async () => {
    const response = await request(app)
      .post("/api/upload")
      .attach("file", Buffer.from("%PDF-1.4 mock"), { filename: "example.pdf", contentType: "application/pdf" });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.item.workspaceId).toBe("wk_mock_001");
    expect(response.body.item.parentNodeId).toBe("node_specs_001");
  });
});
