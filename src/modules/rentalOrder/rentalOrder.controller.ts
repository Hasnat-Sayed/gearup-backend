import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { rentalOrderService } from "./rentalOrder.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { IRentalOrderQuery } from "./rentalOrder.interface";

const createRentalOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await rentalOrderService.createRentalOrderIntoDB(
    req.user!.id,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Rental order placed successfully",
    data: order,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await rentalOrderService.getMyOrdersFromDB(
    req.user!.id,
    req.query as IRentalOrderQuery,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Your orders fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getProviderOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await rentalOrderService.getProviderOrdersFromDB(
    req.user!.id,
    req.query as IRentalOrderQuery,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Incoming orders fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const rentalOrderController = {
  createRentalOrder,
  getMyOrders,
  getProviderOrders
};
