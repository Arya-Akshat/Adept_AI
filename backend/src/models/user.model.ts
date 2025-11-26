import mongoose from "mongoose";
import { compareValue, hashValue } from "../utils/bcrypt";


export interface UserDocument extends mongoose.Document {
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(val:string): Promise<boolean>;
    omitPassword(): Pick<UserDocument, "_id" | "email" | "createdAt" | "updatedAt" >;
}

const UserSchema = new mongoose.Schema<UserDocument>(
    {
    email: { type: String, unique: true, required: true},
    password: { type: String, unique: true, required: true},
    },
    {
        timestamps: true,
    }
);

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    this.password = await hashValue(this.password);
    next();
});

UserSchema.methods.comparePassword = async function (val: string) {
    return compareValue(val, this.password);
}

UserSchema.methods.omitPassword = function () {
    const user = this.toObject();
    delete user.password;
    return user;
}

const UserModel = mongoose.model<UserDocument>("User", UserSchema);
export default UserModel;