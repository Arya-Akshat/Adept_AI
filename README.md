# ADEPT - AI Study Companion

ADEPT is a comprehensive AI-powered study assistant that transforms your syllabus and study materials into personalized learning roadmaps. It leverages the power of Large Language Models (Gemini) to generate structured study plans, explain complex topics, and curate relevant YouTube resources.

## 🚀 Quick Start (Run Locally)

After cloning the repository, open **3 separate terminals** and run the following commands:

**Terminal 1: Backend (Node.js)**
```bash
cd backend && npm install && npm run dev
```

**Terminal 2: AI Engine (Flask)**
```bash
# Ensure you have Python installed. You may need to create a venv first.
# python3 -m venv .venv_new && source .venv_new/bin/activate && pip install -r flask/requirements.txt
python3 flask/app.py
```

**Terminal 3: Frontend (React)**
```bash
cd frontend && npm install && npm run dev
```

---

## 🛠️ Tech Stack

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS
*   **Backend:** Node.js, Express, MongoDB (Mongoose)
*   **AI Engine:** Python, Flask, Google Gemini API, LangChain
*   **Authentication:** JWT (JSON Web Tokens)

---

## 📸 Application Screenshots

### 1. Landing / Login
![Login Screen](ss/Screenshot%202025-11-27%20at%2011.59.52%20AM.png)

### 2. Dashboard Overview
![Dashboard](ss/Screenshot%202025-11-27%20at%2012.00.10%20PM.png)

### 3. Upload Interface
![Upload Interface](ss/Screenshot%202025-11-27%20at%2012.00.29%20PM.png)

### 4. Roadmap Generation
![Roadmap Generation](ss/Screenshot%202025-11-27%20at%2012.00.42%20PM.png)

### 5. Topic Explanation
![Topic Explanation](ss/Screenshot%202025-11-27%20at%2012.00.50%20PM.png)

### 6. Detailed View
![Detailed View](ss/Screenshot%202025-11-27%20at%2012.00.59%20PM.png)

### 7. Resource Curation
![Resource Curation](ss/Screenshot%202025-11-27%20at%2012.01.10%20PM.png)
