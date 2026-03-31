# VoiceSense Roadmap

## Sprint 1: Foundation + Backend Contracts

### Summary
- [x] Goal of this stage: fix the roadmap in the repo and start implementation from infra + backend contracts.
- [x] First increment target: working local stand (`docker compose up`) and a basic end-to-end flow:
  guest login -> join persistent room -> read/send chat via REST+WS.

### Implementation Changes
- [x] Create this `roadmap.md` in the project root.
- [x] Scaffold backend microservices structure in `backend/`:
  `api-gateway`, `auth-service`, `room-service`, `chat-service`, `media-service`, `shared`.
- [x] Add root `docker-compose.yml` with:
  `postgres`, `redis`, `livekit`, all FastAPI services, and gateway.
- [x] Add `.env.example` with shared variables (DB/Redis/JWT/LiveKit/CORS/room defaults).
- [x] Implement minimal REST contracts:
  1. `POST /api/v1/auth/guest`
  2. `GET /api/v1/rooms`
  3. `GET /api/v1/rooms/{roomId}/messages`
  4. `POST /api/v1/rooms/{roomId}/messages`
  5. `POST /api/v1/rooms/{roomId}/media-token`
- [x] Implement WS endpoint `GET /ws/v1/rooms/{roomId}` with `chat.message.created` and basic presence events.
- [x] Add PostgreSQL schema/migrations for `users`, `rooms`, `messages`, `sessions` and seed persistent rooms.
- [x] Use Redis for presence and pub/sub broadcast of new chat events.
- [x] Add LiveKit webhook handling for join/leave in `media-service`.

### Frontend (FSD)
- [x] Restructure `frontend/src` to FSD layers:
  `app`, `processes`, `pages`, `widgets`, `features`, `entities`, `shared`.
  Note: `pages` layer is placed under `src/fsd/pages` to avoid collision with Next.js `src/pages` router.
- [x] Implement minimal vertical UI scenario:
  1. guest join
  2. persistent room selection
  3. chat history + send message
  4. voice connect via media token (no moderation)
- [x] Defer full screen share publishing to the next sprint,
  but add `screenAudioOn` types and media hooks API now.

### Test Plan
- [ ] Smoke: `docker compose up` brings all services up healthy.
- [ ] Integration: message persists in PostgreSQL and is delivered via WS.
- [ ] Contracts: OpenAPI available in each service and JWT is validated by gateway.
- [ ] E2E (minimum): guest -> room -> send message -> refresh -> history restored.

### Assumptions
- [x] v1 auth model: guest-only.
- [x] Room model: multiple persistent rooms.
- [x] Chat model: immutable + durable storage (no moderation/edit/delete in v1).
- [x] Recording/moderation is out of scope for Sprint 1.

## Next Sprints (High Level)
- Sprint 2: full LiveKit client integration for bidirectional voice and remote participant tracks.
- Sprint 3: screen sharing publish to room with system audio routing and browser-specific fallbacks.
- Sprint 4: moderation, RBAC, and optional session recording.
