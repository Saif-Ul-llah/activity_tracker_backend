import nodemailer from "nodemailer";
import { appConfig } from "./app_config";

const port = appConfig.emailPort ? appConfig.emailPort : 465;

export let transporter = nodemailer.createTransport({
  host: appConfig.emailHost || "smtp.gmail.com",
  port: port,
  secure: false,
  auth: {
    user: appConfig.emailUser,
    pass: appConfig.emailPassword,
  },
});
