import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { ActiveStatus, Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { IAdminUserQuery } from "./admin.interface";
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

export const adminService = {
  getAllUsersFromDB, updateUserStatusInDB
};
