import { Router, type IRouter } from "express";
import healthRouter from "./health";
import settingsRouter from "./settings";
import furnitureRouter from "./furniture";
import buildingsRouter from "./buildings";
import projectsRouter from "./projects";
import adminRouter from "./admin";
import fixDesignRouter from "./fix-design";
import refineDesignRouter from "./refine-design";
import designStatusRouter from "./design-status";

const router: IRouter = Router();

router.use(healthRouter);
router.use(settingsRouter);
router.use(furnitureRouter);
router.use(buildingsRouter);
router.use(projectsRouter);
router.use(adminRouter);
router.use(fixDesignRouter);
router.use(refineDesignRouter);
router.use(designStatusRouter);

export default router;
