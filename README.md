# AdvancedVocabApp

A vocabulary training app for **advanced English learners** (Cambridge Advanced → Proficiency / C1–C2).

Words are presented with their English-language definition, IPA phonetics, audio pronunciation
(accent selectable per user), and example sentences. An SM-2 spaced repetition engine schedules
reviews intelligently; a separate flashcard mode lets users browse at their own pace. Everything
syncs across the web browser and Android.

See **[ROADMAP.md](./ROADMAP.md)** for the full vision, API choices, phase-by-phase task list,
and verification criteria.

See **[CLAUDE.md](./CLAUDE.md)** for architecture, commands, conventions, and current API routes.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core 10, EF Core + MySQL (Pomelo) |
| Web frontend | React 19, Vite, TanStack Router/Query, Zustand, Tailwind 4 |
| Mobile (planned) | React Native / Expo |
| Shared types | `@vocabapp/shared` (TypeScript, source-linked) |
| Auth | Google OAuth (ID token → JWT + refresh token rotation) |
| Dictionary data | Free Dictionary API (dictionaryapi.dev) — free, no key required |
| Audio TTS | Google Cloud Text-to-Speech (WaveNet voices) |

## Quick Start

**Requirements:** Node ≥ 22, pnpm ≥ 10, .NET 10 SDK, MySQL running locally.

```bash
# Frontend
pnpm dev:web

# Backend (separate terminal)
cd server/src/AdvancedVocabApp.Api
dotnet run
```

Swagger UI available at `http://localhost:5000/swagger` when the backend is running.

Secrets go in `server/src/AdvancedVocabApp.Api/appsettings.Development.json` (gitignored).
Copy and fill in: DB connection string, JWT key, Google Client ID, Google Cloud credentials.
