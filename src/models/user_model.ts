import { Schema, model, models, Document } from "mongoose";
import { Roles } from "../types/authTypes";

export enum VerificationStatus {
  VERIFIED = "VERIFIED",
  NOT_VERIFIED = "NOT_VERIFIED",
}

export interface IUser extends Document {
  id: string;
  email: string;
  password?: string;
  phoneNumber: string;
  role: Roles;
  IsActive: boolean;
  createdAt: Date;
  locationId?: number;
  fullName: string;
  address?: string;
  fcmToken?: string;
  TFA_enabled: boolean;
}

export interface IUserVerification extends Document {
  id: string;
  userId: string;
  resetOtp?: number;
  resetOtpExpiresAt?: Date;
  isEmailVerified: VerificationStatus;
  refreshToken?: string;
}

const schemaOptions = {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  versionKey: false,
} as const;

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String },
    phoneNumber: { type: String, required: true },
    role: { type: String, enum: Object.values(Roles), required: true },
    IsActive: { type: Boolean, default: true },
    locationId: { type: Number, unique: true, sparse: true },
    fullName: { type: String, required: true },
    address: { type: String },
    fcmToken: { type: String },
    TFA_enabled: { type: Boolean, default: false },
  },
  schemaOptions
);

const userVerificationSchema = new Schema<IUserVerification>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    resetOtp: { type: Number },
    resetOtpExpiresAt: { type: Date },
    isEmailVerified: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.NOT_VERIFIED,
    },
    refreshToken: { type: String },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false }
);

const UserModel = models.User || model<IUser>("User", userSchema);
const UserVerificationModel =
  models.UserVerification ||
  model<IUserVerification>("UserVerification", userVerificationSchema);

export { UserModel, UserVerificationModel };
