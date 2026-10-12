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

router.get(
  "/my-orders",
  auth(Role.CUSTOMER),
  rentalOrderController.getMyOrders,
);

router.get(
  "/provider-orders",
  auth(Role.PROVIDER),
  rentalOrderController.getProviderOrders,
);

router.get(
  "/:id",
  auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN),
  rentalOrderController.getOrderById,
);

export const rentalOrderRoutes = router;
