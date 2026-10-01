import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const registerUserIntoDB = async (payload: any) => {
  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (existing)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A user with this email already exists.",
    );

  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds),
  );

  return prisma.user.create({
    data: {
      ...payload,
      password: hashedPassword,
      role: payload.role ?? "CUSTOMER",
    },
    omit: { password: true },
  });
};

const getMyProfileFromDB = (userId: string) =>
  prisma.user.findUniqueOrThrow({
    where: { id: userId },
    omit: { password: true },
  });

const updateMyProfileInDB = (userId: string, payload: any) =>
  prisma.user.update({
    where: { id: userId },
    data: { name: payload.name, phone: payload.phone },
    omit: { password: true },
  });

export const userService = {
  registerUserIntoDB,
  getMyProfileFromDB,
  updateMyProfileInDB,
};
