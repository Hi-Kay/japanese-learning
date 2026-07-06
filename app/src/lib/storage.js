const mem = {};

export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return mem[key] ?? null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      mem[key] = value;
    }
  },
  getJSON(key, fallback) {
    const raw = storage.get(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  setJSON(key, value) {
    storage.set(key, JSON.stringify(value));
  },
};
