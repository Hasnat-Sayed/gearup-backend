import { z } from "zod";

export const createReviewValidation = z.object({
  body: z.object({
    gearItemId: z.string().uuid("Invalid gear item ID"),
    rating: z
      .number()
      .int()
      .min(1, "Rating must be between 1 and 5")
      .max(5, "Rating must be between 1 and 5"),
    comment: z
      .string()
      .min(3, "Comment must be at least 3 characters")
      .optional(),
  }),
});

export type TCreateReviewPayload = z.infer<
  typeof createReviewValidation
>["body"];
