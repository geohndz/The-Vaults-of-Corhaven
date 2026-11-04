# Case study materials — The Vaults of Corhaven

| Document | Audience |
|----------|----------|
| [Executive summary (1 page)](../case-study-executive-summary.md) | Recruiters, hiring managers |
| [Development log](../case-study-development-log.md) | Full timeline, decisions, structure — **first live user test (3 Nov 2026, V1.1.6)** is Phase 3; **user test round 3 (V1.4.0, 1v1)** is Phase 4 |
| [Visual archive](./visual-archive.md) | Screenshot index by session |
| [Screenshots](./screenshots/) | PNG assets for Figma / portfolio |

**Live spec:** [style-guide.html](../../style-guide.html)

## Capture workflow

```bash
# From repo root
python3 -m http.server 8765
# Open http://127.0.0.1:8765/The%20Vaults%20of%20Corhaven.html
# After browser screenshots:
./scripts/sync-case-study-screenshots.sh
```

Online flows need the Vercel deployment (WebSocket + Redis), not static `http.server` alone.
