import { Prisma } from "../../../generated/prisma/client";

export interface IGearItemQuery
  extends Omit<Prisma.GearItemWhereInput, "category"> {
  searchTerm?: string;
  category?: string;  
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  availableOnly?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}