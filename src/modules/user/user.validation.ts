import { z } from "zod";

export const registerUserValidation = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
    role: z.enum(["CUSTOMER", "PROVIDER"]).default("CUSTOMER"),
  }),
});

export const updateMyProfileValidation = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
  }),
});

export type TRegisterUserPayload = z.infer<typeof registerUserValidation>["body"];
export type TUpdateMyProfilePayload = z.infer<typeof updateMyProfileValidation>["body"];