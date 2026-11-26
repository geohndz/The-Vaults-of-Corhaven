# Terminology and writing style

Player-facing text in The Vaults of Corhaven uses plain board-game language. The art and setting are medieval fantasy; the words should make sense to someone who has never read the lore.

Repeated in-game messages (captures, shrines, phalanx, vault, third double, ties, time limit) live in the `COPY` table in `The Vaults of Corhaven.html`. Game modes live in `lib/game-modes.js`. Fate Card text and the Mist rule live in `lib/rules.js` (mirrored in `fate-cards.html`, which renders the card art).

## Terms

| Term | Meaning |
|---|---|
| Match | One game session. |
| Player | A person (or the computer) in a match. |
| Kingdom | The faction a player controls: Emberhold, Thornwald, Solmere, Tidereach. |
| Troop | One game piece. Each kingdom has four. |
| Keep | The castle area where troops start and return when captured. |
| Gate | The colored square next to each castle where troops enter the board. |
| Road | The 68-square loop troops move around, counterclockwise. |
| Passage | The seven squares in a kingdom's color that lead from the road to its vault. |
| Vault | The destination. Get all four troops in to win. |
| Square | One space on the board. |
| Move | Moving a troop by a die's value. Never "march". |
| Bonus move | The extra 20 squares earned by a capture or by reaching the vault. |
| Capture | Landing exactly on a single enemy troop, which goes back to its keep. Never "strike" or "fall". |
| Shrine | A grey square with the shrine mark. Troops there can't be captured. Landing on one deals Fate Cards. |
| Phalanx | Two troops of the same kingdom on one square. No troop can pass through or land on it. Never "barricade". |
| Third double | Rolling doubles three times in a row: the turn ends and the furthest troop goes back to the keep. Never "greed". |
| Fate Card | A card kept from a shrine. Categories: Blessing, Tactical, Curse. Hand limit is two. |
| Mist | Every third round, enemy troops on the road are hidden unless next to one of yours. Clears after one round. |
| Host | The player who created an online room. |

## Style

- Say what happens, when, and what the player does next.
- Short sentences, familiar words. Buttons are short verbs: Start match, Create room, Join, Close.
- Keep names: Corhaven, the four kingdoms, Mist, Fate Cards, card titles, mode names.
- Lore belongs in About. It can add flavor elsewhere, but never replaces the explanation.
- No archaic English, and avoid exclamation marks.
- Don't describe features that don't exist (there is no persistent ranking yet; Gauntlet only tracks placements in a match).
