# ADEPT → VedaAI Backend Migration + Full Backend Implementation Prompt

You are working on an existing monorepo project called **ADEPT** and your task is to evolve it into a production-grade AI Assessment Creator system for a hiring assignment called **VedaAI**.

You must COMPLETE the backend migration and implementation in a STRICT PHASE-WISE manner.

DO NOT skip phases.
DO NOT partially implement features.
AFTER EVERY PHASE:
1. Run validation checks.
2. Fix all errors.
3. Ensure build passes.
4. Ensure lint/typecheck passes.
5. Ensure runtime works.
6. STOP and explicitly ASK THE USER for confirmation before moving to the next phase. Do NOT auto-proceed.

If any validation fails:
- STOP
- Fix the issue
- Re-run validations
- Ask the user to verify the fix

The goal is a COMPLETE, TESTED, PRODUCTION-STYLE backend architecture.

IMPORTANT:
- Preserve all existing functionality of ADEPT.
- DO NOT delete existing Gemini image functionality or Flask integration.
- Existing environment variables in `.env` MUST remain intact.
- Primary text generation provider = GROQ (env var: GROQ_API_KEY).
- Gemini is already configured and should remain available for image/PDF processing workflows.
- Maintain backward compatibility wherever possible.
- TypeScript strict mode must be ON throughout.

====================================================
PROJECT CONTEXT
====================================================

Current structure:

/frontend
/backend
/flask

Current stack:
- Frontend: React + TS + Vite
- Backend: Node.js + Express + TS + MongoDB
- AI Engine: Flask + Gemini + LangChain

Target backend additions:
- Redis
- BullMQ
- Socket.io
- Structured assessment generation
- Real-time job updates
- Worker architecture
- Production-ready API structure
- Validation
- Typed schemas
- Clean architecture

====================================================
PHASE 0 — CODEBASE DISCOVERY & MAPPING
====================================================

Before writing any new code:
1. Analyze the existing `/backend` folder structure, routes, and Mongoose models.
2. Identify where the existing Gemini and Flask API calls are currently being made.
3. List all existing environment variables currently used in `.env` or `.env.example`.
4. Identify all existing middleware (auth, error handling, etc.) that must be preserved.
5. Identify the current entry point (e.g. `server.ts` or `index.ts`) and how Express is initialized.
6. Check for any existing Socket.io, Redis, or BullMQ setup (even partial) so it is not duplicated.
7. Output a complete summary of all of the above so we guarantee nothing is overwritten.
8. STOP and wait for user confirmation.

====================================================
PHASE 1 — BACKEND ARCHITECTURE REFACTOR
====================================================

Refactor backend into scalable folder structure.

Target structure:

backend/
│
├── src/
│   ├── config/
│   │   ├── db.ts
│   │   ├── redis.ts
│   │   ├── socket.ts
│   │   ├── env.ts
│   │
│   ├── modules/
│   │   ├── assessment/
│   │   │   ├── assessment.controller.ts
│   │   │   ├── assessment.service.ts
│   │   │   ├── assessment.queue.ts
│   │   │   ├── assessment.worker.ts        ← worker logic lives HERE
│   │   │   ├── assessment.socket.ts        ← socket event emitters for assessment
│   │   │   ├── assessment.schema.ts
│   │   │   ├── assessment.types.ts
│   │   │   ├── assessment.prompts.ts
│   │   │   ├── assessment.parser.ts
│   │   │   ├── assessment.routes.ts
│   │   │
│   │   ├── auth/ (existing — preserve as-is)
│   │   ├── roadmap/ (existing — preserve as-is)
│   │   ├── upload/ (existing — preserve as-is)
│   │
│   ├── models/
│   │   ├── Assessment.ts
│   │   ├── AssessmentJob.ts
│   │
│   ├── services/
│   │   ├── groq.service.ts
│   │   ├── gemini.service.ts       ← wrap existing Gemini logic here, do not rewrite
│   │   ├── pdf.service.ts
│   │
│   ├── queues/
│   │   ├── index.ts                ← exports all BullMQ queue instances
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   ├── response.ts
│   │   ├── asyncHandler.ts         ← wraps async route handlers to catch errors
│   │
│   ├── middleware/
│   │   ├── error.middleware.ts
│   │   ├── auth.middleware.ts      ← preserve existing JWT auth logic exactly
│   │   ├── validate.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │
│   ├── app.ts
│   ├── server.ts
│
├── .env.example                    ← MUST be updated with all new vars
├── package.json
├── tsconfig.json

CLARIFICATION on duplicate worker path:
- `modules/assessment/assessment.worker.ts` = the actual BullMQ Worker definition and processing logic.
- There is NO separate `workers/` top-level folder. The single worker file lives inside the module. Remove any reference to a top-level `workers/` folder.

CLARIFICATION on socket files:
- `config/socket.ts` = Socket.io server initialization and connection setup (attaches to HTTP server).
- `modules/assessment/assessment.socket.ts` = assessment-specific event emitters (imports the initialized socket from config).

Tasks:
- Preserve existing routes. Mount them at the same paths.
- Refactor imports to resolve cleanly.
- Ensure no broken paths.
- Add centralized env loader with runtime validation (use zod or manual checks in env.ts — crash on startup if required vars are missing).
- Add centralized error handling middleware.
- Add typed API responses via `utils/response.ts`.
- Apply `helmet` and `express-rate-limit` as security middleware in `app.ts`.
- Add graceful shutdown handler for SIGTERM/SIGINT that closes: HTTP server, MongoDB, Redis, BullMQ workers.

Install required packages:
- bullmq ioredis socket.io zod groq-sdk uuid dotenv pino pino-pretty helmet express-rate-limit

Install required dev packages:
- @types/uuid

Update `.env.example` with all new required variables:
- GROQ_API_KEY=
- REDIS_URL=redis://localhost:6379
- FRONTEND_URL=http://localhost:5173
- WORKER_CONCURRENCY=3
- MAX_SOURCE_CONTENT_CHARS=3000
- (preserve all existing vars)

Validation after Phase 1:
- npm run build passes
- TypeScript has zero errors (strict mode on)
- Existing routes still work
- MongoDB connects successfully
- Server starts successfully
- Graceful shutdown works (Ctrl+C exits cleanly)
- STOP and await user confirmation.

====================================================
PHASE 2 — REDIS + BULLMQ SETUP
====================================================

Implement complete queue infrastructure.

Tasks:
1. Configure Redis connection in `config/redis.ts`. Export a single ioredis client instance.
   - Handle connection errors gracefully with Pino logging — do NOT crash on Redis unavailability during startup; instead, log error and retry.
   - Expose a `connectRedis()` function called from `server.ts`.
2. Create BullMQ queue in `queues/index.ts`: queue name = `assessment-generation`.
3. Create BullMQ Worker in `modules/assessment/assessment.worker.ts`:
   - Worker concurrency = 3 (configurable via env var WORKER_CONCURRENCY, default 3).
   - Implement idempotency: check if job has already been completed before re-processing.
   - Add retry logic: exponential backoff, max 3 attempts.
   - Add job progress tracking via `job.updateProgress()`.
   - Add failure handler that updates AssessmentJob status to `failed` with error message.
   - Worker should be started from `server.ts` after Redis connects, not from `app.ts`.
4. Add clean job cleanup: completed jobs removed after 1 hour, failed jobs kept for 24 hours.
5. (Optional but recommended) Add Bull Board at route `/admin/queues` for queue monitoring. Protect with a simple env-based password if added.

Job data payload structure (document this in `assessment.types.ts`):
{
  assessmentId: string,
  teacherId: string,
  sourceType: "text" | "pdf" | "none",
  sourceContent: string,
  config: {
    questionTypes: string[],
    totalQuestions: number,
    totalMarks: number,
    difficultyDistribution: { easy: number, medium: number, hard: number },
    instructions: string,
    subject: string,
    duration: number
  }
}

Job flow:
API Request → Validate → Save Assessment Draft → Queue Job → Emit `assessment:queued` → Worker Consumes → Emit `assessment:processing` → AI Generation → Emit `assessment:progress` → Parse Response → Save to DB → Emit `assessment:completed` OR `assessment:failed`

Statuses (use as a TypeScript enum or const in `assessment.types.ts`):
queued → processing → generating_sections → formatting → completed → failed

Progress percentages:
- queued: 0
- processing: 10
- generating_sections: 40
- formatting: 75
- completed: 100
- failed: (no progress update, only status)

Validation:
- Redis connection successful.
- Jobs enter queue and workers consume them.
- Retry logic works (test by intentionally throwing in worker).
- Job progress updates visible.
- Cleanup timers set correctly (check queue options).
- STOP and await user confirmation.

====================================================
PHASE 3 — DATABASE SCHEMAS
====================================================

Create production-grade Mongoose schemas.

Assessment schema (`models/Assessment.ts`):
Fields:
- title: string (required)
- teacherId: ObjectId ref User (required, indexed)
- sourceType: enum ["text", "pdf", "none"]
- sourceContent: string (optional, max 50000 chars)
- dueDate: Date (optional)
- instructions: string (optional)
- subject: string (required)
- duration: number (minutes, required)
- questionTypes: string[] (required)
- difficultyDistribution: { easy: number, medium: number, hard: number }
- totalQuestions: number (required)
- totalMarks: number (required)
- status: enum ["draft", "queued", "processing", "completed", "failed"] (default: "draft")
- generatedPaper: (see structure below, optional)
- jobId: string (optional, for tracking the BullMQ job)
- createdAt, updatedAt (timestamps: true)
- Index on: teacherId, status, createdAt

Question paper structure (generatedPaper, nested in Assessment):
{
  metadata: {
    subject: string,
    totalMarks: number,
    duration: number,     // minutes
    generatedAt: Date,
    instructions: string
  },
  sections: [
    {
      title: string,          // e.g. "Section A"
      instruction: string,    // e.g. "Attempt all questions"
      questions: [
        {
          questionNumber: number,
          text: string,
          difficulty: enum ["easy", "medium", "hard"],
          marks: number,
          bloomLevel: string,   // e.g. "Remember", "Understand", "Apply"
          type: string          // e.g. "MCQ", "Short Answer", "Long Answer"
        }
      ]
    }
  ]
}

AssessmentJob schema (`models/AssessmentJob.ts`):
Fields:
- jobId: string (required, unique, indexed)
- assessmentId: ObjectId ref Assessment (required)
- teacherId: ObjectId ref User (required)
- status: enum ["queued", "processing", "generating_sections", "formatting", "completed", "failed"]
- progress: number (0–100, default 0)
- startedAt: Date (optional)
- completedAt: Date (optional)
- errorMessage: string (optional)
- retryCount: number (default 0)
- createdAt, updatedAt (timestamps: true)

Validation:
- Schemas compile without TypeScript errors.
- Basic CRUD operations work.
- Indexes created correctly (verify via MongoDB Atlas or mongosh).
- STOP and await user confirmation.

====================================================
PHASE 4 — SOCKET.IO IMPLEMENTATION
====================================================

Implement complete realtime system.

Setup (`config/socket.ts`):
- Initialize Socket.io on the existing HTTP server (not a new server).
- Configure CORS to allow the frontend origin (read from env var FRONTEND_URL, fallback to http://localhost:5173).
- Export a `getIO()` function so other modules can emit without circular imports.
- Log client connect/disconnect events with Pino.

Room strategy:
- Clients join a room named after jobId: `socket.join(jobId)`.
- All assessment events are emitted to the room: `io.to(jobId).emit(event, payload)`.
- This means multiple browser tabs or clients watching the same job all receive updates.

Events (emit from `modules/assessment/assessment.socket.ts`):
- `assessment:queued`     → { jobId, assessmentId, status: "queued", progress: 0 }
- `assessment:processing` → { jobId, assessmentId, status: "processing", progress: 10 }
- `assessment:progress`   → { jobId, assessmentId, status, progress, message }
- `assessment:completed`  → { jobId, assessmentId, status: "completed", progress: 100, result: generatedPaper }
- `assessment:failed`     → { jobId, assessmentId, status: "failed", error: string }

Reconnect handling:
- On client reconnect, the frontend can call `GET /api/assessments/job/:jobId/status` to catch up on missed state (not a socket concern — just document this contract in docs/WEBSOCKET.md).

Validation:
- Socket.io server starts without errors.
- Client can connect (test with wscat or a quick HTML test file).
- Joining a room works.
- Events emit correctly to the correct room.
- STOP and await user confirmation.

====================================================
PHASE 5 — GROQ AI GENERATION PIPELINE
====================================================

IMPORTANT:
- Use GROQ for TEXT generation only. Preserve Gemini integrations. DO NOT overwrite Gemini env vars.
- GROQ_API_KEY must be read from env. Crash on startup (via env.ts validation) if missing.

Create: `services/groq.service.ts`

Implement:
- Initialize Groq client using `groq-sdk`.
- Primary model: `llama-3.3-70b-versatile`. Fallback model: `llama-3.1-8b-instant` (if primary rate-limits or fails).
- Force JSON-only responses: set `response_format: { type: "json_object" }` in every API call.
- Implement timeout: reject if no response within 60 seconds.
- Implement retry: up to 2 retries with 2s delay on rate-limit or timeout errors only (do not retry on parsing failures).
- Export a typed `generateAssessment(prompt: string): Promise<RawAssessmentResponse>` function.

Prompt engineering (`modules/assessment/assessment.prompts.ts`):

Build a `buildAssessmentPrompt(config: AssessmentJobData): string` function.

The system prompt must instruct the model:
- Respond ONLY with valid JSON. No markdown. No code fences. No explanation.
- Do not include any text before or after the JSON object.
- Follow the exact schema: `{ "metadata": { ... }, "sections": [ { "title", "instruction", "questions": [ { "questionNumber", "text", "difficulty", "marks", "bloomLevel", "type" } ] } ] }`

The user prompt must include:
- Subject
- Total questions and marks
- Difficulty distribution (how many easy/medium/hard)
- Question types requested
- Duration
- Any additional instructions
- Source content (if provided, trimmed to 3000 chars max to avoid token overflow)
- Explicit instruction to distribute questions across sections logically (e.g. Section A = MCQs, Section B = Short Answers, etc.)
- Explicit instruction to assign Bloom's taxonomy level to each question

Parser layer (`modules/assessment/assessment.parser.ts`):
- Define a Zod schema matching the full generatedPaper structure.
- Export `parseAssessmentResponse(raw: string): ParsedPaper` function.
- Steps: (1) attempt JSON.parse, (2) validate against Zod schema, (3) throw structured error on failure.
- On Zod failure: log the raw response (truncated to 500 chars) for debugging, throw a typed `ParseError`.
- DO NOT silently swallow parse errors.

Validation:
- Call the GROQ service manually with a hardcoded test prompt (add a temporary test script or log in worker).
- AI response parses successfully via Zod.
- Invalid/malformed outputs throw a typed error.
- Model fallback triggers on simulated rate-limit.
- STOP and await user confirmation.

====================================================
PHASE 6 — ASSESSMENT GENERATION APIs
====================================================

Create the following endpoints in `modules/assessment/assessment.routes.ts`.
ALL routes must be protected by the existing `auth.middleware.ts` (JWT verification).

POST   /api/assessments/create
GET    /api/assessments
GET    /api/assessments/:id
POST   /api/assessments/:id/regenerate
GET    /api/assessments/job/:jobId/status
DELETE /api/assessments/:id

POST /api/assessments/create — Full flow:
1. Validate request body with Zod (use `validate.middleware.ts`).
   Required fields: title, subject, duration, totalQuestions, totalMarks, questionTypes, difficultyDistribution
   Optional fields: dueDate, instructions, sourceType, sourceContent
   Validation rules: totalQuestions > 0, totalMarks > 0, duration > 0, difficultyDistribution values sum to totalQuestions (or warn if not), questionTypes not empty.
2. Save Assessment to MongoDB with status "draft".
3. Create BullMQ job with job data payload (see Phase 2).
4. Save AssessmentJob to MongoDB.
5. Emit `assessment:queued` socket event.
6. Return: { success: true, data: { jobId, assessmentId } }

POST /api/assessments/:id/regenerate:
- Verify assessment belongs to requesting teacher (teacherId match).
- Check assessment is not already in processing/queued state.
- Create a new BullMQ job, create a new AssessmentJob record, update Assessment status to "queued".
- Emit `assessment:queued`.
- Return: { success: true, data: { jobId, assessmentId } }

GET /api/assessments/:id:
- Return full assessment including generatedPaper.
- Verify ownership.

GET /api/assessments:
- Return list of assessments for the authenticated teacher.
- Support pagination: ?page=1&limit=10 (default limit 10).
- Sort by createdAt descending.

GET /api/assessments/job/:jobId/status:
- Return current AssessmentJob status, progress, errorMessage.
- Used by frontend to catch up after reconnect.

DELETE /api/assessments/:id:
- Verify ownership.
- Delete assessment and associated AssessmentJob records.
- Return: { success: true }

All responses must use the typed response utility from `utils/response.ts`:
- Success: { success: true, data: T }
- Error: { success: false, error: { code: string, message: string } }

Validation:
- All APIs return correct responses.
- Zod validation rejects bad input with clear error messages.
- Queue integration triggers and job is created.
- Ownership checks prevent unauthorized access.
- Pagination works on list endpoint.
- STOP and await user confirmation.

====================================================
PHASE 7 — FILE PROCESSING SUPPORT
====================================================

Preserve and integrate existing upload system (PDF/TXT).

Tasks:
- Review the existing upload route and multer configuration. DO NOT change the existing upload logic.
- Add a `extractTextFromUpload(filePath: string, mimeType: string): Promise<string>` function in `services/gemini.service.ts` (or a new `services/fileExtract.service.ts` if cleaner).
  - For plain text (.txt): read file directly.
  - For PDF: use existing Gemini PDF capability if available; otherwise use `pdf-parse` library.
- In the assessment creation flow (Phase 6), if `sourceType === "pdf"` and a file has been uploaded, call this extractor and populate `sourceContent` before queuing the job.
- Trim extracted content to MAX_SOURCE_CONTENT_CHARS (env var, default 3000).
- Log extracted content length for debugging.
- DO NOT remove the existing upload functionality used by other parts of ADEPT.

Validation:
- Upload endpoint still works for existing ADEPT functionality.
- Text extraction works for .txt files.
- Text extraction works for PDF files.
- Extracted content is correctly passed to the assessment job queue.
- STOP and await user confirmation.

====================================================
PHASE 8 — PDF GENERATION SYSTEM
====================================================

Implement PDF-ready backend service in `services/pdf.service.ts`.

Library choice:
- Use PDFKit if the layout can be achieved with it (preferred — lower memory, no headless browser).
- Use Puppeteer only if PDFKit cannot produce the required structured layout.
- Document the choice in a code comment at the top of pdf.service.ts.

PDF layout requirements:
- Header: School/Institution name placeholder, subject, date, duration, total marks.
- Student info section: Name _______, Roll No _______, Section _______.
- For each section:
  - Section title (bold, larger font).
  - Section instruction (italic).
  - Numbered questions with question text.
  - Each question must show: marks (right-aligned), difficulty tag (e.g. [Easy]).
- Footer: Page numbers.
- Proper margins, readable font size (min 11pt).

Add endpoint:
GET /api/assessments/:id/pdf

- Verify assessment exists and belongs to requesting teacher.
- Verify assessment status is "completed" and generatedPaper exists.
- Stream PDF as response with headers: Content-Type: application/pdf, Content-Disposition: attachment; filename="assessment-{id}.pdf"
- Handle errors: if PDF generation fails, return a 500 JSON error (do not send partial PDF).

Validation:
- PDF generates successfully.
- Layout is readable (check manually).
- Student info section present.
- All sections and questions present.
- Page numbers in footer.
- Error handled if assessment has no generatedPaper.
- STOP and await user confirmation.

====================================================
PHASE 9 — LOGGING + ERROR HANDLING
====================================================

Implement production-grade logging and error handling.

Logging (`utils/logger.ts`):
- Use Pino with pino-pretty in development, plain JSON in production (check NODE_ENV).
- Export a single logger instance used everywhere (no console.log in production code).
- Log levels: error, warn, info, debug.
- Add request logging middleware (use `pino-http` or a manual middleware): log method, path, status, duration for every request.
- Log all BullMQ job lifecycle events: queued, started, completed, failed, retried.
- Log all Socket.io connect/disconnect events.
- Sanitize logs: never log full source content (truncate to 100 chars).

Error handling:
- Centralized error middleware in `middleware/error.middleware.ts`.
- Handle: ValidationError (Zod), MongooseError, CastError (invalid ObjectId), JWT errors, custom AppError class.
- Custom AppError class in `utils/errors.ts`: { message, statusCode, code }.
- All async route handlers wrapped with `asyncHandler` from `utils/asyncHandler.ts`.
- BullMQ worker failures: catch all errors, update AssessmentJob status, emit `assessment:failed` socket event.
- Redis connection failures: log and retry — do NOT crash the entire server.
- GROQ API failures: propagate as AppError with code `AI_GENERATION_FAILED`.
- Parsing failures: propagate as AppError with code `AI_PARSE_FAILED`.
- Unhandled promise rejections and uncaughtException: log and exit process (let process manager restart).

Validation:
- Logs output correctly in development (pretty) and production (JSON).
- All error types return correct HTTP status codes and structured responses.
- BullMQ job failures are caught and stored correctly.
- Unhandled rejections are logged before process exit.
- STOP and await user confirmation.

====================================================
PHASE 10 — TESTING + FINAL VALIDATION
====================================================

Perform COMPLETE system validation.

Run:
- npm run build
- npm run lint
- npm run typecheck

Fix ALL issues before proceeding.

Manual integration tests (document results in output):

1. MongoDB: connect, create Assessment, create AssessmentJob, read back both.
2. Redis: connect, ping, set/get a key.
3. BullMQ: add a job to `assessment-generation`, confirm worker picks it up.
4. Socket.io: connect a test client, join a room, confirm events arrive.
5. GROQ generation: call `generateAssessment()` with a test prompt, confirm JSON is returned and parses via Zod.
6. Existing Gemini workflows: confirm existing ADEPT roadmap generation still works.
7. API endpoints: test all 6 assessment API routes with valid and invalid inputs.
8. PDF generation: call `GET /api/assessments/:id/pdf` on a completed assessment, confirm PDF downloads.
9. File upload: upload a PDF and confirm text extraction works.
10. Retry logic: simulate a worker failure (throw intentionally), confirm retry and eventual `assessment:failed` event.
11. Graceful shutdown: send SIGTERM, confirm server closes cleanly without hanging.
12. Auth protection: call all assessment routes without JWT, confirm 401 responses.

Then create / update the following documentation files in the repo root:

1. `README.md` — updated with: project overview, full setup instructions, env variable reference, how to run all services.
2. `docs/ARCHITECTURE.md` — system architecture overview with a text diagram of all components and how they interact.
3. `docs/QUEUE_FLOW.md` — step-by-step BullMQ job lifecycle from API request to WebSocket completion event.
4. `docs/API.md` — full API reference: method, path, auth required, request body schema, response schema, error codes.
5. `docs/WEBSOCKET.md` — all Socket.io events, their payloads, and when they are emitted.
6. `.env.example` — complete list of all environment variables with comments explaining each one.

CRITICAL RULES:
1. NEVER delete existing Gemini functionality.
2. NEVER remove existing env variables.
3. Preserve backward compatibility.
4. Apply auth.middleware.ts to ALL new assessment routes.
5. Use strict TypeScript throughout — no `any` types.
6. Never use console.log in production code — use the Pino logger.
7. DO NOT MOVE TO THE NEXT PHASE until you ask the user and the user says "Proceed".