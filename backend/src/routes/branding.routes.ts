import { Router } from "express";
import { getBrandingSettings } from "../services/runtime-settings.service";

const router = Router();

router.get("/", async (_req, res) => {
  const branding = await getBrandingSettings();

  return res.json({
    success: true,
    data: branding
  });
});

export default router;
