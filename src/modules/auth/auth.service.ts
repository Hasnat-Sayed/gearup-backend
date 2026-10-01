import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { jwtUtils } from "../../utils/jwt";

const loginUser = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
  }
  if (user.activeStatus === "SUSPENDED")
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account has been suspended.",
    );

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as SignOptions,
  );
  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return { accessToken, refreshToken, role: user.role };
};

const refreshAccessToken = async (token: string) => {
  const verified = jwtUtils.verifyToken(
    token,
    config.jwt_refresh_secret as string,
  );
  if (!verified.success)
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired refresh token.",
    );

  const { id } = verified.data as JwtPayload;
  const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (user.activeStatus === "SUSPENDED")
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account has been suspended.",
    );

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as SignOptions,
  );
  return { accessToken };
};

export const authService = { loginUser, refreshAccessToken };
