import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
  ActiveStatus,
  RentalOrderStatus,
  Role,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import {
  IAdminGearQuery,
  IAdminRentalQuery,
  IAdminUserQuery,
} from "./admin.interface";
import { AppError } from "../../utils/AppError";
import { TUpdateUserStatusPayload } from "./admin.validation";

const getAllUsersFromDB = async (query: IAdminUserQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const where: Prisma.UserWhereInput = {
    ...(query.role && { role: query.role as Role }),
    ...(query.activeStatus && {
      activeStatus: query.activeStatus as ActiveStatus,
    }),
    ...(query.searchTerm && {
      OR: [
        {
          name: { contains: query.searchTerm, mode: "insensitive" },
        },
        {
          email: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
      ],
    }),
  };

  const [data, total] = await prisma.$transaction(async (tx) => {
    const data = await tx.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      omit: { password: true },
    });
    const total = await tx.user.count({ where });
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

const updateUserStatusInDB = async (
  targetUserId: string,
  adminId: string,
  payload: TUpdateUserStatusPayload,
) => {
  if (targetUserId === adminId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot change your own account status.",
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: targetUserId },
  });
  if (user.role === "ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Admin accounts cannot be suspended.",
    );
  }

  const result = await prisma.user.update({
    where: { id: targetUserId },
    data: { activeStatus: payload.activeStatus },
    omit: { password: true },
  });
  return result;
};

const getAllGearItemsFromDB = async (query: IAdminGearQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const where: Prisma.GearItemWhereInput = query.searchTerm
    ? {
        OR: [
          {
            name: {
              contains: query.searchTerm,
              mode: "insensitive",
            },
          },
          {
            brand: { contains: query.searchTerm, mode: "insensitive" },
          },
        ],
      }
    : {};

  const [data, total] = await prisma.$transaction(async (tx) => {
    const data = await tx.gearItem.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        provider: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });
    const total = await tx.gearItem.count({ where });
    return [data, total];
  });

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getAllRentalsFromDB = async (query: IAdminRentalQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const where: Prisma.RentalOrderWhereInput = {
    ...(query.status && { status: query.status as RentalOrderStatus }),
  };

  const [data, total] = await prisma.$transaction(async (tx) => {
    const data = await tx.rentalOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            gearItem: true,
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

export const adminService = {
  getAllUsersFromDB,
  updateUserStatusInDB,
  getAllGearItemsFromDB,
  getAllRentalsFromDB,
};
