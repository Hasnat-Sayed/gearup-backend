import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { TCreateRentalOrderPayload } from "./rentalOrder.validation";
import httpStatus from "http-status";

const createRentalOrderIntoDB = async (
  customerId: string,
  payload: TCreateRentalOrderPayload,
) => {
  const days = Math.max(
    1,
    Math.ceil((payload.endDate.getTime() - payload.startDate.getTime()) / 86_400_000),
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

export const rentalOrderService = {
  createRentalOrderIntoDB,
};
