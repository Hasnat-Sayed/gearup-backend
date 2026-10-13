import Stripe from "stripe";
import { prisma } from "../../lib/prisma";

export const handleCheckoutCompleted = async (
  session: Stripe.Checkout.Session,
) => {
  if (session.payment_status !== "paid") return;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: {
        transactionId: session.id,
      },
    });

    if (!payment || payment.status === "COMPLETED") return;

    await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "COMPLETED",
        paidAt: new Date(),
        method: session.payment_method_types?.[0] ?? "card",
      },
    });

    await tx.rentalOrder.updateMany({
      where: {
        id: payment.rentalOrderId,
        status: "CONFIRMED",
      },
      data: {
        status: "PAID",
      },
    });
  });
};

export const handleCheckoutFailed = async (
  session: Stripe.Checkout.Session,
) => {
  await prisma.payment.updateMany({
    where: {
      transactionId: session.id,
      status: "PENDING",
    },
    data: {
      status: "FAILED",
    },
  });
};
