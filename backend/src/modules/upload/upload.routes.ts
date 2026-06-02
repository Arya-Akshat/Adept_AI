import { Router } from "express";
import {
  connectionHandler,
  delTokenHandler,
  getTokenHandler,
  linkHandler,
  getRoadmapHandler,
} from "./upload.controller";
import multer from "multer";


const upload = multer()
const apiRoutes = Router();

// prefix: /api
apiRoutes.post("/checkConnection", connectionHandler);
apiRoutes.post("/parseLink", linkHandler);
apiRoutes.post("/deleteToken", delTokenHandler);
apiRoutes.get("/getToken", getTokenHandler)
apiRoutes.get("/getRoadmap", getRoadmapHandler)


export default apiRoutes;
