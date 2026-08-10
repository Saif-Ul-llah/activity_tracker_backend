import express from "express";
import authRouter from "../modules/auth/auth_route";
import agentRouter from "../modules/agent/agent_route";

const router = express.Router();

router.use(authRouter);
router.use("/agent", agentRouter);

export { router as allRoutes };
