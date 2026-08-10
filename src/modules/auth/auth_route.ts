import { Router } from "express";
import { checkToken } from "../../imports";
import AuthController from "./auth_controller";

const router = Router();

router.post("/login", AuthController.login);
// Public self-registration is intentionally DISABLED — accounts are created only by
// an admin (POST /api/admin/users) or the seed script (npm run seed:admin) for the
// first admin on a fresh database.
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-otp", AuthController.verifyOTP);
router.post("/reset-password", checkToken, AuthController.resetPassword);
router.post("/change-password", checkToken, AuthController.changePassword);

export default router;
