import { Router } from "express";
import { getUserHandler, updateUserHandler } from "../controllers/user.controller";

const userRoutes = Router();

// prefix: /user
userRoutes.get("/", getUserHandler);
userRoutes.patch("/", updateUserHandler);

export default userRoutes;
