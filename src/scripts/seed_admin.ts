/**
 * Bootstrap the first admin on a fresh database. Public self-registration is
 * disabled, so this is how the very first account is created; afterwards, admins
 * create users from the admin panel.
 *
 * Usage:
 *   SEED_EMAIL=you@co.com SEED_PASSWORD='strongpass' SEED_NAME='You' \
 *     npx ts-node src/scripts/seed_admin.ts
 *
 * Reads MONGO_URI from the environment (or .env). Idempotent-ish: refuses to run if
 * the email already exists.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { appConfig } from "../config/app_config";
import { UserModel } from "../models/user_model";
import { encryptPass } from "../utils/helpers";

async function main() {
  const email = (process.env.SEED_EMAIL || "").toLowerCase().trim();
  const password = process.env.SEED_PASSWORD || "";
  const fullName = process.env.SEED_NAME || "Admin";
  const phoneNumber = process.env.SEED_PHONE || "0000000000";

  if (!email || !password) {
    console.error("Set SEED_EMAIL and SEED_PASSWORD environment variables.");
    process.exit(1);
  }

  await mongoose.connect(appConfig.dbUrl);

  const existing = await UserModel.findOne({ email });
  if (existing) {
    console.error(`A user with ${email} already exists — nothing to do.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const user = await UserModel.create({
    email,
    password: await encryptPass(password),
    fullName,
    phoneNumber,
    role: "ADMIN",
    IsActive: true,
  });

  console.log(`Created ADMIN ${user.email} (id ${user.id}).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
