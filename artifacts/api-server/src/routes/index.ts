import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import pagesRouter from "./pages";
import sectionsRouter from "./sections";
import imagesRouter from "./images";
import accountRouter from "./account";
import publicRouter from "./public";
import publicBlogRouter from "./public-blog";
import contactRouter from "./contact";
import settingsRouter from "./settings";
import messagesRouter from "./messages";
import blogRouter from "./blog";
import anthropicRouter from "./anthropic/index";
import modulesRouter from "./modules";

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
router.use(publicBlogRouter);
router.use(contactRouter);
router.use(messagesRouter);
router.use(blogRouter);
router.use(anthropicRouter);
router.use(modulesRouter);

export default router;
