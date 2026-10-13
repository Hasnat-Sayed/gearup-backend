import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { TCreateReviewPayload } from "./review.validation";

const createReviewIntoDB = async (
  customerId: string,
  payload: TCreateReviewPayload,
) => {
  const result = await prisma.$transaction(async (tx) => {
    await tx.gearItem.findUniqueOrThrow({
      where: {
        id: payload.gearItemId,
      },
    });

    const returnedOrder = await tx.rentalOrder.findFirst({
      where: {
        customerId,
        status: "RETURNED",
        items: {
          some: {
            gearItemId: payload.gearItemId,
          },
        },
      },
    });
    if (!returnedOrder) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only review gear that you have rented and returned.",
      );
    }

    const existing = await tx.review.findFirst({
      where: {
        customerId,
        gearItemId: payload.gearItemId,
      },
    });
    if (existing) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You have already reviewed this gear item.",
      );
    }

    const review = await tx.review.create({
      data: {
        ...payload,
        customerId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return review;
  });

  return result;
};

export const reviewService = { createReviewIntoDB };
