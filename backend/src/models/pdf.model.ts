import mongoose, { Document, Schema } from "mongoose";

export interface IPdf extends Document {
    filename: string;
    uploadDate: Date;
    roadmap?: any; // Store roadmap JSON directly
    summary?: string;
}

const pdfSchema = new Schema<IPdf>({
    filename: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    roadmap: { type: Schema.Types.Mixed }, // Flexible field for roadmap data
    summary: { type: String }
});

const PdfModel = mongoose.model<IPdf>("Pdf", pdfSchema);
export default PdfModel;
