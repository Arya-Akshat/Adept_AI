import mongoose from "mongoose";
import { compareValue, hashValue } from "../utils/bcrypt";


export interface UserDocument extends mongoose.Document {
    email: string;
    password: string;
    fullName?: string;
    avatarUrl?: string;
    institutionName?: string;
    branch?: string;
    schoolName?: string;
    city?: string;
    primarySubject?: string;
    classesTeaching?: string[];
    schoolBoard?: string;
    approximateStudents?: number | null;
    referralSource?: string;
    avatarBase64?: string;
    onboardingCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(val:string): Promise<boolean>;
    omitPassword(): Omit<UserDocument, "password">;
}

const UserSchema = new mongoose.Schema<UserDocument>(
    {
    email: { type: String, unique: true, required: true},
    password: { type: String, required: true},
    fullName: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    institutionName: { type: String, default: "" },
    branch: { type: String, default: "" },
    schoolName: { type: String, default: "" },
    city: { type: String, default: "" },
    primarySubject: { type: String, default: "" },
    classesTeaching: { type: [String], default: [] },
    schoolBoard: { type: String, default: "" },
    approximateStudents: { type: Number, default: null },
    referralSource: { type: String, default: "" },
    avatarBase64: { type: String, default: "" },
    onboardingCompleted: { type: Boolean, default: false },
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