import { Router } from "express";
import { resolveBrandingForRequest } from "../lib/branding-url";
import { getBrandingSettings } from "../services/runtime-settings.service";

const router = Router();

router.get("/", async (req, res) => {
  const branding = await getBrandingSettings();

  return res.json({
    success: true,
    data: resolveBrandingForRequest(req, branding)
  });
});

export default router;
