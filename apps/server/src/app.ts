import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import type { AppConfig, DingtalkProvider } from "./types.js";
import { isPdfFilename, sanitizePdfFilename } from "./utils/filename.js";
import { AppError, isAppError } from "./utils/errors.js";

interface CreateAppOptions {
  config: AppConfig;
  provider: DingtalkProvider;
}

export function createApp({ config, provider }: CreateAppOptions) {
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.maxUploadBytes
    }
  });

  app.use(
    cors({
      origin: config.backendAllowedOrigins === "*" ? true : config.backendAllowedOrigins.split(",").map((value) => value.trim()),
      credentials: true
    })
  );
  app.use(express.json());

  app.get("/health", async (_req, res, next) => {
    try {
      res.json({
        ok: true,
        service: "dingtalk-pdf-uploader-server",
        ...await provider.getHealth()
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/workspaces", async (_req, res, next) => {
    try {
      const workspaces = await provider.listWorkspaces();
      res.json({ items: workspaces });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/nodes", async (req, res, next) => {
    try {
      const parentNodeId = String(req.query.parentNodeId ?? "").trim();
      if (!parentNodeId) {
        throw new AppError("Query parameter parentNodeId is required.", 400, "parent_node_id_required");
      }

      const nodes = await provider.listNodes(parentNodeId);
      res.json({ items: nodes });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/upload", upload.single("file"), async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError("A multipart PDF file is required.", 400, "file_required");
      }

      const workspaceId = String(req.body.workspaceId ?? config.defaultWorkspaceId ?? "").trim();
      const parentNodeId = String(req.body.parentNodeId ?? config.defaultParentNodeId ?? "").trim();
      const requestedFilename = String(req.body.filename ?? file.originalname ?? "document.pdf");

      if (!workspaceId) {
        throw new AppError("workspaceId is required.", 400, "workspace_id_required");
      }

      if (!parentNodeId) {
        throw new AppError("parentNodeId is required.", 400, "parent_node_id_required");
      }

      const mimeTypeLooksPdf = file.mimetype === "application/pdf";
      if (!mimeTypeLooksPdf && !isPdfFilename(file.originalname) && !isPdfFilename(requestedFilename)) {
        throw new AppError("Only PDF files can be uploaded.", 400, "pdf_required");
      }

      const filename = sanitizePdfFilename(requestedFilename);

      const result = await provider.uploadPdf({
        workspaceId,
        parentNodeId,
        filename,
        contentType: "application/pdf",
        bytes: file.buffer
      });

      res.status(201).json({
        ok: true,
        item: result
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        ok: false,
        code: "file_too_large",
        message: `PDF exceeds the configured ${config.maxUploadBytes} byte limit.`
      });
      return;
    }

    if (isAppError(error)) {
      res.status(error.statusCode).json({
        ok: false,
        code: error.code,
        message: error.message,
        details: error.details
      });
      return;
    }

    res.status(500).json({
      ok: false,
      code: "internal_error",
      message: error instanceof Error ? error.message : "Unexpected server error."
    });
  });

  return app;
}
