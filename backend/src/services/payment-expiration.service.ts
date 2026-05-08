import { prisma } from "../lib/prisma";
import { PAYMENT_EXPIRY_SECONDS } from "./payment.service";

export async function expirePendingPayments(now = new Date()) {
  const legacyExpiryCutoff = new Date(now.getTime() - PAYMENT_EXPIRY_SECONDS * 1000);

  const expiredPayments = await prisma.payment.findMany({
    where: {
      status: "PENDING",
      OR: [
        {
          expiresAt: {
            not: null,
            lte: now
          }
        },
        {
          expiresAt: null,
          createdAt: {
            lte: legacyExpiryCutoff
          }
        }
      ]
    },
    select: {
      id: true,
      checkRequestId: true
    }
  });

  if (expiredPayments.length === 0) {
    return 0;
  }

  const paymentIds = expiredPayments.map((payment) => payment.id);
  const checkRequestIds = Array.from(new Set(expiredPayments.map((payment) => payment.checkRequestId)));

  await prisma.$transaction([
    prisma.payment.updateMany({
      where: {
        id: { in: paymentIds },
        status: "PENDING"
      },
      data: {
        status: "EXPIRED"
      }
    }),
    prisma.checkRequest.updateMany({
      where: {
        id: { in: checkRequestIds },
        paymentStatus: "PENDING"
      },
      data: {
        paymentStatus: "EXPIRED"
      }
    })
  ]);

  return expiredPayments.length;
}
