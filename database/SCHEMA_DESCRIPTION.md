# Database Schema Documentation

This document describes the current database schema for the Dos Mundos project (V2 Architecture).

## Core Tables

### `episodes`
The central entity representing a podcast episode. It is language-agnostic and serves as the parent for all other data.

| Column | Type | Description |
| :--- | :--- | :--- |
| `slug` | `text` | **Primary Key**. The unique identifier for the episode (e.g., `2024-01-01`). |
| `date` | `date` | The release date of the episode. |
| `created_at` | `timestamptz` | Timestamp of creation. |
| `updated_at` | `timestamptz` | Timestamp of last update. |

### `episode_variants`
Contains language-specific metadata and audio files for an episode. An episode can have multiple variants (e.g., 'ru', 'es', 'mixed').

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key**. |
| `episode_slug` | `text` | Foreign Key to `episodes(slug)`. |
| `lang` | `text` | Language code ('ru', 'es', 'mixed', etc.). |
| `title` | `text` | The title of the episode in this language. |
| `audio_url` | `text` | URL to the audio file (R2/S3). |
| `duration` | `integer` | Duration of the audio in seconds. |
| `search_vector` | `tsvector` | Full-text search vector. |
| `created_at` | `timestamptz` | Timestamp of creation. |

### `transcripts`
Stores the transcript data for a specific episode variant.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key**. |
| `episode_slug` | `text` | Foreign Key to `episodes(slug)`. |
| `lang` | `text` | Language of the transcript. |
| `content` | `jsonb` | The structured transcript data (utterances, words). |
| `plain_text` | `text` | Plain text version for search/display. |
| `status` | `text` | Status of transcription ('pending', 'completed', 'error'). |
| `provider_id` | `text` | ID from the transcription provider (e.g., AssemblyAI). |
| `created_at` | `timestamptz` | Timestamp of creation. |

### `timecodes`
Stores marked time points (formerly "questions") for an episode.
*Replaces the deprecated `questions` table.*

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key**. |
| `episode_slug` | `text` | Foreign Key to `episodes(slug)`. |
| `lang` | `text` | Language context for the timecode. |
| `time` | `integer` | Time in seconds from the start of the audio. |
| `title` | `text` | Title or description of the timecode/question. |
| `created_at` | `timestamptz` | Timestamp of creation. |

The application listens for realtime updates on the following tables:
*   `timecodes` (for instant updates when adding/editing questions)
