import type { DingtalkCredentialDraft, KnowledgeNode, WorkspaceSummary } from "../lib/types.js";
import { mergeSettingsWithDefaults, requestJson } from "./dingtalkApi.js";
import { getDingtalkAccessToken } from "./dingtalkAuth.js";

interface WorkspaceListResponse {
  items?: Array<Record<string, unknown>>;
  result?: Array<Record<string, unknown>>;
  list?: Array<Record<string, unknown>>;
}

interface NodeListResponse {
  items?: Array<Record<string, unknown>>;
  result?: Array<Record<string, unknown>>;
  list?: Array<Record<string, unknown>>;
}

interface CreateNodeResponse {
  dentryUuid?: string;
  nodeId?: string;
  id?: string;
}

interface CreateNodeInput {
  workspaceId: string;
  parentNodeId: string;
  filename: string;
  mediaId: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function buildCreateNodeUrl(apiBaseUrl: string, createNodePath: string, workspaceId: string): string {
  const resolvedPath = createNodePath.includes("{workspaceId}")
    ? createNodePath.replaceAll("{workspaceId}", encodeURIComponent(workspaceId))
    : createNodePath;
  return `${apiBaseUrl}${resolvedPath}`;
}

export async function listDingtalkWorkspaces(draft: Partial<DingtalkCredentialDraft>): Promise<WorkspaceSummary[]> {
  const settings = mergeSettingsWithDefaults(draft);
  if (!settings.operatorId) {
    throw new Error("Operator unionId is required to load knowledge bases.");
  }
  const accessToken = await getDingtalkAccessToken(settings);
  const url = new URL(`${settings.apiBaseUrl}/v2.0/wiki/workspaces`);
  url.searchParams.set("operatorId", settings.operatorId);
  url.searchParams.set("maxResults", "30");

  const payload = await requestJson<WorkspaceListResponse>(url.toString(), {
    headers: {
      "x-acs-dingtalk-access-token": accessToken
    }
  });
  const items = payload.items ?? payload.result ?? payload.list ?? [];

  return items
    .map((item) => {
      const rootNode = asRecord(item.rootNode);
      return {
        workspaceId: String(item.workspaceId ?? item.spaceId ?? item.id ?? ""),
        name: String(item.name ?? item.title ?? "Unnamed workspace"),
        rootNodeId: String(item.rootNodeId ?? rootNode.nodeId ?? rootNode.dentryUuid ?? ""),
        teamId: item.teamId ? String(item.teamId) : undefined
      };
    })
    .filter((item) => item.workspaceId && item.rootNodeId);
}

export async function listDingtalkNodes(
  draft: Partial<DingtalkCredentialDraft>,
  parentNodeId: string
): Promise<KnowledgeNode[]> {
  const settings = mergeSettingsWithDefaults(draft);
  if (!settings.operatorId) {
    throw new Error("Operator unionId is required to browse folders.");
  }
  const accessToken = await getDingtalkAccessToken(settings);
  const url = new URL(`${settings.apiBaseUrl}/v2.0/wiki/nodes`);
  url.searchParams.set("operatorId", settings.operatorId);
  url.searchParams.set("parentNodeId", parentNodeId);
  url.searchParams.set("maxResults", "50");

  const payload = await requestJson<NodeListResponse>(url.toString(), {
    headers: {
      "x-acs-dingtalk-access-token": accessToken
    }
  });
  const items = payload.items ?? payload.result ?? payload.list ?? [];

  return items
    .map((item) => ({
      nodeId: String(item.dentryUuid ?? item.nodeId ?? item.id ?? ""),
      name: String(item.name ?? item.title ?? "Unnamed node"),
      nodeType: item.dentryType === "folder" ? ("folder" as const) : ("file" as const),
      parentNodeId: item.parentNodeId ? String(item.parentNodeId) : undefined,
      workspaceId: item.workspaceId ? String(item.workspaceId) : undefined,
      extension: item.extension ? String(item.extension) : undefined
    }))
    .filter((item) => item.nodeId);
}

export async function createDingtalkKnowledgeNode(
  draft: Partial<DingtalkCredentialDraft>,
  input: CreateNodeInput
): Promise<string> {
  const settings = mergeSettingsWithDefaults(draft);
  if (!settings.operatorId) {
    throw new Error("Operator unionId is required to create a knowledge-base node.");
  }
  const accessToken = await getDingtalkAccessToken(settings);
  const url = buildCreateNodeUrl(settings.apiBaseUrl, settings.createNodePath, input.workspaceId);

  const payload = await requestJson<CreateNodeResponse>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-acs-dingtalk-access-token": accessToken
    },
    body: JSON.stringify({
      workspaceId: input.workspaceId,
      parentNodeId: input.parentNodeId,
      operatorId: settings.operatorId,
      name: input.filename,
      dentryType: "file",
      contentType: "document",
      extension: "pdf",
      mediaId: input.mediaId
    })
  });

  return payload.dentryUuid ?? payload.nodeId ?? payload.id ?? "";
}
