import mongoose from "mongoose";
import { MONGO_URI } from "../constants/env";


const connectToDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Succesfully connected to DB");
    } catch (error) {
        console.log('Could not connect to database', error);
        console.log('Could not connect to database', error);
        // process.exit(1); // Don't crash if DB is missing, we use JSON for now
    }
}
export default connectToDatabase;