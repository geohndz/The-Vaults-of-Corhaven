# The Vaults of Corhaven — Development log (for case study)

**Author:** Geo Hernandez (product design & development)  
**Repository:** `board-game/v3`  
**Document purpose:** A factual timeline of what shipped in this repo, with design decisions, product moments, and narrative hooks for a UX/product case study.  
**Last updated from repo:** 4 Nov 2026 (user test round 4 on **V1.4.4**, with a teacher's notes on the board)

**Related:** [Executive summary (1 page)](./case-study-executive-summary.md) · [Visual archive](./case-study/visual-archive.md) · [Case study folder](./case-study/README.md)

---

## Visual archive

Screenshots are captured after meaningful product changes (see `.cursor/rules/case-study-captures.mdc`). Current set: **[visual-archive.md](./case-study/visual-archive.md)** — initial session **2026-10-27** (title, local setup, in-game HUD, style guide, join room, chronicle). **2026-11-02:** [the march forming](./case-study/screenshots/2026-11-02-01-march-forming-desktop.png), the [connection lost banner](./case-study/screenshots/2026-11-02-03-connection-banner-desktop.png), the [marker lab](./case-study/screenshots/2026-11-02-04-marker-lab-thorns-desktop.png), the [ring post](./case-study/screenshots/2026-11-02-09-ring-post-water-desktop.png), the [wheel](./case-study/screenshots/2026-11-02-05-roulette-desktop.png) without its card, the [title screen](./case-study/screenshots/2026-11-02-10-title-banners-desktop.png) with banner actions, the [slate title](./case-study/screenshots/2026-11-02-12-title-slate-desktop.png), the [room lobby](./case-study/screenshots/2026-11-02-18-lobby-black-overlay-desktop.png) on the black overlay over the board, [Play local](./case-study/screenshots/2026-11-02-22-local-setup-overlay-desktop.png) on that same overlay, [Join a room](./case-study/screenshots/2026-11-03-01-join-room-overlay-desktop.png) on it as well, then [open rooms in that same layout](./case-study/screenshots/2026-11-03-03-join-open-rooms-desktop.png). **2026-11-03:** [purple Stones of the Pact](./case-study/screenshots/2026-11-03-05-stones-pact-wheel-desktop.png) on the wheel and [on the road](./case-study/screenshots/2026-11-03-06-stones-pact-portals-desktop.png). First live user test the same day is **Phase 3** below (V1.1.6). Playtest follow-up **V1.2.0:** [Learn the march](./case-study/screenshots/2026-11-03-07-learn-the-march-title-desktop.png) on the title, [order as a table banner](./case-study/screenshots/2026-11-03-08-learn-march-order-desktop.png), [barricade hint](./case-study/screenshots/2026-11-03-09-hint-sheet-barricade-desktop.png). **V1.2.2:** [leave keep with dice](./case-study/screenshots/2026-11-03-11-tutorial-leave-keep-dice-desktop.png), [March event toggles](./case-study/screenshots/2026-11-03-13-tutorial-march-toggles-desktop.png), [victory](./case-study/screenshots/2026-11-03-14-tutorial-victory-desktop.png). **V1.4.0** second playtest: [order letter-spacing, Next on](./case-study/screenshots/2026-11-03-15-tutorial-order-letter-spacing-desktop.png), [shrine burst](./case-study/screenshots/2026-11-03-16-tutorial-shrine-burst-desktop.png), [World events cycle](./case-study/screenshots/2026-11-03-17-tutorial-world-events-desktop.png). User test round 3 the same night (1v1, laptop and a Quest browser) is **Phase 4** below. No new screens. **V1.4.1:** [Play in the room on the title](./case-study/screenshots/2026-11-03-18-title-play-in-the-room-desktop.png) and [on the board](./case-study/screenshots/2026-11-03-19-room-button-on-board-desktop.png).

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
| **28 Oct** | **Sun, fog, cone** | The sun eases from bright to dark through the intro, and the lances keep a hot trail. The mist is a lighter bank. The ruins sink into the volcano, and the dice strike the cone. [Sun](./case-study/screenshots/2026-10-28-26-sun-dim-scorch-desktop.png), [volcano](./case-study/screenshots/2026-10-28-27-ash-volcano-dice-desktop.png), [mist](./case-study/screenshots/2026-10-28-28-mist-fog-desktop.png). |
| **28 Oct** | **Water through the yards** | The March now runs through the castle yards. The flood stays shallow, with the earlier crest and ripple, and the road still shows through. [Flood](./case-study/screenshots/2026-10-28-29-flood-yards-desktop.png). |
| **28 Oct** | **Lore, settings, and the dice** | The title opens a lore page (chronicle, kingdoms, the March, the kings, the world events). A gear sets the theme and the effects apart, each with a level and a way to silence it. On a phone the roll is two dice at the bottom left, and they leave when it is not your turn. [Title](./case-study/screenshots/2026-10-28-31-title-gear-about-desktop.png), [settings](./case-study/screenshots/2026-10-28-32-settings-desktop.png), [kings](./case-study/screenshots/2026-10-28-33-about-kings-desktop.png). |
| **28 Oct** | **Names of the March** | The wheel now speaks six names: the Drowning Tide, the Heartfire Rising, the Wild Awakening, the Searing Seal, the Veil of Mist, and the Stones of the Pact. [World events](./case-study/screenshots/2026-10-28-35-world-event-names-desktop.png). |
| **28 Oct** | **Dice on the right** | On a phone the dice sit opposite the roster, and the roster comes down to the bottom. Each seat stacks the troop count under the name. [Phone](./case-study/screenshots/2026-10-28-36-dice-right-roster-mobile.png). |
| **28 Oct** | **Tap to roll** | The roll control is the same bone die, with the same red pips, as the die you tap to march. A small arrow bobs above it until you roll. [Phone](./case-study/screenshots/2026-10-28-37-roll-dice-arrow-mobile.png). |
| **28 Oct** | **Order total** | While the rider's order is rolled, the total sits between the two dice, and the seat keeps that total. In the march, each die keeps its own number. [Order](./case-study/screenshots/2026-10-28-38-order-total-mobile.png), [march](./case-study/screenshots/2026-10-28-39-split-dice-mobile.png). |
| **28 Oct** | **One roll** | The two dice are one button. Your roll is a banner. Everyone else's sits beside the name. [Pair](./case-study/screenshots/2026-10-28-40-roll-pair-mobile.png), [banner](./case-study/screenshots/2026-10-28-41-roll-banner-mobile.png), [seats](./case-study/screenshots/2026-10-28-42-roll-beside-name-mobile.png). |
| **28 Oct** | **Order banner** | Only the order roll is announced, with the total large and the two dice small beneath it. A march is not announced. [Total](./case-study/screenshots/2026-10-28-43-order-total-banner-mobile.png). |
| **28 Oct** | **Who marches first** | The order roll seats the highest total first, and a tie rolls again without moving anyone already seated. The banner names your place, and the roster keeps 1st through 4th for the opening round. [Places](./case-study/screenshots/2026-10-28-44-turn-order-places-desktop.png). |

**Phase 2 theme:** *From “beautiful solo/couch experience” to “async-friendly online play on phones”*—progressive disclosure, role-based controls, celebration moments without noise.

---

### Phase 3 — First live user test (3 Nov 2026)

**Build tested:** **V1.1.6** (`a6b122a`, shipped the morning of the session). Online room on the live game; Geo hosted. Several real players at once. Local CPU play was also in the mix (the barricade note).

This is the first session with people who were not the designer. The Oct 27 mobile pass was a HUD/motion finding; this one is full-match comprehension, pace, and connection.

#### What players struggled with

| Finding | What happened | Design implication |
|---------|----------------|--------------------|
| **Banners too fast** | Players said they could not finish reading the toast before it left. | Hold high-signal banners longer, or let the player dismiss them. The Oct 27 “respect attention” toast model assumed a glance was enough. It was not. |
| **No durable hint after the beat** | Confusion in the first couple of rounds: a world event, Greed, or a barricade would fire, then vanish. | After the banner, leave a small control at the side of the screen. Tap it, it slides out, and you can read what just happened and who it hits. Same pattern for the March, Greed, barricades, and the rest of the high-signal events. |
| **Order roll is invisible if it is not your turn** | While seats were being rolled, players who were waiting thought nothing was happening. | Everyone needs a banner (or equal status) that the table is rolling for order—not only the person whose dice are up. |
| **Shared disconnects** | The table dropped at the same time more than once. When it happened, it was on Geo’s turn (the host). | Treat as a host/turn-path reliability bug, not a one-off client glitch. Investigate WS/room persistence around the host’s action. |
| **Pieces lost in the siege** | World effects made troops hard to pick out. | On your turn, your own pieces should glow, or carry a marker above them, so the board still reads under fog, flood, and ash. |
| **CPU over-builds barricades** | In local play the AI stacked barricades and the match dragged. | Lower the CPU’s barricade weight so local games keep the same pace the live table found fun. |

#### What landed

- Players **banded together** against whoever was ahead. The race-and-eat loop is doing the social work.
- **World events were a hit**, especially the fog.
- Real opponents **changed how fast the game felt**. Clock time was about the same as a CPU match; it did not feel slow.
- After a couple of rounds the rules **clicked** and play sped up. The problem is the opening, not the system once it is known.

#### Creator reflection

The product is already fun with people in the room. The gap is **onboarding in the first two rounds**: durable explanation of what just happened, a visible order-roll for every seat, pieces that stay findable under the siege, and banners that stay long enough to read. Connection drops on the host’s turn are a trust issue for online play, separate from teaching.

#### Next: a scripted tutorial under Play local

Not a full match. A predetermined walk that fades between beats, opened from the title screen under Play local, covering:

1. Rolling for order  
2. Leaving the yard on a 6 and a 1  
3. Doubles and rolling again  
4. Greed  
5. Barricades  
6. Safe squares  
7. Choosing which die to march  
8. +20 for a capture  
9. +20 for reaching the vault  
10. Each world event and who it hits  
11. Winning  

Each beat is one explanation, then a fade, then the next. That matches what testers needed: they understood the game once they had seen it, not from the toast alone.

**Shipped in V1.2.0** (same day): banners hold ~5s and tap away; order is announced to every seat; a side chip slides open after world events, Greed, barricades, strikes, and the vault; your troops carry a marker on your turn; the computer would rather march than stack; Tutorial is eleven scripted beats under Play local. Host-turn disconnects are still open. Visuals: [title](./case-study/screenshots/2026-11-03-10-tutorial-title-desktop.png), [order lesson](./case-study/screenshots/2026-11-03-08-learn-march-order-desktop.png), [barricade hint](./case-study/screenshots/2026-11-03-09-hint-sheet-barricade-desktop.png).

**V1.2.2** tutorial polish: dice on Leaving the keep (scripted 6 and 1); one troop walks onto the other for a barricade; strike then +20; vault uses two pieces; Show again / Back / Next; March event toggles; Victory keeps a single Back to title. Visuals: [leave keep](./case-study/screenshots/2026-11-03-11-tutorial-leave-keep-dice-desktop.png), [March toggles](./case-study/screenshots/2026-11-03-13-tutorial-march-toggles-desktop.png), [victory](./case-study/screenshots/2026-11-03-14-tutorial-victory-desktop.png).

---

### Phase 4 — User test round 3 (3 Nov 2026)

**Build tested:** **V1.4.0**. One other person, 1v1. One seat on a laptop, the other on a Quest. The in-game VR button never appeared, so the headset seat was the Quest browser.

This is a narrower table than round 1: one opponent, two devices, after the tutorial and the V1.4.0 pass. Some notes are things that failed in play. Some are how the game felt. The cadence notes at the end are ideas they offered.

#### What failed in the session

| Finding | What they said |
|---------|----------------|
| **Dice lesson teaches the wrong verb** | In the tutorial’s dice portion it was not clear that you only roll. They tried to move the pieces. |
| **Banner covers the board** | The notification stays up, takes too much space, and overlaps the pieces. Round 1 needed longer to read. This complaint is the size and where it sits. |
| **Connection dropped three times** | The 1v1 dropped three times in one sitting. Online trust is still open, now with a single opponent. |
| **Markers still missing online** | The dots above the pieces did not show. **V1.2.0** was meant to mark your troops on your turn, and the four-player pass already reported a missing marker. Online, they are still absent. |
| **Dice miss the volcano** | During ash, the dice did not collide with the volcano. The 28 Oct pass had the dice striking the cone. |
| **Trigger clicks and orbits** | In the headset browser, the trigger selected and also tried to rotate the board, so clicking a piece or a die was hard. |
| **No VR entry** | The VR button did not show. They played in the Quest’s browser. The board was never placed in the room. |

#### Comments on how the game felt

- They pointed at the **mist** because it created a feeling of uncertainty. The other world events felt cosmetic. Their words: “they’re just there.” Round 1 had called the fog a hit. This player liked the mist for the uncertainty, and described the rest as atmosphere.
- **Sun beams** (the sun lances, the Searing Seal) were the least preferred world event.

#### How often a world event should fire

They thought an event after every round may be too often. These are their suggestions. The session did not choose one.

- After pieces reach the middle
- Every other round
- When someone lands on a shrine
- When someone rolls a double 6

#### Creator reflection

The opening gap narrowed to one beat: the dice portion still reads as if you march the pieces. Online, the drops continue, and the markers promised since **V1.2.0** are still missing. The banner now stays, and it covers the troops. Mist and the sun beams are taste. The four cadence ideas stay theirs until a later rules pass. VR entry failed before passthrough could be judged; the trigger conflict is from playing the flat board inside the headset browser.

**V1.4.1:** Play in the room is on the title and on the board. **V1.4.2** shows it only when the browser can start a headset session (`immersive-ar`, or `immersive-vr` if the room mode is unavailable). In the flat Quest panel the trigger has to travel before the board turns, so a click can land. [Title](./case-study/screenshots/2026-11-03-18-title-play-in-the-room-desktop.png), [on the board](./case-study/screenshots/2026-11-03-19-room-button-on-board-desktop.png). Passthrough on a headset is still unconfirmed.

**V1.4.3:** On your turn a kingdom-colored dot sits above each of your troops, including online and the ones still in the yard. While the volcano is up, the throw uses the cone’s collider, then shows the faces the room already drew. [Dots](./case-study/screenshots/2026-11-03-21-piece-dots-desktop.png), [dice on the cone](./case-study/screenshots/2026-11-03-22-dice-volcano-desktop.png).

**V1.4.4:** The room socket is closed at five minutes, which is why a whole table dropped together three or four times a match. Each seat opens a fresh socket before that, a few seconds apart, and the connection banner stays down unless the new socket fails.

---

### Phase 5 — User test round 4 (4 Nov 2026)

**Build tested:** **V1.4.4**, the live build after the socket refresh. A teacher sat in and gave notes on the art direction.

This is the first round with no connection or marker failures in the notes. What is left is legibility, pace, and teaching. Players also asked for a mode, an accessibility setting, and a change to the board's color.

#### What made play harder

| Finding | What they said | What the build does today |
|---------|----------------|---------------------------|
| **Pieces look alike** | They asked for the pieces to be more distinct. | Every troop is the same pawn, gold band, visor, and plume. Only the body color changes. Emberhold red (`#B3261E`), Thornwald green (`#2E7D32`) and Tidereach blue (`#1F4E9C`) are all dark, and red and green collapse for the most common color blindness. |
| **World events move too fast** | The events transition too fast. | A new event is dealt every round, and play resumes once the board has changed (3.6 to 7 seconds). Round 3 thought every round may be too often. |
| **Info banner too fast** | The banner goes by too fast. | Round 1 said the same, and round 3 said the banner stayed too long and too large. A lone banner holds 5.2 seconds, but when several queue, each is cut to 2.8. Busy moments, the ones with the most to read, get the least time. |
| **Volcano hardest to see** | The Heartfire Rising was the hardest event to read. | Round 2 also said the lava hid tiles. |
| **Sun beams burn the road** | Scorch marks from the sun lances make the board harder to see. | The char stays on the tiles for the rest of the event, and the sky dims. |
| **Tutorial not clear enough** | After the tutorial, players asked what they need to bring a troop out of the keep, and how Geo was getting bonus moves. | See the two questions below. |

#### The two tutorial questions

**“What do I need to get a troop out of the keep?”** The rule is a 1 or a 6 on either die. The lesson always rolls a 6 and a 1 together, and one die takes the troop out while the other moves it a square. With both exit faces on the table, the demo cannot show that either one is enough, or that one die is spent just walking out. Since Phase 3 the log itself has called this beat “a 6 and a 1.”

**“How are you getting the bonus moves?”** The game has three things a player could read as a bonus move, and they look different:

- **+20** after a strike or a vault. It appears as a `+20` chip in the roller’s tray and in a banner. Off-turn the tray is hidden, so the banner is the only cue, and that banner is one of the ones cut short when several queue.
- **+2** from Tide, Heartfire, Wild or the Seal. The die still shows its face, and only a small `+2` badge on the avatar marks it. The troop simply walks two squares further than the die says. It also drops back to the plain count when the longer move is illegal.
- **Doubles**, a second roll after the march.

The question does not say which they saw. In both cases, the move happened on someone else’s turn and nothing on the board explained it.

#### What landed

- **Easy to get into.**
- **World events**, especially **mist**, **sun beams** and the **Stones of the Pact**. Mist is the favorite for the third round running. The sun beams were loved here and least preferred in round 3. Here the complaint was what the beams leave on the road.
- **Sounds** overall, and the **hop** in particular.

#### Comments and requests

- **Second and third place.** A mode where the match keeps going after the first kingdom reaches the vault. Today the match ends on the first winner.
- **Color blind mode**, or a high-contrast mode.
- **Not every event is as destructive as the others.** Four of the six (Tide, Heartfire, Wild, Seal) only add two squares to one kingdom's moves. Mist and the Stones change what you can see or where you land. Round 3 put it as “they’re just there.”

#### From the teacher

- Make the board colors **grittier** to match the lore, with **darker crimson** tones.

#### Creator reflection

The connection and marker work from round 3 held. What is left is legibility. Pieces only differ by a dark hue, effects cover the road, and banners shorten exactly when there is more to read. The teacher wants a darker crimson board, and players want more contrast. Both can be done if the board darkens and the pieces carry contrast through shape and outline, not hue alone. Emberhold red on a crimson board is the case to test first.

Both tutorial questions are about moves that need explaining in the moment. The keep beat rolls both exit faces at once, so it never shows that one is enough. The +2 and the +20 happen on other people’s turns without a mark on the board. The tutorial can fix the first. The second needs the board to say why a troop went further than its die.

For the second time, a player has said that four of the six events only change one rule. Mist and the Stones are the two that change the board, and they are the favorites. Pace and weight of the events are probably one problem. If each event did more, it could come less often and stay longer.

#### Decision: if it is not visible, it is not usable

Round 4 kept pointing at the same cost. The events were the most impressive thing on the board, and they were also what hid the road, the troops, and where to tap. Geo chose legibility: players should never be confused about what to click or where to go.

**Shipped in V1.5.0:** the wheel and five of the six events are out of play. The mist stays, because players asked for it in three rounds out of four. It no longer comes from a wheel. It arrives on its own after every third round and lifts after the next, with a banner each way. The toggle reads “Mist every third round.” A new event system is planned for a later version. The effects for the other five stay in `lib/siege-fx.js` for the marker lab.

**Shipped:** ranked play, a toggle under the mist in Play local and in the room lobby. A kingdom with every troop home takes the next place and leaves the turn order. The rest march on until one is left, and the victory sheet lists every place. Visuals: [Play local](./case-study/screenshots/2026-11-05-01-play-local-ranked-toggle-desktop.png), [mist on round 3](./case-study/screenshots/2026-11-05-02-mist-third-round-desktop.png), [ranked victory](./case-study/screenshots/2026-11-05-03-ranked-victory-places-desktop.png), [room lobby](./case-study/screenshots/2026-11-05-04-room-lobby-ranked-toggle-desktop.png).

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

### 6. Event feedback model (Oct 27 → challenged 3 Nov)

Shift from persistent turn card messaging to **ephemeral toasts** for pivotal beats. **Design principle:** *Respect attention*—especially when waiting on others’ 20s turns.

**Playtest (V1.1.6):** the glance was too short, and the first rounds still needed a durable “what just happened” readout. Next pass: keep the banner, then a side chip that slides open for the March, Greed, barricades, and the rest.

**Playtest round 3 (V1.4.0):** the banner now stays. This player said it takes too much of the board and sits on the pieces. Duration and footprint are separate problems.

**Playtest round 4 (V1.4.4):** too fast again. A lone banner holds 5.2 seconds, but a queue cuts each to 2.8, so the busiest moments are the hardest to read. A single fixed hold cannot satisfy rounds 1, 3 and 4 together.

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
5. **Outcomes** — First live table on **V1.1.6** (3 Nov 2026): world events and table politics landed; opening rounds, banner duration, host disconnects, and piece legibility did not. See Phase 3. Round 3 the same night (**V1.4.0**, 1v1, laptop and Quest browser): dice lesson still reads as movement, the banner covers the pieces, the table dropped together on the five-minute socket limit, mist was the event with stakes, sun beams the least preferred. **V1.4.3** puts the dots back on your turn and sends the dice into the volcano. **V1.4.4** refreshes the room socket before that close. Cadence ideas stay suggestions. See Phase 4. Round 4 (**V1.4.4**, 4 Nov) had no connection failures: easy to get into, sounds and the hop liked, mist, sun beams and the Stones favored. Open: pieces too alike, events and banners too fast, volcano and scorch hide the road, tutorial still leaves basic questions. Requests: second and third place, a color blind mode, a grittier crimson board. See Phase 5.
6. **Reflection** — Teach the first two rounds (side hints + scripted tutorial under Play local); keep the siege spectacle once players can still find their troops.

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
- [x] First live user test (3 Nov 2026, **V1.1.6**, online + local CPU notes) — Phase 3 above. Quoted lines still open if you want them later.
- [x] User test round 3 (3 Nov 2026, **V1.4.0**, 1v1, laptop + Quest browser) — Phase 4 above. **V1.4.2** shows Play in the room only when a headset session is available, and keeps a trigger click from turning the board. **V1.4.3** marks your troops on your turn and makes the dice strike the volcano. **V1.4.4** refreshes the room socket before the five-minute close. Passthrough on a headset is still unconfirmed.
- [x] User test round 4 (4 Nov 2026, **V1.4.4**, with a teacher) — Phase 5 above. Shipped from it: world events cut to the mist on a three-round schedule, and ranked play. Tutorial questions recorded: getting out of the keep, and Geo’s bonus moves. Not recorded: how many players, and which devices.
- [ ] Deployment URL and analytics (if any)
- [x] Phase 3 next work (from the 3 Nov table): slower banners, side-sheet hints, order-roll banner for every seat, on-turn piece glow, CPU barricade weight, scripted tutorial under Play local — **V1.2.0**. Still open: host-turn disconnects.

---

*Generated from repository facts; amend with personal process notes and visuals as you build the public case study.*
