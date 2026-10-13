import { Prisma, RentalOrderStatus } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IRentalOrderQuery } from "./rentalOrder.interface";
import { TCreateRentalOrderPayload } from "./rentalOrder.validation";
import httpStatus from "http-status";

const createRentalOrderIntoDB = async (
  customerId: string,
  payload: TCreateRentalOrderPayload,
) => {
  const days = Math.max(
    1,
    Math.ceil(
      (payload.endDate.getTime() - payload.startDate.getTime()) / 86_400_000,
    ),
  );

  const result = await prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const orderItemsData: Prisma.RentalOrderItemCreateManyRentalOrderInput[] =
      [];

    for (const item of payload.items) {
      const gearItem = await tx.gearItem.findUniqueOrThrow({
        where: {
          id: item.gearItemId,
        },
      });

      if (gearItem.quantityAvailable < item.quantity) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Only ${gearItem.quantityAvailable} unit(s) of "${gearItem.name}" are available.`,
        );
      }

      await tx.gearItem.update({
        where: {
          id: item.gearItemId,
        },
        data: {
          quantityAvailable: {
            decrement: item.quantity,
          },
        },
      });

      const pricePerDay = Number(gearItem.pricePerDay);
      const subtotal = pricePerDay * item.quantity * days;
      totalAmount += subtotal;

      orderItemsData.push({
        gearItemId: item.gearItemId,
        quantity: item.quantity,
        pricePerDay,
        subtotal,
      });
    }

    const order = await tx.rentalOrder.create({
      data: {
        customerId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        totalAmount,
        items: {
          createMany: {
            data: orderItemsData,
          },
        },
      },

      include: {
        items: {
          include: {
            gearItem: true,
          },
        },
      },
    });

    return order;
  });

  return result;
};

const getMyOrdersFromDB = async (
  customerId: string,
  query: IRentalOrderQuery,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const where: Prisma.RentalOrderWhereInput = {
    customerId,
    ...(query.status && {
      status: query.status as RentalOrderStatus,
    }),
  };

  const [data, total] = await prisma.$transaction(async (tx) => {
    const data = await tx.rentalOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: "desc",
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
    const total = await tx.rentalOrder.count({
      where,
    });
    return [data, total];
  });

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getProviderOrdersFromDB = async (
  providerId: string,
  query: IRentalOrderQuery,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const where: Prisma.RentalOrderWhereInput = {
    items: {
      some: {
        gearItem: {
          providerId,
        },
      },
    },
    ...(query.status && {
      status: query.status as RentalOrderStatus,
    }),
  };

  const [data, total] = await prisma.$transaction(async (tx) => {
    const data = await tx.rentalOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            gearItem: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        payment: true,
      },
    });
    const total = await tx.rentalOrder.count({ where });
    return [data, total];
  });

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getOrderByIdFromDB = async (id: string, userId: string, role: string) => {
  const order = await prisma.rentalOrder.findUniqueOrThrow({
    where: {
      id,
    },
    include: {
      items: {
        include: {
          gearItem: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      payment: true,
    },
  });

  const isOwner = order.customerId === userId;
  const isProviderOfAnItem = order.items.some(
    (item) => item.gearItem.providerId === userId,
  );

  if (!isOwner && !isProviderOfAnItem && role !== "ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You don't have access to this order.",
    );
  }

  return order;
};

const cancelOrderInDB = async (id: string, customerId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        items: true,
      },
    });

    if (order.customerId !== customerId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only cancel your own orders.",
      );
    }
    if (order.status !== "PLACED") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot cancel an order that is already ${order.status}.`,
      );
    }

    for (const item of order.items) {
      await tx.gearItem.update({
        where: {
          id: item.gearItemId,
        },
        data: {
          quantityAvailable: {
            increment: item.quantity,
          },
        },
      });
    }

    return tx.rentalOrder.update({
      where: {
        id,
      },
      data: {
        status: "CANCELLED",
      },
    });
  });

  return result;
};

const VALID_TRANSITIONS: Record<string, RentalOrderStatus> = {
  PLACED: "CONFIRMED",
  PAID: "PICKED_UP",
  PICKED_UP: "RETURNED",
};

const updateOrderStatusInDB = async (
  id: string,
  providerId: string,
  role: string,
  nextStatus: RentalOrderStatus,
) => {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        items: true,
      },
    });

    const ownsAnItem = await tx.gearItem.findFirst({
      where: {
        id: {
          in: order.items.map((i) => i.gearItemId),
        },
        providerId,
      },
    });
    
    if (!ownsAnItem && role !== "ADMIN") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You don't manage any item in this order.",
      );
    }

    const expectedCurrentStatus = Object.keys(VALID_TRANSITIONS).find(
      (key) => VALID_TRANSITIONS[key] === nextStatus,
    );
    if (order.status !== expectedCurrentStatus) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot move an order from ${order.status} to ${nextStatus}.`,
      );
    }

    if (nextStatus === "RETURNED") {
      for (const item of order.items) {
        await tx.gearItem.update({
          where: {
            id: item.gearItemId,
          },
          data: {
            quantityAvailable: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    return tx.rentalOrder.update({
      where: {
        id,
      },
      data: {
        status: nextStatus,
      },
    });
  });

  return result;
};

export const rentalOrderService = {
  createRentalOrderIntoDB,
  getMyOrdersFromDB,
  getProviderOrdersFromDB,
  getOrderByIdFromDB,
  cancelOrderInDB,
  updateOrderStatusInDB,
};
