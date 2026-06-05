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

        // Drop unique password index if it exists to clean up schema unique index
        try {
            const db = mongoose.connection.db;
            if (db) {
                const collections = await db.listCollections({ name: "users" }).toArray();
                if (collections.length > 0) {
                    const indexes = await db.collection("users").indexes();
                    const hasPasswordIndex = indexes.some(idx => idx.name === "password_1" || (idx.key && idx.key.password));
                    if (hasPasswordIndex) {
                        await db.collection("users").dropIndex("password_1");
                        logger.info("Successfully dropped unique password index (password_1)");
                    }
                }
            }
        } catch (idxErr: any) {
            logger.warn({ err: idxErr.message }, "Could not drop unique password index (might not exist)");
        }
    } catch (error) {
        databaseConnected = false;
        logger.error({ error }, "Could not connect to database");
        // Keep the dev server alive so non-DB routes can still be tested locally.
    }
}
export default connectToDatabase;
