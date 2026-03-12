import { Router, type IRouter } from "express";
import healthRouter from "./health";
import settingsRouter from "./settings";
import furnitureRouter from "./furniture";
import buildingsRouter from "./buildings";
import projectsRouter from "./projects";

const router: IRouter = Router();

router.use(healthRouter);
router.use(settingsRouter);
router.use(furnitureRouter);
router.use(buildingsRouter);
router.use(projectsRouter);

export default router;
