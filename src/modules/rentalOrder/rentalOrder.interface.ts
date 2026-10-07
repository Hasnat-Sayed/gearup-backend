import { Prisma } from "../../../generated/prisma/client";

export interface IRentalOrderQuery extends Omit<
  Prisma.RentalOrderWhereInput,
  "status"
> {
  status?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
