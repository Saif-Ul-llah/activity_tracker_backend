import express from "express";
import authRouter from "../modules/auth/auth_route";
import agentRouter from "../modules/agent/agent_route";
import adminRouter from "../modules/admin/admin_route";

const router = express.Router();

router.use(authRouter);
router.use("/agent", agentRouter);
router.use("/admin", adminRouter);

export { router as allRoutes };
