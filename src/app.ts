import express, { Application, Request, Response } from "express";

import "dotenv/config";
import cookieParser from "cookie-parser";
import config from "./config";
import cors from "cors";
import { notFound } from "./middlewares/notFound";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { userRoutes } from "./modules/user/user.route";
import { authRoutes } from "./modules/auth/auth.route";
import { categoryRoutes } from "./modules/category/category.route";
import { gearItemRoutes } from "./modules/gearItem/gearItem.route";
import { rentalOrderRoutes } from "./modules/rentalOrder/rentalOrder.route";
import { paymentRoutes } from "./modules/payments/payment.route";

const app: Application = express();

app.use(
  cors({
    origin: config.app_url,
    credentials: true,
  }),
);

app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World!");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/gear-items", gearItemRoutes);
app.use("/api/rental-orders", rentalOrderRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
