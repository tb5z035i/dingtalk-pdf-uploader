import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDingtalkKnowledgeNode, listDingtalkNodes, listDingtalkWorkspaces } from "./dingtalkKnowledgeBase.js";

const getMock = vi.fn();
const setMock = vi.fn();
const removeMock = vi.fn();

describe("dingtalk knowledge-base helpers", () => {
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

  it("normalizes workspace and node responses", async () => {
    getMock.mockResolvedValue({
      tokenCache: {
        accessToken: "cached_token",
        expiresAt: Date.now() + 10 * 60 * 1000,
        strategy: "modern"
      }
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                workspaceId: "wk_001",
                name: "Team KB",
                rootNode: { dentryUuid: "root_001" }
              }
            ]
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: [
              {
                dentryUuid: "folder_001",
                name: "Specs",
                dentryType: "folder",
                parentNodeId: "root_001",
                workspaceId: "wk_001"
              }
            ]
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      );

    await expect(
      listDingtalkWorkspaces({
        clientId: "ding123",
        clientSecret: "secret_123",
        operatorId: "union_123"
      })
    ).resolves.toEqual([
      {
        workspaceId: "wk_001",
        name: "Team KB",
        rootNodeId: "root_001",
        teamId: undefined
      }
    ]);

    await expect(
      listDingtalkNodes(
        {
          clientId: "ding123",
          clientSecret: "secret_123",
          operatorId: "union_123"
        },
        "root_001"
      )
    ).resolves.toEqual([
      {
        nodeId: "folder_001",
        name: "Specs",
        nodeType: "folder",
        parentNodeId: "root_001",
        workspaceId: "wk_001",
        extension: undefined
      }
    ]);

    fetchMock.mockRestore();
  });

  it("creates a knowledge-base node with mediaId", async () => {
    getMock.mockResolvedValue({
      tokenCache: {
        accessToken: "cached_token",
        expiresAt: Date.now() + 10 * 60 * 1000,
        strategy: "modern"
      }
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ dentryUuid: "node_001" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(
      createDingtalkKnowledgeNode(
        {
          clientId: "ding123",
          clientSecret: "secret_123",
          operatorId: "union_123",
          createNodePath: "/v1.0/doc/workspaces/{workspaceId}/docs"
        },
        {
          workspaceId: "wk_001",
          parentNodeId: "folder_001",
          filename: "guide.pdf",
          mediaId: "media_001"
        }
      )
    ).resolves.toBe("node_001");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://api.dingtalk.com/v1.0/doc/workspaces/wk_001/docs");
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-acs-dingtalk-access-token": "cached_token"
    });
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      workspaceId: "wk_001",
      parentNodeId: "folder_001",
      operatorId: "union_123",
      name: "guide.pdf",
      mediaId: "media_001"
    });

    fetchMock.mockRestore();
  });
});
