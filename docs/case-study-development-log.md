# The Vaults of Corhaven — Development log (for case study)

**Author:** Geo Hernandez (product design & development)  
**Repository:** `board-game/v3`  
**Document purpose:** A factual timeline of what shipped in this repo, with design decisions, product moments, and narrative hooks for a UX/product case study.  
**Last updated from repo:** 27 Oct 2026 (commit `11a0f89`)

**Related:** [Executive summary (1 page)](./case-study-executive-summary.md) · [Visual archive](./case-study/visual-archive.md) · [Case study folder](./case-study/README.md)

---

## Visual archive

Screenshots are captured after meaningful product changes (see `.cursor/rules/case-study-captures.mdc`). Current set: **[visual-archive.md](./case-study/visual-archive.md)** — initial session **2026-10-27** (title, local setup, in-game HUD, style guide, join room, chronicle).

---

## How to read this document

| Source | What it captures |
|--------|------------------|
| **Git history** (13 commits) | Dated shipping events and stated intent in commit messages |
| **`style-guide.html`** | Interface inventory, copy, visual system, screen states (design source of truth) |
| **`lib/rules.js` + `server/game.js`** | Game rules and online-room behavior (authoritative for multiplayer) |
| **This repo’s scope** | Version **v3** only. The first commit already contained a playable 3D game, audio, and a full style guide—earlier exploration likely lives outside this git tree (e.g. prior versions or pre-publish work). Call that out honestly in your case study. |

Every commit in this repo lists **Co-authored-by: Cursor**—useful process detail: design-led iteration with an AI pair for implementation and refactors.

---

## Project snapshot (current state)

**The Vaults of Corhaven** is a four-kingdom race to the vault: a Ludo-inspired board game with custom rules (two dice, phalanxes, shrines, hidden passages, doubles penalty, 20-square bonus marches). Players can:

- **Play local** — 2–4 players, human or CPU per kingdom, setup persisted in `localStorage`
- **Play online** — create/join a 5-character room code, pick a kingdom, 20s turn clock, auto-play on timeout, forfeit on leave/away
- **Play in Quest (WebXR)** — passthrough room mode: board placed in physical space; hand tracking, grips, board scale slider

**Delivery:** Single-page `The Vaults of Corhaven.html` (~2,600 lines) + `style-guide.html` interface inventory, deployed via **Vercel** (`/` rewrites to the game HTML).

**Kingdoms (color + fantasy identity):**

| Kingdom | Role in lore | Crest color |
|---------|----------------|-------------|
| Emberhold | Iron | `#B3261E` |
| Thornwald | Timber | `#2E7D32` |
| Solmere | Grain | `#D9A21B` |
| Tidereach | Salt | `#1F4E9C` |

**Narrative frame:** A hooded rider tells each monarch the vaults survived; each thinks they alone know. Setup copy, rules, chronicle, and victory lines are written in medieval second person—documented exhaustively in the style guide’s “Every line of copy” section.

---

## Design system decisions (stable across the project)

These were established at publish and treated as **constraints**, not drafts:

1. **Material metaphor:** Leather panels (`--leather`, `--leather-2`), gold trim (`--gold`, `--gold-bright`), parchment text (`--parch`, `--parch-dim`)—table/sky backgrounds separate “physical” UI from the 3D board.
2. **Typography:** Display = Pirata One / UnifrakturCook; body = Alegreya with Palatino/Georgia fallbacks—readable serif fantasy without sacrificing mobile legibility.
3. **Crest as player avatar:** Shield clip-path reused at multiple scales (tally, roster, octagonal timer ring, kingdom banners).
4. **Layering:** Board canvas fixed full viewport; HUD `z-index: 5`; toasts `6`; modals `20`. Dialogs **no** scrim-click dismiss—each sheet exits through its own button (intentional friction for rules/chronicle).
5. **Day/night:** Sky gradient shifts with `prefers-color-scheme` / `data-theme`; leather UI unchanged (night = atmosphere, not a second theme).
6. **Accessibility touches:** Focus-visible gold outlines, `sr-only` live region for turn state, ARIA on modals and kingdom pickers.
7. **Interface inventory as process artifact:** `style-guide.html` documents assembled screens and every string—strong case-study evidence of designer-owned spec before/at ship.

---

## Architecture (high level — for “how we built it” slides)

| Layer | Role |
|-------|------|
| **Browser client** | Three.js board, Cannon physics for dice, local game loop + online client driven by server events |
| **`lib/rules.js`** | Shared rules module (browser script + Node import)—single source for move legality, CPU scoring |
| **`server/game.js`** | Authoritative room state: lobby, order roll, turns, timers, forfeits, event log |
| **`server/hub.js` + `api/ws.js`** | WebSocket hub; Vercel serverless entry |
| **`server/store.js`** | Redis-backed room persistence |
| **`test/game.test.js`** | Node tests for lobby, full games, clock, forfeits, illegal moves |

**Notable product–engineering decision:** Turn deadline (`TURN_MS = 20_000`) is extended by **animation budget** per server event type (`eventMs()` in `server/game.js`) so the 20 seconds start after the board finishes moving—players aren’t punished for network/animation latency.

---

## Chronological timeline

### Phase 0 — Pre-repository (inferred, not in git)

**What the first commit implies:** By 5 Oct 2026 the team had already:

- Built a 3D Sundered March board with four keeps, 68-track loop, passages, and vault win condition
- Authored full rules + chronicle copy
- Produced sound design (theme, battle, dice, movement, win)
- Created a complete **interface inventory** (`style-guide.html`, ~1,080 lines at publish)

**Case-study prompt for you:** Capture pre-v3 iteration here from memory—paper prototypes, earlier HTML versions, rule changes, playtests. The repo cannot reconstruct that period.

---

### Phase 1 — Ship & immersive experiment (5 Oct 2026)

| Date | Event | Product / design notes |
|------|--------|-------------------------|
| **5 Oct, 13:25** | **Publish to go live** (`03a7807`) | First public artifact: game + style guide + assets + Vercel config. ~4,600 lines added in one commit—**“big bang” launch** rather than incremental git history. |
| **5 Oct, 14:01** | **Quest passthrough mode** (`7370bd6`) | **Platform bet:** Meta Quest / WebXR passthrough—board sits in the player’s room. Flat web UI unchanged; VR adds pointing for troops, grip for dice. Decision: **dual modality** instead of a separate app. |
| **5 Oct, 14:20–14:30** | **Theme on load** (`0bcde4d`, `0db92e1`) | **Onboarding tone:** Music starts immediately (with autoplay-safe retries). Sets “arrival at the march” before any tap—audio as brand. |
| **5 Oct, 15:11** | **Turn card + scalable room board** (`1d33f999`) | **XR layout:** Keep HUD readable while board scales in passthrough—HUD stability vs. world-scale board. |
| **5 Oct, 16:09** | **Hand tracking, board slider, stick controls** (`1fdd1e3c`) | **Input design for VR:** Fine control without breaking flat-mode parity. |
| **5 Oct, 21:41** | **Hand overlays in player color** (`252d577d`) | **Feedback:** Tracked hands drawn over board in kingdom color—multiplayer legibility in shared physical space. |

**Phase 1 theme:** *Prove the fantasy in the browser, then stretch into spatial computing without forking the product.*

**Gap:** No commits **5 Oct → 26 Oct** (~21 days). Note playtesting, deployment, or design work that happened off-git during this window in your case study.

---

### Phase 2 — Multiplayer & mobile-first UX (26–27 Oct 2026)

| Date | Event | Product / design notes |
|------|--------|-------------------------|
| **26 Oct, 14:56** | **Online rooms** (`b02fbb6`) | Major capability: **create/join by code**, shared rules on server, **20s turn clock**, forfeits for leave/away (`AWAY_MS = 60s`). Client refactored to replay server events. Adds Redis store, WS API, automated tests—**trustworthy multiplayer** as design enabler (timers, fair moves). |
| **26 Oct, 14:59** | **Redeploy** (`d7c03ec`) | Operational: ship backend + frontend together. |
| **26 Oct, 16:12** | **Title page + viewport-sized board** (`a209a4e`) | **Mobile framing:** Dedicated title screen; board sized to **visible** viewport (`100dvh`, safe areas)—fixes “board feels cropped on phone” class of issues. |
| **26 Oct, 16:29** | **Kingdom banners in lobby** (`2118686`) | **Emotional choice moment:** Grayscale → color on hover; claimed kingdom shows owner name. Wider sheet when picking (`min(760px)`). Design moves identity from “color slot” to **banner artifact**. |
| **26 Oct, 17:47** | **HUD recomposition** (`da3e6f4`) | **Information hierarchy reset:** Castle marker on active keep; **your** status top-center with timer ring; **others** bottom-left roster; chrome collapsed into **menu** (Chronicle, Rules, Sound, New game). Reduces corner clutter on small screens. |
| **27 Oct, 16:47** | **Turn clarity & touch** (`11a0f89`) | **Spectator vs actor UI:** Dice + roll hidden when not your turn. **Toast banners** for high-signal moments only (not a full event log). **Me card** loses heavy panel—vertical stack, text on sky. **Larger tap targets** for troops/dice on phones. |
| **27 Oct, evening** | **Motion-sickness fix (mobile user testing)** | **Finding:** hiding the roll button/dice off-turn collapsed the bottom bar, so the roster and menu jumped every turn, and HUD reflow re-ran the camera fit, re-zooming the board and discarding pinch zoom. **Fix:** hidden controls keep their slot on phones (one constant footprint), camera re-frames only on rotation or game start/end, the player's own zoom is kept, OrbitControls damping off under `prefers-reduced-motion`, menu moved to the **top-right**. Order roll now names both dice ("rolled 5 and 6, 11 in all"). Visuals: [your turn](./case-study/screenshots/2026-10-27-02-mobile-your-turn-stable-hud-mobile.png) vs [waiting](./case-study/screenshots/2026-10-27-03-mobile-waiting-stable-hud-mobile.png), [menu](./case-study/screenshots/2026-10-27-04-mobile-menu-top-right-mobile.png). |
| **27 Oct, night** | **The March, on the board** | Wheel holds the name until it stops. Flood and ash are moving surfaces on the King's Road ([water](./case-study/screenshots/2026-10-27-11-flood-sheet-desktop.png), [lava](./case-study/screenshots/2026-10-27-12-ash-shader-desktop.png)). The mist no longer hides your troops or the dice when you zoom out. |
| **28 Oct** | **Siege performances** | Each March event is one performance across the whole board, with the castle yards cut out. Flood is a tsunami, ash is a volcano, the wild is vines on the road, the mist is a rolling bank, and the sun is three lances that burn the board. The camera does not shake. [Flood](./case-study/screenshots/2026-10-28-13-flood-tsunami-desktop.png), [volcano](./case-study/screenshots/2026-10-28-14-ash-volcano-desktop.png), [lances](./case-study/screenshots/2026-10-28-17-sun-lances-desktop.png). |
| **28 Oct** | **March polish** | A tied order roll can no longer seat a kingdom twice. The wheel closes when it lands and the banner carries the event. Blessed kingdoms show +2 on the avatar. Flood sits lower and reaches the walls, lava is a pool, vines wrap the chest, and the shifting stones are portals. [Flood](./case-study/screenshots/2026-10-28-19-flood-castle-desktop.png), [portals](./case-study/screenshots/2026-10-28-21-shifting-portals-desktop.png), [+2](./case-study/screenshots/2026-10-28-25-plus-two-badge-desktop.png). |

**Phase 2 theme:** *From “beautiful solo/couch experience” to “async-friendly online play on phones”*—progressive disclosure, role-based controls, celebration moments without noise.

---

## Key product decisions (case-study bullets)

### 1. One HTML surface, three modes

Local, online, and XR share one canvas and one visual language. **Tradeoff:** Large monolith file, but **one design system to maintain** (`style-guide.html` stays truthful).

### 2. Authoritative server for online play

Moves validated in `server/game.js`; client animates. **Why it matters for UX:** You could design strict turn order, clocks, and forfeit flows knowing cheats aren’t client-side.

### 3. Copy as UI

Kingdom names, chronicle, and rule headings (“Phalanx,” “The passages”) do worldbuilding work that generic “Player 1” UI wouldn’t. The style guide’s copy section is evidence of **content design** as a first-class deliverable.

### 4. Dialog patterns

No dismiss-on-backdrop—players must choose “Back to the board” / “Close the chronicle.” **Intent:** Rules and lore are **sessions**, not accidental overlays.

### 5. Online lobby as ritual

Flow: title → create/join → name → **banner pick** → waiting room → march. Each step has a dedicated sheet title and lead line—reduces “what do I do?” in async invites.

### 6. Event feedback model (Oct 27)

Shift from persistent turn card messaging to **ephemeral toasts** for pivotal beats. **Design principle:** *Respect attention*—especially when waiting on others’ 20s turns.

### 7. Timer fairness

Server adds milliseconds for animations before the turn clock starts—**feel of fairness** backed by implementation detail worth a case-study diagram.

---

## UX evolution map (before → after)

Use these pairs for before/after visuals in Figma or screenshots from git checkout.

| Area | Earlier (style guide / pre–26 Oct online HUD) | Current (post `da3e6f4` / `11a0f89`) |
|------|-----------------------------------------------|--------------------------------------|
| **Entry** | Setup modal on sky | Title page; separate local vs online paths |
| **Kingdom select (online)** | (N/A or seat list) | Four banner buttons, hover color, claimed state |
| **Self status** | Leather turn card, top-left | Frameless top-center stack; octagonal timer on avatar |
| **Others** | Tally inside turn card | Bottom-left roster; current player enlarged |
| **Actions** | Chips top-right + bottom roll | Menu bottom-right; roll/dice bottom-center **only on your turn** |
| **Notifications** | Status line in card | Center toast with gold rules, kingdom-colored ornament |
| **Board on phone** | Fixed layout risks | `100dvh`, safe-area insets, forgiving hit targets |

---

## Measurable / testable outcomes in repo

- **Automated tests** cover: lobby rules, full 4-player games to vault win, illegal moves rejected, **idle clock** finishes games, last-player wins on forfeits.
- **Deploy:** Vercel rewrite to single HTML—zero build step for the client (designers can preview static assets easily).

---

## Artifacts for your portfolio

| Artifact | Path | Case-study use |
|----------|------|----------------|
| Playable game | `The Vaults of Corhaven.html` | Final interaction, mobile + online |
| Interface inventory | `style-guide.html` | Process, components, all copy |
| Rules reference | Rules modal + `lib/rules.js` | Systems thinking |
| Chronicle | In-game modal | Narrative design |
| This log | `docs/case-study-development-log.md` | Timeline & decisions |
| Executive summary | `docs/case-study-executive-summary.md` | Recruiter one-pager |
| Visual archive | `docs/case-study/visual-archive.md` + `screenshots/` | Session screenshots |
| Commit messages | `git log` | Verbatim shipping narrative |

---

## Suggested case-study structure (designer-led)

1. **Problem & fantasy** — Why Corhaven, not generic Ludo; four kingdoms, one secret rider.
2. **Constraints** — Browser-first, then Quest; later phones + async friends.
3. **Process** — Interface inventory before polish; copy spec; pairing with Cursor on implementation.
4. **Deep dives (pick 2–3)**  
   - Online lobby + kingdom banners  
   - Turn timer + role-based HUD (Oct 27)  
   - WebXR passthrough without splitting the brand  
5. **Outcomes** — What you’d validate with users (time-to-first-roll, comprehension of phalanx rules, drop-off in waiting room).
6. **Reflection** — Monolith tradeoffs; what pre-v3 git doesn’t show; next experiments.

---

## Appendix A — Full commit index

| SHA (short) | Date (UTC-5) | Summary |
|-------------|--------------|---------|
| `03a7807` | 2026-10-05 | Publish The Vaults of Corhaven so the game can go live. |
| `7370bd6` | 2026-10-05 | Quest passthrough mode; point to move, grip for dice. |
| `0bcde4d` | 2026-10-05 | Start theme on page load. |
| `0db92e1` | 2026-10-05 | Play theme out loud on load. |
| `1d33f99` | 2026-10-05 | Keep turn card in view; room board can shrink. |
| `1fdd1e3` | 2026-10-05 | Hand tracking, board-size slider, stick controls in room. |
| `252d577` | 2026-10-05 | Tracked hands over board in player color. |
| `b02fbb6` | 2026-10-26 | Online rooms, 20s clock, forfeits; server + tests. |
| `d7c03ec` | 2026-10-26 | Redeploy with online rooms. |
| `a209a4e` | 2026-10-26 | Title page; phone board fits visible screen. |
| `2118686` | 2026-10-26 | Kingdom banners for online pick. |
| `da3e6f4` | 2026-10-26 | Castle marker, top me-card, roster, menu. |
| `11a0f89` | 2026-10-27 | Vertical me-card, toasts, hide dice when waiting, touch targets. |

---

## Appendix B — Placeholder: your memory (fill in for the case study)

Use this section in your own doc or Notion— the repo cannot supply it.

- [ ] When did rule design start? What changed from classic Ludo?
- [ ] Sketches / FigJam / playtest notes from before 5 Oct 2026
- [ ] Why v3 folder name—what shipped in v1/v2?
- [ ] User quotes or playtest observations (local vs online vs Quest)
- [ ] Deployment URL and analytics (if any)
- [ ] What you’d do differently for Phase 3

---

*Generated from repository facts; amend with personal process notes and visuals as you build the public case study.*
