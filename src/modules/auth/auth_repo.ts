import { registerInterface, UserModel, UserVerificationModel } from "../../imports";

class AuthRepo {
  public static registerRepo = async (payload: registerInterface) => {
    const user = await UserModel.create(payload);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
    };
  };

  public static checkEmailExists = async (email: string) => {
    const user = await UserModel.findOne({ email });
    return user;
  };

  public static findByEmail = async (email: string) => {
    const user = await UserModel.findOne({ email });
    if (!user) return null;

    const verification = await UserVerificationModel.findOne({ userId: user.id });
    return Object.assign(user, { verification });
  };

  public static findById = async (userId: string) => {
    return UserModel.findById(userId);
  };

  public static updateRefreshToken = async (
    userId: string,
    refreshToken: string
  ) => {
    return UserVerificationModel.findOneAndUpdate(
      { userId },
      { $set: { refreshToken }, $setOnInsert: { userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  };

  public static saveResetOtp = async (
    userId: string,
    otp: number,
    expiresAt: Date
  ) => {
    return UserVerificationModel.findOneAndUpdate(
      { userId },
      {
        $set: { resetOtp: otp, resetOtpExpiresAt: expiresAt },
        $setOnInsert: { userId },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  };

  public static verifyOtp = async (userId: string, otp: number) => {
    return UserVerificationModel.findOne({
      userId,
      resetOtp: otp,
      resetOtpExpiresAt: { $gt: new Date() },
    });
  };

  public static resetPassword = async (userId: string, newPassword: string) => {
    return UserModel.findByIdAndUpdate(
      userId,
      { $set: { password: newPassword } },
      { new: true }
    );
  };

  public static changePassword = async (
    userId: string,
    newPassword: string
  ) => {
    return UserModel.findByIdAndUpdate(
      userId,
      { $set: { password: newPassword } },
      { new: true }
    );
  };
}

export default AuthRepo;
