export interface AppConfig {
  port: number;
  mockMode: boolean;
  maxUploadBytes: number;
  backendAllowedOrigins: string;
  defaultWorkspaceId?: string;
  defaultParentNodeId?: string;
  dingtalkApiBaseUrl: string;
  dingtalkOapiBaseUrl: string;
  dingtalkCreateNodePath: string;
  dingtalkAppKey?: string;
  dingtalkAppSecret?: string;
  dingtalkOperatorId?: string;
}

export interface WorkspaceSummary {
  workspaceId: string;
  name: string;
  rootNodeId: string;
  teamId?: string;
}

export interface KnowledgeNode {
  nodeId: string;
  name: string;
  nodeType: "file" | "folder";
  parentNodeId?: string;
  workspaceId?: string;
  extension?: string;
}

export interface UploadPdfInput {
  workspaceId: string;
  parentNodeId: string;
  filename: string;
  contentType: string;
  bytes: Buffer;
}

export interface UploadPdfResult {
  workspaceId: string;
  parentNodeId: string;
  nodeId: string;
  name: string;
  mediaId?: string;
  uploadedAt: string;
}

export interface DingtalkProvider {
  getHealth(): Promise<Record<string, unknown>>;
  listWorkspaces(): Promise<WorkspaceSummary[]>;
  listNodes(parentNodeId: string): Promise<KnowledgeNode[]>;
  uploadPdf(input: UploadPdfInput): Promise<UploadPdfResult>;
}
