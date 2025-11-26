import path from "path";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from "../constants/http";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";
import fs from "fs";
import { RAW_DATA_PATH, PROCESSED_DATA_PATH } from "../constants/env";
import { API } from "../config/apiClient";

type fileSchema = Express.Multer.File[]
export const pdfHandler = catchErrors(async (req, res) => {
    const files = req.files as fileSchema
    appAssert(files, BAD_REQUEST, "No files sent")
    console.log(files)

    for (const file of files) {
        const filename = `${file.originalname}`;
        const filePath = path.join(RAW_DATA_PATH, filename);

        fs.writeFileSync(filePath, file.buffer);
    }
    console.log("Files saved successfully")

    const response = await API.get("/getRoadmap")
    appAssert(response, INTERNAL_SERVER_ERROR, "Parsing PDF failed")

    const roadmapData = (response.data as any).body;
    const finalDataPath = path.join(PROCESSED_DATA_PATH, "finalData.json");
    fs.writeFileSync(finalDataPath, JSON.stringify(roadmapData, null, 4));

    return res.status(OK).json({ message: "File parsed successfully " })
})

export const imgHandler = catchErrors(async (req, res) => {
    const files = req.files as Express.Multer.File[]; // Adjust type based on your setup
    appAssert(files && files.length > 0, BAD_REQUEST, "No image file sent");

    const file = files[0];
    const ext = path.extname(file.originalname).toLowerCase();

    appAssert(ext === '.jpg' || ext === '.jpeg', BAD_REQUEST, "Only .jpg files are allowed");

    const filePath = path.join(RAW_DATA_PATH, 'syllabus.jpg');
    fs.writeFileSync(filePath, file.buffer);

    return res.status(OK).json({ message: "Image saved as syllabus.jpg" });
})

export const connectionHandler = catchErrors(async (req, res) => {
    const response = async () => API.get("/")
    console.log(response);
    return res.status(OK).json({ message: "Connection successful " })
})

export const linkHandler = catchErrors(async (req, res) => {
    const response = await API.get("/getNotes")
    appAssert(response, INTERNAL_SERVER_ERROR, "Flask Error")
    console.log(response.data);

    console.log("Files saved successfully")

    const parseResponse = await API.get("/getRoadmap")
    appAssert(parseResponse, INTERNAL_SERVER_ERROR, "Parsing PDF failed")

    const roadmapData = (parseResponse.data as any).body;
    const finalDataPath = path.join(PROCESSED_DATA_PATH, "finalData.json");
    fs.writeFileSync(finalDataPath, JSON.stringify(roadmapData, null, 4));

    return res.status(OK).json({ message: "File parsed successfully " })
})

export const delTokenHandler = catchErrors(async (req, res) => {
    const response = await API.get("/deleteToken")
    appAssert(response, INTERNAL_SERVER_ERROR, "Flask Error")

    console.log(response.data)
    return res.status(OK).json({ message: "Token Deleted", data: response.data })
})

export const getTokenHandler = catchErrors(async (req, res) => {
    const filePath = path.join(RAW_DATA_PATH, 'syllabus.jpg');

    if (fs.existsSync(filePath)) {
        return res.status(OK).json({ message: "Syllabus exists." });
    } else {
        return res.status(NOT_FOUND).json({ message: "Syllabus does not exist." });
    }

    // const response = await API.get("/getToken")
    // appAssert(response, INTERNAL_SERVER_ERROR, "Flask Error")

    // if (response.status !== 200) {
    //     return res.status(BAD_REQUEST).json({ message: "Failed to get token" })
    // }
    // console.log(response.data)
    // return res.status(OK).json(response.data)
})

export const getRoadmapHandler = catchErrors(async (req, res) => {
    const finalDataPath = path.join(PROCESSED_DATA_PATH, "finalData.json");
    if (fs.existsSync(finalDataPath)) {
        const data = fs.readFileSync(finalDataPath, 'utf-8');
        return res.status(OK).json(JSON.parse(data));
    } else {
        return res.status(NOT_FOUND).json({ message: "Roadmap not found" });
    }
})


