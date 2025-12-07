# DosMundos Project: Master Developer & AI Guide

This document is the single source of truth for developers and AI agents working on the DosMundos project. It synthesizes project structure, database schemas, workflows, and lessons learned from development sessions.

---

## 1. Project Identity & Tech Stack
**DosMundos** is a multilingual podcast platform focused on healing and meditation content.
*   **Frontend:** React (Vite), Tailwind CSS.
*   **Backend/Database:** Supabase (PostgreSQL).
*   **AI Services:** DeepSeek V3 (via OpenAI SDK), AssemblyAI (Transcription).
*   **Runtime:** Node.js (for maintenance scripts).

---

## 2. Database Architecture
Understanding the separation of concerns in the DB is critical.

### `episodes`
*   **Purpose:** Core metadata.
*   **Key Columns:** `slug` (PK, usually `YYYY-MM-DD`), `date`, `title`, `description`.

### `episode_audios`
*   **Purpose:** Links to audio files for specific languages.
*   **Key Columns:** `episode_slug` (FK), `lang` ('ru', 'es', 'en', etc.), `audio_url`.
*   **Pattern:** Audio URLs typically follow: `.../uploads/Audio/YYYY-MM-DD.mp3`.

### `transcripts`
*   **Purpose:** Stores the full text and timing data.
*   **Key Columns:**
    *   `id` (PK)
    *   `episode_slug` (FK)
    *   `lang`
    *   `edited_transcript_data`: **JSONB**. The structured transcript. Contains an array of `utterances` (`{ start, end, speaker, text }`).
    *   `status`: 'completed', 'processing'.
*   **CRITICAL:** Do not attempt to save transcript text in `episode_audios`. It belongs here.

### `timecodes`
*   **Purpose:** Stores interactive timestamps (Questions, Chapters, Meditations).
*   **Key Columns:**
    *   `id` (PK)
    *   `episode_slug` (FK)
    *   `lang`
    *   `time`: Integer (seconds).
    *   `title`: String (The question or topic title).

---

## 3. File Naming & Conventions

### Transcript Source Files
When importing local files, the system expects specific naming patterns to extract metadata automatically:
*   **Pattern:** `YYYY-MM-DD_LANG_suffix.json`
*   **Examples:**
    *   `2025-12-03_RU_assemblyai.json` (Raw AssemblyAI output)
    *   `2025-12-03_ES_edit.json` (Edited transcript)

### Audio Files
*   **Pattern:** `YYYY-MM-DD.mp3` (often hosted on external WP uploads).

---

## 4. Operational Workflows & Scripts

### A. Importing New Episodes
*   **Script:** `scripts/import-episodes.cjs`
*   **Usage:** `node scripts/import-episodes.cjs ./path/to/folder`
*   **Features:**
    *   Reads `_edit.json` files.
    *   Calculates audio duration using `music-metadata` (fetches remote header).
    *   Creates/Updates `episodes` and `episode_audios`.

### B. Updating Transcripts from AssemblyAI
*   **Script:** `scripts/update-transcripts-from-assemblyai.cjs`
*   **Usage:** `node scripts/update-transcripts-from-assemblyai.cjs`
*   **Features:**
    *   Scans specific local folders for `_assemblyai.json`.
    *   Updates `transcripts.edited_transcript_data` in Supabase.
    *   **Lesson:** Ensure the target table is `transcripts`, not `episode_audios`.

### C. Generating Questions/Chapters (AI)
*   **Script:** `scripts/generate-questions-deepseek.cjs`
*   **Usage:** `node scripts/generate-questions-deepseek.cjs`
*   **Features:**
    *   Fetches transcripts from DB.
    *   Sends text to DeepSeek V3.
    *   Parses JSON response and inserts into `timecodes`.

---

## 5. AI Agent Guidelines (The "Brain")

### DeepSeek V3 Strategy
*   **Context Window:** DeepSeek V3 has a massive context window (64k+ tokens).
*   **Do Not Slice Aggressively:** Previous attempts failed when slicing text to 200 segments.
*   **Best Practice:** Send ~2500 segments (approx 50k tokens) or the full transcript if possible. This allows the model to understand the full flow and find questions at the end.

### Prompt Engineering
*   **Goal:** Identify *original* listener questions and *guided meditations*.
*   **Avoid Over-Specification:** Do not list specific keywords like "relax" or "breathe" as mandatory filters, as this causes false positives/negatives.
*   **Focus on Structure:** Instruct the model to look for:
    *   Speaker changes (Listener -> Healer).
    *   Explicit markers ("Question from...", "Let's meditate").
    *   Meditations usually occurring at the end of the session.

### Robustness
*   **JSON Parsing:** AI models often wrap JSON in markdown (` ```json ... ``` `). Always use regex to extract the array before parsing:
    ```javascript
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    const jsonText = jsonMatch ? jsonMatch[0] : response;
    ```

---

## 6. Troubleshooting & Maintenance

### Rollback Strategy
If a batch script messes up data (e.g., generates bad questions), use the rollback script immediately.
*   **Script:** `scripts/rollback-questions.cjs`
*   **Logic:** Deletes records created *today* for a specific language.

### Verification
*   **Script:** `scripts/check-questions.cjs`
*   **Logic:** Lists the most recently created records to verify titles and timestamps.

### Supabase Permissions
*   **Read:** `VITE_SUPABASE_ANON_KEY` is usually fine.
*   **Write:** **ALWAYS** use `SUPABASE_SERVICE_ROLE_KEY` in Node.js scripts to bypass RLS (Row Level Security).
*   **Env:** Ensure `.env` is loaded (`require('dotenv').config()`).

---
*Last Updated: December 7, 2025*
