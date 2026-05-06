import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config";

const privateUploadProtocol = "private://";

export function createManagedSourceReference(filename: string) {
  return `${privateUploadProtocol}${encodeURIComponent(path.basename(filename))}`;
}

export function extractManagedFilename(sourceFileUrl: string) {
  if (sourceFileUrl.startsWith(privateUploadProtocol)) {
    return path.basename(decodeURIComponent(sourceFileUrl.slice(privateUploadProtocol.length)));
  }

  try {
    const sourceUrl = new URL(sourceFileUrl);
    const baseUrl = new URL(config.publicUploadsBaseUrl);

    if (sourceUrl.origin !== baseUrl.origin) {
      return null;
    }

    if (!sourceUrl.pathname.startsWith(baseUrl.pathname)) {
      return null;
    }

    const encodedFilename = sourceUrl.pathname.slice(baseUrl.pathname.length).replace(/^\/+/, "");
    if (!encodedFilename) {
      return null;
    }

    return path.basename(decodeURIComponent(encodedFilename));
  } catch {
    return null;
  }
}

export function resolveManagedUploadPath(sourceFileUrl: string) {
  const filename = extractManagedFilename(sourceFileUrl);
  if (!filename) {
    return null;
  }

  const uploadsRoot = sourceFileUrl.startsWith(privateUploadProtocol)
    ? path.resolve(config.privateUploadsDir)
    : path.resolve(config.uploadsDir);
  const resolved = path.resolve(uploadsRoot, filename);

  if (!resolved.startsWith(`${uploadsRoot}${path.sep}`) && resolved !== uploadsRoot) {
    return null;
  }

  return resolved;
}

export async function cleanupManagedUpload(sourceFileUrl?: string | null) {
  if (!sourceFileUrl) {
    return false;
  }

  const uploadPath = resolveManagedUploadPath(sourceFileUrl);
  if (!uploadPath) {
    return false;
  }

  try {
    await fs.unlink(uploadPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}
