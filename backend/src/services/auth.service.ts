import { CONFLICT, UNAUTHORIZED } from "../constants/http";
import SessionModel from "../models/session.model";
import UserModel from "../models/user.model"
import appAssert from "../utils/appAssert";
import { ONE_DAY_MS, thirtyDaysFromNow } from "../utils/date";
import { refreshTokenDefaults, RefreshTokenPayload, signToken, verifyToken } from "../utils/jwt";


type CreateAccountParams = {
    email: string,
    password: string,
    userAgent?: string,
}
export const createAccount = async (data:CreateAccountParams) => {
    const existingUser = await UserModel.exists({ email: data.email });
    appAssert(!existingUser, CONFLICT, "Email already in use");

    const user = await UserModel.create({
        email: data.email,
        password: data.password
    })
    const userId = user._id

    const session = await SessionModel.create({
        userId,
        userAgent: data.userAgent
    });

    const refreshToken = signToken({ sessionId: session._id }, refreshTokenDefaults);

    const accessToken = signToken({ userId, sessionId: session._id});

    return {
        user: user.omitPassword(),
        accessToken,
        refreshToken
    }
}


type LoginParams = {
    email: string,
    password: string,
    userAgent?: string,
}
export const loginUser = async ({ email, password, userAgent}:LoginParams) => {
    const user = await UserModel.findOne({ email });
    appAssert(user, UNAUTHORIZED, "User does not exist")

    const isValid = await user.comparePassword(password);
    appAssert(isValid, UNAUTHORIZED, "Incorrect password");

    const userId = user._id;
    const session = await SessionModel.create({
        userId,
        userAgent
    });

    const sessionInfo = {
        sessionId: session._id,
    }

    const refreshToken = signToken(sessionInfo, refreshTokenDefaults)

    const accessToken = signToken({ ...sessionInfo, userId })

    return {
        user: user.omitPassword(),
        accessToken,
        refreshToken,
    };
}


export const refreshUserAccessToken = async (refreshToken: string) => {
    const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, {
        secret: refreshTokenDefaults.secret
    });
    appAssert(payload, UNAUTHORIZED, "Invalid refresh token");

    const session = await SessionModel.findById(payload.sessionId);
    const now = Date.now();
    appAssert(
        session && session.expiresAt.getTime() > now,
        UNAUTHORIZED, 
        "Session expired"
    );

//refresh the session if it expires in the next 24 hours
    // const sessionNeedsRefresh = session.expiresAt.getTime() - now <= ONE_DAY_MS;
    const sessionNeedsRefresh = true;
    if (sessionNeedsRefresh) {
        session.expiresAt = thirtyDaysFromNow();
        await session.save();
    }

    const newRefreshToken = sessionNeedsRefresh ? signToken({ sessionId: session._id }, refreshTokenDefaults) : undefined;

    const accessToken = signToken({
        userId: session.userId,
        sessionId: session._id,});
    
    return {
        accessToken,
        newRefreshToken
    }
}
