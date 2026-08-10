import * as dotenv from "dotenv";
dotenv.config();

interface AppConfig {
  port: number;
  dbUrl: string;
  jwtSecret: string;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  deviceTokenSecret: string;
  appUrl: string;
  corsOrigins: string[];
  googleMapsKey: string;
  emailUser: string;
  emailPassword: string;
  emailHost: string;
  emailPort: number;
  emailTo: string;
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint: string;
    publicBase: string;
  };
}

// ACCESS_TOKEN_SECRET is authoritative for the user access token. JWT_SECRET is kept
// only as a legacy alias so old deployments keep working; both fall back to each other.
const accessTokenSecret =
  process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "secret";

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || "5000", 10),
  dbUrl:
    process.env.MONGO_URI ||
    process.env.DB_URL ||
    "mongodb://localhost:27017/ts_boiler_plate_mern",
  jwtSecret: accessTokenSecret,
  accessTokenSecret,
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_SECRET || accessTokenSecret + "-refresh",
  deviceTokenSecret:
    process.env.DEVICE_TOKEN_SECRET || accessTokenSecret + "-device",
  appUrl: process.env.APP_URL || "http://localhost:5000",
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  emailUser: process.env.EMAIL_USER || "email",
  emailPassword: process.env.EMAIL_PASSWORD || "password",
  emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
  emailPort: parseInt(process.env.EMAIL_PORT || "465", 10),
  emailTo: process.env.EMAIL_TO || "fullstackwebsitedeveloper11@gmail.com",
  googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || "",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET || "",
    endpoint:
      process.env.R2_ENDPOINT ||
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : ""),
    publicBase: process.env.R2_PUBLIC_BASE || "",
  },
};
