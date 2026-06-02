import { Router } from "express";
import { getUserHandler, updateUserHandler, onboardingCompleteHandler } from "../controllers/user.controller";
import { validate } from "../middleware/validate.middleware";
import { onboardingSchema } from "../controllers/user.schemas";

const userRoutes = Router();

// prefix: /user
userRoutes.get("/", getUserHandler);
userRoutes.patch("/", updateUserHandler);
userRoutes.post("/onboarding/complete", validate(onboardingSchema), onboardingCompleteHandler);

export default userRoutes;
