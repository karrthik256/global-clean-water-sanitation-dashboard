// state.js — shared filter state (topic / year / region) that drives every
// chart, per the proposal's "shared control bar" (section 3.6). Charts
// subscribe to be notified whenever any control changes.

const AppState = (() => {
  const state = {
    topic: "water", // "water" | "sanitation"
    year: 2024, // 2000-2024
    region: "All", // "All" | one of the region_sdg values
  };

  const listeners = [];

  function get() {
    return state;
  }

  function set(partial) {
    Object.assign(state, partial);
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.push(fn);
  }

  return { get, set, subscribe };
})();
