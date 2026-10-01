import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { categoryController } from "./category.controller";
import { createCategoryValidation } from "./category.validation";

const router = Router();
router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(createCategoryValidation),
  categoryController.createCategory,
);
router.get("/", categoryController.getAllCategories);
router.delete("/:id", auth(Role.ADMIN), categoryController.deleteCategory);

export const categoryRoutes = router;
