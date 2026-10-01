import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { Role } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import config from "../config";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string; email: string; role: Role };
    }
  }
}

export const auth = (...allowedRoles: Role[]) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken
      ? req.cookies.accessToken
      : req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : undefined;

    if (!token)
      throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in.");

    const verified = jwtUtils.verifyToken(
      token,
      config.jwt_access_secret as string,
    );
    if (!verified.success)
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid or expired token.");

    const { id, name, email, role } = verified.data as JwtPayload;

    if (allowedRoles.length && !allowedRoles.includes(role)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You don't have permission for this action.",
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user)
      throw new AppError(httpStatus.UNAUTHORIZED, "User no longer exists.");
    if (user.activeStatus === "SUSPENDED")
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Your account has been suspended.",
      );

    req.user = {
      id,
      name,
      email,
      role,
    };
    next();
  });
