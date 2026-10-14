import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { adminController } from "./admin.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { updateUserStatusValidation } from "./admin.validation";

const router = Router();

router.use(auth(Role.ADMIN)); 

router.get("/users", adminController.getAllUsers);
router.patch("/users/:id", validateRequest(updateUserStatusValidation), adminController.updateUserStatus);

export const adminRoutes = router;