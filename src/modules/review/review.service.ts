import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { TCreateReviewPayload } from "./review.validation";
import { IReviewQuery } from "./review.interface";

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

const getGearItemReviewsFromDB = async (
  gearItemId: string,
  query: IReviewQuery,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const [data, total] = await prisma.$transaction(async (tx) => {
    const data = await tx.review.findMany({
      where: { gearItemId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: "desc",
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

    const total = await tx.review.count({
      where: { gearItemId },
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

export const reviewService = { createReviewIntoDB, getGearItemReviewsFromDB };
