# Essay Grader Architecture

> **Last updated:** May 2025

This document describes the architecture of the Essay Grader application, emphasizing the grading workflow, LLM (AI) integration, PDF evidence highlighting, and local analytics. The system is designed for reliability, privacy, extensibility, and strong user control.

---

## 1. Overview

Essay Grader is a desktop app (Electron + React) that enables teachers to grade essays interactively, using AI for rubric-based scoring, feedback, and evidence highlighting. All analytics and grades are stored locally for privacy and performance.

---

## 2. Key Features and Workflow

### A. PDF Upload & Extraction
- Users upload a PDF essay.
- The app extracts text (with `[PAGE X]` markers) for page-aware LLM prompts and evidence mapping.

### B. Context & Rubric Setup
- Teachers can add assignment/course context (optional), which is cached and used in all LLM prompts.
- Teachers paste a rubric, which is parsed into structured criteria using the LLM.

### C. Interactive Grading
- For each criterion:
  - Teacher reviews the essay (rendered with page navigation and zoom).
  - Highlights evidence directly in the PDF (using `react-pdf-highlighter`).
  - Writes or edits justification (free text or bullets).
  - Assigns a teacher score.
  - Optionally requests AI score and feedback.
- The LLM provides:
  - Criterion scoring and rationale.
  - Evidence highlights (proof points) mapped to the PDF.
  - Score revision when justifications are edited.
- All scores, justifications, and evidence are saved locally for analytics.

### D. Overall Assessment
- After grading all criteria, the LLM generates a summary of strengths, improvements, and an overall grade.

---

## 3. System Components

| Layer         | Main Files/Modules                 | Responsibilities                                          |
|--------------|------------------------------------|----------------------------------------------------------|
| **Frontend** | `App.js`, `Chat.js`, `AssessmentSection.js`, `EvidenceSection.js`, `OverallAssessment.js`, `RubricModal.js`, `ContextDialog.js`, `AdvancedPdfViewer.js` | UI, grading workflow, PDF viewing/highlighting, rubric/context entry |
| **LLM Service** | `src/services/geminiService.js`  | Rubric parsing, criterion grading, score revision, overall assessment, evidence extraction |
| **PDF Utils** | `src/utils/pdfUtils.js`            | PDF text extraction, worker configuration                 |
| **Electron Main** | `main.js`                      | Window management, local DB setup, IPC handlers, PDF worker, local protocol |
| **Electron Preload** | `preload.js`                | Secure API exposure (grade recording, PDF worker path)    |
| **Local DB** | `better-sqlite3` (via `main.js`)   | Stores all grades, justifications, evidence, analytics    |

- **Analytics Dashboard (optional):** Displays statistics and usage analytics if enabled.

---

## 2. Electron Layer

- **Preload Script (IPC Bridge):**
  - Exposes secure, whitelisted APIs to the renderer for:
    - Saving/fetching grades (`saveGrade`, `fetchGrades`)
    - Requesting LLM feedback (`requestLLMFeedback`)
    - Loading PDFs (`loadPDF`)
  - Validates and serializes all data between frontend and backend.

- **Main Process:**
  - **Database Handler:** Uses `better-sqlite3` to manage local SQLite DB. Handles grade and analytics storage/retrieval.
  - **PDF Handler:** Validates and streams PDFs from disk to the renderer.
  - **LLM Proxy:** Handles requests to Gemini API, manages API keys, and error handling.
  - **Error Logging:** Captures and logs backend errors.

---

## 3. Database (SQLite)

- **grades table:**
  - Stores both AI and user grades for analytics.
  - Fields: `id`, `essay_id`, `rubric_item`, `ai_grade`, `user_grade`, `justification`, `evidence`, `timestamp`, `source` (AI/User)
- **analytics table:**
  - Stores usage and event analytics.
  - Fields: `id`, `event_type`, `event_data`, `timestamp`
- **Location:** Database file stored in Electron user data directory (local to each user).

---

## 4. LLM Service (Gemini API)

- **Request:** Prompt includes essay text, rubric, and `[PAGE X]` markers for evidence.
- **Response:** Returns an array of `{page, highlight, context}` for evidence, plus suggestions.
- **Flow:** Renderer sends prompt via IPC → Main → Gemini API → Main returns result via IPC.

---

## 5. PDF Handling Pipeline

- **Source:** Essay PDF is selected/uploaded by user.
- **Backend:** Electron main process validates and streams the PDF.
- **Frontend:** PDF Viewer renders the document, overlays highlights, and supports navigation.

---

## 6. Data & Control Flows

### Example: Saving a Grade

1. **User** fills out rubric and justification in the React UI.
2. **Frontend** calls `window.api.saveGrade(gradeData)` via IPC.
3. **Preload** validates and forwards the request to Electron Main.
4. **Main Process** writes the grade to SQLite (`grades` table).
5. **Frontend** receives confirmation and updates UI/analytics.

```js
// Example gradeData sent from frontend
{
  essay_id: "essay123",
  rubric_item: "argument_clarity",
  ai_grade: 4,
  user_grade: 5,
  justification: "Clear, logical argument with strong evidence.",
  evidence: [{ page: 2, highlight: "The author states..." }],
  timestamp: "2025-05-22T13:00:00Z",
  source: "user"
}
```