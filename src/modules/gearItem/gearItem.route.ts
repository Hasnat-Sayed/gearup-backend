import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { gearItemController } from "./gearItem.controller";
import {
  createGearItemValidation,
  updateGearItemValidation,
} from "./gearItem.validation";

const router = Router();

router.get("/my-items", auth(Role.PROVIDER), gearItemController.getMyGearItems);

router.post(
  "/",
  auth(Role.PROVIDER),
  validateRequest(createGearItemValidation),
  gearItemController.createGearItem,
);

router.get("/", gearItemController.getAllGearItems);

router.get("/:id", gearItemController.getGearItemById);

router.patch(
  "/:id",
  auth(Role.PROVIDER, Role.ADMIN),
  validateRequest(updateGearItemValidation),
  gearItemController.updateGearItem,
);

router.delete(
  "/:id",
  auth(Role.PROVIDER, Role.ADMIN),
  gearItemController.deleteGearItem,
);

export const gearItemRoutes = router;
