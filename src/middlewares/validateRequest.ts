import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { catchAsync } from "../utils/catchAsync";

export const validateRequest = (schema: ZodType) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await schema.parseAsync({ body: req.body, query: req.query, params: req.params });
    next();
  });