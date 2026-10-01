import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../utils/AppError";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message: string = "Something went wrong";
  let errorDetails: unknown = err.message;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorDetails = err.errorDetails ?? err.message;
  } else if (err instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Validation failed";
    errorDetails = err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Invalid or missing fields";
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = httpStatus.BAD_REQUEST;
    message =
      err.code === "P2002"
        ? `Duplicate value for: ${(err.meta?.target as string[])?.join(", ")}`
        : err.code === "P2003"
          ? "Foreign key constraint failed"
          : err.code === "P2025"
            ? "Record not found"
            : "Database request error";
    errorDetails = err.message;
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    statusCode = httpStatus.UNAUTHORIZED;
    message = "Invalid or expired token";
  } else if (err instanceof Error) {
    message = err.message;
  }

  console.error("Error:", err);
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errorDetails,
  });
};
