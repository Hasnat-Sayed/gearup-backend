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

export const paymentRoutes = router;
