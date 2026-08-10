import { Router } from "express";
import { checkToken, checkAdmin } from "../../imports";
import AdminController from "./admin_controller";

const router = Router();

// All admin routes require a user token AND the ADMIN/SUB_ADMIN role.
router.use(checkToken, checkAdmin);

router.get("/overview", AdminController.overview);
router.get("/users", AdminController.users);
router.get("/devices", AdminController.devices);
router.get("/activity", AdminController.activity);
router.get("/screenshots", AdminController.screenshots);
router.get("/events", AdminController.events);

export default router;
