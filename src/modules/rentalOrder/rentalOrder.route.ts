import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";
import { createRentalOrderValidation, updateOrderStatusValidation } from "./rentalOrder.validation";
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

router.patch(
  "/:id/cancel",
  auth(Role.CUSTOMER),
  rentalOrderController.cancelOrder,
);
router.patch(
  "/:id/status",
  auth(Role.PROVIDER, Role.ADMIN),
  validateRequest(updateOrderStatusValidation),
  rentalOrderController.updateOrderStatus,
);

export const rentalOrderRoutes = router;
