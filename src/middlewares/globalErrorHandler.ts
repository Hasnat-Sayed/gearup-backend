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
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2025": {
        statusCode = httpStatus.NOT_FOUND;
        const model = err.meta?.modelName as string | undefined;
        message = model ? `${model} not found` : "Record not found";
        break;
      }
      case "P2002": {
        statusCode = httpStatus.CONFLICT;
        const target = err.meta?.target;
        message = Array.isArray(target)
          ? `Duplicate value for: ${target.join(", ")}`
          : "A record with these details already exists";
        break;
      }
      default:
        statusCode = httpStatus.BAD_REQUEST;
        message =
          err.code === "P2003"
            ? "Related record constraint failed"
            : "Database request error";
    }
    errorDetails = err.message;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Invalid or missing fields";
  } else if (err.type === "entity.parse.failed") {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Invalid JSON in request body";
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    statusCode = httpStatus.UNAUTHORIZED;
    message = "Invalid or expired token";
  } else if (err instanceof Error) {
    message =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message;
  }

  console.error("Error:", err);
  res.status(statusCode).json({ success: false, message, errorDetails });
};
