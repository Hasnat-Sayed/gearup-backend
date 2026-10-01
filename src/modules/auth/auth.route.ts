import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { authController } from "./auth.controller";
import { loginValidation } from "./auth.validation";

const router = Router();
router.post(
  "/login",
  validateRequest(loginValidation),
  authController.loginUser,
);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logoutUser);

export const authRoutes = router;
