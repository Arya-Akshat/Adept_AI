import mongoose from "mongoose";
import { compareValue, hashValue } from "../utils/bcrypt";


export interface UserDocument extends mongoose.Document {
    email: string;
    password: string;
    fullName?: string;
    avatarUrl?: string;
    institutionName?: string;
    branch?: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(val:string): Promise<boolean>;
    omitPassword(): Omit<UserDocument, "password">;
}

const UserSchema = new mongoose.Schema<UserDocument>(
    {
    email: { type: String, unique: true, required: true},
    password: { type: String, unique: true, required: true},
    fullName: { type: String },
    avatarUrl: { type: String },
    institutionName: { type: String },
    branch: { type: String },
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