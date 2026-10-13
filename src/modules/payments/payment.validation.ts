import { z } from "zod";

export const createPaymentValidation = z.object({
  body: z.object({
    rentalOrderId: z.string().uuid("Invalid rental order ID"),
  }),
});

export const confirmPaymentValidation = z.object({
  body: z.object({
    sessionId: z.string().min(1, "sessionId is required"),
  }),
});

export type TCreatePaymentPayload = z.infer<
  typeof createPaymentValidation
>["body"];
export type TConfirmPaymentPayload = z.infer<
  typeof confirmPaymentValidation
>["body"];
