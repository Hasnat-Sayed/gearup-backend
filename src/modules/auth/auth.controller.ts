import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { authService } from "./auth.service";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none" as const,
};

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, role } = await authService.loginUser(
    req.body,
  );
  res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 864e5 });
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 6048e5,
  });
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Logged in successfully",
    data: { accessToken, refreshToken, role },
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { accessToken } = await authService.refreshAccessToken(
    req.cookies?.refreshToken,
  );
  res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 864e5 });
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Access token refreshed",
    data: { accessToken },
  });
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Logged out successfully",
    data: null,
  });
});

export const authController = { loginUser, refreshToken, logoutUser };
