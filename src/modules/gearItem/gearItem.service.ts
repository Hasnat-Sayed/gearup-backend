import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IGearItemQuery } from "./gearItem.interface";
import {
  TCreateGearItemPayload,
  TUpdateGearItemPayload,
} from "./gearItem.validation";
import { Prisma } from "../../../generated/prisma/client";

const createGearItemIntoDB = async (
  providerId: string,
  payload: TCreateGearItemPayload,
) => {
  const category = await prisma.category.findUnique({
    where: {
      id: payload.categoryId,
    },
  });

  if (!category)
    throw new AppError(httpStatus.BAD_REQUEST, "Category not found.");

  const result = await prisma.gearItem.create({
    data: {
      ...payload,
      providerId,
      quantityAvailable: payload.quantityTotal,
    },

    include: {
      category: true,
    },
  });

  return result;
};

const getAllGearItemsFromDB = async (query: IGearItemQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";

  const andConditions: Prisma.GearItemWhereInput[] = [];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: query.searchTerm, mode: "insensitive" } },
        { description: { contains: query.searchTerm, mode: "insensitive" } },
        { brand: { contains: query.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (query.category) {
    andConditions.push({
      category: { name: { equals: query.category, mode: "insensitive" } },
    });
  }

  if (query.brand) {
    andConditions.push({
      brand: { equals: query.brand, mode: "insensitive" },
    });
  }

  if (query.minPrice || query.maxPrice) {
    const priceFilter: { gte?: number; lte?: number } = {};
    if (query.minPrice) priceFilter.gte = Number(query.minPrice);
    if (query.maxPrice) priceFilter.lte = Number(query.maxPrice);
    andConditions.push({ pricePerDay: priceFilter });
  }

  if (query.availableOnly === "true") {
    andConditions.push({ quantityAvailable: { gt: 0 } });
  }

  const where: Prisma.GearItemWhereInput = andConditions.length
    ? { AND: andConditions }
    : {};

  const [data, total] = await prisma.$transaction(async (tx) => {
    const data = await tx.gearItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: true,
        provider: { select: { id: true, name: true } },
        _count: { select: { reviews: true } },
      },
    });

    const total = await tx.gearItem.count({ where });

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

const getGearItemByIdFromDB = async (id: string) => {
  const result = await prisma.gearItem.findUniqueOrThrow({
    where: {
      id,
    },
    include: {
      category: true,
      provider: {
        select: {
          id: true,
          name: true,
        },
      },
      reviews: {
        include: {
          customer: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return result;
};

const getMyGearItemsFromDB = async (
  providerId: string,
  query: IGearItemQuery,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const [data, total] = await prisma.$transaction(async (tx) => {
    const data = await tx.gearItem.findMany({
      where: {
        providerId,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });

    const total = await tx.gearItem.count({
      where: {
        providerId,
      },
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

const assertOwnership = async (
  id: string,
  providerId: string,
  role: string,
) => {
  const gearItem = await prisma.gearItem.findUniqueOrThrow({
    where: {
      id,
    },
  });

  if (gearItem.providerId !== providerId && role !== "ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only manage your own gear items.",
    );
  }
  return gearItem;
};

const updateGearItemInDB = async (
  id: string,
  providerId: string,
  role: string,
  payload: TUpdateGearItemPayload,
) => {
  const gearItem = await assertOwnership(id, providerId, role);

  if (payload.categoryId) {
    const category = await prisma.category.findUnique({
      where: {
        id: payload.categoryId,
      },
    });
    if (!category)
      throw new AppError(httpStatus.BAD_REQUEST, "Category not found.");
  }

  const delta =
    payload.quantityTotal !== undefined
      ? payload.quantityTotal - gearItem.quantityTotal
      : 0;
  if (gearItem.quantityAvailable + delta < 0) {
    const rentedOut = gearItem.quantityTotal - gearItem.quantityAvailable;
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot reduce total below the ${rentedOut} unit(s) currently rented out.`,
    );
  }

  const result = await prisma.gearItem.update({
    where: { id },
    data: {
      ...payload,
      ...(delta !== 0 && {
        quantityAvailable: {
          increment: delta,
        },
      }),
    },
  });
  return result;
};

const deleteGearItemFromDB = async (
  id: string,
  providerId: string,
  role: string,
) => {
  await assertOwnership(id, providerId, role);
  const hasHistory = await prisma.rentalOrderItem.count({
    where: {
      gearItemId: id,
    },
  });
  if (hasHistory > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This gear has rental history and cannot be deleted.",
    );
  }
  const result = await prisma.gearItem.delete({ where: { id } });
  return result;
};

export const gearItemService = {
  createGearItemIntoDB,
  getAllGearItemsFromDB,
  getGearItemByIdFromDB,
  getMyGearItemsFromDB,
  updateGearItemInDB,
  deleteGearItemFromDB,
};
