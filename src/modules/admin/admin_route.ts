import { Router } from "express";
import { checkToken, checkAdmin } from "../../imports";
import AdminController from "./admin_controller";

const router = Router();

// All admin routes require a user token AND the ADMIN/SUB_ADMIN role.
router.use(checkToken, checkAdmin);

router.get("/overview", AdminController.overview);
router.get("/users", AdminController.users);
router.post("/users", AdminController.createUser);
router.patch("/users/:id", AdminController.updateUser);
router.get("/devices", AdminController.devices);
router.post("/devices/:id/revoke", AdminController.revokeDevice);
router.get("/activity", AdminController.activity);
router.get("/screenshots", AdminController.screenshots);
router.get("/events", AdminController.events);
router.get("/storage", AdminController.storage);
router.patch("/settings", AdminController.updateSettings);
router.post("/screenshots/delete", AdminController.deleteScreenshots);

export default router;
