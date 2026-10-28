# Case study — visual archive

Screenshots captured during development sessions. Each entry ties to a **user request or ship moment** so the portfolio story stays traceable.

**Folder:** `docs/case-study/screenshots/`  
**Naming:** `YYYY-MM-DD-##-short-description-{desktop|mobile}.png`  
**After capture:** run `./scripts/sync-case-study-screenshots.sh` (browser saves to Cursor temp first).

---

## Session: 2026-10-27 — Case study bootstrap

**Trigger:** Document project history; add executive summary; establish screenshot workflow for future requests.

**Environment:** Local static server (`python3 -m http.server 8765`). Online kingdom-pick / host-room screens need deployed WS backend—captured join flow only.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 01 | [2026-10-27-01-title-screen-desktop.png](./screenshots/2026-10-27-01-title-screen-desktop.png) | Title page | Primary CTA hierarchy: Create → Join → Local → Chronicle |
| 02 | [2026-10-27-02-title-screen-mobile.png](./screenshots/2026-10-27-02-title-screen-mobile.png) | Title (390×844) | Re-capture after viewport + reload if layout splits incorrectly |
| 03 | [2026-10-27-03-local-setup-desktop.png](./screenshots/2026-10-27-03-local-setup-desktop.png) | Local setup modal | Player count, Human/Computer toggles, board visible behind scrim |
| 04 | [2026-10-27-04-in-game-hud-desktop.png](./screenshots/2026-10-27-04-in-game-hud-desktop.png) | In-match HUD | Top “me” card (Solmere), bottom-left roster, castle marker, order-roll dice |
| 05 | [2026-10-27-05-style-guide-assembled-screens-full.png](./screenshots/2026-10-27-05-style-guide-assembled-screens-full.png) | Interface inventory | Assembled screens + nav (process artifact) |
| 06 | [2026-10-27-06-online-join-room-desktop.png](./screenshots/2026-10-27-06-online-join-room-desktop.png) | Join room | Five-cell room code field; Continue / Back |
| 07 | [2026-10-27-07-chronicle-modal-desktop.png](./screenshots/2026-10-27-07-chronicle-modal-desktop.png) | Chronicle modal | Narrative content design; explicit close |

## Session: 2026-10-27 (evening) — Motion-sickness fix from mobile user testing

**Trigger:** Phone testers reported motion sickness: the roll button and dice appearing under the bottom UI shoved the roster/menu up and down every turn, and the board re-zoomed each time the turn came back. Fix: the bottom stack keeps one footprint on phones (hidden controls reserve their slot), HUD reflow is decoupled from the camera (re-frame only on rotation or game start/end), the player's pinch zoom is kept, and the menu moved to the top-right. Also reworded the order roll to name both dice ("rolled 5 and 6, 11 in all").

**Environment:** Local static server, 390×844 emulation (touch). Compare 02 and 03: board, roster and menu sit at identical pixels whether or not it is your turn.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 02 | [2026-10-27-02-mobile-your-turn-stable-hud-mobile.png](./screenshots/2026-10-27-02-mobile-your-turn-stable-hud-mobile.png) | In-match, your turn (390×844) | Roll button in its fixed slot; empty dice row reserved above it; menu now top-right |
| 03 | [2026-10-27-03-mobile-waiting-stable-hud-mobile.png](./screenshots/2026-10-27-03-mobile-waiting-stable-hud-mobile.png) | In-match, waiting (390×844) | Same frame as 02 with the button gone: no HUD or camera movement on turn change |
| 04 | [2026-10-27-04-mobile-menu-top-right-mobile.png](./screenshots/2026-10-27-04-mobile-menu-top-right-mobile.png) | Menu open (390×844) | Opens downward from the top-right button, above the turn card; bottom band is roster + roll stack only |

### Still to capture (when WS / production available)

- [ ] Online **Create room** (room code + share strip)
- [ ] **Kingdom banners** pick step (claimed vs available)
- [ ] **Waiting room** with seat list
- [x] **Your turn** vs **waiting** (dice hidden) — mobile, evening session 02/03
- [ ] **Toast** moment (capture, bonus march, vault)
- [x] **Menu** expanded (Chronicle, Rules, Sound, New game) — mobile, evening session 04
- [ ] **Rules** modal
- [ ] **Victory** sheet (human + CPU copy)
- [ ] **Quest / passthrough** (if case study covers XR)

---

## How new entries get added

At the end of a meaningful chat turn, the agent should:

1. Decide if the change is **visual** (new/changed UI, flow, or component state).
2. Serve the game locally or use production URL.
3. Capture 1–3 PNGs (desktop; mobile when relevant).
4. Run `scripts/sync-case-study-screenshots.sh`.
5. Append a row to **this file** and link from [development log](../case-study-development-log.md) if the moment is timeline-worthy.

See `.cursor/rules/case-study-captures.mdc`.
