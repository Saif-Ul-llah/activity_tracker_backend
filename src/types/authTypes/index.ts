export enum Roles {
  ADMIN = "ADMIN",
  SUB_ADMIN = "SUB_ADMIN",
  DISTRIBUTOR = "DISTRIBUTOR",
  INSTALLER = "INSTALLER",
  CUSTOMER = "CUSTOMER",
} // roles

export interface registerInterface {
  email: string;
  password: string;
  role: Roles;
  fullName: string;
  phoneNumber: string;
}

export interface loginInterface {
  email: string;
  password: string;
}

export interface resetPassInterface {
  newPassword: string;
  email: string;
}

export interface SendOtpOptions {
  email: string|null;
  otp: string;
  validMinutes: number;
  userName?: string;
  sendDate?: string;
  year?: number;
}

export interface SendMail {
  email: string;
  subject: string;
  html: string;
}