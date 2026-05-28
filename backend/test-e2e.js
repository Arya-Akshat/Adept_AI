const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const API_URL = 'http://localhost:4004/api';

async function runTests() {
  console.log("Starting E2E test...");

  // Create a dummy JWT token
  const dummyUserId = new mongoose.Types.ObjectId().toString();
  const dummySessionId = new mongoose.Types.ObjectId().toString();
  
  const token = jwt.sign(
    { userId: dummyUserId, sessionId: dummySessionId },
    process.env.JWT_SECRET,
    { expiresIn: '15m', audience: 'user' }
  );

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  try {
    // 1. Upload Image
    console.log("1. Uploading image to /parseImg...");
    const dummyImagePath = path.join(__dirname, 'dummy.jpg');
    fs.writeFileSync(dummyImagePath, Buffer.from("dummy image content"));
    
    const formData = new FormData();
    formData.append("image", fs.createReadStream(dummyImagePath));

    const uploadRes = await axios.post(`${API_URL}/parseImg`, formData, {
      headers: {
        ...authHeaders,
        ...formData.getHeaders(),
      }
    });

    console.log("Upload Response:", uploadRes.data);
    const pdfId = uploadRes.data.pdfId;

    if (!pdfId) {
        throw new Error("No pdfId returned from upload!");
    }

    // 2. Wait a second for things to settle
    await new Promise(r => setTimeout(r, 1000));

    // 3. Request Roadmap Generation
    console.log(`2. Requesting roadmap for pdfId: ${pdfId}...`);
    const roadmapRes = await axios.get(`${API_URL}/pdfs/${pdfId}/roadmap`, {
      headers: authHeaders
    });

    console.log("Roadmap Response Status:", roadmapRes.status);
    console.log("Roadmap successfully generated!");

    fs.unlinkSync(dummyImagePath);
    process.exit(0);

  } catch (error) {
    console.error("Test failed!");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

runTests();
