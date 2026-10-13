import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { createReviewValidation } from "./review.validation";
import { reviewController } from "./review.controller";

const router = Router();

router.post(
  "/",
  auth(Role.CUSTOMER),
  validateRequest(createReviewValidation),
  reviewController.createReview,
);
router.get("/gear-item/:gearItemId", reviewController.getGearItemReviews);
export const reviewRoutes = router;
