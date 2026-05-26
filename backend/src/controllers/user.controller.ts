import { NOT_FOUND, OK } from "../constants/http";
import { isDatabaseConnected } from "../config/db";
import UserModel from "../models/user.model";
import { localAuthStore } from "../services/localAuthStore";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";


export const getUserHandler = catchErrors(async (req, res) => {
    if (!isDatabaseConnected()) {
        const user = await localAuthStore.findUserById(req.userId);
        appAssert(user, NOT_FOUND, "User not found");
        return res.status(OK).json(localAuthStore.toPublicUser(user));
    }

    const user = await UserModel.findById(req.userId);
    appAssert(user, NOT_FOUND, "User not found");

    return res.status(OK).json(
        user.omitPassword() 
    )
})