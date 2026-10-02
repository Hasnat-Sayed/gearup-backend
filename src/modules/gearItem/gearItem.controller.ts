import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { gearItemService } from "./gearItem.service";
import { IGearItemQuery } from "./gearItem.interface";

const createGearItem = catchAsync(async (req: Request, res: Response) => {
  const gearItem = await gearItemService.createGearItemIntoDB(
    req.user!.id,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Gear item created successfully",
    data: gearItem,
  });
});

const getAllGearItems = catchAsync(async (req: Request, res: Response) => {
  const result = await gearItemService.getAllGearItemsFromDB(
    req.query as IGearItemQuery,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Gear items fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getGearItemById = catchAsync(async (req: Request, res: Response) => {
  const gearItem = await gearItemService.getGearItemByIdFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Gear item fetched successfully",
    data: gearItem,
  });
});

const getMyGearItems = catchAsync(async (req: Request, res: Response) => {
  const result = await gearItemService.getMyGearItemsFromDB(
    req.user!.id,
    req.query as IGearItemQuery,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Your gear items fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateGearItem = catchAsync(async (req: Request, res: Response) => {
  const updated = await gearItemService.updateGearItemInDB(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Gear item updated successfully",
    data: updated,
  });
});

const deleteGearItem = catchAsync(async (req: Request, res: Response) => {
  await gearItemService.deleteGearItemFromDB(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
  );
  
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Gear item deleted successfully",
    data: null,
  });
});

export const gearItemController = {
  createGearItem,
  getAllGearItems,
  getGearItemById,
  getMyGearItems,
  updateGearItem,
  deleteGearItem,
};
