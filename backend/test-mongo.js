const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function getPdf() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // LibraryFile collection
  const db = mongoose.connection.db;
  const libraryfiles = db.collection('libraryfiles');
  
  const pdfId = new mongoose.Types.ObjectId('6a181ba2cf56bb1ecef6efe5');
  const doc = await libraryfiles.findOne({ _id: pdfId });
  
  console.log("PDF Doc:", JSON.stringify(doc, null, 2));
  process.exit(0);
}

getPdf().catch(console.error);
