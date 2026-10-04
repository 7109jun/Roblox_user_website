import { CONFIG } from './config.js';

const PREFIX = 'ruw:v1:';

function now() {
  return Date.now();
}

export function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.expiresAt < now()) {
      sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function cacheSet(key, value, ttl = CONFIG.CACHE_TTL_MS) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ value, expiresAt: now() + ttl }));
  } catch {
    // Storage can be disabled or full; the app still works without it.
  }
}


export function cacheClearAll() {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Storage can be disabled; nothing to clear.
  }
}
