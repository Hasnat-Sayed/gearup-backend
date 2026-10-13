import { z } from "zod";

export const createRentalOrderValidation = z.object({
  body: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      items: z
        .array(
          z.object({
            gearItemId: z.string().uuid("Invalid gear item ID"),
            quantity: z
              .number()
              .int()
              .positive("Quantity must be a positive integer"),
          }),
        )
        .min(1, "At least one gear item is required"),
    })
    .refine((data) => data.endDate > data.startDate, {
      message: "endDate must be after startDate",
      path: ["endDate"],
    }),
});

export const updateOrderStatusValidation = z.object({
  body: z.object({
    status: z.enum(["CONFIRMED", "PICKED_UP", "RETURNED"], {
      message: "Status must be one of: CONFIRMED, PICKED_UP, RETURNED",
    }),
  }),
});

export type TCreateRentalOrderPayload = z.infer<
  typeof createRentalOrderValidation
>["body"];
export type TUpdateOrderStatusPayload = z.infer<
  typeof updateOrderStatusValidation
>["body"];
