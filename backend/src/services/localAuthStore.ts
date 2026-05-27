import { v4 as uuidv4 } from "uuid";
import { compareValue, hashValue } from "../utils/bcrypt";
import { thirtyDaysFromNow } from "../utils/date";

export type LocalUser = {
    _id: string;
    email: string;
    password: string;
    fullName?: string;
    avatarUrl?: string;
    institutionName?: string;
    branch?: string;
    createdAt: Date;
    updatedAt: Date;
};

export type LocalSession = {
    _id: string;
    userId: string;
    userAgent?: string;
    createdAt: Date;
    expiresAt: Date;
};

const users = new Map<string, LocalUser>();
const sessions = new Map<string, LocalSession>();

const normalizeUser = (user: LocalUser) => ({
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    institutionName: user.institutionName,
    branch: user.branch,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

export const localAuthStore = {
    async createUser(email: string, password: string) {
        const existingUser = Array.from(users.values()).find((user) => user.email === email);
        if (existingUser) {
            return { user: null, existingUser: true };
        }

        const now = new Date();
        const user: LocalUser = {
            _id: uuidv4(),
            email,
            password: await hashValue(password),
            createdAt: now,
            updatedAt: now,
        };

        users.set(user._id, user);

        return { user, existingUser: false };
    },

    async findUserByEmail(email: string) {
        return Array.from(users.values()).find((user) => user.email === email) || null;
    },

    async findUserById(userId: string) {
        return users.get(userId) || null;
    },

    async verifyPassword(email: string, password: string) {
        const user = await this.findUserByEmail(email);
        if (!user) {
            return { user: null, isValid: false };
        }

        const isValid = await compareValue(password, user.password);
        return { user, isValid };
    },

    async updateUser(userId: string, updates: Partial<Omit<LocalUser, "_id" | "email" | "password">>) {
        const user = users.get(userId);
        if (!user) return null;
        const updatedUser = { ...user, ...updates, updatedAt: new Date() };
        users.set(userId, updatedUser);
        return updatedUser;
    },

    async createSession(userId: string, userAgent?: string) {
        const now = new Date();
        const session: LocalSession = {
            _id: uuidv4(),
            userId,
            userAgent,
            createdAt: now,
            expiresAt: thirtyDaysFromNow(),
        };

        sessions.set(session._id, session);
        return session;
    },

    async findSessionById(sessionId: string) {
        return sessions.get(sessionId) || null;
    },

    async deleteSessionById(sessionId: string) {
        sessions.delete(sessionId);
    },

    async refreshSession(sessionId: string) {
        const session = sessions.get(sessionId);
        if (!session) {
            return null;
        }

        session.expiresAt = thirtyDaysFromNow();
        sessions.set(sessionId, session);
        return session;
    },

    toPublicUser(user: LocalUser) {
        return normalizeUser(user);
    },
};