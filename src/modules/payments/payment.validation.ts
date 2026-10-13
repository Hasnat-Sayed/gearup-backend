import { z } from "zod";

export const createPaymentValidation = z.object({
  body: z.object({
    rentalOrderId: z.string().uuid("Invalid rental order ID"),
  }),
});


export type TCreatePaymentPayload = z.infer<
  typeof createPaymentValidation
>["body"];
