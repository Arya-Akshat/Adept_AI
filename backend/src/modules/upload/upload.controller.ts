import path from "path";
import fs from "fs";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "../../constants/http";
import appAssert from "../../utils/appAssert";
import catchErrors from "../../utils/catchErrors";
import { RAW_DATA_PATH, PROCESSED_DATA_PATH } from "../../constants/env";
import logger from "../../utils/logger";
import { API } from "../../services/gemini.service";
import { v4 as uuidv4 } from "uuid";
import FormData from "form-data";

import LibraryFile from "../../models/LibraryFile";
import { uploadFileToSupabase, deleteFileFromSupabase } from "../../services/supabase.service";
import axios from "axios";

type fileSchema = Express.Multer.File[]

export const pdfHandler = catchErrors(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    appAssert(files && files.length > 0, BAD_REQUEST, "No files sent");
    logger.debug({ fileCount: files.length }, "PDF upload received");

    const firstFile = files[0];
    const pdfId = uuidv4();
    const filename = `${pdfId}_${firstFile.originalname}`;

    // Upload to Supabase
    const publicUrl = await uploadFileToSupabase("adept-files", filename, firstFile.buffer, firstFile.mimetype);
    logger.info({ filename, publicUrl }, "File uploaded to Supabase");

    // Save to MongoDB
    const libraryFile = await LibraryFile.create({
        userId: req.userId,
        filename: filename,
        originalName: firstFile.originalname,
        supabaseUrl: publicUrl,
        fileSize: firstFile.size,
        isSyllabus: false,
        hasRoadmap: false
    });

    const formData = new FormData();
    formData.append("userId", req.userId.toString());
    formData.append("pdf_file", firstFile.buffer, { filename: firstFile.originalname });

    const response = await API.post("/getRoadmap", formData, {
        headers: { ...formData.getHeaders() },
    });
    appAssert(response, INTERNAL_SERVER_ERROR, "Parsing PDF failed");

    const roadmapData = (response.data as any).body;
    
    // Save roadmap JSON to MongoDB
    libraryFile.hasRoadmap = true;
    libraryFile.roadmapData = roadmapData;
    await libraryFile.save();

    // Also update the active user roadmap
    // The frontend currently reads finalData.json. We will update getRoadmapHandler to fetch the latest roadmap.
    
    return res.status(OK).json({ message: "File parsed successfully " });
});

export const imgHandler = catchErrors(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    appAssert(files && files.length > 0, BAD_REQUEST, "No image file sent");

    const file = files[0];
    const ext = path.extname(file.originalname).toLowerCase();
    appAssert(ext === '.jpg' || ext === '.jpeg' || ext === '.png', BAD_REQUEST, "Only .jpg, .jpeg, or .png files are allowed");

    const pdfId = uuidv4();
    const filename = `${pdfId}${ext}`;

    // Upload to Supabase
    const publicUrl = await uploadFileToSupabase("adept-files", filename, file.buffer, file.mimetype);

    // Save to MongoDB
    await LibraryFile.create({
        userId: req.userId,
        filename: filename,
        originalName: file.originalname,
        supabaseUrl: publicUrl,
        fileSize: file.size,
        isSyllabus: true,
        hasRoadmap: false
    });

    return res.status(OK).json({
        message: `Image saved and added to library`,
        pdfId: pdfId,
        fileName: file.originalname
    });
});

export const connectionHandler = catchErrors(async (req, res) => {
    const response = async () => API.get("/")
    logger.debug({ response }, "Connection check prepared");
    return res.status(OK).json({ message: "Connection successful " })
})

export const linkHandler = catchErrors(async (req, res) => {
    const response = await API.get("/getNotes", {
        params: { userId: req.userId.toString() }
    });
    appAssert(response, INTERNAL_SERVER_ERROR, "Flask Error");
    logger.debug({ data: response.data }, "Flask notes response received");

    const parseFormData = new FormData();
    parseFormData.append("userId", req.userId.toString());
    
    // Find the latest syllabus image for this user from MongoDB
    const latestSyllabus = await LibraryFile.findOne({ userId: req.userId, isSyllabus: true }).sort({ createdAt: -1 });
    
    if (latestSyllabus) {
        // Download buffer from Supabase to forward it
        try {
            const fileResponse = await axios.get(latestSyllabus.supabaseUrl, { responseType: 'arraybuffer' });
            parseFormData.append("syllabus_file", Buffer.from(fileResponse.data as ArrayBuffer), { filename: latestSyllabus.filename });
        } catch (err) {
            logger.warn({ err }, "Failed to fetch syllabus from Supabase for linkHandler");
        }
    }

    const parseResponse = await API.post("/getRoadmap", parseFormData, {
        headers: { ...parseFormData.getHeaders() }
    });
    appAssert(parseResponse, INTERNAL_SERVER_ERROR, "Parsing PDF failed");

    const roadmapData = (parseResponse.data as any).body;
    
    if (latestSyllabus) {
        latestSyllabus.hasRoadmap = true;
        latestSyllabus.roadmapData = roadmapData;
        await latestSyllabus.save();
    } else {
        // Create a dummy record if no syllabus existed just to hold the roadmap
        await LibraryFile.create({
            userId: req.userId,
            filename: `roadmap_${Date.now()}.json`,
            originalName: "Generated Roadmap",
            supabaseUrl: "",
            fileSize: 0,
            isSyllabus: false,
            hasRoadmap: true,
            roadmapData: roadmapData
        });
    }

    return res.status(OK).json({ message: "File parsed successfully" });
});

export const delTokenHandler = catchErrors(async (req, res) => {
    // Delete all files for this user from Supabase and MongoDB
    const files = await LibraryFile.find({ userId: req.userId });
    
    for (const file of files) {
        if (file.filename) {
            await deleteFileFromSupabase("adept-files", file.filename);
        }
    }
    
    await LibraryFile.deleteMany({ userId: req.userId });

    const response = await API.get("/deleteToken", {
        params: { userId: req.userId.toString() }
    });
    appAssert(response, INTERNAL_SERVER_ERROR, "Flask Error");

    return res.status(OK).json({ message: "Token and user data deleted", data: response.data });
});

export const getTokenHandler = catchErrors(async (req, res) => {
    const syllabus = await LibraryFile.findOne({ userId: req.userId, isSyllabus: true });
    
    if (syllabus) {
        return res.status(OK).json({ message: "Syllabus exists." });
    } else {
        return res.status(NOT_FOUND).json({ message: "Syllabus does not exist." });
    }
});

export const getRoadmapHandler = catchErrors(async (req, res) => {
    // Return the most recently generated roadmap for this user
    const latestFile = await LibraryFile.findOne({ userId: req.userId, hasRoadmap: true }).sort({ updatedAt: -1 });
    
    if (latestFile && latestFile.roadmapData) {
        return res.status(OK).json(latestFile.roadmapData);
    } else {
        return res.status(NOT_FOUND).json({ message: "Roadmap not found" });
    }
});
