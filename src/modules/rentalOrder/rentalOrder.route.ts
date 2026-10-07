import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";
import { createRentalOrderValidation } from "./rentalOrder.validation";
import { auth } from "../../middlewares/auth";
import { rentalOrderController } from "./rentalOrder.controller";

const router = Router();

router.post(
  "/",
  auth(Role.CUSTOMER),
  validateRequest(createRentalOrderValidation),
  rentalOrderController.createRentalOrder,
);


export const rentalOrderRoutes = router;