# Chat Pipeline

This directory contains the server-side chat pipeline for both normal project chat and quick-create.

The current design has two major goals:

- stream useful prose to the user as early as possible
- persist structured outputs (cards, actions, unlocks, follow-ups, sources) in a reliable way

## High-level Flow

1. The route validates auth and attachments.
2. File attachments are persisted to project uploads when relevant.
3. The server calls Gemini in streaming mode.
4. The model responds using a tagged format, not legacy token markers.
5. The stream parser incrementally reads tagged output and:
   - writes knowledge cards during the stream
   - streams `<Prose>` text to the client
   - collects follow-up questions, actions, and unlock tags
   - collects grounding chunks from Gemini metadata
6. After streaming completes, the shared finalizer:
   - generates resource cards from grounding chunks using the legacy grounding-based path
   - resolves card references in the prose
   - assembles final chat attachments
   - writes the chat pair to Firestore
   - runs tutor actions / unlock logic when applicable
   - schedules background hierarchy generation

## Current Output Contract

The model is instructed to emit structured tags in this order:

- zero or more `<NewCard>{...}</NewCard>` tags
- exactly one `<Prose>...</Prose>` block
- zero or more `<FollowUp>...</FollowUp>` tags
- zero or more `<Action>...</Action>` tags
- optional `<UnlockCards>...</UnlockCards>` tag

Inside prose, references use:

- `<CardRef id="existingCardId" />`
- `<NewCardRef title="Exact New Card Title" />`

The backend converts those into the markdown-style `(card: id)` references the frontend already knows how to render.

Resource cards are **not** model-generated anymore. The model may recommend resources in prose, but actual resource card creation comes from grounding chunks via the old `groundingChunksToCardsAndWrite(...)` path.

## Key Files

### Core route files

- `app/api/chat/stream/route.ts`
  - Main project-chat streaming route.
  - Handles auth, project lookup, file upload persistence, and stream setup.

- `app/api/projects/quick-create/route.ts`
  - Quick-create version of the same pipeline.
  - Creates a project first, then runs the same streaming/finalization flow.

### Shared orchestration

- `app/api/chat/stream/orchestrator.ts`
  - Shared post-stream finalization used by both routes.
  - Responsibilities:
    - generate resource cards from grounding chunks
    - resolve refs in prose
    - assemble final attachments
    - write chat history
    - run unlock logic and tutor actions (existing-project mode)
    - schedule background hierarchy generation

- `app/api/chat/stream/persist.ts`
  - Persists model-generated knowledge cards during the stream.
  - Only knowledge cards are written here.

- `app/api/chat/stream/shared.ts`
  - Shared helpers for final attachment assembly and reference resolution.
  - `buildFinalChatAttachments(...)` currently includes:
    - non-grounding attachments
    - written cards
    - one grouped `Sources` attachment containing all deduped grounding chunks

### Stream parsing

- `app/api/chat/stream/helpers.ts`
  - Main streaming function: `streamChatResponse(...)`
  - Owns the parser state machine:
    - pending text buffer
    - active block being parsed
    - parsed cards
    - written cards
    - follow-up questions
    - tutor actions
    - unlock ids
    - response prose
  - Calls Gemini streaming API and feeds chunks through the parser.

- `app/api/chat/stream/types.ts`
  - Shared internal types for the stream layer.
  - Includes:
    - `ModelCard`
    - `KnowledgeCardSpec`
    - `ResourceCardSpec`
    - `StreamChatResponseResult`
    - block/tag types

- `app/api/chat/stream/tag_parsing.ts`
  - Pure parsing helpers.
  - Responsibilities:
    - detect partial tags across chunk boundaries
    - parse card JSON bodies
    - parse block attributes
    - parse knowledge/resource cards
    - parse unlock tags
    - detect top-level open tags

- `app/api/chat/stream/prose_helpers.ts`
  - Prose-specific cleanup helpers.
  - Currently used to strip transport tags before final response text is returned.

- `app/api/chat/stream/model_request.ts`
  - Builds the Gemini streaming request.
  - Responsibilities:
    - inline file attachments into model parts
    - serialize history/current message
    - attach existing notes/context
    - attach unlock context
    - attach system prompt/config/tools

### Prompt + legacy business logic

- `app/api/chat/prompts.ts`
  - Contains the chat system prompt.
  - Defines the tagged output contract and examples.

- `app/api/chat/helpers.ts`
  - Larger helper file containing:
    - `groundingChunksToCardsAndWrite(...)`
    - `generateNewHierarchyFromCards(...)`
    - `writeHierarchy(...)`
    - `writeChatPairToDb(...)`
    - `executeTutorActions(...)`
    - unlock helpers
    - resource enrichment helpers

## Route-by-route Behavior

### `POST /api/chat/stream`

Used for normal project chat.

Extra responsibilities beyond quick-create:

- loads existing hierarchy and cards
- supports unlock tags for course projects
- supports tutor actions like hierarchy edits
- background hierarchy generation uses prior project state

### `POST /api/projects/quick-create`

Used when the user starts from the quick-create surface.

Differences:

- creates a new project first
- emits `projectId` immediately in the stream so the client can navigate
- no tutor actions/unlock flow from prior project context
- background hierarchy generation starts from an empty hierarchy

## Attachments Model

The final assistant message can contain a mix of attachments:

- written knowledge cards
- written resource cards
- prior referenced cards
- thinking summaries
- grouped `Sources` attachment containing grounding results

Frontend rendering relies on:

- `Card.kind === "resource"` or `card.url` to render resource-style cards
- grouped `sources` attachment to open a modal listing grounding results

## Knowledge Cards vs Resource Cards

### Knowledge cards

- generated directly by the model via `<NewCard>` tags
- persisted during the stream
- available quickly for inline refs like `<NewCardRef ... />`

### Resource cards

- generated from grounding chunks after the stream
- use the old grounding-based generation pipeline
- are intentionally decoupled from the model’s tag output because grounding proved more reliable than model-authored resource metadata

## Reference Resolution

There are two reference classes:

- existing cards: `<CardRef id="..." />`
- newly created knowledge cards: `<NewCardRef title="..." />`

The parser resolves new-card refs against already-written cards, and the finalizer runs another pass before saving/final output.

The frontend ultimately renders `(card: someId)` references.

## Follow-up Questions

The model emits follow-ups with `<FollowUp>...</FollowUp>`.

The parser collects them during the stream, and there is also a recovery pass over the raw model output in case the streaming state machine misses any follow-up tags due to chunk boundaries.

## Tutor Actions and Unlocks

### Actions

The model can emit JSON action payloads inside `<Action>...</Action>`.

These are parsed into `TutorAction[]` and executed only in the main chat route.

### Unlocks

When the project belongs to a course lesson, the model can emit `<UnlockCards>...</UnlockCards>`.

Those card ids are parsed and turned into unlocked cards if valid.

## Background Work

After the final response is sent, background hierarchy generation runs via `after(...)`.

This keeps the visible chat flow responsive while still updating the project structure in Firestore.

## Current Design Decisions

- one streamed request only
- tagged output instead of legacy special tokens
- knowledge cards come from model tags
- resource cards come from grounding chunks
- all grounding chunks are shown in grouped `Sources` for transparency
- fixed default chat behavior instead of user-configurable runtime preferences

## Notes for Future Changes

If you modify the pipeline, keep these invariants in mind:

1. `streamChatResponse(...)` should remain the only place that owns stream-parser state.
2. Shared route behavior should live in `stream/orchestrator.ts`, not be duplicated.
3. Prompt format and parser behavior must evolve together.
4. If resource generation changes again, update both:
   - the route/orchestrator flow
   - the attachment assembly assumptions
5. Any frontend tag leakage should be treated as a parser bug first, not a markdown/rendering problem.
