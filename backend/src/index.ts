import "./polyfill";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { APP_ORIGIN, FLASK_URL, NODE_ENV, PORT } from "./constants/env";
import errorHandler from "./middleware/errorHandler";
import { OK } from "./constants/http";
import apiRoutes from "./routes/api.route";
import cookieParser from "cookie-parser";
import connectToDatabase from "./config/db";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import pdfRoutes from "./routes/pdf.route";
import authenticate from "./middleware/authenticate";

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            // Allow allowed origins
            if (origin === APP_ORIGIN || origin === FLASK_URL) {
                return callback(null, true);
            }

            // Allow Vercel deployments
            if (origin.endsWith(".vercel.app")) {
                return callback(null, true);
            }

            // Allow localhost in development
            if (NODE_ENV === "development" && origin.includes("localhost")) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"), false);
        },
        credentials: true,
    })
)
app.use(cookieParser())



app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.get("/", (req, res, next) => {
    res.status(OK).json({
        status: "healthy",
    });
});

// api routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/pdfs', pdfRoutes);

// protected routes
app.use('/user', authenticate, userRoutes);
// app.use('/sessions', authenticate, sessionRoutes);

app.use(errorHandler);

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} environment`);
    await connectToDatabase();
});
