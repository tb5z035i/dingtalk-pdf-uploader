import type { AppConfig, DingtalkProvider, KnowledgeNode, UploadPdfInput, UploadPdfResult, WorkspaceSummary } from "../types.js";
import { AppError } from "../utils/errors.js";
import { DingtalkAuthService } from "./dingtalkAuth.js";
import { DingtalkUploadService } from "./dingtalkUpload.js";

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
  code?: string;
  message?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export class RealDingtalkProvider implements DingtalkProvider {
  private readonly config: AppConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly authService: DingtalkAuthService;
  private readonly uploadService: DingtalkUploadService;

  constructor(config: AppConfig, fetchImpl: typeof fetch = fetch) {
    if (!config.dingtalkAppKey || !config.dingtalkAppSecret || !config.dingtalkOperatorId) {
      throw new AppError("Real DingTalk mode requires app credentials and operator ID.", 500, "config_invalid");
    }

    this.config = config;
    this.fetchImpl = fetchImpl;
    this.authService = new DingtalkAuthService(
      {
        appKey: config.dingtalkAppKey,
        appSecret: config.dingtalkAppSecret,
        apiBaseUrl: config.dingtalkApiBaseUrl
      },
      fetchImpl
    );
    this.uploadService = new DingtalkUploadService(
      {
        oapiBaseUrl: config.dingtalkOapiBaseUrl
      },
      fetchImpl
    );
  }

  async getHealth(): Promise<Record<string, unknown>> {
    return {
      mode: "real",
      hasCredentials: true,
      defaultWorkspaceId: this.config.defaultWorkspaceId ?? null,
      defaultParentNodeId: this.config.defaultParentNodeId ?? null
    };
  }

  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    const token = await this.authService.getAccessToken();
    const operatorId = this.config.dingtalkOperatorId!;
    const url = new URL(`${this.config.dingtalkApiBaseUrl}/v2.0/wiki/workspaces`);
    url.searchParams.set("operatorId", operatorId);
    url.searchParams.set("maxResults", "30");

    const payload = await this.fetchJson<WorkspaceListResponse>(url.toString(), token);
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

  async listNodes(parentNodeId: string): Promise<KnowledgeNode[]> {
    const token = await this.authService.getAccessToken();
    const operatorId = this.config.dingtalkOperatorId!;
    const url = new URL(`${this.config.dingtalkApiBaseUrl}/v2.0/wiki/nodes`);
    url.searchParams.set("operatorId", operatorId);
    url.searchParams.set("parentNodeId", parentNodeId);
    url.searchParams.set("maxResults", "50");

    const payload = await this.fetchJson<NodeListResponse>(url.toString(), token);
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

  async uploadPdf(input: UploadPdfInput): Promise<UploadPdfResult> {
    const token = await this.authService.getAccessToken();
    const mediaId = await this.uploadService.uploadPdf(token, input.filename, input.bytes);

    const response = await this.fetchImpl(`${this.config.dingtalkApiBaseUrl}${this.config.dingtalkCreateNodePath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-acs-dingtalk-access-token": token
      },
      body: JSON.stringify({
        workspaceId: input.workspaceId,
        parentNodeId: input.parentNodeId,
        operatorId: this.config.dingtalkOperatorId,
        name: input.filename,
        dentryType: "file",
        contentType: "document",
        extension: "pdf",
        mediaId
      })
    });

    const payload = (await response.json()) as CreateNodeResponse;
    if (!response.ok) {
      throw new AppError(
        payload.message ?? "Failed to create DingTalk knowledge-base node for uploaded PDF.",
        response.status,
        payload.code ?? "dingtalk_node_create_failed",
        payload
      );
    }

    const nodeId = payload.dentryUuid ?? payload.nodeId ?? payload.id;
    if (!nodeId) {
      throw new AppError("DingTalk node creation did not return a node identifier.", 502, "dingtalk_node_create_invalid");
    }

    return {
      workspaceId: input.workspaceId,
      parentNodeId: input.parentNodeId,
      nodeId,
      name: input.filename,
      mediaId,
      uploadedAt: new Date().toISOString()
    };
  }

  private async fetchJson<T>(url: string, token: string): Promise<T> {
    const response = await this.fetchImpl(url, {
      headers: {
        "x-acs-dingtalk-access-token": token
      }
    });

    const payload = (await response.json()) as T & { code?: string; message?: string };
    if (!response.ok) {
      throw new AppError(
        payload.message ?? "DingTalk API request failed.",
        response.status,
        payload.code ?? "dingtalk_request_failed",
        payload
      );
    }

    return payload;
  }
}

const MOCK_WORKSPACES: WorkspaceSummary[] = [
  {
    workspaceId: "wk_mock_001",
    name: "演示团队知识库",
    rootNodeId: "node_root_001",
    teamId: "team_demo_001"
  }
];

const MOCK_NODES: Record<string, KnowledgeNode[]> = {
  node_root_001: [
    {
      nodeId: "node_specs_001",
      name: "产品规范",
      nodeType: "folder",
      parentNodeId: "node_root_001",
      workspaceId: "wk_mock_001"
    },
    {
      nodeId: "node_shared_001",
      name: "共享资料",
      nodeType: "folder",
      parentNodeId: "node_root_001",
      workspaceId: "wk_mock_001"
    }
  ],
  node_specs_001: [
    {
      nodeId: "node_specs_arch_001",
      name: "历史归档",
      nodeType: "folder",
      parentNodeId: "node_specs_001",
      workspaceId: "wk_mock_001"
    }
  ],
  node_shared_001: []
};

export class MockDingtalkProvider implements DingtalkProvider {
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  async getHealth(): Promise<Record<string, unknown>> {
    return {
      mode: "mock",
      hasCredentials: false,
      defaultWorkspaceId: this.config.defaultWorkspaceId ?? MOCK_WORKSPACES[0]?.workspaceId ?? null,
      defaultParentNodeId: this.config.defaultParentNodeId ?? MOCK_WORKSPACES[0]?.rootNodeId ?? null
    };
  }

  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    return MOCK_WORKSPACES;
  }

  async listNodes(parentNodeId: string): Promise<KnowledgeNode[]> {
    return MOCK_NODES[parentNodeId] ?? [];
  }

  async uploadPdf(input: UploadPdfInput): Promise<UploadPdfResult> {
    return {
      workspaceId: input.workspaceId,
      parentNodeId: input.parentNodeId,
      nodeId: `node_uploaded_${Date.now()}`,
      name: input.filename,
      mediaId: "media_mock_uploaded",
      uploadedAt: new Date().toISOString()
    };
  }
}

export function createDingtalkProvider(config: AppConfig, fetchImpl?: typeof fetch): DingtalkProvider {
  return config.mockMode ? new MockDingtalkProvider(config) : new RealDingtalkProvider(config, fetchImpl);
}
