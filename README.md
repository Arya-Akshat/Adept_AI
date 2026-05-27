# VedaAI (formerly ADEPT) – AI Assessment Creator & Study Companion

VedaAI is a production-grade educational platform that combines student roadmap generation with a powerful AI Assessment Creator for teachers. It features background job queuing via Redis/BullMQ, real-time WebSocket notifications via Socket.io, structured text generation via Groq, file extraction (PDF/text), and exam-style PDF generation using PDFKit.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React (Vite) + TypeScript + Tailwind CSS
- **Backend (Node.js)**: Express, Mongoose, Redis, BullMQ, Socket.io, PDFKit
- **AI Engine (Python/FastAPI)**: FastAPI, Google Gemini API, LangChain (for student roadmaps)
- **Primary AI Provider (VedaAI)**: Groq SDK (`llama-3.3-70b-versatile` & fallback `llama-3.1-8b-instant`)

---

## 🚀 Quick Start (Local Setup)

To run the full stack locally, make sure you have **Node.js (v18+)**, **Python 3.10+**, and a running **Redis** instance.

### 1. Redis Service
Ensure Redis is running on `localhost:6379` (or update `REDIS_URL` in `.env`):
```bash
redis-server
```

### 2. Backend (Node.js)
```bash
cd backend
npm install
npm run build
npm run dev
```

### 3. AI Engine (FastAPI)
Create a virtual environment, install requirements, and run the FastAPI server:
```bash
python3 -m venv .venv_new
source .venv_new/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 5001 --app-dir fastapi
```

### 4. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Environment Variables (Node.js Backend)

Create a `.env` file inside the `backend` folder:
```env
# Server Config
NODE_ENV=development
PORT=4004

# Origins
APP_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
FASTAPI_URL=http://localhost:5001

# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/vedaai

# Security / JWT
JWT_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key

# Paths
RAW_DATA_PATH=./src/constants/rawData
PROCESSED_DATA_PATH=./src/constants/processedData

# VedaAI Generation Configuration
GROQ_API_KEY=your_groq_api_key
REDIS_URL=redis://localhost:6379
WORKER_CONCURRENCY=3
MAX_SOURCE_CONTENT_CHARS=3000
```
