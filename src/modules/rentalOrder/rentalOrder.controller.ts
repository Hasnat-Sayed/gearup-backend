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

const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const order = await rentalOrderService.getOrderByIdFromDB(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Order fetched successfully",
    data: order,
  });
});

const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await rentalOrderService.cancelOrderInDB(
    req.params.id as string ,
    req.user!.id,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Order cancelled successfully",
    data: order,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const order = await rentalOrderService.updateOrderStatusInDB(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
    req.body.status,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Order marked as ${req.body.status}`,
    data: order,
  });
});

export const rentalOrderController = {
  createRentalOrder,
  getMyOrders,
  getProviderOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
};
