import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const createCategoryIntoDB = async (name: string) => {
  const existing = await prisma.category.findUnique({ where: { name } });

  if (existing)
    throw new AppError(httpStatus.BAD_REQUEST, "This category already exists.");

  const result = await prisma.category.create({
    data: {
      name,
    },
  });

  return result;
};

const getAllCategoriesFromDB = async () => {
  const result = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
  return result;
};

const deleteCategoryFromDB = async (id: string) =>
  await prisma.category.delete({
    where: {
      id,
    },
  });

export const categoryService = {
  createCategoryIntoDB,
  getAllCategoriesFromDB,
  deleteCategoryFromDB,
};
