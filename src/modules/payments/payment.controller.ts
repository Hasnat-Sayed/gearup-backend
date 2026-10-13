import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { paymentService } from "./payment.service";
import { IPaymentQuery } from "./payment.interface";

const createPaymentSession = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.createPaymentSession(
    req.user!.id,
    req.body.rentalOrderId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payment session created successfully",
    data: result,
  });
});
const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body as Buffer;
  const signature = req.headers["stripe-signature"] as string;
  await paymentService.handleWebhook(payload, signature);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Webhook handled successfully",
    data: null,
  });
});

const getPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getPaymentsFromDB(
    req.user!.id,
    req.user!.role,
    req.query as IPaymentQuery,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payments fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getPaymentByIdFromDB(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payment fetched successfully",
    data: result,
  });
});

export const paymentController = {
  handleWebhook,
  createPaymentSession,
  getPayments,
  getPaymentById,
};
