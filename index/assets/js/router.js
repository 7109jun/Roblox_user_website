function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getRoute() {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash && hash !== '/') {
    const parts = hash.split('/').filter(Boolean);
    if (parts[0] === 'u' && parts[1]) return { page: 'profile', query: safeDecode(parts.slice(1).join('/')) };
    return { page: 'not-found' };
  }

  const queryUser = new URLSearchParams(window.location.search).get('user');
  if (queryUser) return { page: 'profile', query: queryUser.trim() };
  return { page: 'home' };
}

export function openUser(value) {
  window.location.hash = `/u/${encodeURIComponent(String(value).trim())}`;
}
