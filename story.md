# The ADEPT Revival & VedaAI Integration: Our Finish-Up-A-Thon Journey

This document captures the before-and-after story of reviving **ADEPT** and expanding it with the **VedaAI AI Assessment Creator** for the GitHub Finish-Up-A-Thon Challenge.

---

## 📅 The Starting Point (Before)

At the beginning of this challenge, **ADEPT** was a specialized **AI Study Companion** built to help students turn unstructured syllabus images and notes PDFs into organized, interactive learning paths.

### **Current Tech Stack:**
*   **Frontend:** React (Vite) + TypeScript + Tailwind CSS + Shadcn UI
*   **Backend:** Node.js (Express + TypeScript) + MongoDB (Mongoose)
*   **AI Engine:** Python (Flask) + Google Gemini API + LangChain
*   **Database:** MongoDB

### **Current Feature Status:**
- [x] **User Auth:** Basic JWT authentication (Register / Login).
- [x] **Notes Integration:** Downloading course materials directly from Google Classroom using Google OAuth.
- [x] **Roadmap Generation:** Parsing syllabus images and PDFs using Gemini to output study milestones.
- [x] **Topic Explanation:** Double-clicking topic cards to get detailed Gemini-generated explanations.
- [x] **Video Curation:** Pulling relevant YouTube tutorials using the YouTube Data API.

### **Limitations / Pain Points (Before the Hackathon):**
1.  **Student-Only Utility:** Only served students studying existing material; no features existed for teachers, tutors, or assessment creators.
2.  **No Background Queuing:** Long-running AI generations were handled synchronously over HTTP, risking timeouts.
3.  **No Real-time Sync:** The frontend had to wait for HTTP responses rather than receiving real-time status updates via WebSockets.
4.  **No Global State Management:** State was passed through props or React Context, lacking a scalable global store (like Redux or Zustand).

---

## 🎯 The Revival Goal: Merging VedaAI with ADEPT

Our goal is to evolve **ADEPT** from a student study tool into a bidirectional education platform by implementing **VedaAI's AI Assessment Creator** inside the codebase. 

### **Planned Upgrades:**
1.  **Add Teacher Workspace (Frontend):** Build a responsive, beautiful form using Zustand to gather test parameters (Due date, Question count, Marks, Instructions, Difficulty).
2.  **Asynchronous Generation Pipeline (Backend):** 
    *   Integrate **Redis** and **BullMQ** to process AI question generation in the background.
    *   Set up a **WebSocket (Socket.io)** server to push real-time queue progress updates to the frontend.
3.  **Structured AI Prompting (AI Engine):** Implement a structured schema parser to force Gemini to return valid, JSON-formatted question papers split into logical sections (A, B, C) with difficulty tags (Easy, Moderate, Hard).
4.  **Premium Output Layout (Frontend):** Create an elegant, exam-style preview page matching the Figma design, with student info inputs, visually colored difficulty badges, and clean styling.
5.  **Extra features:**
    *   [ ] PDF Export (properly formatted).
    *   [ ] Regeneration action bar.

---

## 🚀 The Finish Line (After)

*(To be filled once integration is complete!)*

### **New Architecture Diagram:**
*(To be completed)*

### **Completed Upgrades & Copilot's Role:**
*(To be completed)*
