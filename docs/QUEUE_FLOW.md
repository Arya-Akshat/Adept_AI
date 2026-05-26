# BullMQ Queue Lifecycle & Job Flow

This document details the step-by-step asynchronous processing flow of assessment generation, starting from the client's HTTP request to the final WebSocket completion event.

## Detailed Steps

```
Client             Backend API         Redis/Queue         BullMQ Worker         Groq AI          Database
  |                     |                   |                    |                  |                 |
  |--- POST /create --->|                   |                    |                  |                 |
  |                     |--- Validate Zod ->|                    |                  |                 |
  |                     |--- Save Draft ----+--------------------+------------------+-------------->| [Save Draft]
  |                     |--- Add Job ------>|                    |                  |                 |
  |                     |                   |-- [Job Queued]     |                  |                 |
  |<-- Return jobId ----|                   |                    |                  |                 |
  |                     |                   |                    |                  |                 |
  |=== Connect Socket ===========================================|                  |                 |
  |--- Join room(jobId) |                   |                    |                  |                 |
  |                     |                   |                    |                  |                 |
  |                     |                   |--- Polls Job ----->|                  |                 |
  |                     |                   |                    |-- [Processing]   |                 |
  |<-- Emit processing -+-------------------+--------------------|                  |                 |
  |                     |                   |                    |                  |                 |
  |                     |                   |                    |--- Gen Prompt -->|                 |
  |                     |                   |                    |--- Generate ---->|                 |
  |<-- Emit generating -+-------------------+--------------------|                  |                 |
  |                     |                   |                    |                  |<-- JSON text ---|
  |                     |                   |                    |                  |                 |
  |                     |                   |                    |-- Parse & Check  |                 |
  |<-- Emit formatting -+-------------------+--------------------|                  |                 |
  |                     |                   |                    |                  |                 |
  |                     |                   |                    |-- Save Paper ----+---------------->| [Save Paper]
  |                     |                   |                    |-- Complete Job --+---------------->| [Complete Job]
  |<-- Emit completed --+-------------------+--------------------|                  |                 |
```

### 1. Request Initiation & Validation
- The frontend posts to `/api/assessments/create` with assessment parameters and optionally an uploaded `pdfId`.
- The backend validates fields via Zod and extracts text from files if `sourceType` is `"pdf"` or `"text"`.

### 2. Draft Storage & Queuing
- The backend creates an `Assessment` document in MongoDB with `status: "draft"`.
- It pushes the job details onto the `assessment-generation` queue in Redis.
- A matching `AssessmentJob` is written to MongoDB tracking progress (initialized to `0%`).
- The `Assessment` status updates to `"queued"` and records the `jobId`.
- The backend emits `assessment:queued` to Socket.io.
- The API responds immediately to the frontend with `{ success: true, data: { jobId, assessmentId } }` within 100-200ms.

### 3. Worker Ingestion
- A free worker thread picks up the job from the Redis queue.
- It updates the database statuses to `"processing"` (progress `10%`) and emits `assessment:processing` to the Socket.io room.

### 4. Groq Text Generation
- The worker compiles the parameters and text context into a prompt using templates in `assessment.prompts.ts`.
- The worker updates status to `"generating_sections"` (progress `40%`) and calls the Groq Service.
- If Groq returns a rate limit (HTTP 429) or timeout, the worker retries (up to 2 times) and falls back to `llama-3.1-8b-instant`.

### 5. Parsing & Schema Validation
- Once the JSON is returned, the worker transitions to `"formatting"` (progress `75%`) and calls the Zod parser layer.
- If validation fails, it throws a `ParseError` (triggering a job failure).

### 6. Completion & Persistence
- The parsed exam structure is saved into the original `Assessment` document in the `generatedPaper` property, and the status changes to `"completed"`.
- The `AssessmentJob` status is updated to `"completed"` (progress `100%`) with `completedAt: new Date()`.
- The worker emits `assessment:completed` containing the fully generated paper.
- The client receives the paper and displays the success layout.

### 7. Failure Handling
- If any exception is thrown, the worker catches it, updates both MongoDB documents to `status: "failed"`, and records `errorMessage` on the job.
- The worker emits `assessment:failed` with the error.
- The job is retried by BullMQ up to 3 times (with exponential backoff) before entering a final failed state.
