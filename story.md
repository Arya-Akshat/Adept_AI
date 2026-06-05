# The Story of AdeptAI: The Resurrected Assistant

In my college, we have a lot of exams. Teachers get constantly overwhelmed with creating exam papers, checking student work, and tracking individual progress. A teacher once told me how much time they waste just doing manual paperwork instead of teaching. That was the spark: *what if an AI could handle all the tedious exam generation, grading rubrics, and personalized study guides?*

That was the birth of **AdeptAI**. 

It first started as a hackathon project, but like many student ideas, it got abandoned midway due to our own exams and was forgotten with time. But with the GitHub-a-thon, I finally got a chance to bring it back to life.

---

## 📅 The Starting Point (Before)

Initially, AdeptAI was a basic student study companion designed to help convert syllabus images or notes PDFs into simple roadmap milestones. 

Here is what the interface looked like before the resurrection:

### 1. Simple Login & Dashboard
The login was standard, and the dashboard was a basic, static layout displaying course files.

### 2. Syllabus Upload & Roadmaps
Students could upload a syllabus file to create simple learning roadmaps. However, processing was slow, synchronous, and frequently timed out on large files.

### 3. Basic Doubt Solvers
Clicking a topic card opened a simple panel providing standard LLM definitions and raw YouTube tutorials.

---

## 🚀 The Upgrade Journey (After)

With the GitHub Finish-Up-a-thon, I didn't just fix the bugs, I completely rebuilt AdeptAI into a unified, high-performance learning suite for both teachers and students.

Here is the upgraded interface:

### 1. Modern Workspace
I refreshed the design language, introduced a unified layout with custom theme panels, and synchronized user avatars in real-time.

### 2. High-Performance Library & Async Pipelines
I optimized database queries to exclude heavy JSON payloads (`-roadmapData`) so library lists load in milliseconds. I also added Redis and BullMQ queues to handle roadmaps in the background, showing real-time progress bars via Socket.io.

### 3. Intelligent Doubt Solving
I replaced discontinued Gemini endpoints with a resilient, self-healing model sequence (trying `gemini-3.5-flash` first, falling back to `gemini-2.5-flash`), securing seamless image-text extractions even under high load.

### 4. The Teacher's Toolkit
I introduced a teacher suite designed to make exam creation and grading easy:
* **Rubrics Generator:** Splits total marks mathematically into structured grades automatically.
* **AI Question Bank & Slides:** Generates questions by difficulty and compiles study slides.
* **Groups Management:** Arranges students into active project teams.

---

## 🛠️ The Tech Stack (Under the Hood)
* **Frontend:** React (Vite) + TypeScript + Tailwind CSS + Zustand + Socket.io-client
* **Backend:** Node.js (Express) + MongoDB (Mongoose) + Redis (ioredis) + BullMQ + Socket.io + PDFKit
* **AI Engine:** Python (FastAPI) + Google Gemini API (`gemini-3.5-flash` & `gemini-embedding-2`) + LangChain + Groq SDK (`llama-3.3-70b-versatile`)
* **File Storage:** Supabase Cloud Storage
* **Deployments:**
  * **Vercel Client:** https://adept-ai-seven.vercel.app
  * **Render API Backend:** https://adept-ai.onrender.com
  * **YouTube Demo Walkthrough:** https://youtu.be/2FcKouCd3xg
