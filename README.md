# ADEPT - AI Study Companion

[**Live Demo**](https://adept-ai-seven.vercel.app/)

## Quick Start
Run the following commands to start the project locally:

```bash
# Install dependencies & Start Backend
pip install -r requirements.txt && cd backend && npm install && npm run build && cd .. && ./start.sh

# Start Frontend (in a new terminal)
cd frontend && npm install && npm run dev
```

## About
ADEPT is an intelligent study companion that transforms your syllabus and PDF materials into personalized learning roadmaps.

**Key Features:**
-   **AI Roadmaps:** Automatically generates structured study paths from your documents.
-   **Deep Dive:** Provides detailed explanations for every topic using Gemini AI.
-   **Curated Resources:** Finds relevant YouTube videos for each concept.
-   **Interactive UI:** Track your progress and learn at your own pace.

## Tech Stack
-   **Frontend:** React, Vite, TypeScript, Tailwind CSS
-   **Backend:** Node.js (Express) & Python (Flask)
-   **AI:** Google Gemini 2.0 Flash
