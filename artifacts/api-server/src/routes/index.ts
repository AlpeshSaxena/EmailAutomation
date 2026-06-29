import { Router, type IRouter } from "express";
import templatesRouter from "./templates.js";
import campaignsRouter from "./campaigns.js";
import dashboardRouter from "./dashboard.js";
import emailLogsRouter from "./email_logs.js";

const router: IRouter = Router();

router.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/templates", templatesRouter);
router.use("/campaigns", campaignsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/email-logs", emailLogsRouter);

export default router;
