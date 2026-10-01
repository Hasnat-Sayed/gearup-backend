import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { userController } from "./user.controller";
import { registerUserValidation } from "./user.validation";

const router = Router();
router.post(
  "/register",
  validateRequest(registerUserValidation),
  userController.registerUser,
);
router.get(
  "/me",
  auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN),
  userController.getMyProfile,
);
router.patch(
  "/me",
  auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN),
  userController.updateMyProfile,
);

export const userRoutes = router;
