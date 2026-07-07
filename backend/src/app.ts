import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { importRouter } from "./routes/import.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(morgan("dev"));
  app.use(express.json());

  app.use("/api", healthRouter);
  app.use("/api", importRouter);

  app.use(errorMiddleware);

  return app;
}
