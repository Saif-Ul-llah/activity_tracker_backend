import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";
import path from "path";
import fs, { stat } from "fs";
import { appConfig, Response, dotenv, SendOtpOptions } from "../imports";
dotenv.config();

interface ApiResponse {
  data: object;
  message: string;
  status?: string;
}

export async function encryptPass(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);
  return hashPassword;
}

export async function comparePassword(
  password: string,
  hashPassword: string | null
): Promise<boolean> {
  if (hashPassword === null) {
    console.error("No password found");
    return false;
  }
  let isPasswordValid = await bcrypt.compare(password, hashPassword);
  return isPasswordValid;
}

export async function generateToken(payload: any) {
  return jwt.sign(payload, appConfig.jwtSecret, { expiresIn: "30d" });
}

export const sendResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: object = {},
  status?: string
) => {
  const response: ApiResponse = {
    status,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

export function decryptToken(token: string) {
  try {
    let decoded = jwt.verify(token, appConfig.jwtSecret);
    return decoded;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

export function parseInt(id: any): number {
  let intId = parseInt(id);
  return intId;
}

export const trim = (str: string) => {
  return str.replace(/\s+/g, "");
};

export const getCurrentDate = () => {
  let date = new Date();
  return date;
};

export const getCurrentTime = () => {
  let time = new Date();
  return time;
};

export async function generateOTP() {
  let OTP = Math.floor(100000 + Math.random() * 900000);
  return OTP;
}

export function getSignUpHtml(fullName: string, otp: string) {
  return `
              <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
              <div style="margin:50px auto;width:70%;padding:20px 0">
              <div style="border-bottom:1px solid #eee">
                  <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Grabby</a>
              </div>
              <p style="font-size:1.1em">Hi, ${fullName} </p>
              <p>Thank you for Joining 4Ways. Use the following OTP to complete your Sign Up procedures. OTP is valid for 15 minutes</p>
              <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
              <p style="font-size:0.9em;">Regards,<br />4Ways</p>
              <hr style="border:none;border-top:1px solid #eee" />
              <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                  <p>4Ways</p>
              </div>
              </div>
          </div>
       `;
}

export function getEmailVerificationHtml({
  otp,
  validMinutes,
  userName = "",
  sendDate = new Date().toLocaleDateString(),
  year = new Date().getFullYear(),
}: SendOtpOptions) {
  const otpSpaced = otp.split("").join(" ");
  return `
  <!doctype html>
  <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Solar Energy | Verification Code</title>
    <meta name="x-apple-disable-message-reformatting" />
    <style>
      @media (max-width: 600px) {
        .container { width: 100% !important; }
        .card { border-radius: 16px !important; }
        .otp { font-size: 26px !important; letter-spacing: .25em !important; }
        .btns { display:block !important; }
        .btn { display:block !important; width:100% !important; margin-bottom:12px !important; }
      }
      a.btn:hover { opacity: 0.9 !important; }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#F9FAFB; color:#111827; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

    <!-- Hidden preview text -->
    <div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
      Your Solar Energy verification code: ${otp}. Expires in ${validMinutes} minutes.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px;">

            <!-- Header -->
            <tr>
              <td style="padding:16px 20px; background:#10a0b9; border-radius:16px 16px 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" style="font-size:18px; font-weight:700; color:#FFFFFF;">
                      Solar Energy
                    </td>
                    <td align="right" style="font-size:12px; color:#E6FFF4;">
                      ${sendDate}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main Card -->
            <tr>
              <td class="card" style="background:#FFFFFF; border:1px solid #E5E7EB; border-top:0; border-radius:0 0 16px 16px; box-shadow:0 4px 14px rgba(0,0,0,0.08); padding:0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  
                  <!-- Title -->
                  <tr>
                    <td style="padding:28px 28px 12px 28px;">
                      <h1 style="margin:0; font-size:22px; font-weight:800; color:#111827;">
                        Email Verification Required
                      </h1>
                      <p style="margin:8px 0 0 0; font-size:15px; line-height:22px; color:#374151;">
                        Hello ${userName ? userName + "," : ""} please use the code below to verify your email address for <strong>Solar Energy</strong>. 
                        This code will expire in <strong style="color:#111827;">${validMinutes} minutes</strong>.
                      </p>
                    </td>
                  </tr>

                  <!-- OTP -->
                  <tr>
                    <td style="padding:20px 28px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6; border:1px solid #E5E7EB; border-radius:12px;">
                        <tr>
                          <td align="center" style="padding:28px 16px;">
                            <div class="otp" style="display:inline-block; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace; font-size:38px; font-weight:800; letter-spacing:.4em; color:#10a0b9;">
                              ${otpSpaced}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Security note -->
                  <tr>
                    <td style="padding:12px 28px 28px 28px;">
                      <p style="margin:0; font-size:13px; line-height:20px; color:#6B7280;">
                        For your security, never share this code with anyone. If you did not request this, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="height:4px; background:#10a0b9; border-radius:0 0 16px 16px;"></td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 16px; font-size:12px; line-height:18px; color:#6B7280;">
                © ${year} Solar Energy. All rights reserved.
                <br/>
                You’re receiving this email because a verification was requested for your account.
                <br/>
                <a href="mailto:support@solarenergy.com" style="color:#10a0b9; text-decoration:none;">Contact Support</a>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}


const ACCESS_SECRET = appConfig.accessTokenSecret;
const REFRESH_SECRET = appConfig.refreshTokenSecret;

export const generateAccessToken = (payload: object) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
};

export const generateRefreshToken = (payload: object) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET);
};

export const comparePass = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// ── Desktop-agent device tokens ───────────────────────────────────────────────
// Long-lived, revocable tokens issued to a specific device. Signed with a secret
// distinct from the user tokens so an agent token can never be used as a user token.

export interface DeviceTokenPayload {
  deviceId: string;
  userId: string;
  tokenId: string; // must match device.tokenId on the server (revocation handle)
  scope: string[];
}

export const generateDeviceToken = (payload: DeviceTokenPayload): string => {
  return jwt.sign(payload, appConfig.deviceTokenSecret, { expiresIn: "365d" });
};

export const verifyDeviceToken = (token: string): DeviceTokenPayload | null => {
  try {
    return jwt.verify(token, appConfig.deviceTokenSecret) as DeviceTokenPayload;
  } catch (error) {
    return null;
  }
};
