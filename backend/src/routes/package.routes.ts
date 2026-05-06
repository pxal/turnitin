import { Router } from "express";
import { z } from "zod";
import { listPackages, resolvePackageByFileSize } from "../services/package.service";
import { calculateDiscountPricing, findActiveVoucherByCode } from "../services/voucher.service";

const router = Router();

router.get("/", async (_req, res) => {
  const packages = await listPackages({ activeOnly: true });

  return res.json({
    success: true,
    data: packages
  });
});

router.post("/resolve", async (req, res) => {
  const schema = z.object({
    fileSizeBytes: z.number().int().positive()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Ukuran file tidak valid." });
  }

  const item = await resolvePackageByFileSize(parsed.data.fileSizeBytes);
  return res.json(item);
});

router.post("/quote", async (req, res) => {
  const schema = z.object({
    fileSizeBytes: z.number().int().positive(),
    voucherCode: z.string().trim().optional().or(z.literal(""))
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Data simulasi harga tidak valid." });
  }

  try {
    const selectedPackage = await resolvePackageByFileSize(parsed.data.fileSizeBytes);
    const voucher =
      parsed.data.voucherCode && parsed.data.voucherCode.trim()
        ? await findActiveVoucherByCode(parsed.data.voucherCode)
        : null;
    const hasVoucherAttempt = Boolean(parsed.data.voucherCode && parsed.data.voucherCode.trim());

    const pricing = calculateDiscountPricing(selectedPackage.price, voucher?.discountPercent);

    return res.json({
      success: true,
      message: hasVoucherAttempt && !voucher ? "Kode voucher tidak ditemukan atau sudah tidak aktif." : undefined,
      data: {
        package: selectedPackage,
        pricing: {
          ...pricing,
          voucherCode: voucher?.code || null
        }
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Gagal menghitung harga."
    });
  }
});

export default router;
