import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { adminController } from "./admin.controller";

const router = Router();

router.use(auth(Role.ADMIN)); 

router.get("/users", adminController.getAllUsers);

export const adminRoutes = router;