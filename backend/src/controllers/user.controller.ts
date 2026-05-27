import { NOT_FOUND, OK } from "../constants/http";
import { isDatabaseConnected } from "../config/db";
import UserModel from "../models/user.model";
import { localAuthStore } from "../services/localAuthStore";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";


export const getUserHandler = catchErrors(async (req, res) => {
    if (!isDatabaseConnected()) {
        const user = await localAuthStore.findUserById(req.userId.toString());
        appAssert(user, NOT_FOUND, "User not found");
        return res.status(OK).json(localAuthStore.toPublicUser(user));
    }

    const user = await UserModel.findById(req.userId);
    appAssert(user, NOT_FOUND, "User not found");

    return res.status(OK).json(
        user.omitPassword() 
    )
})

export const updateUserHandler = catchErrors(async (req, res) => {
    const { fullName, avatarUrl, institutionName, branch } = req.body;
    
    if (!isDatabaseConnected()) {
        const user = await localAuthStore.updateUser(req.userId.toString(), {
            fullName,
            avatarUrl,
            institutionName,
            branch
        });
        appAssert(user, NOT_FOUND, "User not found");
        return res.status(OK).json(localAuthStore.toPublicUser(user));
    }

    const user = await UserModel.findByIdAndUpdate(
        req.userId,
        {
            $set: {
                fullName,
                avatarUrl,
                institutionName,
                branch
            }
        },
        { new: true }
    );
    appAssert(user, NOT_FOUND, "User not found");

    return res.status(OK).json(user.omitPassword());
});