import { Request, Response } from "express";

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    errorDetails: `No route matched ${req.method} ${req.originalUrl}`,
  });
};