# System Architecture

This document describes the high-level architecture of VedaAI and shows how the frontend, Node.js backend, Python FastAPI service, database, Redis queue, and AI models interact.

```
                  +-----------------------------------+
                  |           React Frontend          |
                  +-----------------+-----------------+
                                    |
            HTTP/REST APIs          |   WebSockets (Real-time Progress)
            & File Uploads          |   & Room Joining
                                    v
                  +-----------------+-----------------+
                  |          Node.js Backend          | <-----+
                  +-------+-------------------+-------+       |
                          |                   |               |
          DB Reads/Writes |   Queues Jobs     | HTTP Proxies  | Emits Progress
                          v                   v               v Events
       +------------------+--+      +---------+-------+    +--+--------------+
       |   MongoDB Atlas     |      |  Redis (BullMQ) |    |  Socket.io Room |
       +---------------------+      +---------+-------+    +-----------------+
                                              |
                                              | Processes
                                              v Jobs
                                    +---------+-------+
                                    |  BullMQ Worker  |
                                    +---------+-------+
                                              |
                                              | Chat/Generation APIs
                                              v
                              +---------------+---------------+
                              |    Groq SDK (Llama 3.3/3.1)   |
                              +-------------------------------+
```

## Architectural Components

### 1. Frontend Client (React)
- Interfaces with the teacher to collect configuration parameters (subject, question count, marks, difficulty, instructions).
- Uploads PDFs/text notes files.
- Establishes a Socket.io connection to listen for progress updates matching the specific BullMQ `jobId`.
- Visualizes real-time status transitions (`queued` -> `processing` -> `generating_sections` -> `formatting` -> `completed` / `failed`).
- Renders the final, formatted exam preview and initiates PDF exports.

### 2. Node.js Backend Server (Express + TypeScript)
- **API Routing & Controllers**: Exposes REST endpoints to create, fetch, paginate, regenerate, and delete assessments.
- **Job Broker (BullMQ Queue)**: Interacts with Redis to broker long-running assessment generation requests.
- **WebSocket Gateway (Socket.io)**: Maps clients watching a job to rooms, and propagates worker progress events to subscribers.
- **Services Layer**: 
  - `pdf.service.ts`: Renders structural exam layouts using PDFKit.
  - `fileExtract.service.ts`: Extracts plaintext from PDFs and text files in-memory.
- **Centralized Error & Logging**: Maps different runtime failures using Pino logging and standard JSON error formats.

### 3. Queue Coordinator (Redis)
- Backs the BullMQ system.
- Stores queued jobs, failed retries, and job progress data.

### 4. Background Job Consumer (BullMQ Worker)
- Runs concurrently (default 3 workers).
- Pulls jobs, executes Groq AI generation pipelines, parses structured JSON, updates MongoDB, and publishes status updates back to Socket.io.

### 5. FastAPI AI Engine
- Python helper engine used for student roadmap creation, YouTube recommendations, and deep explanation overlays.
