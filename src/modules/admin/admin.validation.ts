import { z } from "zod";

export const updateUserStatusValidation = z.object({
  body: z.object({
    activeStatus: z.enum(["ACTIVE", "SUSPENDED"], {
      message: "activeStatus must be ACTIVE or SUSPENDED",
    }),
  }),
});

export type TUpdateUserStatusPayload = z.infer<
  typeof updateUserStatusValidation
>["body"];
