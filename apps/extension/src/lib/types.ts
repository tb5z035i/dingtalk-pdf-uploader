export interface ExtensionSettings {
  backendBaseUrl: string;
  workspaceId: string;
  workspaceName: string;
  parentNodeId: string;
  parentNodeName: string;
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

export interface ApiListResponse<T> {
  items: T[];
}
