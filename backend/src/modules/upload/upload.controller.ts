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

const METADATA_DIR = path.join(path.dirname(RAW_DATA_PATH), "metadata");
const METADATA_PATH = path.join(METADATA_DIR, "pdfs.json");

// Ensure data directories exist
if (!fs.existsSync(RAW_DATA_PATH)) {
    fs.mkdirSync(RAW_DATA_PATH, { recursive: true });
}
if (!fs.existsSync(PROCESSED_DATA_PATH)) {
    fs.mkdirSync(PROCESSED_DATA_PATH, { recursive: true });
}
if (!fs.existsSync(METADATA_DIR)) {
    fs.mkdirSync(METADATA_DIR, { recursive: true });
}

const readMetadata = () => {
    if (!fs.existsSync(METADATA_PATH)) {
        return { pdfs: [] };
    }
    const data = fs.readFileSync(METADATA_PATH, 'utf-8');
    return JSON.parse(data);
};

const writeMetadata = (metadata: any) => {
    fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 4));
};

type fileSchema = Express.Multer.File[]

export const pdfHandler = catchErrors(async (req, res) => {
    const files = req.files as fileSchema
    appAssert(files, BAD_REQUEST, "No files sent")
    logger.debug({ fileCount: files.length }, "PDF upload received");

    const firstFile = files[0];
    const filename = `${req.userId}_${firstFile.originalname}`;

    for (const file of files) {
        const filePath = path.join(RAW_DATA_PATH, filename);
        fs.writeFileSync(filePath, file.buffer);
    }
    logger.info({ filename }, "Files saved successfully");

    const formData = new FormData();
    formData.append("userId", req.userId.toString());
    formData.append("pdf_file", fs.createReadStream(path.join(RAW_DATA_PATH, filename)));

    const response = await API.post("/getRoadmap", formData, {
        headers: { ...formData.getHeaders() },
    })
    appAssert(response, INTERNAL_SERVER_ERROR, "Parsing PDF failed")

    const roadmapData = (response.data as any).body;
    const finalDataPath = path.join(PROCESSED_DATA_PATH, `finalData_${req.userId}.json`);
    fs.writeFileSync(finalDataPath, JSON.stringify(roadmapData, null, 4));

    return res.status(OK).json({ message: "File parsed successfully " })
})

export const imgHandler = catchErrors(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    appAssert(files && files.length > 0, BAD_REQUEST, "No image file sent");

    const file = files[0];
    const ext = path.extname(file.originalname).toLowerCase();

    appAssert(ext === '.jpg' || ext === '.jpeg' || ext === '.png', BAD_REQUEST, "Only .jpg, .jpeg, or .png files are allowed");

    // Save as standard user-isolated syllabus name for session/alignment compatibility
    const sessionFilePath = path.join(RAW_DATA_PATH, `syllabus_${req.userId}${ext}`);
    fs.writeFileSync(sessionFilePath, file.buffer);

    // Save with unique ID in library list
    const pdfId = uuidv4();
    const libraryFilename = `${pdfId}${ext}`;
    const libraryFilePath = path.join(RAW_DATA_PATH, libraryFilename);
    fs.writeFileSync(libraryFilePath, file.buffer);

    // Save metadata so it shows up in "My Library"
    const metadata = readMetadata();
    const pdfMetadata = {
        id: pdfId,
        userId: req.userId.toString(),
        filename: libraryFilename,
        originalName: file.originalname,
        uploadDate: new Date().toISOString(),
        fileSize: file.size,
        hasRoadmap: false,
        isSyllabus: true
    };
    metadata.pdfs.push(pdfMetadata);
    writeMetadata(metadata);

    return res.status(OK).json({
        message: `Image saved as syllabus_${req.userId}${ext} and added to library`,
        pdfId: pdfId,
        fileName: file.originalname
    });
})

export const connectionHandler = catchErrors(async (req, res) => {
    const response = async () => API.get("/")
    logger.debug({ response }, "Connection check prepared");
    return res.status(OK).json({ message: "Connection successful " })
})

export const linkHandler = catchErrors(async (req, res) => {
    const response = await API.get("/getNotes", {
        params: { userId: req.userId.toString() }
    })
    appAssert(response, INTERNAL_SERVER_ERROR, "Flask Error")
    logger.debug({ data: response.data }, "Flask notes response received");

    logger.info("Files saved successfully");

    const parseFormData = new FormData();
    parseFormData.append("userId", req.userId.toString());
    
    // Attach syllabus image if one exists for this user
    for (const ext of ['.png', '.jpg', '.jpeg']) {
        const syllabusPath = path.join(RAW_DATA_PATH, `syllabus_${req.userId}${ext}`);
        if (fs.existsSync(syllabusPath)) {
            parseFormData.append("syllabus_file", fs.createReadStream(syllabusPath));
            break;
        }
    }

    const parseResponse = await API.post("/getRoadmap", parseFormData, {
        headers: { ...parseFormData.getHeaders() }
    })
    appAssert(parseResponse, INTERNAL_SERVER_ERROR, "Parsing PDF failed")

    const roadmapData = (parseResponse.data as any).body;
    const finalDataPath = path.join(PROCESSED_DATA_PATH, `finalData_${req.userId}.json`);
    fs.writeFileSync(finalDataPath, JSON.stringify(roadmapData, null, 4));

    return res.status(OK).json({ message: "File parsed successfully " })
})

export const delTokenHandler = catchErrors(async (req, res) => {
    // Delete local user session syllabus images
    for (const ext of ['.jpg', '.jpeg', '.png']) {
        const filePath = path.join(RAW_DATA_PATH, `syllabus_${req.userId}${ext}`);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                logger.error({ err, filePath }, "Failed to delete session syllabus file");
            }
        }
    }

    // Delete library syllabus items and their image/roadmap files for this user
    const metadata = readMetadata();
    const remainingPdfs = [];
    for (const pdf of metadata.pdfs) {
        if (pdf.isSyllabus && pdf.userId === req.userId.toString()) {
            const filePath = path.join(RAW_DATA_PATH, pdf.filename);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    logger.error({ err, filePath }, "Failed to delete library syllabus file");
                }
            }
            const roadmapPath = path.join(PROCESSED_DATA_PATH, `${pdf.id}_roadmap.json`);
            if (fs.existsSync(roadmapPath)) {
                try {
                    fs.unlinkSync(roadmapPath);
                } catch (err) {
                    logger.error({ err, roadmapPath }, "Failed to delete library syllabus roadmap cache");
                }
            }
        } else {
            remainingPdfs.push(pdf);
        }
    }
    metadata.pdfs = remainingPdfs;
    writeMetadata(metadata);

    const response = await API.get("/deleteToken", {
        params: { userId: req.userId.toString() }
    })
    appAssert(response, INTERNAL_SERVER_ERROR, "Flask Error")

    logger.debug({ data: response.data }, "Token deletion response received");
    return res.status(OK).json({ message: "Token Deleted", data: response.data })
})

export const getTokenHandler = catchErrors(async (req, res) => {
    const extensions = ['.jpg', '.jpeg', '.png'];
    let syllabusExists = false;
    for (const ext of extensions) {
        if (fs.existsSync(path.join(RAW_DATA_PATH, `syllabus_${req.userId}${ext}`))) {
            syllabusExists = true;
            break;
        }
    }

    if (syllabusExists) {
        return res.status(OK).json({ message: "Syllabus exists." });
    } else {
        return res.status(NOT_FOUND).json({ message: "Syllabus does not exist." });
    }
})

export const getRoadmapHandler = catchErrors(async (req, res) => {
    const finalDataPath = path.join(PROCESSED_DATA_PATH, `finalData_${req.userId}.json`);
    if (fs.existsSync(finalDataPath)) {
        const data = fs.readFileSync(finalDataPath, 'utf-8');
        return res.status(OK).json(JSON.parse(data));
    } else {
        return res.status(NOT_FOUND).json({ message: "Roadmap not found" });
    }
})
