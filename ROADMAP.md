# AdvancedVocabApp — Vision & Roadmap

## Vision

A vocabulary training app aimed at **advanced English learners** (Cambridge Advanced → Proficiency / C1–C2).
Unlike simple flashcard apps, every word card surfaces:

- **Definition in the target language** (English, not a translation)
- **Phonetic spelling** (IPA)
- **Audio pronunciation** with user-selectable accent (British, American, Australian, etc.)
- **Example sentences**
- **Intelligent review scheduling** via SM-2 spaced repetition
- **Manual flashcard mode** for self-paced review

Users create **vocab sets**, review them on any device, and data is **synced across web and Android** via the shared backend.

---

## External API Decisions

### Dictionary data (definitions, IPA, examples)

**Free Dictionary API** — `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`

- No API key required, completely free
- Returns: IPA phonetic text, a default audio URL, part-of-speech, definitions, example sentences
- Already maps 1:1 to the `DictionaryData` / `DictionaryMeaning` entity schema
- Implement as `IDictionaryService` in Infrastructure

The returned default audio URL can be stored as-is in `DictionaryData.AudioUrl` for the fallback/default pronunciation. When user voice preference matters, TTS overrides it.

### Audio pronunciation (accent selection)

**Google Cloud Text-to-Speech**

- WaveNet voices cover `en-GB` (British), `en-US` (American), `en-AU` (Australian), `en-IN` (Indian), etc.
- Free tier: 1 M WaveNet characters/month — more than sufficient for single-word TTS
- Implement as `ITextToSpeechService` in Infrastructure
- Generated audio stored / cached via `AudioCache` entity (word + voice → GCS URL or base64)
- User selects preferred voice in settings (`ApplicationUser.VoicePreference`, e.g. `"en-GB-Wavenet-A"`)

> Both services share the **same Google Cloud project** — one account, one billing setup.

---

## Platforms

| Platform | Stack |
|---|---|
| Web | React 19 SPA (Vite, TanStack Router, TanStack Query, Zustand, Tailwind 4) |
| Android | React Native (Expo) — shares `@vocabapp/shared` types and hits the same API |
| Backend | ASP.NET Core 10 on .NET 10, MySQL via EF Core |

iOS is out of scope for now. Android first, iOS later if needed.

---

## Phase 1 — Dictionary & TTS Services (Backend)

Goal: every time a user adds a word, its definition, IPA, example sentences, and a default audio URL are automatically fetched and cached.

### Tasks

- [x] **1.1 — DictionaryService** (`AdvancedVocabApp.Infrastructure/Services/FreeDictionaryService.cs`)
  - Implement `IDictionaryService.LookupWordAsync` using `HttpClient` against `api.dictionaryapi.dev`
  - Parse response: populate `DictionaryData` (word, language, phoneticText, audioUrl, RawJson) and `DictionaryMeaning` list
  - If the word is already in `DictionaryData` table (same word + language), reuse it — don't re-fetch
  - Concurrent insert race handled via `DbUpdateException` → re-fetch from DB
  - Registered as typed `HttpClient<IDictionaryService, FreeDictionaryService>` in `Program.cs`

- [ ] **1.2 — TextToSpeechService** (`AdvancedVocabApp.Infrastructure/Services/TextToSpeechService.cs`)
  - Implement `ITextToSpeechService.GetPronunciationUrlAsync` using Google Cloud TTS REST API
  - Accept `voiceName` param (e.g. `"en-GB-Wavenet-A"`); fall back to `en-US-Wavenet-D` if null
  - Implement `GetAvailableVoicesAsync` returning the English WaveNet voice list
  - Cache generated audio in `AudioCache` table (key: `word + voiceName`) — return cached URL if hit
  - Store audio as a GCS object URL (or base64 data-URI if GCS is not yet set up)
  - Register in `Program.cs`

- [ ] **1.3 — Wire services into VocabEntriesController**
  - On `POST /api/vocab-entries`: after saving the entry, call `DictionaryService.LookupWordAsync` and attach result
  - On `GET /api/vocab-entries/{id}`: if `DictionaryData` is null and word hasn't been retried recently, attempt lookup
  - Add `GET /api/vocab-entries/{id}/audio?voice={voiceName}` endpoint: returns TTS audio URL for the word

- [x] **1.3 — Wire DictionaryService into VocabEntriesController**
  - `POST /api/vocab-entries`: saves entry + ReviewCard first, then calls `LookupWordAsync` and attaches result
  - `GET /api/vocab-entries/{id}`: lazy-fetches dictionary data if `DictionaryData` is null (API may have been down at creation time)

- [x] **1.4 — Review controller** (`ReviewController.cs`)
  - `GET /api/review/due` — cards due now for current user (ordered by `NextReviewDate`)
  - `POST /api/review/submit` — validates quality (1/3/4/5), calls SM-2, saves updated card + `ReviewHistory` row
  - `GET /api/review/stats` — returns `ReviewStatsResponse` (dueToday, reviewedToday, totalCards, currentStreak)

### Verification

- `POST /api/vocab-entries` with `{"word":"ephemeral"}` → response includes `dictionaryData` with non-null `phoneticText`, at least one meaning with `definition` and `example`
- `GET /api/vocab-entries/{id}/audio` → returns a URL/data that plays audio
- `GET /api/review/due` returns cards with `nextReviewDate <= now`
- `POST /api/review/submit` with `quality: 5` → card interval increases, `nextReviewDate` moves forward
- `GET /api/review/stats` returns correct counts

---

## Phase 2 — Core Web Frontend

Goal: users can add words, see full cards, do spaced repetition sessions, and browse their sets — all on the web.

### Tasks

- [ ] **2.1 — Dashboard** (`routes/_authenticated/dashboard.tsx`)
  - Show `ReviewStats` widget: cards due today, today's reviewed count, streak
  - Quick-add word input → `POST /api/vocab-entries` → auto-add to a default set
  - Link to sets list and review session

- [ ] **2.2 — Vocab Sets pages**
  - `routes/_authenticated/sets/index.tsx` — list all sets, create new set button
  - `routes/_authenticated/sets/$setId.tsx` — set detail: list entries, add/remove words

- [ ] **2.3 — Word card page** (`routes/_authenticated/entries/$entryId.tsx`)
  - Show word, IPA phonetic, audio player (calls `/audio` endpoint with user's voice preference), part-of-speech chips, definition(s), example sentences
  - "Edit custom definition / phonetic" inline form → `PUT /api/vocab-entries/{id}`

- [ ] **2.4 — Spaced repetition review session** (`routes/_authenticated/review/index.tsx`)
  - Fetch due cards, present one at a time: word shown → user flips → sees definition + audio → rates 1/3/4/5
  - `POST /api/review/submit` on each rating, advance to next card
  - Summary screen on session completion

- [ ] **2.5 — Flashcard mode** (`routes/_authenticated/review/flashcard.tsx`)
  - User picks a set, browses cards at own pace (no rating, no SM-2 scheduling)
  - Forward / back navigation, flip animation

- [ ] **2.6 — User settings** (`routes/_authenticated/settings.tsx`)
  - Voice preference selector (populated from `GET /api/tts/voices`)
  - `PUT /api/users/me` endpoint to save preference

### Verification

- Adding a word shows its full card (definition, IPA, audio) within 2 seconds
- Review session presents only due cards; after rating, that card disappears from the due queue
- Flashcard mode cycles all entries in a selected set without submitting reviews
- Voice preference change → next audio fetch uses new voice

---

## Phase 3 — Android App (React Native / Expo)

Goal: feature parity with web for core flows; offline queue for reviews.

### Tasks

- [ ] **3.1 — Expo project scaffold** (`apps/mobile/`)
  - `npx create-expo-app apps/mobile --template blank-typescript`
  - Add to `pnpm-workspace.yaml`
  - Import `@vocabapp/shared` for types

- [ ] **3.2 — Auth**
  - Google Sign-In via `@react-native-google-signin/google-signin`
  - Store tokens in `expo-secure-store` instead of localStorage
  - Axios instance with same refresh-token interceptor logic as web

- [ ] **3.3 — Core screens**
  - Home / dashboard (stats + quick add)
  - Sets list + set detail
  - Word card screen
  - Review session screen
  - Flashcard screen
  - Settings screen (voice picker)

- [ ] **3.4 — Offline review queue**
  - Store pending `ReviewSubmitRequest` items in SQLite (via `expo-sqlite`) when offline
  - Sync on next connection

- [ ] **3.5 — Push notifications (optional)**
  - Daily reminder when cards are due, using Expo Notifications

### Verification

- Login on mobile, add a word on web → word appears in mobile set list after pull-to-refresh
- Complete a review session offline → items sync when back online
- Audio plays using user's stored voice preference

---

## Phase 4 — AI-Generated Vocab Sets

Goal: user describes a topic or level, app generates a vocab set with definitions pre-populated.

### Tasks

- [ ] **4.1 — Backend endpoint** `POST /api/vocab-sets/generate`
  - Accept `{ topic: string, count: number, level: "C1" | "C2" }`
  - Call Claude API (`claude-opus-4-6`) to generate a word list; look each word up via DictionaryService
  - Return created set with entries

- [ ] **4.2 — Frontend generate flow**
  - "Generate set" button on sets list page
  - Modal: topic input, word count slider, level picker
  - Progress indicator while generating

### Verification

- `POST /api/vocab-sets/generate` with `{ topic: "scientific terminology", count: 10, level: "C2" }` returns a set with 10 entries, each with dictionary data

---

## Phase 5 — Cambridge Advanced Exam Exercises

Goal: AI-generated Use-of-English / reading exercises tailored to the user's weak words.

### Tasks

- [ ] **5.1 — Exercise types**: word formation, key word transformation, open cloze, multiple-choice cloze
- [ ] **5.2 — Generation endpoint**: `POST /api/exercises/generate` — picks words from user's sets + review history (weak cards prioritised), generates exercise via Claude API
- [ ] **5.3 — Exercise UI**: dedicated exercise route, answer checking, score tracking

---

## Backlog / Nice-to-Have

- Word search / autocomplete when adding entries (Free Dictionary API suggestions)
- Streak freeze items / gamification
- Dark mode
- Export set as CSV / Anki deck
- iOS support
- Multiple languages (app currently wired for `en` target language; schema supports others)
