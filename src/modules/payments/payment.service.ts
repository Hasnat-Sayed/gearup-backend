import httpStatus from "http-status";
import Stripe from "stripe";
import { PaymentStatus } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import { AppError } from "../../utils/AppError";
import { IPaymentQuery } from "./payment.interface";
import { handleCheckoutCompleted, handleCheckoutFailed } from "./payment.utils";

const createPaymentSession = async (customerId: string, rentalOrderId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.findUniqueOrThrow({
      where: { id: rentalOrderId },
      include: { items: { include: { gearItem: true } }, payment: true },
    });

    if (order.customerId !== customerId) {
      throw new AppError(httpStatus.FORBIDDEN, "You can only pay for your own orders.");
    }
    if (order.status !== "CONFIRMED") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Order must be CONFIRMED by the provider before payment. Current status: ${order.status}.`,
      );
    }
    if (order.payment?.status === "COMPLETED") {
      throw new AppError(httpStatus.BAD_REQUEST, "This order is already paid.");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: order.items.map((item) => ({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(item.subtotal) * 100),
          product_data: { name: `${item.gearItem.name} x ${item.quantity}` },
        },
      })),
      success_url: `${config.app_url}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.app_url}/payment/cancel`,
      metadata: { rentalOrderId: order.id, customerId },
    });

    // retry-safe: one Payment row per order, pointed at the latest session
    await tx.payment.upsert({
      where: { rentalOrderId: order.id },
      update: { transactionId: session.id, amount: order.totalAmount, status: "PENDING" },
      create: {
        rentalOrderId: order.id,
        transactionId: session.id,
        amount: order.totalAmount,
        provider: "STRIPE",
        status: "PENDING",
      },
    });

    return { paymentUrl: session.url, sessionId: session.id };
  });

  return result;
};

const handleWebhook = async (payload: Buffer, signature: string) => {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, config.stripe_webhook_secret);
  } catch (err: any) {
    throw new AppError(httpStatus.BAD_REQUEST, `Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      await handleCheckoutFailed(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      console.log(`No events matched. Unhandled event type ${event.type}.`);
  }
};



export const paymentService = {
  createPaymentSession,
  handleWebhook,

};