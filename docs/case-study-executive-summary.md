# The Vaults of Corhaven — Executive summary (recruiters)

**Geo Hernandez** · Product design & front-end development · Oct 2026  
**One-liner:** A browser-first 3D board game with medieval narrative UI, local + online multiplayer, and optional Quest passthrough—designed and shipped as a single cohesive product surface.

---

## What it is

Four kingdoms race through the **Sundered March** to reach Corhaven’s vault first. Custom rules (two dice, phalanxes, shrines, hidden passages, doubles penalty) sit on a familiar race-to-home loop, wrapped in **content-driven UI**: chronicle, rules, kingdom identity, and turn copy written as fantasy prose—not generic game chrome.

---

## What I did

- **Product & UX:** Entry flows (title → local / online / lore), lobby ritual (room code → name → kingdom banners → wait), in-match hierarchy (you vs others vs board), role-based controls (dice only on your turn), high-signal toasts vs noise.
- **Visual design:** Leather–gold–parchment system; Pirata One + Alegreya; crest as avatar at every scale; day/night sky without re-skinning HUD.
- **Design ops:** Living **interface inventory** (`style-guide.html`) with assembled screens and every string—spec and portfolio artifact in one.
- **Build:** Shipped as one HTML canvas app (~2.6k lines) on Vercel; online rooms with authoritative server, 20s turn clock, forfeits; WebXR passthrough for Quest without a separate SKU.
- **Process:** Iteration paired with Cursor (co-authored commits); automated tests for multiplayer rules and timers.

---

## Highlights for interview depth

| Topic | Design choice |
|--------|----------------|
| **Multiplayer fairness** | Server-authoritative moves; turn timer starts *after* move animations (`eventMs`) so latency doesn’t eat player time. |
| **Mobile** | `100dvh` + safe areas; menu collapse; larger touch targets; board framed to visible viewport. |
| **Identity moment** | Online kingdom pick uses **banner artifacts** (grayscale → color, owner label)—not a color swatch grid. |
| **Attention** | Oct 27 pass: hide dice/roll when waiting; roster for opponents; frameless “me” card with timer ring. |
| **Immersion** | Modals don’t dismiss on backdrop tap—rules and chronicle are intentional reading sessions. |

---

## Stack (short)

Three.js + Cannon (board/dice) · WebSocket + Redis (rooms) · Shared `lib/rules.js` (client + server) · Node tests · Vercel static + serverless WS.

---

## Artifacts

| Link | Use in portfolio |
|------|------------------|
| [Development log](./case-study-development-log.md) | Timeline, decisions, before/after |
| [Visual archive](./case-study/visual-archive.md) | Screenshots by session |
| [Interface inventory](../style-guide.html) | Components & copy |
| [Play locally](../The%20Vaults%20of%20Corhaven.html) | Live product |

---

## Honest scope note

Git history in **v3** starts at **public launch** (Oct 5, 2026) with the full game already present; Oct 26–27 commits show the **online + mobile** pivot. Pre-launch exploration lives outside this repo—see development log Appendix B.

---

*~1 page · expand with visuals from `docs/case-study/screenshots/` and your deployment URL.*
