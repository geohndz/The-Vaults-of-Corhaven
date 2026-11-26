/* Game mode catalog for navigation and room setup. Shared labels; rules live in lib/rules.js + server/game.js. */
(function (root) {
  'use strict';

  const GAME_MODES = [
    {
      id: 'normal',
      label: 'Crucible',
      tagline: 'Full rules',
      desc: 'Race all four troops to your vault. Mist hides enemy troops every third round, and shrines give you Fate Cards.',
      available: true,
      worlds: true,
      ranked: false,
      fate: true,
    },
    {
      id: 'gauntlet',
      label: 'Gauntlet',
      tagline: 'Ranked',
      desc: 'Crucible rules, but the match continues after the first player finishes. Everyone keeps playing for second and third place.',
      available: true,
      worlds: true,
      ranked: true,
      fate: true,
    },
    {
      id: 'conquest',
      label: 'Conquest',
      tagline: 'Elimination',
      desc: 'Capture enemy troops to add them to your army. A kingdom falls when it loses all four of its original troops. The last kingdom remaining wins. No vault, Mist, Fate Cards or phalanxes.',
      available: true,
      hidden: true, /* off the mode picker for now; matches still work online */
      worlds: false,
      ranked: false,
      fate: false,
    },
    {
      id: 'classic',
      label: 'Classic',
      tagline: 'Original rules',
      desc: 'No Mist and no Fate Cards. Just movement, captures, phalanxes, and the race to your vault.',
      available: true,
      worlds: false,
      ranked: false,
      fate: false,
    },
  ];

  const byId = (id) => GAME_MODES.find((m) => m.id === id) || GAME_MODES[0];

  function labelOf(id) {
    return byId(id).label;
  }

  function applyToRoomOpts(id) {
    const m = byId(id);
    if (!m.available) return null;
    return { mode: m.id, worlds: m.worlds, ranked: m.ranked };
  }

  function inferMode(room) {
    if (room && room.mode && byId(room.mode).id === room.mode) return room.mode;
    if (room && room.ranked) return 'gauntlet';
    return 'normal';
  }

  root.CorhavenGameModes = {
    MODES: GAME_MODES,
    DEFAULT_ID: 'normal',
    byId,
    labelOf,
    applyToRoomOpts,
    inferMode,
  };
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : self);
