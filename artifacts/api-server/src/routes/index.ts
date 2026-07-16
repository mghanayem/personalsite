import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import pagesRouter from "./pages";
import sectionsRouter from "./sections";
import imagesRouter from "./images";
import accountRouter from "./account";
import publicRouter from "./public";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(pagesRouter);
router.use(sectionsRouter);
router.use(imagesRouter);
router.use(accountRouter);
router.use(settingsRouter);
router.use(publicRouter);

export default router;
