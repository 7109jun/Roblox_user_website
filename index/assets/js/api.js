import { CONFIG } from './config.js';
import { cacheGet, cacheSet } from './cache.js';
import { buildQuery, chunk, clampItems, uniqueById } from './utils.js';

const CORS_PROXY_BASE = 'https://proxy.cors.dev/';

function proxify(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('잘못된 API URL입니다.');
  }
  return `${CORS_PROXY_BASE}${url}`;
}

async function request(url, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    if (method !== 'GET' && method !== 'HEAD') {
      throw new Error('현재 무계정 CORS 중계는 GET/HEAD 요청만 지원합니다.');
    }

    const response = await fetch(proxify(url), {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.text();
        if (body) detail = `: ${body.slice(0, 240)}`;
      } catch {
        // Ignore body parsing failure.
      }
      throw new Error(`HTTP ${response.status}${detail}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error('API가 JSON이 아닌 응답을 반환했습니다.');
      }
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Roblox API 응답 시간이 초과되었습니다.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function get(url, cacheKey = url) {
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;

  const data = await request(url);
  cacheSet(cacheKey, data);
  return data;
}

function avatarThumbnailUrl(userId) {
  return `${CONFIG.APIS.thumbnails}/v1/users/avatar?${buildQuery({
    userIds: userId,
    ...CONFIG.AVATAR_PNG
  })}`;
}

function headshotThumbnailUrl(userIds) {
  return `${CONFIG.APIS.thumbnails}/v1/users/avatar-headshot?${buildQuery({
    userIds: userIds.join(','),
    size: '150x150',
    format: 'Png',
    isCircular: 'false'
  })}`;
}

function gameThumbnailUrl(universeIds) {
  return `${CONFIG.APIS.thumbnails}/v1/games/multiget/thumbnails?${buildQuery({
    universeIds: universeIds.join(','),
    size: '768x432',
    format: 'Png',
    isCircular: 'false'
  })}`;
}

function placeIconUrl(placeIds) {
  return `${CONFIG.APIS.thumbnails}/v1/places/gameicons?${buildQuery({
    placeIds: placeIds.join(','),
    size: '512x512',
    format: 'Png',
    isCircular: 'false'
  })}`;
}

function assetThumbnailUrl(assetIds) {
  return `${CONFIG.APIS.thumbnails}/v1/assets?${buildQuery({
    assetIds: assetIds.join(','),
    size: '420x420',
    format: 'Png',
    isCircular: 'false'
  })}`;
}

function badgeIconUrl(badgeIds) {
  return `${CONFIG.APIS.thumbnails}/v1/badges/icons?${buildQuery({
    badgeIds: badgeIds.join(','),
    size: '150x150',
    format: 'Png',
    isCircular: 'false'
  })}`;
}

async function fetchPaged(baseUrl, initialParams = {}, getId = item => item?.id, pageSizeParam = 'limit') {
  const all = [];
  let cursor;

  for (let page = 0; page < 8 && all.length < CONFIG.MAX_ITEMS; page += 1) {
    const params = {
      ...initialParams,
      [pageSizeParam]: Math.min(CONFIG.PAGE_SIZE, CONFIG.MAX_ITEMS - all.length),
      cursor
    };

    const data = await request(`${baseUrl}?${buildQuery(params)}`);
    const items = Array.isArray(data?.data) ? data.data : [];

    all.push(...items);
    cursor = data?.nextPageCursor ?? null;

    if (!cursor || items.length === 0) break;
  }

  return clampItems(uniqueById(all, getId));
}

export async function getUserById(userId) {
  return get(
    `${CONFIG.APIS.users}/v1/users/${encodeURIComponent(userId)}`,
    `user:${userId}`
  );
}

export async function searchUserByName(username) {
  const url = `${CONFIG.APIS.users}/v1/users/search?${buildQuery({
    keyword: username,
    limit: 10
  })}`;

  const data = await get(url, `user-search:${username.toLowerCase()}`);
  const users = Array.isArray(data?.data) ? data.data : [];

  return users.find(
    item => item?.name?.toLowerCase() === username.toLowerCase()
  ) ?? users[0] ?? null;
}

export async function getUserAvatar(userId) {
  const data = await get(
    avatarThumbnailUrl(userId),
    `avatar-png:${userId}`
  );

  return data?.data?.[0]?.imageUrl ?? null;
}

export async function getCurrentlyWearing(userId) {
  const data = await get(
    `${CONFIG.APIS.avatar}/v1/users/${encodeURIComponent(userId)}/currently-wearing`,
    `wearing:${userId}`
  );

  const ids = Array.isArray(data?.assetIds) ? data.assetIds : [];
  return clampItems(ids.map(Number).filter(Number.isFinite));
}

export async function getCatalogItemDetails(assetIds) {
  const ids = clampItems(
    [...new Set(assetIds.map(Number).filter(Number.isFinite))]
  );

  if (!ids.length) return [];

  const result = [];

  // The previous implementation used POST /v1/catalog/items/details.
  // This version uses Roblox's GET single-item details endpoint so that
  // the no-account GET-only CORS proxy can be used.
  for (const id of ids) {
    try {
      const url = `${CONFIG.APIS.catalog}/v1/catalog/items/${encodeURIComponent(id)}/details?itemType=asset`;
      const data = await get(url, `catalog-detail:${id}`);

      const item = data?.data ?? data;
      if (item && typeof item === 'object') {
        result.push({
          ...item,
          id: Number(item.id ?? item.assetId ?? id),
          name: item.name ?? item.Name ?? `Asset #${id}`
        });
      }
    } catch {
      // The UI can still show the asset ID when details are unavailable.
    }
  }

  return clampItems(uniqueById(result));
}

export async function getFriends(userId) {
  const data = await get(
    `${CONFIG.APIS.friends}/v1/users/${encodeURIComponent(userId)}/friends`,
    `friends:${userId}`
  );

  return clampItems(uniqueById(data?.data ?? []));
}

export async function getFriendHeadshots(friends) {
  const ids = clampItems(
    uniqueById(friends).map(item => item.id).filter(Boolean)
  ).map(Number);

  const map = new Map();

  for (const group of chunk(ids, 50)) {
    try {
      const data = await get(
        headshotThumbnailUrl(group),
        `friend-headshots:${group.join(',')}`
      );

      for (const item of data?.data ?? []) {
        if (item?.targetId && item?.imageUrl) {
          map.set(Number(item.targetId), item.imageUrl);
        }
      }
    } catch {
      // Keep cards usable.
    }
  }

  return map;
}

export async function getBadges(userId) {
  const data = await get(
    `${CONFIG.APIS.account}/v1/users/${encodeURIComponent(userId)}/roblox-badges`,
    `badges:${userId}`
  );

  const badges = Array.isArray(data) ? data : (data?.data ?? []);
  return clampItems(uniqueById(badges));
}

export async function getBadgeIcons(badges) {
  const ids = clampItems(
    uniqueById(badges).map(item => item.id).filter(Boolean)
  ).map(Number);

  const map = new Map();

  for (const group of chunk(ids, 50)) {
    try {
      const data = await get(
        badgeIconUrl(group),
        `badge-icons:${group.join(',')}`
      );

      for (const item of data?.data ?? []) {
        if (item?.targetId && item?.imageUrl) {
          map.set(Number(item.targetId), item.imageUrl);
        }
      }
    } catch {
      // Badge responses may already contain image URLs.
    }
  }

  return map;
}

export async function getFavoriteGames(userId) {
  return fetchPaged(
    `${CONFIG.APIS.games}/v2/users/${encodeURIComponent(userId)}/favorite/games`
  );
}

export async function getCreatedGames(userId) {
  return fetchPaged(
    `${CONFIG.APIS.games}/v2/users/${encodeURIComponent(userId)}/games`
  );
}

export async function getGameIcons(games) {
  const ids = clampItems(
    uniqueById(games).map(item => item.id).filter(Boolean)
  ).map(Number);

  const map = new Map();

  for (const group of chunk(ids, 50)) {
    try {
      const data = await get(
        gameThumbnailUrl(group),
        `game-thumbnails:${group.join(',')}`
      );

      for (const item of data?.data ?? []) {
        if (item?.targetId && item?.imageUrl) {
          map.set(Number(item.targetId), item.imageUrl);
        }
      }
    } catch {
      // Keep cards usable.
    }
  }

  return map;
}

function extractFavoriteAssetTypeIds(value) {
  const found = new Set();

  const visit = node => {
    if (!node || typeof node !== 'object') return;

    if (Number.isFinite(Number(node.assetTypeId))) {
      found.add(Number(node.assetTypeId));
    }

    if (Array.isArray(node)) {
      node.forEach(visit);
    } else {
      Object.values(node).forEach(visit);
    }
  };

  visit(value);
  return [...found];
}

export async function getFavoriteAssetTypeIds(userId) {
  try {
    const data = await get(
      `${CONFIG.APIS.inventory}/v1/users/${encodeURIComponent(userId)}/categories/favorites`,
      `favorite-categories:${userId}`
    );

    return extractFavoriteAssetTypeIds(data);
  } catch {
    return [];
  }
}

export async function getFavoriteAssets(userId, assetTypeIds) {
  const results = [];

  for (const assetTypeId of assetTypeIds) {
    if (results.length >= CONFIG.MAX_ITEMS) break;

    try {
      const items = await fetchPaged(
        `${CONFIG.APIS.catalog}/v1/favorites/users/${encodeURIComponent(userId)}/favorites/${encodeURIComponent(assetTypeId)}/assets`
      );

      results.push(
        ...items.map(item => ({ ...item, assetTypeId }))
      );
    } catch {
      // Try the next favorite type.
    }
  }

  return clampItems(uniqueById(results));
}

export async function getAssetThumbnails(assets) {
  const ids = clampItems(
    uniqueById(assets).map(item => item.id).filter(Boolean)
  ).map(Number);

  const map = new Map();

  for (const group of chunk(ids, 50)) {
    try {
      const data = await get(
        assetThumbnailUrl(group),
        `asset-thumbnails:${group.join(',')}`
      );

      for (const item of data?.data ?? []) {
        if (item?.targetId && item?.imageUrl) {
          map.set(Number(item.targetId), item.imageUrl);
        }
      }
    } catch {
      // Keep cards usable.
    }
  }

  return map;
}

export async function getPlaces(userId) {
  const tabs = ['Created', 'MyGames', 'OtherGames'];
  const all = [];

  for (const placesTab of tabs) {
    if (all.length >= CONFIG.MAX_ITEMS) break;

    try {
      const items = await fetchPaged(
        `${CONFIG.APIS.inventory}/v1/users/${encodeURIComponent(userId)}/places/inventory`,
        { placesTab },
        item => item?.placeId ?? item?.id,
        'itemsPerPage'
      );

      all.push(
        ...items.map(item => ({ ...item, placesTab }))
      );
    } catch {
      // One tab failing should not hide the other place data.
    }
  }

  return clampItems(
    uniqueById(all, item => item?.placeId ?? item?.id)
  );
}

export async function getPlaceIcons(places) {
  const ids = clampItems(
    uniqueById(places, item => item?.placeId ?? item?.id)
      .map(item => item?.placeId ?? item?.id)
      .filter(Boolean)
  ).map(Number);

  const map = new Map();

  for (const group of chunk(ids, 50)) {
    try {
      const data = await get(
        placeIconUrl(group),
        `place-icons:${group.join(',')}`
      );

      for (const item of data?.data ?? []) {
        if (item?.targetId && item?.imageUrl) {
          map.set(Number(item.targetId), item.imageUrl);
        }
      }
    } catch {
      // Keep place cards usable.
    }
  }

  return map;
}

export async function loadProfile(userId) {
  const core = await Promise.allSettled([
    getUserById(userId),
    getUserAvatar(userId),
    getCurrentlyWearing(userId),
    getFriends(userId),
    getBadges(userId),
    getFavoriteGames(userId),
    getCreatedGames(userId),
    getFavoriteAssetTypeIds(userId),
    getPlaces(userId)
  ]);

  const value = (index, fallback) =>
    core[index].status === 'fulfilled' ? core[index].value : fallback;

  const profile = {
    user: value(0, null),
    avatarUrl: value(1, null),
    wearingIds: value(2, []),
    friends: value(3, []),
    badges: value(4, []),
    favoriteGames: value(5, []),
    createdGames: value(6, []),
    favoriteAssetTypeIds: value(7, []),
    places: value(8, [])
  };

  if (!profile.user) {
    throw new Error('사용자 정보를 가져오지 못했습니다.');
  }

  const [
    friendHeadshots,
    badgeIcons,
    gameIcons,
    favoriteAssets,
    placeIcons,
    wearableDetails
  ] = await Promise.all([
    getFriendHeadshots(profile.friends),
    getBadgeIcons(profile.badges),
    getGameIcons([...profile.favoriteGames, ...profile.createdGames]),
    getFavoriteAssets(userId, profile.favoriteAssetTypeIds),
    getPlaceIcons(profile.places),
    getCatalogItemDetails(profile.wearingIds)
  ]);

  const [assetThumbnails, wearableThumbnails] = await Promise.all([
    getAssetThumbnails(favoriteAssets),
    getAssetThumbnails(profile.wearingIds.map(id => ({ id })))
  ]);

  const wearableMap = new Map(
    wearableDetails.map(item => [Number(item.id), item])
  );

  const wearableAssets = profile.wearingIds.map(id => {
    const detail = wearableMap.get(Number(id));
    return detail ? detail : { id, name: `Asset #${id}` };
  });

  return {
    ...profile,
    friendHeadshots,
    badgeIcons,
    gameIcons,
    favoriteAssets,
    assetThumbnails,
    placeIcons,
    wearableAssets,
    wearableThumbnails
  };
}
