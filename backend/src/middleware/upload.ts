import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../config";

fs.mkdirSync(config.uploadsDir, { recursive: true });

const allowedBrandingMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml"
]);

const allowedBrandingExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

export const uploadPdfInMemory = multer({
  storage: multer.diskStorage({
    destination(_req, _file, callback) {
      callback(null, path.resolve(config.privateUploadsDir));
    },
    filename(_req, file, callback) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      callback(null, filename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter(_req, file, callback) {
    if (file.mimetype !== "application/pdf") {
      callback(new Error("Hanya file PDF yang diperbolehkan."));
      return;
    }

    callback(null, true);
  }
});

export const uploadBrandingImage = multer({
  storage: multer.diskStorage({
    destination(_req, _file, callback) {
      callback(null, path.resolve(config.uploadsDir));
    },
    filename(_req, file, callback) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `branding-${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      callback(null, filename);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(_req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const isAllowedMimeType = allowedBrandingMimeTypes.has(file.mimetype);
    const isAllowedExtension = allowedBrandingExtensions.has(extension);

    if (!isAllowedMimeType || !isAllowedExtension) {
      callback(new Error("Logo harus berupa file PNG, JPG, JPEG, WEBP, atau SVG."));
      return;
    }

    callback(null, true);
  }
});
