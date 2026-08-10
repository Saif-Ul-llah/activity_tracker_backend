import nodemailer, { Transporter } from "nodemailer";
import { SendMail } from "../imports";


export const sendMail = async ({
 email,
 subject,
 html,
}: SendMail): Promise<void> => {
  try {
    const transporter: Transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    throw new Error("Error sending OTP");
  }
};
