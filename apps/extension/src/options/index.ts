import { fetchNodes, fetchWorkspaces } from "../lib/api.js";
import { DEFAULT_SETTINGS, getSettings, saveSettings } from "../lib/storage.js";
import type { KnowledgeNode, WorkspaceSummary } from "../lib/types.js";

const backendInput = document.querySelector<HTMLInputElement>("#backend-url");
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
  if (!backendInput?.value || !folderListEl) {
    return;
  }

  const nodes = await fetchNodes(backendInput.value.trim(), parentNodeId);
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
  if (backendInput) {
    backendInput.value = settings.backendBaseUrl || DEFAULT_SETTINGS.backendBaseUrl;
  }

  loadButton?.addEventListener("click", async () => {
    try {
      setStatus("Loading workspaces…");
      workspaces = await fetchWorkspaces(backendInput?.value.trim() || DEFAULT_SETTINGS.backendBaseUrl);
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
        backendBaseUrl: backendInput?.value.trim() || DEFAULT_SETTINGS.backendBaseUrl,
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.name,
        parentNodeId: selectedFolder.nodeId,
        parentNodeName: selectedFolder.name
      });
      setStatus("Options saved.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save options.", "error");
    }
  });

  setStatus("Enter your backend URL, then load workspaces.");
}

void init();
