import { Router } from "express";
import { checkToken, checkDeviceToken } from "../../imports";
import AgentController from "./agent_controller";

const router = Router();

// Liveness probe — public and DB-free so the agent can trust it as an online signal.
router.head("/ping", AgentController.ping);
router.get("/ping", AgentController.ping);

// Device registration is authenticated with the USER token (login once).
router.post("/devices/register", checkToken, AgentController.registerDevice);

// Everything else is authenticated with the long-lived DEVICE token.
router.get("/settings", checkDeviceToken, AgentController.getSettings);
router.post("/activity/batch", checkDeviceToken, AgentController.activityBatch);
router.post("/screenshots/presign", checkDeviceToken, AgentController.presign);
router.post("/screenshots/confirm", checkDeviceToken, AgentController.confirm);
router.post("/events", checkDeviceToken, AgentController.events);

export default router;
