import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { IReviewQuery } from "./review.interface";
import { reviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewService.createReviewIntoDB(req.user!.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Review created successfully",
    data: review,
  });
});

const getGearItemReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewService.getGearItemReviewsFromDB(
    req.params.gearItemId as string,
    req.query as IReviewQuery,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Reviews fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const reviewController = { createReview, getGearItemReviews };
