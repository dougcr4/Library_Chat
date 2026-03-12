import { Router, type IRouter } from "express";
import healthRouter from "./health";
import settingsRouter from "./settings";
import furnitureRouter from "./furniture";
import projectsRouter from "./projects";

const router: IRouter = Router();

router.use(healthRouter);
router.use(settingsRouter);
router.use(furnitureRouter);
router.use(projectsRouter);

export default router;
