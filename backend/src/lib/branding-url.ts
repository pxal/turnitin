import type { Request } from "express";
import type { BrandingSettings } from "../services/runtime-settings.service";
import { extractManagedFilename } from "./uploads";

function getRequestBaseUrl(req: Request) {
  return `${req.protocol}://${req.get("host")}`;
}

export function resolveBrandingForRequest(req: Request, branding: BrandingSettings): BrandingSettings {
  const managedFilename = extractManagedFilename(branding.logoUrl);
  if (!managedFilename) {
    return branding;
  }

  return {
    ...branding,
    logoUrl: `${getRequestBaseUrl(req)}/uploads/${encodeURIComponent(managedFilename)}`
  };
}
