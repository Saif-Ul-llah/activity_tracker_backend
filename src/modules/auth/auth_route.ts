import { Router } from "express";
import { checkToken } from "../../imports";
import AuthController from "./auth_controller";

const router = Router();

router.post("/login", AuthController.login);
router.post("/register", AuthController.register);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-otp", AuthController.verifyOTP);
router.post("/reset-password", checkToken, AuthController.resetPassword);
router.post("/change-password", checkToken, AuthController.changePassword);

export default router;
