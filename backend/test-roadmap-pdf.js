const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'https://adept-ai.onrender.com/api';
const AUTH_URL = 'https://adept-ai.onrender.com/auth';

async function run() {
  const email = `testuser_${Date.now()}@test.com`;
  
  // 1. Register
  const regRes = await axios.post(`${AUTH_URL}/register`, {
    email,
    password: "password123",
    confirmPassword: "password123",
    firstName: "Test",
    lastName: "User"
  });
  const token = regRes.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Upload a real PDF
  const formData = new FormData();
  const dummyPdfPath = path.join(__dirname, 'src', 'constants', 'rawData', 'test.pdf');
  formData.append('file', fs.createReadStream(dummyPdfPath));
  formData.append('documentType', 'notes');

  const uploadRes = await axios.post(`${API_URL}/upload/parseImg`, formData, {
    headers: { ...authHeaders, ...formData.getHeaders() }
  });
  const pdfId = uploadRes.data.pdfs[0].id;

  // 3. Roadmap
  console.log(`Requesting roadmap for PDF ${pdfId}...`);
  try {
      const start = Date.now();
      const roadmapRes = await axios.get(`${API_URL}/pdfs/${pdfId}/roadmap`, { headers: authHeaders });
      console.log("Success in " + (Date.now() - start) + "ms");
  } catch (err) {
      console.log("Failed! Status:", err.response?.status);
      console.log("Data:", JSON.stringify(err.response?.data, null, 2));
  }
}
run();
