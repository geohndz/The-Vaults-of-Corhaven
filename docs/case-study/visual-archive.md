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
| 44 | [2026-10-28-44-turn-order-places-desktop.png](./screenshots/2026-10-28-44-turn-order-places-desktop.png) | Turn order | Each seat keeps 1st through 4th for the opening round |

## Session: 2026-10-28 — Leave the last local human

**Trigger:** Leaving a local match as the only person still playing sent the computers on without you. Leave now ends that match. If another person is still at the table, only your kingdom drops out.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 45 | [2026-10-28-45-leave-only-human-desktop.png](./screenshots/2026-10-28-45-leave-only-human-desktop.png) | Leave match | Copy names that you are the only one left, and that leaving ends the match |

## Session: 2026-11-02 — Quiet gate and connection banner

**Trigger:** A live match lost the socket. Troops jumped, including ones already in the vault, the dice would not roll, and phones ran hot. The theme also started at a different point on each device, and a dropped connection was only a line of hint text.

**Environment:** Local static server. The gate and the banner were opened over a local match. Online create-room still needs the deployed socket.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 01 | [2026-11-02-01-march-forming-desktop.png](./screenshots/2026-11-02-01-march-forming-desktop.png) | Match gate | Silence while the road opens. The gold rule fills to the shared start, then the theme fades in together |
| 02 | [2026-11-02-02-connection-banner-desktop.png](./screenshots/2026-11-02-02-connection-banner-desktop.png) | Connection banner, first pass | Full-width bar. Replaced the same day by the centered banner |
| 03 | [2026-11-02-03-connection-banner-desktop.png](./screenshots/2026-11-02-03-connection-banner-desktop.png) | Connection lost | Same banner as Your turn: gold rules, pulsing wifi, tracked title. Stays for the whole interruption and leaves the gear and menu where they are |
| 04 | [2026-11-02-04-marker-lab-thorns-desktop.png](./screenshots/2026-11-02-04-marker-lab-thorns-desktop.png) | Marker lab | Five landing marks under the Wild Awakening, with the vines wrapped on the towers. The ring is the mark still used in a match |
| 05 | [2026-11-02-05-roulette-desktop.png](./screenshots/2026-11-02-05-roulette-desktop.png) | The March wheel | The wheel sits on the board by itself. The leather card is gone |
| 06 | [2026-11-02-06-ring-post-desktop.png](./screenshots/2026-11-02-06-ring-post-desktop.png) | Marker lab, ring post | First pass: a solid gold post and sphere over the ring. The post bobs |
| 07 | [2026-11-02-07-ring-post-beam-desktop.png](./screenshots/2026-11-02-07-ring-post-beam-desktop.png) | Marker lab, ring post | The post and sphere use the beam's gold light, so they read through the thorns. The ring stays on the tile |
| 08 | [2026-11-02-08-ring-post-cylinder-desktop.png](./screenshots/2026-11-02-08-ring-post-cylinder-desktop.png) | Marker lab, ring post | The stem is a straight cylinder of the same light. It runs down through the board, so the end stays buried while the post bobs |
| 09 | [2026-11-02-09-ring-post-water-desktop.png](./screenshots/2026-11-02-09-ring-post-water-desktop.png) | Marker lab, ring post in the tide | The post and ring stay visible through the Drowning Tide. The stem still ends at the board |

## Session: 2026-11-02 (afternoon) — Title screen as banners

**Trigger:** Restyle the homepage. Drop the lead sentence, center the title, and make the actions look like the connection banner.

**Environment:** Local static server. Dialog buttons (Play local, Join a room) stay the gold fill and outline. Only the title screen changed.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 10 | [2026-11-02-10-title-banners-desktop.png](./screenshots/2026-11-02-10-title-banners-desktop.png) | Title page | Centered title. Fading bands, tracked capitals. Gold hairlines appear only on the banner under the pointer |
| 11 | [2026-11-02-11-title-banners-mobile.png](./screenshots/2026-11-02-11-title-banners-mobile.png) | Title page (390×844) | Same stack at rest, lines hidden. The long About label stays on one line |

## Session: 2026-11-02 (afternoon) — Slate and steel

**Trigger:** Shift the interface from leather and brass to gray and slate. Kingdom colors and the wooden board stay.

**Environment:** Local static server.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 12 | [2026-11-02-12-title-slate-desktop.png](./screenshots/2026-11-02-12-title-slate-desktop.png) | Title page | Slate field, steel type, the same fading bands |
| 13 | [2026-11-02-13-local-setup-slate-desktop.png](./screenshots/2026-11-02-13-local-setup-slate-desktop.png) | Play local | Steel panel and button. The four kingdom crests stay red, green, gold, and blue |

## Session: 2026-11-02 (afternoon) — One room screen

**Trigger:** Fold the room-code step and the kingdom step into a single lobby. The code, the name, the people, and the actions share a sidebar. The four banners fill the rest.

**Environment:** Local static server. The room is a preview of the lobby renderer (code 7GH3C), because this machine has no socket.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 14 | [2026-11-02-14-combined-lobby-desktop.png](./screenshots/2026-11-02-14-combined-lobby-desktop.png) | Room lobby | Sidebar about 40%, banners about 60%. Code, name, seats as people arrive, Start and Leave pinned to the bottom. Thornwald stays lit under Mara |
| 15 | [2026-11-02-15-combined-lobby-mobile.png](./screenshots/2026-11-02-15-combined-lobby-mobile.png) | Room lobby (390×844) | The column stacks and the sheet scrolls. This frame is the kingdoms, then Start and Leave |
| 16 | [2026-11-02-16-lobby-full-overlay-desktop.png](./screenshots/2026-11-02-16-lobby-full-overlay-desktop.png) | Room lobby | The card is gone. The slate overlay covers the window, and the same 40/60 layout sits on it |
| 17 | [2026-11-02-17-lobby-full-overlay-mobile.png](./screenshots/2026-11-02-17-lobby-full-overlay-mobile.png) | Room lobby (390×844) | Full-window stack. The sheet scrolls on to the rest of the banners and the buttons |
| 18 | [2026-11-02-18-lobby-black-overlay-desktop.png](./screenshots/2026-11-02-18-lobby-black-overlay-desktop.png) | Room lobby | The slate fill is gone. The black dim covers the board, and the room info sits on top |
| 19 | [2026-11-02-19-lobby-separator-desktop.png](./screenshots/2026-11-02-19-lobby-separator-desktop.png) | Room lobby | A hairline runs the full height between the sidebar and the banners |
| 20 | [2026-11-02-20-lobby-taller-banners-desktop.png](./screenshots/2026-11-02-20-lobby-taller-banners-desktop.png) | Kingdom banners | The arches run longer. The scenes fill the glass and the moon stays round |
| 21 | [2026-11-02-21-lobby-banner-buttons-desktop.png](./screenshots/2026-11-02-21-lobby-banner-buttons-desktop.png) | Room lobby actions | Start and Leave use the title banners: fading band, tracked capitals, hairlines only on hover |

## Session: 2026-11-02 (afternoon) — Play local on the black overlay

**Trigger:** Play local uses the same full-window treatment as the room lobby.

**Environment:** Local static server.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 22 | [2026-11-02-22-local-setup-overlay-desktop.png](./screenshots/2026-11-02-22-local-setup-overlay-desktop.png) | Play local | The card is gone. A black dim covers the board. Player count sits on the left, the kingdoms on the right, and Begin and Back are title banners |
| 23 | [2026-11-02-23-local-setup-overlay-mobile.png](./screenshots/2026-11-02-23-local-setup-overlay-mobile.png) | Play local (390×844) | The column stacks. A hairline sits above the kingdoms, and the buttons stay at the bottom |

## Session: 2026-11-03 — Join a room on the black overlay

**Trigger:** Join a room was the last screen still sitting in a card.

**Environment:** Local static server. The socket is not running here, so the shot is the code step before a room answers.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 24 | [2026-11-03-01-join-room-overlay-desktop.png](./screenshots/2026-11-03-01-join-room-overlay-desktop.png) | Join a room | The card is gone. The black dim covers the board. The code sits on the right, and Continue and Back are title banners |
| 25 | [2026-11-03-02-join-room-overlay-mobile.png](./screenshots/2026-11-03-02-join-room-overlay-mobile.png) | Join a room (390×844) | The column stacks. A hairline sits above the code, and Continue and Back stay at the bottom |

## Session: 2026-11-03 — Join lists open rooms

**Trigger:** Make Join a room match Create a room: code in the sidebar, open rooms with free seats in the main column.

**Environment:** `node scripts/local.js` (WebSocket). A second client held lobby `79UGM` so the list had a row.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 26 | [2026-11-03-03-join-open-rooms-desktop.png](./screenshots/2026-11-03-03-join-open-rooms-desktop.png) | Join a room | Code field on the left with Continue / Back. Open rooms on the right: code, crests, seats left |
| 27 | [2026-11-03-04-join-open-rooms-mobile.png](./screenshots/2026-11-03-04-join-open-rooms-mobile.png) | Join a room (390×844) | Code, then a hairline, then the open-room row, then Continue and Back |

## Session: 2026-11-03 — Stones of the Pact in purple

**Trigger:** The shifting stones were cyan on the road and gold on the wheel, next to Solmere. Both are purple now.

**Environment:** Local `node scripts/local.js`. Wheel shown on the board. Portals from the marker lab with the chrome hidden.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 28 | [2026-11-03-05-stones-pact-wheel-desktop.png](./screenshots/2026-11-03-05-stones-pact-wheel-desktop.png) | The March wheel | The sixth slice is purple, beside mist grey, not Solmere gold |
| 29 | [2026-11-03-06-stones-pact-portals-desktop.png](./screenshots/2026-11-03-06-stones-pact-portals-desktop.png) | Stones of the Pact | Four purple portals on 14, 31, 48 and 65 |

## Session: 2026-11-03 — First live user test (no new screens)

**Trigger:** First full-match table with people who were not the designer. Build **V1.1.6**. Notes and reflections live in the [development log, Phase 3](../case-study-development-log.md#phase-3--first-live-user-test-3-nov-2026). No screens captured during the session.

## Session: 2026-11-03 — Playtest follow-up (V1.2.0)

**Trigger:** First live table: banners too fast, opening rounds confusing, order roll looked idle, pieces lost in the siege, CPU stacked barricades. **V1.2.0** holds banners longer, announces order to every seat, leaves a side hint after the beat, marks your troops on your turn, races the computer instead of locking squares, and adds Tutorial under Play local.

**Environment:** Local `node scripts/local.js`. Title, then Tutorial.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 30 | [2026-11-03-07-learn-the-march-title-desktop.png](./screenshots/2026-11-03-07-learn-the-march-title-desktop.png) | Title | First label: Learn the march, under Play local. **V1.2.0** |
| 31 | [2026-11-03-08-learn-march-order-desktop.png](./screenshots/2026-11-03-08-learn-march-order-desktop.png) | Tutorial, 1 of 11 | Board stays in view. Rolling for order is a banner for the whole table, with a side chip to read again |
| 32 | [2026-11-03-09-hint-sheet-barricade-desktop.png](./screenshots/2026-11-03-09-hint-sheet-barricade-desktop.png) | Barricade hint | Two Emberhold troops lock a square. The chip slides open so you can read who it hits |
| 33 | [2026-11-03-10-tutorial-title-desktop.png](./screenshots/2026-11-03-10-tutorial-title-desktop.png) | Title | The action is Tutorial. **V1.2.1** |

## Session: 2026-11-03 — Tutorial polish (V1.2.2)

**Trigger:** Dice hidden in the lesson HUD; barricade spawned stacked; strike and vault skipped the +20 walk; Victory duplicated Back to title; the side chip peeked when closed and played the start-game sting.

**Environment:** Local `node scripts/local.js`. Tutorial from title.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 34 | [2026-11-03-11-tutorial-leave-keep-dice-desktop.png](./screenshots/2026-11-03-11-tutorial-leave-keep-dice-desktop.png) | Leaving the keep | Roll pair on the board. The lesson roll always lands 6 and 1. Next / Back / Show again |
| 35 | [2026-11-03-12-tutorial-hint-closed-desktop.png](./screenshots/2026-11-03-12-tutorial-hint-closed-desktop.png) | Barricade hint, closed | Chip sits on the edge. The sheet is fully off-screen |
| 36 | [2026-11-03-13-tutorial-march-toggles-desktop.png](./screenshots/2026-11-03-13-tutorial-march-toggles-desktop.png) | The March | Tide, Heartfire, Wild, Seal, Mist, Stones. Mist is on |
| 37 | [2026-11-03-14-tutorial-victory-desktop.png](./screenshots/2026-11-03-14-tutorial-victory-desktop.png) | Victory | Four Emberhold troops in the vault. One Back to title. **V1.2.2** |

## Session: 2026-11-03 — Second playtest pass (V1.4.0)

**Trigger:** Four-player table: dyslexia spacing, skip the order demo, rename The March, lava hiding tiles, order banner repeating, missing marker sphere, shrine with no burst, hour-long leftover local matches, disconnects.

**Environment:** Local `node scripts/local.js`. Tutorial from title.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 38 | [2026-11-03-15-tutorial-order-letter-spacing-desktop.png](./screenshots/2026-11-03-15-tutorial-order-letter-spacing-desktop.png) | Who rides first | Wider letter-spacing on the lesson body. Next stays on during the order rolls |
| 39 | [2026-11-03-16-tutorial-shrine-burst-desktop.png](./screenshots/2026-11-03-16-tutorial-shrine-burst-desktop.png) | Shrines | Grey star tiles. White burst on land (same family as barricade sparks) |
| 40 | [2026-11-03-17-tutorial-world-events-desktop.png](./screenshots/2026-11-03-17-tutorial-world-events-desktop.png) | World events | Title renamed from The March. Tide / Heartfire / Wild / Seal / Mist / Stones cycle, Next stays on. **V1.4.0** |

## Session: 2026-11-03 — User test round 3 (no new screens)

**Trigger:** One other person, 1v1, on **V1.4.0**. Laptop and a Quest. The VR button never appeared, so the headset seat was the Quest browser. Notes live in the [development log, Phase 4](../case-study-development-log.md#phase-4--user-test-round-3-3-nov-2026). No screens captured during the session.

What failed in play: the tutorial dice beat reads as moving pieces, the banner overlaps the troops, the connection dropped three times, online dot markers are still missing, the dice miss the volcano, and the trigger both clicks and orbits. Comments, left as comments: mist created uncertainty and the other events felt cosmetic; sun beams were the least preferred. They also suggested slower world-event triggers (mid-board, every other round, a shrine, a double 6).

## Session: 2026-11-03 — Play in the room (V1.4.1)

**Trigger:** Round 3, on a Quest. The VR control never appeared, so they played the flat page in the headset browser, and the trigger both clicked and turned the board.

**Environment:** Local `python3 -m http.server 8765`. The control stays hidden until the browser reports a headset session. These shots forced a Quest Browser identity so the control could be framed. A real passthrough session was not available. **V1.4.2** no longer shows it from the browser name alone.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 41 | [2026-11-03-18-title-play-in-the-room-desktop.png](./screenshots/2026-11-03-18-title-play-in-the-room-desktop.png) | Title | Play in the room sits with the other ways in. **V1.4.1** |
| 42 | [2026-11-03-19-room-button-on-board-desktop.png](./screenshots/2026-11-03-19-room-button-on-board-desktop.png) | In match | The same control stays on the board, under the menu, so a match does not bury it |

## Session: 2026-11-03 — Your troops, and the volcano (V1.4.3)

**Trigger:** Round 3, overall. The dots above the pieces were still missing online, and the dice passed through the volcano.

**Environment:** Local `python3 -m http.server 8765`. The dot shot is Solmere’s turn. The volcano shot is a throw whose faces were already chosen, the same path an online roll uses, once Heartfire is up.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 43 | [2026-11-03-21-piece-dots-desktop.png](./screenshots/2026-11-03-21-piece-dots-desktop.png) | Your turn | A gold dot above each Solmere troop. The other kingdoms stay unmarked |
| 44 | [2026-11-03-22-dice-volcano-desktop.png](./screenshots/2026-11-03-22-dice-volcano-desktop.png) | Heartfire | The dice meet the cone and finish on the road, on the faces the roll already drew |

## Session: 2026-11-04 — User test round 4 (no new screens)

**Trigger:** Round 4 on **V1.4.4**, with a teacher sitting in. Notes live in the [development log, Phase 5](../case-study-development-log.md#phase-5--user-test-round-4-4-nov-2026). No screens captured during the session.

What made play harder: the pieces look alike, world events and banners move too fast, the volcano is the hardest event to read, and the sun beams' scorch hides the road. After the tutorial, players asked what gets a troop out of the keep and how Geo was getting bonus moves. What landed: easy to get into, the sounds and the hop, and mist, sun beams and the Stones. Requests: second and third place, a color blind or high-contrast mode, and from the teacher, a grittier board in darker crimson.

## Session: 2026-11-05 — Mist only, and ranked play (V1.5.0)

**Trigger:** Round 4. Five of the six world events hid the road, the troops, or what to tap. The wheel and those five come out of play. The mist, the event players asked for, now arrives on its own after every third round and lifts after the next. Players also asked to keep playing for second and third.

**Environment:** Local `node scripts/local.js`. The mist and victory shots are an all-computer local match, with the round count and three kingdoms moved forward so the moments arrive sooner.

| # | File | Screen / component | Notes |
|---|------|-------------------|--------|
| 45 | [2026-11-05-01-play-local-ranked-toggle-desktop.png](./screenshots/2026-11-05-01-play-local-ranked-toggle-desktop.png) | Play local | Mist every third round replaces The March (world events). Ranked sits under it, off by default |
| 46 | [2026-11-05-02-mist-third-round-desktop.png](./screenshots/2026-11-05-02-mist-third-round-desktop.png) | Round 3 | The mist arrives with its banner and the side chip. No wheel opens first |
| 47 | [2026-11-05-03-ranked-victory-places-desktop.png](./screenshots/2026-11-05-03-ranked-victory-places-desktop.png) | Victory, ranked | One row per place, crest and name. The roster behind reads “2nd place” and “3rd place” |
| 48 | [2026-11-05-04-room-lobby-ranked-toggle-desktop.png](./screenshots/2026-11-05-04-room-lobby-ranked-toggle-desktop.png) | Room lobby, host | The same two toggles beside Private. The server keeps the ranked choice for the room |

### Still to capture (when WS / production available)

- [ ] Online **Create room** (room code + share strip)
- [x] **Kingdom banners** and the **seat list** — one lobby, shots 14 and 15. A live socket still needs a pass for two people joining at once
- [x] **Your turn** vs **waiting** (dice hidden) — mobile, evening session 02/03
- [x] **Toast** moment — order banner and Shields locked, shots 31 and 32
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
