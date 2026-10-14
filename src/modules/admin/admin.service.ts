import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { ActiveStatus, Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { IAdminUserQuery } from "./admin.interface";

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

export const adminService = {
  getAllUsersFromDB,
};
