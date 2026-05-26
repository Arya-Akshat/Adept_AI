import mongoose from "mongoose";
import { MONGO_URI } from "../constants/env";
import logger from "../utils/logger";

let databaseConnected = false;

export const isDatabaseConnected = () => databaseConnected;


const connectToDatabase = async() => {
    try {
        await mongoose.connect(MONGO_URI);
        databaseConnected = true;
        logger.info("Successfully connected to DB");
    } catch (error) {
        databaseConnected = false;
        logger.error({ error }, "Could not connect to database");
        // Keep the dev server alive so non-DB routes can still be tested locally.
    }
}
export default connectToDatabase;
