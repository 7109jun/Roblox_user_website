import { CONFIG } from './config.js';

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function isUserId(value) {
  return /^\d{1,20}$/.test(String(value).trim());
}

export function clampItems(items, limit = CONFIG.MAX_ITEMS) {
  return Array.isArray(items) ? items.slice(0, limit) : [];
}

export function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

export async function withConcurrency(items, worker, concurrency = 4) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      try { results[index] = await worker(items[index], index); }
      catch { results[index] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner));
  return results;
}

export function formatId(id) {
  return new Intl.NumberFormat('en-US').format(Number(id));
}

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

export function buildQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  return query.toString();
}

export function uniqueById(items, getId = item => item?.id) {
  const seen = new Set();
  return items.filter(item => {
    const id = getId(item);
    if (id === undefined || id === null || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
