const getEnv = (key:string, defaultValue?: string):string => {
    const value = process.env[key] || defaultValue;

    if (value === undefined) {
        throw new Error(`Missing envirionment variable ${key}`);
    }

    return value;
}

export const NODE_ENV = getEnv("NODE_ENV", "development");
export const PORT = getEnv("PORT", "4004");
export const MONGO_URI = getEnv("MONGO_URI");
export const JWT_SECRET = getEnv("JWT_SECRET");
export const JWT_REFRESH_SECRET = getEnv("JWT_REFRESH_SECRET");
export const APP_ORIGIN = getEnv("APP_ORIGIN");
export const RAW_DATA_PATH = getEnv("RAW_DATA_PATH")
export const PROCESSED_DATA_PATH = getEnv("PROCESSED_DATA_PATH")
export const FLASK_URL = getEnv("FLASK_URL")
