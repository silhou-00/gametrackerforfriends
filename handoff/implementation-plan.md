# PointDrop — Implementation Plan (v2)

## Clarification

`pointdrop/project/` is **design reference only** — do not modify those files.
Implementation targets `frontend/` (React Native/Expo) and `backend/` (Python/FastAPI).

---

## Architecture Summary

```
┌──────────────────────────────────────────┐
│  Device (Android)                        │
│  ┌────────────────────────────────────┐  │
│  │  React Native / Expo               │  │
│  │  - 4 tab modules (Library/Play/    │  │
│  │    History/Settings)               │  │
│  │  - Dynamic Rules Engine            │  │
│  │  - Tri-Input Scoring               │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │  SQLite (5 tables)           │  │  │
│  │  │  Local-first. No server      │  │  │
│  │  │  needed for core gameplay    │  │  │
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
└──────────────────────┬───────────────────┘
                       │ Wi-Fi (PDF export only)
                       ▼
┌──────────────────────────────────────────┐
│  FastAPI Backend (Docker)                │
│  - POST /api/v1/pdf/generate             │
│  - Pydantic validation                   │
│  - WeasyPrint → StreamingResponse        │
│  - Zero file artifacts on server         │
└──────────────────────────────────────────┘
```

**Core principle:** Backend is unreachable during gameplay. SQLite is the single source of truth.

---

## Current State Audit

### Frontend — What Exists
| File/Folder | Status | Issue |
|---|---|---|
| `_layout.tsx` | Partial | Wrong tab structure (Home/Explore, not Library/Play/History/Settings) |
| `index.tsx` | Partial | Mock data, no SQLite, wrong design palette |
| `match/[id]/index.tsx` | Partial | Scores via API not SQLite, no rules engine |
| `features/*/service.ts` | Partial | All API calls — wrong for local-first arch |
| `styles/tokens/colors.ts` | Wrong | Generic palette, not PointDrop parchment system |
| `app-tabs.tsx` | Wrong | 2 tabs, not 4 |
| SQLite layer | Missing | No database at all |
| Rules engine | Missing | No evaluator, no operator dict |
| Library module | Missing | No game/mode management screens |
| History module | Missing | No audit ledger, no tamper check |
| Settings module | Missing | No backup/wipe/network diagnostics |
| Voice pairing | Missing | LAN-Auth infrastructure stub only |
| HMAC signing | Missing | No cryptographic match signing |

### Backend — What Exists
| File | Status | Issue |
|---|---|---|
| `main.py` | Good | FastAPI, CORS, error handler, health check |
| `middleware/error_handler.py` | Good | Standardized error envelope |
| `shared/schemas.py` | Good | Generic response shapes |
| `config/settings.py` | Good | Pydantic settings |
| `pdf/router.py` | Stub | Endpoint exists, service raises NotImplementedError |
| `pdf/service.py` | Stub | Needs WeasyPrint + Jinja2 implementation |
| Database layer | Missing | No SQLite/ORM (not needed — device-local) |
| Rate limiting | Missing | `slowapi` not installed |

---

## Design Tokens (from PointDrop reference)

All UI must use these exact values:

### Colors
```
Background:    #FAF7F2  (Warm Parchment)  → C.bg in reference
Surface/Cards: #FFFFFF  (Pure White)       → C.surface
Primary:       #D97757  (Terracotta)       → C.primary  ← spec value
                                            (reference uses #C25B38 — follow SPEC)
Ink/Text:      #2C363F  (Soft Charcoal)   → C.ink

State palette:
  Connecting:  #5C80BC  (Muted Steel Blue)
  Success:     #4A7C59  (Forest Green)
  Warning:     #D4A373  (Sand)
  Error:       #B0413E  (Rust Red)
```

### Fonts
```
Headers/Scores: Roboto Slab (700/800/900) — via @expo-google-fonts/roboto-slab
Body/Buttons:   Lato (400/700)            — via @expo-google-fonts/lato
```

---

## Phase 1 — SQLite Schema & Data Access Layer
**Target files:** `frontend/src/db/`

### 1.1 Install dependency
```
expo-sqlite  (already in Expo SDK 50+, may need explicit install)
```

### 1.2 Create `frontend/src/db/schema.ts`
Exact SQL from spec Appendix §10:
- `PRAGMA foreign_keys = ON`
- `Games` table (id TEXT PK, name, created_at)
- `GameModes` table (id, game_id FK, name, rules_config TEXT, created_at)
- `Matches` table (id, mode_id FK, status, current_round, hash_signature, created_at, finished_at)
- `Players` table (id, match_id FK, name, created_at)
- `AuditLogs` table (id, match_id FK, player_id FK, action_type, delta_value, created_at)
- Performance indexes: `idx_auditlogs_match_player`, `idx_matches_status`

### 1.3 Create `frontend/src/db/client.ts`
- `openDatabase()` — singleton SQLite connection
- `initDatabase()` — runs CREATE TABLE IF NOT EXISTS for all 5 tables
- `uid()` — UUID generator (crypto.randomUUID or uuid lib)

### 1.4 Create `frontend/src/db/games.ts`
- `createGame(name)` → inserts + returns Game row
- `listGames()` → all Games ordered by created_at
- `renameGame(id, name)` → UPDATE
- `deleteGame(id)` → DELETE CASCADE (removes modes too)

### 1.5 Create `frontend/src/db/gameModes.ts`
- `createMode(gameId, name, rulesConfig)` → inserts + returns GameMode
- `listModes(gameId)` → modes for a game
- `updateMode(id, patch)` → UPDATE name/rules_config
- `deleteMode(id)` → DELETE

### 1.6 Create `frontend/src/db/matches.ts`
- `createMatch(modeId)` → inserts active match + returns id
- `getMatch(id)` → full match row
- `getActiveMatch()` → first match with status='active'
- `advanceRound(id)` → UPDATE current_round + 1
- `finishMatch(id, hashSignature)` → UPDATE status='finished', hash_signature, finished_at
- `listFinishedMatches()` → status IN ('finished','archived') ordered DESC

### 1.7 Create `frontend/src/db/players.ts`
- `addPlayer(matchId, name)` → inserts + returns Player
- `listPlayers(matchId)` → all players for match
- `getScore(matchId, playerId)` → SELECT SUM(delta_value) FROM AuditLogs

### 1.8 Create `frontend/src/db/auditLogs.ts`
- `appendLog(matchId, playerId, actionType, deltaValue)` → INSERT only, never UPDATE
- `listLogs(matchId)` → all logs ordered by created_at ASC
- `getPlayerScore(matchId, playerId)` → SUM(delta_value) WHERE player_id=?
- `getRoundScore(matchId, playerId, round)` → SUM with round filter (requires adding `round` column to AuditLogs)

> Note: Add `round INTEGER DEFAULT 1` column to AuditLogs schema (spec §4.2 implies rounds, reference impl confirms it)

---

## Phase 2 — Dynamic Rules Engine
**Target file:** `frontend/src/engine/rulesEngine.ts`

Port directly from `pointdrop/project/tokens.jsx` rules engine section.

### 2.1 Operator dictionary
```typescript
const OPERATORS = {
  EQ:  (a, b) => a === b,
  GT:  (a, b) => a > b,
  GTE: (a, b) => a >= b,
  LT:  (a, b) => a < b,
  LTE: (a, b) => a <= b,
  MOD: (a, b) => b !== 0 && a % b === 0,
}
```

### 2.2 Subject resolver
Maps JSON subject tokens to live match state:
- `player.score` → current player's score (from AuditLogs SUM)
- `match.round` → current_round from Matches
- `opponent.max` → highest score among other players
- `player.roundWins` → round win count for acting player

### 2.3 Consequence dispatcher
```typescript
type Consequence =
  | { action: 'END_MATCH'; winner: 'acting' | 'leader' }
  | { action: 'WIN_ROUND'; winner: 'acting' | 'leader' }
  | { action: 'SET_VALUE'; value: number }
  | { action: 'MODIFY_VALUE'; value: number }
  | { action: 'UPDATE_STATUS' }
```

### 2.4 `evaluateRules(rulesConfig, trigger, ctx)` → Consequence | null
- Iterate rules array
- Filter by trigger_event
- Evaluate conditions with logical_gate (AND/OR)
- Return first matching consequence

### 2.5 `buildContext(matchState)` → EvalContext
- Reads live data from SQLite to build evaluation context
- Called after every score mutation

### 2.6 `frontend/src/engine/hmac.ts`
- `signMatch(matchId, logs)` → HMAC-SHA256 using device keychain salt
- `verifyMatch(matchId, logs, storedHash)` → boolean
- Use `expo-crypto` for HMAC, `expo-secure-store` for keychain salt

---

## Phase 3 — Design System Overhaul
**Target files:** `frontend/src/styles/tokens/`, `frontend/src/styles/themes/`

### 3.1 Replace `colors.ts` with PointDrop palette
Exact values from spec + reference (colors listed in Design Tokens section above).

### 3.2 Update `typography.ts`
- fontFamily entries for Roboto Slab + Lato
- Size/weight scales matching reference

### 3.3 Create `frontend/src/components/ui/` shared primitives
Port from `pointdrop/project/ui.jsx`:
- `Icon.tsx` — SVG stroke icons (back, plus, minus, mic, wifi, check, close, trophy, trash, download, shield, settings, history, library, play, chevR, dots, edit, lan, reset, grid)
- `Button.tsx` — primary/ghost/soft/danger tones, sm/md/lg sizes
- `Card.tsx` — surface card with shadow + border
- `Sheet.tsx` — bottom sheet with slide-up animation
- `Modal.tsx` — centered modal with scale-in animation
- `Toast.tsx` — bottom toast with slide-up
- `Header.tsx` — back button + Roboto Slab title + optional right slot
- `StatusPill.tsx` — colored dot + label with optional pulse
- `SectionLabel.tsx` — uppercase 11px label
- `Ornament.tsx` — brass diamond divider
- `TabBar.tsx` — 4-tab bottom navigation

---

## Phase 4 — Navigation Restructure
**Target:** `frontend/src/app/_layout.tsx`, `frontend/src/app/`

### 4.1 Replace tab structure
Current: `Home`, `Explore` (2 tabs)  
Required: `Library`, `Play`, `History`, `Settings` (4 tabs)

### 4.2 Screen route map
```
app/
  _layout.tsx              ← root layout, font loading, DB init
  library/
    index.tsx              ← LibraryScreen (games list)
    [gameId]/index.tsx     ← ModeSelectorScreen (modes drill-down)
  play/
    index.tsx              ← MatchSetupScreen
    scoreboard.tsx         ← ScoreboardScreen (active match)
    victory.tsx            ← VictoryScreen
  history/
    index.tsx              ← HistoryScreen (match list)
    [matchId]/index.tsx    ← MatchDetailScreen (ledger + PDF export)
  settings/
    index.tsx              ← SettingsScreen
```

---

## Phase 5 — Screen Implementation

### 5.1 Library Module
**LibraryScreen** (`library/index.tsx`)
- Header: "Library" + game count subtitle
- "New game" primary CTA button (terracotta, full-width)
- List of Game cards: Stamp badge (initials), name, mode count, created date, chevron
- Tap → navigate to ModeSelectorScreen

**ModeSelectorScreen** (`library/[gameId]/index.tsx`)
- Header: game name + "Rule variations" subtitle + edit button
- Mode cards: name, rules description badge, "Start match" + "Edit" buttons
- "New mode" docked FAB

**CreateGameModal / ModeCreatorModal / GameConfigModal**
- Port modal logic from `pointdrop/project/rules.jsx`
- RuleCard builder: trigger selector, condition rows (subject/operator/threshold), consequence selector
- Template shortcuts: "Target score", "Best of 3 rounds", "Exact + bust", "Round limit", "Bonus every 3rd"
- Auto-reset toggle
- JSON preview (collapsible)

### 5.2 Play Module
**MatchSetupScreen** (`play/index.tsx`)
- Game + Mode selectors (bottom sheet pickers)
- Roster builder (chip tags + add input)
- Hardware Voice card (Enable button → PairingSheet)
- "Start match" CTA (disabled until mode + 1+ players)

**PairingSheet**
- 3-step animated flow: Verify network → Broadcast mDNS → LAN-Auth token
- Wi-Fi check (show error if mobile data)
- Token display (monospace, Bearer label)
- "Confirm paired" button

**ScoreboardScreen** (`play/scoreboard.tsx`)
- Status header: mode name, round, mic status pill, ConvoAI pill
- 2-column player grid cards
- Per-player: avatar initial, name, score (Roboto Slab 52px), ±1 buttons
- Round wins diamonds (round-based modes)
- Lead trophy icon on leading player
- Bottom controls: mic button + "Next round" button
- Voice simulation (tap mic → random player +1 with toast)

**VictoryScreen** (`play/victory.tsx`)
- Trophy icon (pop animation)
- Winner name (Roboto Slab 38px)
- Final standings list (rank circles, scores)
- HMAC signature banner (green shield)
- Buttons: "View ledger", "Rematch", "Done"

### 5.3 History Module
**HistoryScreen** (`history/index.tsx`)
- Header: "History" + match count
- Match cards: title, mode name, date, winner + score, TAMPERED badge if hash mismatch
- Tap → MatchDetailScreen

**MatchDetailScreen** (`history/[matchId]/index.tsx`)
- Header with PDF export button (top right)
- Integrity banner: green (verified) or red (tampered) with HMAC hash
- Standings horizontal scroll strip
- Turn-by-turn ledger: delta badge (+1/-1), player name, action type, round, running total
- PdfExportSheet: idle → checking → rendering → done / offline flows

### 5.4 Settings Module
**SettingsScreen** (`settings/index.tsx`)
- Database section: stat rows (SQLite, audit count), Backup + Wipe buttons
- Wipe confirmation sheet
- Network diagnostics: HostServerPanel (Enable/Stop, animated startup sequence, live endpoint table)
- About section: version, sync mode

---

## Phase 6 — Backend: PDF Engine
**Target:** `backend/pdf/`

### 6.1 Install dependencies (add to requirements.txt)
```
weasyprint
jinja2
slowapi
```

### 6.2 `backend/pdf/templates/report.html.j2`
Jinja2 HTML template mapping audit log data to styled report:
- Match metadata header (game, mode, date, hash)
- Player standings table
- Full turn-by-turn ledger table
- Tamper warning if hash_signature indicates mismatch

### 6.3 `backend/pdf/service.py`
```python
def generate_pdf(request: GeneratePdfRequest) -> BytesIO:
    html = render_template("report.html.j2", data=request)
    pdf_bytes = weasyprint.HTML(string=html).write_pdf()
    return BytesIO(pdf_bytes)
```
- Zero file writes to disk
- Returns in-memory BytesIO stream

### 6.4 `backend/pdf/router.py`
- `POST /api/v1/pdf/generate` → `StreamingResponse(pdf_bytes, media_type="application/pdf")`
- Pydantic validation on request body
- Global error middleware returns `{"error": "GenerationFailed"}` on failure

### 6.5 Rate limiting
Add `slowapi` limiter to main.py:
```python
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```
Apply `@limiter.limit("10/minute")` to PDF endpoint.

---

## Phase 7 — LAN-Auth & Voice Infrastructure
**Target:** `frontend/src/features/lanServer/`

### 7.1 Token generation
- `generateToken()` → crypto random 8-char uppercase (e.g. `A3F7-KX92`)
- Store in React Context during active pairing session

### 7.2 Network check
- `checkWifiConnection()` → uses `@react-native-community/netinfo`
- If mobile data: block toggle, show error
- If Wi-Fi: proceed to mDNS broadcast phase

### 7.3 mDNS broadcast
- `react-native-zeroconf` → broadcast `_pointdrop._tcp` on UDP 5353
- Hostname: `game-tracker.local`

### 7.4 Background HTTP listener
- `react-native-tcp-socket` or `fetch` polyfill server
- Listen POST `:8080/voice-command`
- Validate `Authorization: Bearer <token>` header → 401 if mismatch
- Valid payloads dispatch to scoring engine

---

## File Creation Checklist

### Frontend
```
frontend/src/db/
  schema.ts
  client.ts
  games.ts
  gameModes.ts
  matches.ts
  players.ts
  auditLogs.ts

frontend/src/engine/
  rulesEngine.ts
  hmac.ts
  types.ts

frontend/src/components/ui/
  Icon.tsx
  Button.tsx
  Card.tsx
  Sheet.tsx
  Modal.tsx
  Toast.tsx
  Header.tsx
  StatusPill.tsx
  SectionLabel.tsx
  Ornament.tsx
  TabBar.tsx

frontend/src/app/
  _layout.tsx          (update: 4 tabs, font loading, DB init)
  library/index.tsx
  library/[gameId]/index.tsx
  play/index.tsx
  play/scoreboard.tsx
  play/victory.tsx
  history/index.tsx
  history/[matchId]/index.tsx
  settings/index.tsx

frontend/src/styles/tokens/
  colors.ts            (update: PointDrop palette)
  typography.ts        (update: Roboto Slab + Lato)
```

### Backend
```
backend/pdf/
  service.py           (implement WeasyPrint)
  templates/
    report.html.j2     (Jinja2 PDF template)

backend/main.py        (add slowapi rate limiting)
backend/requirements.txt (add weasyprint, jinja2, slowapi)
```

---

## Build Order

1. `db/` layer (foundation, everything depends on it)
2. `engine/rulesEngine.ts` (pure logic, no UI deps)
3. `styles/tokens/` overhaul (unblocks all UI work)
4. `components/ui/` primitives (unblocks all screens)
5. `_layout.tsx` navigation restructure
6. Library screens (game/mode management)
7. Play screens (setup → scoreboard → victory)
8. History screens (audit ledger + PDF trigger)
9. Settings screen
10. Backend PDF engine
11. LAN-Auth + voice pairing
