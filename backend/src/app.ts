import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import adminRoutes from "./routes/admin.routes";
import affiliateRoutes from "./routes/affiliate.routes";
import authRoutes from "./routes/auth.routes";
import brandingRoutes from "./routes/branding.routes";
import checkRoutes from "./routes/check.routes";
import { config } from "./config";
import packageRoutes from "./routes/package.routes";

function addAllowedOrigin(allowed: Set<string>, rawUrl: string) {
  if (!rawUrl) {
    return;
  }

  allowed.add(rawUrl);
}

function createCorsOriginError(origin: string) {
  const error = new Error(`Origin ${origin} tidak diizinkan oleh konfigurasi CORS.`) as Error & {
    statusCode?: number;
    code?: string;
  };

  error.statusCode = 403;
  error.code = "CORS_ORIGIN_NOT_ALLOWED";
  return error;
}

function buildAllowedOrigins(frontendBaseUrl: string, appBaseUrl: string, extraOrigins: string[], nodeEnv: string) {
  const allowed = new Set<string>();

  addAllowedOrigin(allowed, frontendBaseUrl);
  addAllowedOrigin(allowed, appBaseUrl);
  extraOrigins.forEach((origin) => addAllowedOrigin(allowed, origin));

  if (nodeEnv !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
    allowed.add("https://localhost:3000");
    allowed.add("https://127.0.0.1:3000");
  }

  return allowed;
}

function readRequestOrigin(req: express.Request) {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin) {
    return origin;
  }

  const referer = req.headers.referer;
  if (typeof referer === "string" && referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

function requiresOriginValidation(req: express.Request) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase())) {
    return false;
  }

  if (/^\/api\/checks\/[^/]+\/payment-callback\/?$/.test(req.path)) {
    return false;
  }

  return req.path.startsWith("/api/");
}

function isCorsProtectedMethod(req: express.Request) {
  return ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(req.method.toUpperCase());
}

export function createApp() {
  const app = express();
  const allowedOrigins = buildAllowedOrigins(
    config.frontendBaseUrl,
    config.appBaseUrl,
    config.corsAllowedOrigins,
    config.nodeEnv
  );

  fs.mkdirSync(config.uploadsDir, { recursive: true });
  fs.mkdirSync(config.privateUploadsDir, { recursive: true });

  app.use((req, res, next) => {
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        if (!isCorsProtectedMethod(req)) {
          callback(null, false);
          return;
        }

        callback(createCorsOriginError(origin));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-session-role"]
    })(req, res, next);
  });
  app.use(
    express.json({
      verify(req, _res, buf) {
        (req as express.Request & { rawBody?: string }).rawBody = buf.toString("utf8");
      }
    })
  );
  app.use((req, res, next) => {
    if (!requiresOriginValidation(req)) {
      next();
      return;
    }

    const requestOrigin = readRequestOrigin(req);
    if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
      return res.status(403).json({
        message: "Origin request tidak valid untuk aksi ini."
      });
    }

    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api", (_req, res) => {
    res.json({
      status: "ok",
      message: "API is running"
    });
  });

  app.use("/uploads", express.static(path.resolve(config.uploadsDir)));

  app.use("/api/auth", authRoutes);
  app.use("/api/affiliate", affiliateRoutes);
  app.use("/api/branding", brandingRoutes);
  app.use("/api/packages", packageRoutes);
  app.use("/api/checks", checkRoutes);
  app.use("/api/admin", adminRoutes);

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        const isPdfUpload = _req.path.includes("/api/checks/upload");
        return res.status(400).json({
          message: isPdfUpload
            ? "Ukuran file PDF melebihi batas maksimum 10 MB. Silakan unggah file 10 MB atau lebih kecil."
            : "Ukuran file logo maksimal 5 MB."
        });
      }

      return res.status(400).json({
        message: error.message || "Upload file gagal diproses."
      });
    }

    if (error instanceof SyntaxError) {
      return res.status(400).json({
        message: "Payload JSON tidak valid."
      });
    }

    if ((error as Error & { code?: string }).code === "CORS_ORIGIN_NOT_ALLOWED") {
      return res.status(403).json({
        message: error.message
      });
    }

    console.error("Unhandled application error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server."
    });
  });

  return app;
}
