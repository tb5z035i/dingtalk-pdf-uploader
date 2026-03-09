import type { ApiListResponse, KnowledgeNode, WorkspaceSummary } from "./types.js";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchWorkspaces(backendBaseUrl: string): Promise<WorkspaceSummary[]> {
  const payload = await fetchJson<ApiListResponse<WorkspaceSummary>>(`${backendBaseUrl}/api/workspaces`);
  return payload.items;
}

export async function fetchNodes(backendBaseUrl: string, parentNodeId: string): Promise<KnowledgeNode[]> {
  const url = new URL(`${backendBaseUrl}/api/nodes`);
  url.searchParams.set("parentNodeId", parentNodeId);
  const payload = await fetchJson<ApiListResponse<KnowledgeNode>>(url.toString());
  return payload.items;
}
