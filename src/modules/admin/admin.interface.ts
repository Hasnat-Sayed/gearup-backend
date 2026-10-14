import { Prisma } from "../../../generated/prisma/client";

export interface IAdminUserQuery extends Omit<
  Prisma.UserWhereInput,
  "role" | "activeStatus"
> {
  searchTerm?: string;
  role?: string;
  activeStatus?: string;
  page?: string;
  limit?: string;
}
