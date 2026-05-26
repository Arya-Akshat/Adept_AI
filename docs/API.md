# REST API Reference (Assessments)

All endpoints listed below are prefixed with `/api/assessments` and require authentication. Pass the credentials using cookies (`accessToken`).

---

## 1. Create Assessment
- **Method**: `POST`
- **Path**: `/create`
- **Auth Required**: Yes
- **Request Body Schema**:
  ```json
  {
    "title": "Unit 1 Algebra Test",
    "subject": "Mathematics",
    "duration": 60,
    "totalQuestions": 5,
    "totalMarks": 25,
    "questionTypes": ["MCQ", "Short Answer"],
    "difficultyDistribution": {
      "easy": 2,
      "medium": 2,
      "hard": 1
    },
    "dueDate": "2026-06-01T00:00:00.000Z", // Optional
    "instructions": "Answer all questions. No calculators.", // Optional
    "sourceType": "pdf", // Optional: "pdf", "text", "none" (default)
    "sourceContent": "3df9857d-bc21-4fba-bb86-903b41d2938a" // Optional: pdfId or txt file ID or raw text
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "jobId": "1a2b3c4d-5e6f-7g8h",
      "assessmentId": "65b90f421ca2b3d870ff5021"
    }
  }
  ```

---

## 2. List Assessments
- **Method**: `GET`
- **Path**: `/`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "assessments": [
        {
          "id": "65b90f421ca2b3d870ff5021",
          "title": "Unit 1 Algebra Test",
          "subject": "Mathematics",
          "status": "completed",
          "totalQuestions": 5,
          "totalMarks": 25,
          "createdAt": "2026-05-26T17:53:20.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 1,
        "totalPages": 1
      }
    }
  }
  ```

---

## 3. Get Single Assessment
- **Method**: `GET`
- **Path**: `/:id`
- **Auth Required**: Yes
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "65b90f421ca2b3d870ff5021",
      "title": "Unit 1 Algebra Test",
      "subject": "Mathematics",
      "status": "completed",
      "generatedPaper": {
        "metadata": {
          "subject": "Mathematics",
          "totalMarks": 25,
          "duration": 60,
          "generatedAt": "2026-05-26T17:53:20.000Z",
          "instructions": "Answer all questions. No calculators."
        },
        "sections": [
          {
            "title": "Section A: Multiple Choice Questions",
            "instruction": "Select the correct option",
            "questions": [
              {
                "questionNumber": 1,
                "text": "What is x if 2x + 5 = 15?",
                "difficulty": "easy",
                "marks": 5,
                "bloomLevel": "Apply",
                "type": "MCQ"
              }
            ]
          }
        ]
      }
    }
  }
  ```

---

## 4. Regenerate Assessment
- **Method**: `POST`
- **Path**: `/:id/regenerate`
- **Auth Required**: Yes
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "jobId": "7x8y9z0a-1b2c-3d4e",
      "assessmentId": "65b90f421ca2b3d870ff5021"
    }
  }
  ```

---

## 5. Get Job Status
- **Method**: `GET`
- **Path**: `/job/:jobId/status`
- **Auth Required**: Yes
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "processing", // queued, processing, generating_sections, formatting, completed, failed
      "progress": 40,
      "errorMessage": null
    }
  }
  ```

---

## 6. Delete Assessment
- **Method**: `DELETE`
- **Path**: `/:id`
- **Auth Required**: Yes
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Assessment deleted successfully"
    }
  }
  ```

---

## 7. Download Assessment PDF
- **Method**: `GET`
- **Path**: `/:id/pdf`
- **Auth Required**: Yes
- **Response (200 OK)**:
  - Binary Stream: `Content-Type: application/pdf`
  - Filename Header: `Content-Disposition: attachment; filename="assessment-{id}.pdf"`
