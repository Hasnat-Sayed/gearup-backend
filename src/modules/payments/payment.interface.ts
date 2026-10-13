import { Prisma } from "../../../generated/prisma/client";

export interface IPaymentQuery extends Omit<
  Prisma.PaymentWhereInput,
  "status"
> {
  status?: string;
  page?: string;
  limit?: string;
}
