import { AppError } from "./utils/errors.js";
import type { AppConfig } from "./types.js";

function getOptionalEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  return raw ? raw : undefined;
}

function getNumberEnv(name: string, fallback: number): number {
  const raw = getOptionalEnv(name);
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`Environment variable ${name} must be a positive number.`, 500, "config_invalid");
  }

  return parsed;
}

export function loadConfig(): AppConfig {
  const mockMode = process.env.DINGTALK_MOCK_MODE !== "false";

  const config: AppConfig = {
    port: getNumberEnv("PORT", 8787),
    mockMode,
    maxUploadBytes: getNumberEnv("MAX_UPLOAD_BYTES", 10 * 1024 * 1024),
    backendAllowedOrigins: getOptionalEnv("BACKEND_ALLOWED_ORIGINS") ?? "*",
    defaultWorkspaceId: getOptionalEnv("DEFAULT_WORKSPACE_ID"),
    defaultParentNodeId: getOptionalEnv("DEFAULT_PARENT_NODE_ID"),
    dingtalkApiBaseUrl: getOptionalEnv("DINGTALK_API_BASE_URL") ?? "https://api.dingtalk.com",
    dingtalkOapiBaseUrl: getOptionalEnv("DINGTALK_OAPI_BASE_URL") ?? "https://oapi.dingtalk.com",
    dingtalkCreateNodePath: getOptionalEnv("DINGTALK_CREATE_NODE_PATH") ?? "/v2.0/wiki/nodes",
    dingtalkAppKey: getOptionalEnv("DINGTALK_APP_KEY"),
    dingtalkAppSecret: getOptionalEnv("DINGTALK_APP_SECRET"),
    dingtalkOperatorId: getOptionalEnv("DINGTALK_OPERATOR_ID")
  };

  if (!mockMode) {
    const required = ["dingtalkAppKey", "dingtalkAppSecret", "dingtalkOperatorId"] as const;
    for (const key of required) {
      if (!config[key]) {
        throw new AppError(`Missing required configuration for real DingTalk mode: ${key}.`, 500, "config_invalid");
      }
    }
  }

  return config;
}
