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

const createPaymentSession = async (
  customerId: string,
  rentalOrderId: string,
) => {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.findUniqueOrThrow({
      where: {
        id: rentalOrderId,
      },
      include: {
        items: {
          include: {
            gearItem: true,
          },
        },
        payment: true,
      },
    });

    if (order.customerId !== customerId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only pay for your own orders.",
      );
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
          product_data: {
            name: `${item.gearItem.name} x ${item.quantity}`,
          },
        },
      })),
      success_url: `${config.app_url}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.app_url}/payment/cancel`,
      metadata: { rentalOrderId: order.id, customerId },
    });

    await tx.payment.upsert({
      where: {
        rentalOrderId: order.id,
      },
      update: {
        transactionId: session.id,
        amount: order.totalAmount,
        status: "PENDING",
      },
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
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe_webhook_secret,
    );
  } catch (err: any) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Webhook signature verification failed: ${err.message}`,
    );
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      await handleCheckoutFailed(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      console.log(`No events matched. Unhandled event type ${event.type}.`);
  }
};

const confirmPayment = async (
  sessionId: string,
  userId: string,
  role: string,
) => {
  const payment = await prisma.payment.findUnique({
    where: {
      transactionId: sessionId,
    },
    include: {
      rentalOrder: true,
    },
  });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found.");
  if (payment.rentalOrder.customerId !== userId && role !== "ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You don't have access to this payment.",
    );
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  await handleCheckoutCompleted(session);

  const result = await prisma.payment.findUniqueOrThrow({
    where: {
      id: payment.id,
    },
    include: {
      rentalOrder: true,
    },
  });
  return result;
};

const getPaymentsFromDB = async (
  userId: string,
  role: string,
  query: IPaymentQuery,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const roleFilter: Prisma.PaymentWhereInput =
    role === "ADMIN"
      ? {}
      : role === "PROVIDER"
        ? {
            rentalOrder: {
              items: {
                some: {
                  gearItem: {
                    providerId: userId,
                  },
                },
              },
            },
          }
        : {
            rentalOrder: {
              customerId: userId,
            },
          };

  const where: Prisma.PaymentWhereInput = {
    ...roleFilter,
    ...(query.status && { status: query.status as PaymentStatus }),
  };

  const [data, total] = await prisma.$transaction(async (tx) => {
    const data = await tx.payment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        rentalOrder: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });
    const total = await tx.payment.count({ where });
    return [data, total];
  });

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getPaymentByIdFromDB = async (
  id: string,
  userId: string,
  role: string,
) => {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id },
    include: {
      rentalOrder: {
        include: {
          items: {
            include: {
              gearItem: true,
            },
          },
        },
      },
    },
  });

  const isOwner = payment.rentalOrder.customerId === userId;
  const isProvider = payment.rentalOrder.items.some(
    (i) => i.gearItem.providerId === userId,
  );
  if (!isOwner && !isProvider && role !== "ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You don't have access to this payment.",
    );
  }
  return payment;
};

export const paymentService = {
  createPaymentSession,
  handleWebhook,
  confirmPayment,
  getPaymentsFromDB,
  getPaymentByIdFromDB,
};
