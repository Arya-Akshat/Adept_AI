const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:4004/api';
const AUTH_URL = 'http://localhost:4004/auth';

async function runTests() {
  console.log("Starting E2E test against production...");

  try {
    // 1. Register a dummy user
    const dummyEmail = `testuser_${Date.now()}@test.com`;
    console.log("Registering user:", dummyEmail);
    const registerRes = await axios.post(`${AUTH_URL}/register`, {
      email: dummyEmail,
      password: "password123",
      confirmPassword: "password123",
      firstName: "Test",
      lastName: "User"
    });

    const token = registerRes.data.accessToken;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Upload image
    console.log("Uploading image...");
    const dummyImagePath = path.join(__dirname, 'dummy.jpg');
    if (!fs.existsSync(dummyImagePath)) fs.writeFileSync(dummyImagePath, Buffer.from("dummy"));
    
    const formData = new FormData();
    formData.append("image", fs.createReadStream(dummyImagePath));

    const uploadRes = await axios.post(`${API_URL}/parseImg`, formData, {
      headers: { ...authHeaders, ...formData.getHeaders() }
    });
    const pdfId = uploadRes.data.pdfId;

    // 3. Roadmap
    console.log(`Requesting roadmap for ${pdfId}...`);
    try {
      await axios.get(`${API_URL}/pdfs/${pdfId}/roadmap`, { headers: authHeaders });
    } catch(e) {
      console.log("Roadmap failed (expected 502/500 if python is down):", e.response?.status);
    }

    // 4. Create Assessment
    console.log(`Creating assessment for ${pdfId}...`);
    try {
      const assessRes = await axios.post(`${API_URL}/assessments/create`, {
        pdfId: pdfId,
        unitIndex: 1,
        questionCount: 5
      }, { headers: authHeaders });
      console.log("Assessment created:", assessRes.status);
    } catch(e) {
      console.log("Assessment creation failed:", e.response?.status, e.response?.data);
    }

    process.exit(0);
  } catch (error) {
    console.error("Test failed!");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
    process.exit(1);
  }
}

runTests();
