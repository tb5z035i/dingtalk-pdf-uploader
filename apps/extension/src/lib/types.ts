export interface ExtensionSettings {
  appId: string;
  corpId: string;
  clientId: string;
  clientSecret: string;
  operatorId: string;
  workspaceId: string;
  workspaceName: string;
  parentNodeId: string;
  parentNodeName: string;
  apiBaseUrl: string;
  oapiBaseUrl: string;
  createNodePath: string;
}

export interface TokenCache {
  accessToken: string;
  expiresAt: number;
  strategy: "modern" | "legacy";
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

export interface ActivePdfContext {
  ok: boolean;
  isPdf: boolean;
  sourceUrl?: string;
  filename?: string;
  isLocalFile?: boolean;
  detectionMethod?: string;
  message?: string;
}

export interface UploadResponse {
  ok: boolean;
  item?: {
    workspaceId: string;
    parentNodeId: string;
    nodeId: string;
    name: string;
    mediaId?: string;
    uploadedAt: string;
  };
  message?: string;
}

export interface DingtalkCredentialDraft {
  appId: string;
  corpId: string;
  clientId: string;
  clientSecret: string;
  operatorId: string;
  apiBaseUrl: string;
  oapiBaseUrl: string;
  createNodePath: string;
}

export interface DingtalkDraftRequest {
  settings: DingtalkCredentialDraft;
}

export interface DingtalkNodeRequest extends DingtalkDraftRequest {
  parentNodeId: string;
}

export interface DingtalkUploadResult {
  workspaceId: string;
  parentNodeId: string;
  nodeId: string;
  name: string;
  mediaId?: string;
  uploadedAt: string;
}
