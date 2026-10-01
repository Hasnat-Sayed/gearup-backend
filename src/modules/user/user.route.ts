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


export const userRoutes = router;
