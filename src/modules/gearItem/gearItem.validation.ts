import { z } from "zod";

export const createGearItemValidation = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters"),
    brand: z.string().optional(),
    images: z
      .array(z.string().url("Each image must be a valid URL"))
      .min(1, "At least one image is required"),
    pricePerDay: z.number().positive("Price must be a positive number"),
    quantityTotal: z
      .number()
      .int()
      .positive("Quantity must be a positive integer"),
    categoryId: z.string().uuid("Invalid category ID"),
  }),
});

export const updateGearItemValidation = z.object({
  body: createGearItemValidation.shape.body.partial(),
});

export type TCreateGearItemPayload = z.infer<typeof createGearItemValidation>["body"];
export type TUpdateGearItemPayload = z.infer<typeof updateGearItemValidation>["body"];
