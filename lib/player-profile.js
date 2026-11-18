/* Display name for online rooms. Persisted in localStorage; connection id stays in sessionStorage. */
(function (root) {
  'use strict';

  const KEY = 'corhaven-profile';
  const NAME_MAX = 16;

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function write(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function normalize(raw) {
    return String(raw || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, NAME_MAX);
  }

  function getUsername() {
    const p = read();
    const name = p && p.username ? normalize(p.username) : '';
    return name;
  }

  function setUsername(raw) {
    const name = normalize(raw);
    if (!name) return { ok: false, code: 'name-empty' };
    write({ username: name });
    return { ok: true, username: name };
  }

  function hasUsername() {
    return !!getUsername();
  }

  root.CorhavenProfile = {
    KEY,
    NAME_MAX,
    getUsername,
    setUsername,
    hasUsername,
    normalize,
  };
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : self);