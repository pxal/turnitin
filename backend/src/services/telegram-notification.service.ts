import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { fetchWithTimeout } from "../lib/http";
import { getTelegramNotificationSettings } from "./runtime-settings.service";

function escapeTelegramMarkdown(value: string) {
  return value.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export async function notifyPaidOrder(checkRequestId: string) {
  const settings = await getTelegramNotificationSettings();
  if (!settings.enabled || !settings.notifyPaidOrders || !settings.botToken || !settings.chatId) {
    return { sent: false, reason: "telegram-not-configured" as const };
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        paymentStatus: string;
        paymentNotifiedAt: Date | null;
        originalName: string;
        checkStatus: string;
        finalAmount: number;
        userFullName: string;
        userEmail: string;
        packageName: string;
        providerRef: string | null;
      }>
    >(
      Prisma.sql`
        SELECT
          cr.id,
          cr.paymentStatus,
          cr.paymentNotifiedAt,
          cr.originalName,
          cr.checkStatus,
          cr.finalAmount,
          u.fullName AS userFullName,
          u.email AS userEmail,
          p.name AS packageName,
          (
            SELECT py.providerRef
            FROM Payment py
            WHERE py.checkRequestId = cr.id
            ORDER BY py.createdAt DESC
            LIMIT 1
          ) AS providerRef
        FROM CheckRequest cr
        INNER JOIN User u ON u.id = cr.userId
        INNER JOIN Package p ON p.id = cr.packageId
        WHERE cr.id = ${checkRequestId}
        LIMIT 1
        FOR UPDATE
      `
    );

    const checkRequest = rows[0];

    if (!checkRequest) {
      return { sent: false, reason: "check-request-not-found" as const };
    }

    if (checkRequest.paymentStatus !== "PAID") {
      return { sent: false, reason: "payment-not-paid" as const };
    }

    if (checkRequest.paymentNotifiedAt) {
      return { sent: false, reason: "already-notified" as const };
    }

    const message = [
      "🔔 *Order Baru Sudah Dibayar*",
      "",
      `Invoice: \`${escapeTelegramMarkdown(checkRequest.providerRef || checkRequest.id)}\``,
      `Order ID: \`${escapeTelegramMarkdown(checkRequest.id)}\``,
      `Nama User: ${escapeTelegramMarkdown(checkRequest.userFullName)}`,
      `Email: ${escapeTelegramMarkdown(checkRequest.userEmail)}`,
      `Dokumen: ${escapeTelegramMarkdown(checkRequest.originalName)}`,
      `Paket: ${escapeTelegramMarkdown(checkRequest.packageName)}`,
      `Nominal: Rp ${escapeTelegramMarkdown(Number(checkRequest.finalAmount || 0).toLocaleString("id-ID"))}`,
      `Status Cek: ${escapeTelegramMarkdown(checkRequest.checkStatus)}`
    ].join("\n");

    const response = await fetchWithTimeout(
      `https://api.telegram.org/bot${encodeURIComponent(settings.botToken)}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: settings.chatId,
          text: message,
          parse_mode: "MarkdownV2"
        })
      }
    );

    const payload = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.description || "Gagal mengirim notifikasi Telegram.");
    }

    await tx.checkRequest.update({
      where: { id: checkRequest.id },
      data: {
        paymentNotifiedAt: new Date()
      }
    });

    return { sent: true as const };
  });
}
