/* Game mode catalog for navigation and room setup. Shared labels; rules live in lib/rules.js + server/game.js. */
(function (root) {
  'use strict';

  const GAME_MODES = [
    {
      id: 'normal',
      label: 'Normal',
      desc: 'Mist every third round. Fate Cards from shrine spaces. Standard rules.',
      available: true,
      worlds: true,
      ranked: false,
      fate: true,
    },
    {
      id: 'gauntlet',
      label: 'Gauntlet',
      desc: 'Competitive ranked play. Second and third place still matter.',
      available: true,
      worlds: true,
      ranked: true,
      fate: true,
    },
    {
      id: 'conquest',
      label: 'Conquest',
      desc: 'Capture enemy troops for your kingdom. Last realm standing wins.',
      available: false,
      worlds: true,
      ranked: false,
      fate: true,
    },
    {
      id: 'classic',
      label: 'Classic',
      desc: 'No Mist, no Fate Cards. Movement, capture, phalanx, and vault as usual.',
      available: false,
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