# WebSocket Integration Reference (Socket.io)

VedaAI utilizes Socket.io to push real-time status transitions and progress percentages of assessment creation jobs to connected clients.

---

## 🔌 Connection Setup

- **Host**: Backend origin (e.g. `http://localhost:4004`)
- **CORS Allowed**: Reads from `FRONTEND_URL` and `APP_ORIGIN` variables (default `http://localhost:5173`).
- **Credentials**: Set `credentials: true` during client initialization if authentication is coupled.

### Socket Rooms
To avoid broadcast pollution, clients join rooms identified by the BullMQ `jobId`:
1. Client establishes connection.
2. Client emits a `join` event passing the `jobId` payload.
3. Server puts the socket in room `jobId`.
4. All status transitions for that job are emitted strictly to room `jobId`.

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:4004", {
  withCredentials: true,
});

// Join the job tracking room
socket.emit("join", jobId);
```

---

## 📡 List of Emitted Events

All events carry a unified payload structure and are pushed to room `jobId`.

### 1. `assessment:queued`
- **When**: Job added to Redis queue.
- **Payload**:
  ```json
  {
    "jobId": "1a2b3c4d-5e6f-7g8h",
    "assessmentId": "65b90f421ca2b3d870ff5021",
    "status": "queued",
    "progress": 0
  }
  ```

### 2. `assessment:processing`
- **When**: Worker consumes the job.
- **Payload**:
  ```json
  {
    "jobId": "1a2b3c4d-5e6f-7g8h",
    "assessmentId": "65b90f421ca2b3d870ff5021",
    "status": "processing",
    "progress": 10
  }
  ```

### 3. `assessment:progress`
- **When**: Worker moves across pipeline stages (text generation, parsing, formatting).
- **Payload**:
  ```json
  {
    "jobId": "1a2b3c4d-5e6f-7g8h",
    "assessmentId": "65b90f421ca2b3d870ff5021",
    "status": "generating_sections", // or "formatting"
    "progress": 40, // or 75
    "message": "Generating assessment questions using AI..." // optional
  }
  ```

### 4. `assessment:completed`
- **When**: Generation succeeded, validated, and saved in MongoDB.
- **Payload**:
  ```json
  {
    "jobId": "1a2b3c4d-5e6f-7g8h",
    "assessmentId": "65b90f421ca2b3d870ff5021",
    "status": "completed",
    "progress": 100,
    "result": {
      "metadata": { "subject": "Mathematics", "totalMarks": 25, "duration": 60, "instructions": "Answer all." },
      "sections": [ ... ]
    }
  }
  ```

### 5. `assessment:failed`
- **When**: An error is thrown during generation or Zod parsing validation.
- **Payload**:
  ```json
  {
    "jobId": "1a2b3c4d-5e6f-7g8h",
    "assessmentId": "65b90f421ca2b3d870ff5021",
    "status": "failed",
    "progress": 0,
    "error": "Zod parse failed: questions.0.difficulty is invalid"
  }
  ```
