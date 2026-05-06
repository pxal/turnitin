import path from "node:path";
import { config } from "../config";
import { createCheckFileAccessToken } from "../lib/file-access";
import { prisma } from "../lib/prisma";
import { cleanupManagedUpload } from "../lib/uploads";
import { getCekplagiatBalance, getCekplagiatResult, getCekplagiatStatus, submitToCekplagiat } from "./cekplagiat.service";
import { getCheckProcessingOptions } from "./check-processing-options.service";

export const CHECKER_STARTING_LOCK = "__STARTING__";

export type StartCheckOptions = {
  excludeQuotes?: boolean;
  excludeBiblio?: boolean;
  excludeMatches?: string;
  resetFailedState?: boolean;
};

function sanitizeSourceFilename(filename?: string | null) {
  const fallback = "document.pdf";
  const trimmed = filename?.trim();

  if (!trimmed) {
    return fallback;
  }

  const safeName = path.basename(trimmed).replace(/[^a-zA-Z0-9._-]/g, "_");
  return safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
}

function buildProtectedSourceFileUrl(checkRequestId: string, filename?: string | null) {
  const token = createCheckFileAccessToken(checkRequestId, config.checkFileAccessTokenTtlSeconds);
  const safeFilename = sanitizeSourceFilename(filename);
  return `${config.appBaseUrl}/api/checks/${encodeURIComponent(checkRequestId)}/source-file/${encodeURIComponent(safeFilename)}?token=${encodeURIComponent(token)}`;
}

export function hasUsableCheckerJob(jobId?: string | null) {
  return Boolean(jobId && jobId !== CHECKER_STARTING_LOCK);
}

export function getExternalServiceErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export async function cleanupSourceFileForCheck(checkRequestId: string) {
  const current = await prisma.checkRequest.findUnique({
    where: { id: checkRequestId },
    select: {
      sourceFileUrl: true
    }
  });

  if (!current?.sourceFileUrl) {
    return false;
  }

  await cleanupManagedUpload(current.sourceFileUrl).catch((error) => {
    console.error("Failed to cleanup uploaded source file:", error);
  });

  await prisma.checkRequest.update({
    where: { id: checkRequestId },
    data: {
      sourceFileUrl: null
    }
  });

  return true;
}

export async function startCheckIfReady(checkRequestId: string, options: StartCheckOptions = {}) {
  if (options.resetFailedState) {
    await prisma.checkRequest.updateMany({
      where: {
        id: checkRequestId,
        paymentStatus: "PAID",
        checkStatus: "FAILED"
      },
      data: {
        checkerJobId: null,
        resultSummary: null,
        resultReportUrl: null,
        similarityScore: null,
        aiScore: null
      }
    });
  }

  const locked = await prisma.checkRequest.updateMany({
    where: {
      id: checkRequestId,
      paymentStatus: "PAID",
      sourceFileUrl: {
        not: null
      },
      checkerJobId: null,
      checkStatus: {
        notIn: ["PROCESSING", "COMPLETED"]
      }
    },
    data: {
      checkStatus: "PROCESSING",
      checkerJobId: CHECKER_STARTING_LOCK,
      resultSummary: null,
      resultReportUrl: null
    }
  });

  if (locked.count === 0) {
    return {
      started: false as const,
      request: await prisma.checkRequest.findUnique({
        where: { id: checkRequestId }
      })
    };
  }

  const checkRequest = await prisma.checkRequest.findUnique({
    where: { id: checkRequestId }
  });

  if (!checkRequest?.sourceFileUrl) {
    await prisma.checkRequest.updateMany({
      where: {
        id: checkRequestId,
        checkerJobId: CHECKER_STARTING_LOCK
      },
      data: {
        checkStatus: "PAID",
        checkerJobId: null
      }
    });

    return {
      started: false as const,
      request: checkRequest
    };
  }

  try {
    const processingOptions = await getCheckProcessingOptions(checkRequestId);
    const balance = await getCekplagiatBalance();
    if (balance.balance < config.cekplagiatCostPerCheck) {
      throw new Error("Saldo API cekplagiat tidak cukup untuk memulai proses.");
    }

    const result = await submitToCekplagiat({
      fileUrl: buildProtectedSourceFileUrl(checkRequestId, checkRequest.originalName),
      excludeQuotes: options.excludeQuotes ?? processingOptions.excludeQuotes,
      excludeBiblio: options.excludeBiblio ?? processingOptions.excludeBiblio,
      excludeMatches: options.excludeMatches ?? processingOptions.excludeMatches
    });

    const updated = await prisma.checkRequest.update({
      where: { id: checkRequestId },
      data: {
        checkStatus: "PROCESSING",
        checkerJobId: result.jobId,
        resultSummary: null,
        resultReportUrl: null
      }
    });

    return {
      started: true as const,
      request: updated,
      job: result
    };
  } catch (error) {
    await prisma.checkRequest.updateMany({
      where: {
        id: checkRequestId,
        checkerJobId: CHECKER_STARTING_LOCK
      },
      data: {
        checkStatus: "PAID",
        checkerJobId: null
      }
    });

    throw error;
  }
}

export async function syncCheckStatus(checkRequestId: string) {
  const checkRequest = await prisma.checkRequest.findUnique({
    where: { id: checkRequestId }
  });

  if (!checkRequest) {
    return {
      success: false as const,
      statusCode: 404,
      message: "Request tidak ditemukan."
    };
  }

  if (!hasUsableCheckerJob(checkRequest.checkerJobId)) {
    return {
      success: true as const,
      source: "local",
      data: {
        status: checkRequest.checkStatus
      }
    };
  }

  let remote;
  try {
    remote = await getCekplagiatStatus(checkRequest.checkerJobId!);
  } catch (error) {
    return {
      success: false as const,
      statusCode: 502,
      source: "cekplagiat",
      message: getExternalServiceErrorMessage(
        error,
        "Gagal mengecek status ke layanan Cekplagiat. Silakan coba lagi beberapa saat."
      ),
      data: {
        status: checkRequest.checkStatus
      }
    };
  }

  const normalizedStatus =
    remote.status === "DONE"
      ? "COMPLETED"
      : remote.status === "ERROR" || remote.status === "FAILED"
        ? "FAILED"
        : "PROCESSING";

  if (normalizedStatus === "COMPLETED") {
    let result;
    try {
      result = await getCekplagiatResult(checkRequest.checkerJobId!);
    } catch (error) {
      await prisma.checkRequest.update({
        where: { id: checkRequest.id },
        data: {
          checkStatus: "PROCESSING"
        }
      });

      return {
        success: false as const,
        statusCode: 502,
        source: "cekplagiat",
        message: getExternalServiceErrorMessage(
          error,
          "Hasil akhir dari Cekplagiat belum bisa diambil. Silakan coba lagi beberapa saat."
        ),
        data: {
          status: "PROCESSING"
        }
      };
    }

    await prisma.checkRequest.update({
      where: { id: checkRequest.id },
      data: {
        checkStatus: "COMPLETED",
        resultSummary: result.log || null,
        resultReportUrl: result.report_url || null
      }
    });
    await cleanupSourceFileForCheck(checkRequest.id);

    return {
      success: true as const,
      source: "cekplagiat",
      data: result
    };
  }

  await prisma.checkRequest.update({
    where: { id: checkRequest.id },
    data: {
      checkStatus: normalizedStatus
    }
  });

  return {
    success: true as const,
    source: "cekplagiat",
    data: remote
  };
}

let reconciliationRunning = false;

export async function reconcileCheckRequests() {
  if (reconciliationRunning) {
    return;
  }

  reconciliationRunning = true;

  try {
    const [readyToStart, processing] = await Promise.all([
      prisma.checkRequest.findMany({
        where: {
          paymentStatus: "PAID",
          sourceFileUrl: {
            not: null
          },
          checkerJobId: null,
          checkStatus: {
            in: ["PAID", "FAILED"]
          }
        },
        orderBy: {
          updatedAt: "asc"
        },
        take: 5,
        select: {
          id: true,
          checkStatus: true
        }
      }),
      prisma.checkRequest.findMany({
        where: {
          paymentStatus: "PAID",
          checkStatus: "PROCESSING",
          checkerJobId: {
            not: null
          },
          NOT: {
            checkerJobId: CHECKER_STARTING_LOCK
          }
        },
        orderBy: {
          updatedAt: "asc"
        },
        take: 10,
        select: {
          id: true
        }
      })
    ]);

    for (const item of readyToStart) {
      await startCheckIfReady(item.id, {
        resetFailedState: item.checkStatus === "FAILED"
      }).catch((error) => {
        console.error(`[Reconcile] Failed to restart checkRequest=${item.id}:`, error);
      });
    }

    for (const item of processing) {
      await syncCheckStatus(item.id).catch((error) => {
        console.error(`[Reconcile] Failed to sync checkRequest=${item.id}:`, error);
      });
    }
  } finally {
    reconciliationRunning = false;
  }
}
