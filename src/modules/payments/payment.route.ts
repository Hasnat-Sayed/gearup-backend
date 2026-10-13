import { Router } from "express";
import { paymentController } from "./payment.controller";
import { createPaymentValidation } from "./payment.validation";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";

const router = Router();

router.post("/webhook", paymentController.handleWebhook);

router.post(
  "/create",
  auth(Role.CUSTOMER),
  validateRequest(createPaymentValidation),
  paymentController.createPaymentSession,
);
router.get(
  "/",
  auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN),
  paymentController.getPayments,
);
router.get(
  "/:id",
  auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN),
  paymentController.getPaymentById,
);

export const paymentRoutes = router;
