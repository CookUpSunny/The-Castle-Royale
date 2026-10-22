import { Router, type IRouter } from "express";
import healthRouter from "./health";
import monetizationRouter from "./monetization";
import playersRouter from "./players";

const router: IRouter = Router();

router.use(healthRouter);
router.use(playersRouter);
router.use(monetizationRouter);

export default router;
