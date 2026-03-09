import { fetchNodes, fetchWorkspaces } from "../lib/api.js";
import { DEFAULT_SETTINGS, getSettings, saveSettings } from "../lib/storage.js";
import type { DingtalkCredentialDraft, KnowledgeNode, WorkspaceSummary } from "../lib/types.js";

const appIdInput = document.querySelector<HTMLInputElement>("#app-id");
const corpIdInput = document.querySelector<HTMLInputElement>("#corp-id");
const clientIdInput = document.querySelector<HTMLInputElement>("#client-id");
const clientSecretInput = document.querySelector<HTMLInputElement>("#client-secret");
const operatorIdInput = document.querySelector<HTMLInputElement>("#operator-id");
const apiBaseUrlInput = document.querySelector<HTMLInputElement>("#api-base-url");
const oapiBaseUrlInput = document.querySelector<HTMLInputElement>("#oapi-base-url");
const createNodePathInput = document.querySelector<HTMLInputElement>("#create-node-path");
const workspaceSelect = document.querySelector<HTMLSelectElement>("#workspace-select");
const currentFolderEl = document.querySelector<HTMLDivElement>("#current-folder");
const folderListEl = document.querySelector<HTMLUListElement>("#folder-list");
const statusEl = document.querySelector<HTMLDivElement>("#status");
const loadButton = document.querySelector<HTMLButtonElement>("#load-button");
const saveButton = document.querySelector<HTMLButtonElement>("#save-button");
const backButton = document.querySelector<HTMLButtonElement>("#back-button");

let workspaces: WorkspaceSummary[] = [];
let folderStack: Array<{ nodeId: string; name: string }> = [];
let selectedFolder: { nodeId: string; name: string } | null = null;

function getDraftSettings(): DingtalkCredentialDraft {
  return {
    appId: appIdInput?.value.trim() ?? "",
    corpId: corpIdInput?.value.trim() ?? "",
    clientId: clientIdInput?.value.trim() ?? "",
    clientSecret: clientSecretInput?.value.trim() ?? "",
    operatorId: operatorIdInput?.value.trim() ?? "",
    apiBaseUrl: apiBaseUrlInput?.value.trim() || DEFAULT_SETTINGS.apiBaseUrl,
    oapiBaseUrl: oapiBaseUrlInput?.value.trim() || DEFAULT_SETTINGS.oapiBaseUrl,
    createNodePath: createNodePathInput?.value.trim() || DEFAULT_SETTINGS.createNodePath
  };
}

function setStatus(message: string, tone: "neutral" | "success" | "error" = "neutral") {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function getCurrentWorkspace(): WorkspaceSummary | undefined {
  return workspaces.find((workspace) => workspace.workspaceId === workspaceSelect?.value);
}

function renderFolderPath() {
  if (!currentFolderEl) {
    return;
  }

  currentFolderEl.textContent = selectedFolder
    ? `Selected folder: ${folderStack.map((entry) => entry.name).join(" / ")}`
    : "Select a folder from the list below.";
}

async function loadFolders(parentNodeId: string) {
  if (!folderListEl) {
    return;
  }

  const nodes = await fetchNodes({
    settings: getDraftSettings(),
    parentNodeId
  });
  const folders = nodes.filter((node) => node.nodeType === "folder");
  renderFolderList(folders);
}

function renderFolderList(folders: KnowledgeNode[]) {
  if (!folderListEl) {
    return;
  }

  folderListEl.innerHTML = "";
  if (!folders.length) {
    folderListEl.innerHTML = "<li class=\"muted\">No child folders under this node.</li>";
    return;
  }

  for (const folder of folders) {
    const listItem = document.createElement("li");
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.textContent = `Open ${folder.name}`;
    openButton.addEventListener("click", async () => {
      folderStack.push({ nodeId: folder.nodeId, name: folder.name });
      selectedFolder = { nodeId: folder.nodeId, name: folder.name };
      renderFolderPath();
      await loadFolders(folder.nodeId);
    });
    listItem.appendChild(openButton);
    folderListEl.appendChild(listItem);
  }
}

async function loadWorkspaceTree(workspaceId: string, restoreNodeId?: string, restoreNodeName?: string) {
  const workspace = workspaces.find((item) => item.workspaceId === workspaceId);
  if (!workspace) {
    return;
  }

  folderStack = [{ nodeId: workspace.rootNodeId, name: workspace.name }];
  selectedFolder = { nodeId: restoreNodeId ?? workspace.rootNodeId, name: restoreNodeName ?? workspace.name };
  renderFolderPath();

  if (restoreNodeId && restoreNodeId !== workspace.rootNodeId) {
    folderStack.push({ nodeId: restoreNodeId, name: restoreNodeName ?? restoreNodeId });
  }

  await loadFolders(selectedFolder.nodeId);
}

async function init() {
  const settings = await getSettings();
  if (appIdInput) appIdInput.value = settings.appId;
  if (corpIdInput) corpIdInput.value = settings.corpId;
  if (clientIdInput) clientIdInput.value = settings.clientId;
  if (clientSecretInput) clientSecretInput.value = settings.clientSecret;
  if (operatorIdInput) operatorIdInput.value = settings.operatorId;
  if (apiBaseUrlInput) apiBaseUrlInput.value = settings.apiBaseUrl;
  if (oapiBaseUrlInput) oapiBaseUrlInput.value = settings.oapiBaseUrl;
  if (createNodePathInput) createNodePathInput.value = settings.createNodePath;

  loadButton?.addEventListener("click", async () => {
    try {
      setStatus("Authenticating with DingTalk and loading workspaces…");
      workspaces = await fetchWorkspaces(getDraftSettings());
      if (!workspaceSelect) {
        return;
      }

      workspaceSelect.innerHTML = "";
      for (const workspace of workspaces) {
        const option = document.createElement("option");
        option.value = workspace.workspaceId;
        option.textContent = workspace.name;
        workspaceSelect.appendChild(option);
      }

      workspaceSelect.value = settings.workspaceId || workspaces[0]?.workspaceId || "";
      if (workspaceSelect.value) {
        await loadWorkspaceTree(workspaceSelect.value, settings.parentNodeId, settings.parentNodeName);
      }
      setStatus("Workspaces loaded.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load workspaces.", "error");
    }
  });

  workspaceSelect?.addEventListener("change", async () => {
    if (workspaceSelect.value) {
      await loadWorkspaceTree(workspaceSelect.value);
    }
  });

  backButton?.addEventListener("click", async () => {
    if (folderStack.length <= 1) {
      return;
    }

    folderStack.pop();
    const current = folderStack.at(-1);
    if (!current) {
      return;
    }

    selectedFolder = current;
    renderFolderPath();
    await loadFolders(current.nodeId);
  });

  saveButton?.addEventListener("click", async () => {
    try {
      const workspace = getCurrentWorkspace();
      if (!workspace || !selectedFolder) {
        throw new Error("Choose a workspace and a folder first.");
      }

      await saveSettings({
        ...DEFAULT_SETTINGS,
        ...getDraftSettings(),
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.name,
        parentNodeId: selectedFolder.nodeId,
        parentNodeName: selectedFolder.name
      });
      setStatus("Credentials and DingTalk destination saved locally.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save options.", "error");
    }
  });

  setStatus("Enter your DingTalk credentials, then load workspaces.");
}

void init();
