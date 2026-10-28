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

## Session: 2026-10-27 (night) — The March on the board

**Trigger:** The wheel named the event before it stopped, the mist hid troops and dice when the camera pulled back, and the flood and ash were flat sheets. The road now uses a moving water and lava surface, the result waits until the wheel stops, and the mist no longer swallows what you are allowed to see.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 11 | [2026-10-27-11-flood-sheet-desktop.png](./screenshots/2026-10-27-11-flood-sheet-desktop.png) | The Great Flood | Reflective water on the King's Road; tile numbers and the castle arrow stay readable |
| 12 | [2026-10-27-12-ash-shader-desktop.png](./screenshots/2026-10-27-12-ash-shader-desktop.png) | Ashen Skies | Cracked lava on the road and a pool in the ruins; Emberhold shows +2 |

## Session: 2026-10-28 — The siege performances

**Trigger:** The per-tile sheets were replaced with the Ludo Under Siege performances. Each event is one thing across the whole board. The four castle yards stay clear.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 13 | [2026-10-28-13-flood-tsunami-desktop.png](./screenshots/2026-10-28-13-flood-tsunami-desktop.png) | The Great Flood | One wave across the road and the ruins; the castle yards stay dry |
| 14 | [2026-10-28-14-ash-volcano-desktop.png](./screenshots/2026-10-28-14-ash-volcano-desktop.png) | Ashen Skies | The cone rises in the ruined centre and one lava sheet spreads around the yards |
| 17 | [2026-10-28-17-sun-lances-desktop.png](./screenshots/2026-10-28-17-sun-lances-desktop.png) | The Sun's Ascendance | Three lances sweep the road and burn a trail into the board, not the castle yards |

## Session: 2026-10-28 — March polish

**Trigger:** Local play showed a duplicated kingdom, and the siege look needed the flood, lava, vines, sun, and shifting ways tightened. The wheel now lands and gets out of the way.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 18 | [2026-10-28-18-ash-lava-desktop.png](./screenshots/2026-10-28-18-ash-lava-desktop.png) | Ashen Skies | Lava reads as a molten pool, with broad heat instead of combed streaks |
| 19 | [2026-10-28-19-flood-castle-desktop.png](./screenshots/2026-10-28-19-flood-castle-desktop.png) | The Great Flood | Shallower water covers the road up to the walls; the courtyard stays dry |
| 21 | [2026-10-28-21-shifting-portals-desktop.png](./screenshots/2026-10-28-21-shifting-portals-desktop.png) | The Shifting Ways | A glowing portal stands on each of the four stones, with no line between them |
| 25 | [2026-10-28-25-plus-two-badge-desktop.png](./screenshots/2026-10-28-25-plus-two-badge-desktop.png) | Roster | Solmere's avatar carries a +2 while the Sun blesses that kingdom |

## Session: 2026-10-28 — Sun, fog, and the cone

**Trigger:** The sun snapped from bright to dark at the end of the intro, the mist was too heavy for the frame rate, and the ruins stuck out of the volcano.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 26 | [2026-10-28-26-sun-dim-scorch-desktop.png](./screenshots/2026-10-28-26-sun-dim-scorch-desktop.png) | The Sun's Ascendance | The room eases from bright to dark through the intro. The lances stay thick and leave a hot trail |
| 27 | [2026-10-28-27-ash-volcano-dice-desktop.png](./screenshots/2026-10-28-27-ash-volcano-dice-desktop.png) | Ashen Skies | The ruins sit down inside the cone, and a die rests on the lava beside it |
| 28 | [2026-10-28-28-mist-fog-desktop.png](./screenshots/2026-10-28-28-mist-fog-desktop.png) | The Veil of Mists | The bank still rolls across the road, drawn with a lighter fog so the board stays readable |

## Session: 2026-10-28 — Water through the yards

**Trigger:** The castle yards no longer need to stay dry, and the flood should keep its old surface while sitting lower.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 29 | [2026-10-28-29-flood-yards-desktop.png](./screenshots/2026-10-28-29-flood-yards-desktop.png) | The Great Flood | The water runs through the four yards. The sheet stays shallow, and the road still reads through it |

## Session: 2026-10-28 — Title, settings, and the lore

**Trigger:** The title needed a way into the lore, the theme and the effects needed their own levels, and the roll control should be the dice themselves.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 31 | [2026-10-28-31-title-gear-about-desktop.png](./screenshots/2026-10-28-31-title-gear-about-desktop.png) | Title | Gear at the top left. The chronicle button is now About the Vaults of Corhaven |
| 32 | [2026-10-28-32-settings-desktop.png](./screenshots/2026-10-28-32-settings-desktop.png) | Settings | Theme and effects each have a level and a checkbox. Unchecking one silences it and disables its slider |
| 33 | [2026-10-28-33-about-kings-desktop.png](./screenshots/2026-10-28-33-about-kings-desktop.png) | About | One page for the chronicle, the kingdoms, the March, the kings, and the world events |

## Session: 2026-10-28 — The names of the March

**Trigger:** The world events needed names with the weight of the chronicle.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 35 | [2026-10-28-35-world-event-names-desktop.png](./screenshots/2026-10-28-35-world-event-names-desktop.png) | World events | The Drowning Tide, the Heartfire Rising, the Wild Awakening, the Searing Seal, the Veil of Mist, and the Stones of the Pact |

## Session: 2026-10-28 — Dice on the right

**Trigger:** On a phone the dice sat under the roster, and each seat kept its troop count on the same line as the kingdom.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 36 | [2026-10-28-36-dice-right-roster-mobile.png](./screenshots/2026-10-28-36-dice-right-roster-mobile.png) | Phone HUD | Dice sit bottom right. The roster sits at the bottom left, with the troop count under the kingdom |

## Session: 2026-10-28 — Tap to roll

**Trigger:** The roll control was a gold dot. It should be the same die you tap to choose a march, with a small arrow that says to tap.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 37 | [2026-10-28-37-roll-dice-arrow-mobile.png](./screenshots/2026-10-28-37-roll-dice-arrow-mobile.png) | Phone HUD | The roll dice use the same bone face and red pips as a chosen march. A small arrow bobs above them |

## Session: 2026-10-28 — Order total, march numbers

**Trigger:** The order roll should show one total between the two dice. A march should keep each die's own number.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 38 | [2026-10-28-38-order-total-mobile.png](./screenshots/2026-10-28-38-order-total-mobile.png) | Order roll | A 1 and a 6 with 7 between them. The seat keeps the total |
| 39 | [2026-10-28-39-split-dice-mobile.png](./screenshots/2026-10-28-39-split-dice-mobile.png) | Choosing a march | Each die keeps its own number, 3 and 6, with no total between them |

## Session: 2026-10-28 — One roll, one announcement

**Trigger:** The two dice should be one button. Your roll is a banner. Everyone else's roll sits beside the name.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 40 | [2026-10-28-40-roll-pair-mobile.png](./screenshots/2026-10-28-40-roll-pair-mobile.png) | Roll button | Both dice are one button. The arrow bobs above the pair |
| 41 | [2026-10-28-41-roll-banner-mobile.png](./screenshots/2026-10-28-41-roll-banner-mobile.png) | Your roll | A banner names the two dice, 6 and 5, and the total, 11 in all |
| 42 | [2026-10-28-42-roll-beside-name-mobile.png](./screenshots/2026-10-28-42-roll-beside-name-mobile.png) | Other players | Thornwald 9 and Solmere 5 sit beside the name. No banner |

## Session: 2026-10-28 — Order total on the banner

**Trigger:** Only an order roll is announced. The total is large, and the two dice sit small beneath it.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 43 | [2026-10-28-43-order-total-banner-mobile.png](./screenshots/2026-10-28-43-order-total-banner-mobile.png) | Order roll | A large 6, with 5 and 1 beneath it |

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
