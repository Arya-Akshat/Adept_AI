import mongoose from "mongoose";
import { MONGO_URI } from "../constants/env";

let databaseConnected = false;

export const isDatabaseConnected = () => databaseConnected;


const connectToDatabase = async() => {
    try {
        await mongoose.connect(MONGO_URI);
        databaseConnected = true;
        console.log("Succesfully connected to DB");
    } catch (error) {
        databaseConnected = false;
        console.log('Could not connect to database', error);
        // Keep the dev server alive so non-DB routes can still be tested locally.
    }
}
export default connectToDatabase;