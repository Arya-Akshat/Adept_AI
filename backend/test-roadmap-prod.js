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

  // 2. Upload a real image
  const formData = new FormData();
  const dummyImagePath = path.join(__dirname, 'src', 'constants', 'rawData', 'syllabus.jpg');
  formData.append('image', fs.createReadStream(dummyImagePath));

  const uploadRes = await axios.post(`${API_URL}/parseImg`, formData, {
    headers: { ...authHeaders, ...formData.getHeaders() }
  });
  const pdfId = uploadRes.data.pdfId;

  // 3. Roadmap
  console.log(`Requesting roadmap for ${pdfId}...`);
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
