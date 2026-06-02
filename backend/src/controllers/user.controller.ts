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
    const {
        fullName,
        schoolName,
        city,
        primarySubject,
        classesTeaching,
        schoolBoard,
        approximateStudents,
        referralSource,
        avatarBase64,
        onboardingCompleted,
        avatarUrl,
        institutionName,
        branch
    } = req.body;

    const finalAvatar = avatarBase64 !== undefined ? avatarBase64 : avatarUrl;
    const finalSchool = schoolName !== undefined ? schoolName : institutionName;
    const finalCity = city !== undefined ? city : branch;

    const updates: any = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (finalAvatar !== undefined) {
        updates.avatarBase64 = finalAvatar;
        updates.avatarUrl = finalAvatar;
    }
    if (finalSchool !== undefined) {
        updates.schoolName = finalSchool;
        updates.institutionName = finalSchool;
    }
    if (finalCity !== undefined) {
        updates.city = finalCity;
        updates.branch = finalCity;
    }
    if (primarySubject !== undefined) updates.primarySubject = primarySubject;
    if (classesTeaching !== undefined) updates.classesTeaching = classesTeaching;
    if (schoolBoard !== undefined) updates.schoolBoard = schoolBoard;
    if (approximateStudents !== undefined) updates.approximateStudents = approximateStudents;
    if (referralSource !== undefined) updates.referralSource = referralSource;
    if (onboardingCompleted !== undefined) updates.onboardingCompleted = onboardingCompleted;

    if (!isDatabaseConnected()) {
        const user = await localAuthStore.updateUser(req.userId.toString(), updates);
        appAssert(user, NOT_FOUND, "User not found");
        return res.status(OK).json(localAuthStore.toPublicUser(user));
    }

    const user = await UserModel.findByIdAndUpdate(
        req.userId,
        { $set: updates },
        { new: true }
    );
    appAssert(user, NOT_FOUND, "User not found");

    return res.status(OK).json(user.omitPassword());
});

export const onboardingCompleteHandler = catchErrors(async (req, res) => {
    const {
        fullName,
        schoolName,
        city,
        primarySubject,
        classesTeaching,
        schoolBoard,
        approximateStudents,
        referralSource,
        avatarBase64
    } = req.body;

    const updates = {
        fullName,
        schoolName,
        institutionName: schoolName,
        city,
        branch: city,
        primarySubject,
        classesTeaching,
        schoolBoard: schoolBoard || "",
        approximateStudents: approximateStudents !== undefined ? approximateStudents : null,
        referralSource: referralSource || "",
        avatarBase64: avatarBase64 || "",
        avatarUrl: avatarBase64 || "",
        onboardingCompleted: true
    };

    if (!isDatabaseConnected()) {
        const user = await localAuthStore.updateUser(req.userId.toString(), updates);
        appAssert(user, NOT_FOUND, "User not found");
        return res.status(OK).json({
            success: true,
            data: { user: localAuthStore.toPublicUser(user) }
        });
    }

    const user = await UserModel.findByIdAndUpdate(
        req.userId,
        { $set: updates },
        { new: true }
    );
    appAssert(user, NOT_FOUND, "User not found");

    return res.status(OK).json({
        success: true,
        data: { user: user.omitPassword() }
    });
});