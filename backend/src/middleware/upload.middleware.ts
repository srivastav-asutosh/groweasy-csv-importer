import multer from "multer";
import { env } from "../config/env.js";

const storage = multer.memoryStorage();

export const csvUpload = multer({
  storage,
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/octet-stream" ||
      file.originalname.toLowerCase().endsWith(".csv");

    if (!isCsv) {
      cb(new Error("Only .csv files are accepted."));
      return;
    }
    cb(null, true);
  },
});
