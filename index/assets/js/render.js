import { CONFIG } from './config.js';
import { escapeHtml, formatId, safeUrl } from './utils.js';

function imageOrFallback(url, alt, className = 'data-image') {
  if (!url) return `<div class="${className}" aria-hidden="true"></div>`;
  return `<img class="${className}" src="${escapeHtml(safeUrl(url))}" alt="${escapeHtml(alt)}" loading="lazy" referrerpolicy="no-referrer">`;
}

function section(title, count, body, id) {
  return `<section id="${escapeHtml(id)}" class="profile-card section-shell"><div class="section-heading"><h2>${escapeHtml(title)}</h2><p>${count} / ${CONFIG.MAX_ITEMS} MAX</p></div><div class="section-rule"></div>${body}</section>`;
}

function empty(message) { return `<div class="empty-state">${escapeHtml(message)}</div>`; }

export function renderHome(status = '') {
  document.title = 'Roblox User Website';
  return `
    <section class="hero-card home-card">
      <div class="hero-layout">
        <div class="hero-copy">
          <span class="eyebrow">PUBLIC ROBLOX PROFILE</span>
          <h1>한 명의 Roblox 유저, 하나의 프로필.</h1>
          <p class="hero-text">username 또는 숫자 User ID를 입력하면 Roblox의 공개 데이터를 이용해 프로필을 만들어 보여줍니다. 3D 모델은 사용하지 않고 PNG 썸네일만 사용합니다.</p>
          <form id="search-form" class="search-form" autocomplete="off">
            <label class="sr-only" for="user-query">Roblox username 또는 User ID</label>
            <div class="search-wrap">
              <span class="search-prefix">ROBLOX /</span>
              <input id="user-query" name="user" type="text" inputmode="text" maxlength="64" placeholder="예: Roblox 또는 1" required>
            </div>
            <button type="submit">PROFILE OPEN ↗</button>
          </form>
          <div id="home-status" class="status-line" role="status" aria-live="polite">${escapeHtml(status)}</div>
        </div>
        <div class="hero-stage" aria-hidden="true">
          <div class="hero-avatar-frame">
            <div class="avatar-silhouette"></div>
          </div>
          <div class="hero-stage-label">PNG AVATAR • LIVE API</div>
        </div>
      </div>
    </section>
    <section class="feature-grid" aria-label="Features">
      <article class="feature-card"><span>01 / PROFILE</span><h2>Identity</h2><p>닉네임, username, 숫자 ID, 설명글, 인증 상태를 보여줍니다.</p></article>
      <article class="feature-card"><span>02 / AVATAR</span><h2>Avatar</h2><p>전신 PNG와 현재 착용 중인 아이템을 카드 형태로 정리합니다.</p></article>
      <article class="feature-card"><span>03 / SOCIAL</span><h2>Friends & Badges</h2><p>친구와 Roblox 배지를 각각 최대 99개까지 표시합니다.</p></article>
      <article class="feature-card"><span>04 / GAMES</span><h2>Games</h2><p>즐겨찾기/생성 게임은 스크립트 없이 이름과 썸네일만 사용합니다.</p></article>
    </section>
    <p class="source-note">Roblox 공개 API 응답을 브라우저에서 렌더링합니다. API/CORS 상태에 따라 특정 섹션이 비어 있을 수 있습니다.</p>
  `;
}

function friendCards(friends, headshots) {
  if (!friends.length) return empty('친구 데이터가 없거나 현재 공개 API에서 제공되지 않았습니다.');
  return `<div class="data-grid">${friends.map(friend => {
    const image = headshots.get(Number(friend.id));
    return `<a class="data-card data-link friend-card" href="#/u/${encodeURIComponent(friend.id)}">
      ${imageOrFallback(image, friend.displayName || friend.name || 'Friend')}
      <div class="data-body"><p class="data-title">${escapeHtml(friend.displayName || friend.name || 'Unknown')}</p><p class="data-subtitle">@${escapeHtml(friend.name || String(friend.id))}</p></div>
    </a>`;
  }).join('')}</div>`;
}

function badgeCards(badges, badgeIcons) {
  if (!badges.length) return empty('Roblox 배지가 없습니다.');
  return `<div class="data-grid">${badges.map(badge => {
    const image = badgeIcons.get(Number(badge.id)) || badge.imageUrl;
    return `<article class="data-card">
      ${imageOrFallback(image, badge.name || 'Badge')}
      <div class="data-body"><p class="data-title">${escapeHtml(badge.name || `Badge #${badge.id}`)}</p><p class="data-subtitle">${escapeHtml(badge.description || 'Roblox badge')}</p></div>
    </article>`;
  }).join('')}</div>`;
}

function itemCards(items, thumbnails) {
  if (!items.length) return empty('즐겨찾기 아이템 데이터가 없거나 현재 API에서 조회할 수 없습니다.');
  return `<div class="data-grid">${items.map(item => {
    const image = thumbnails.get(Number(item.id));
    const href = item.id ? `https://www.roblox.com/catalog/${encodeURIComponent(item.id)}` : '#';
    return `<a class="data-card data-link" href="${escapeHtml(safeUrl(href))}" target="_blank" rel="noreferrer">
      ${imageOrFallback(image, item.name || 'Asset')}
      <div class="data-body"><p class="data-title">${escapeHtml(item.name || `Asset #${item.id}`)}</p><p class="data-subtitle">ASSET ${escapeHtml(item.id)}</p></div>
    </a>`;
  }).join('')}</div>`;
}

function gameCards(games, gameIcons) {
  if (!games.length) return empty('게임 데이터가 없습니다.');
  return `<div class="data-grid">${games.map(game => {
    const image = gameIcons.get(Number(game.id));
    const placeId = game.rootPlaceId || game.placeId;
    const href = placeId ? `https://www.roblox.com/games/${encodeURIComponent(placeId)}` : `https://www.roblox.com/games/?Keyword=${encodeURIComponent(game.name || '')}`;
    return `<a class="data-card data-link" href="${escapeHtml(safeUrl(href))}" target="_blank" rel="noreferrer">
      ${imageOrFallback(image, game.name || 'Game', 'data-image data-image--game')}
      <div class="data-body"><p class="data-title">${escapeHtml(game.name || 'Unnamed game')}</p></div>
    </a>`;
  }).join('')}</div>`;
}

function wearableCards(items, thumbnails) {
  if (!items.length) return empty('현재 착용 중인 아이템을 가져오지 못했습니다.');
  return `<div class="data-grid">${items.map(item => {
    const id = item.id;
    const href = `https://www.roblox.com/catalog/${encodeURIComponent(id)}`;
    const image = thumbnails.get(Number(id));
    return `<a class="data-card data-link" href="${escapeHtml(safeUrl(href))}" target="_blank" rel="noreferrer">
      ${imageOrFallback(image, item.name || 'Avatar item')}
      <div class="data-body"><p class="data-title">${escapeHtml(item.name || `Asset #${id}`)}</p><p class="data-subtitle">${escapeHtml(item.assetType?.name || item.itemType || 'AVATAR ITEM')}</p></div>
    </a>`;
  }).join('')}</div>`;
}

function placeCards(places, placeIcons) {
  if (!places.length) return empty('Place 데이터가 없습니다.');
  return `<div class="data-grid">${places.map(place => {
    const id = place.placeId ?? place.id;
    const image = placeIcons.get(Number(id));
    const href = id ? `https://www.roblox.com/games/${encodeURIComponent(id)}` : '#';
    return `<a class="data-card data-link" href="${escapeHtml(safeUrl(href))}" target="_blank" rel="noreferrer">
      ${imageOrFallback(image, place.name || 'Place', 'data-image data-image--game')}
      <div class="data-body"><p class="data-title">${escapeHtml(place.name || `Place #${id}`)}</p><p class="data-subtitle">PLACE ${escapeHtml(id)}</p></div>
    </a>`;
  }).join('')}</div>`;
}

function profileNav() {
  const items = [
    ['overview', 'OVERVIEW'], ['avatar', 'AVATAR'], ['friends', 'FRIENDS'], ['badges', 'BADGES'],
    ['favorite-games', 'FAVORITES'], ['favorite-items', 'ITEMS'], ['created-games', 'CREATED'], ['places', 'PLACES']
  ];
  return `<nav class="profile-nav" aria-label="프로필 섹션 바로가기">${items.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav>`;
}

export function renderProfile(profile) {
  const user = profile.user;
  if (!user) throw new Error('사용자 정보를 찾지 못했습니다.');
  const displayName = user.displayName || user.name || 'Unknown';
  const verified = user.hasVerifiedBadge ? '<span class="inline-badge">VERIFIED</span>' : '';
  const description = user.description || '설명글이 없습니다.';
  const created = user.created ? new Date(user.created).toLocaleDateString('ko-KR') : '—';

  document.title = `${displayName} — Roblox User Website`;

  const hero = `<section id="overview" class="profile-card profile-hero-card section-shell">
    <div class="profile-banner">
      <div class="banner-topline"><span class="banner-chip">ROBLOX USER</span><span class="banner-id">LIVE PUBLIC DATA</span></div>
    </div>
    <div class="profile-main">
      <div class="avatar-wrap">${profile.avatarUrl ? imageOrFallback(profile.avatarUrl, `${displayName} avatar`, 'avatar-image') : '<div class="avatar-fallback">Avatar PNG을 불러오지 못했습니다.</div>'}</div>
      <div>
        <div class="profile-kicker">PROFILE</div>
        <h1 class="profile-name">${escapeHtml(displayName)} ${verified}</h1>
        <div class="profile-username">@${escapeHtml(user.name || '')}</div>
        <div class="profile-id">USER ID · ${escapeHtml(formatId(user.id))} · JOINED ${escapeHtml(created)}</div>
        <p class="description">${escapeHtml(description)}</p>
      </div>
      <div class="profile-actions">
        <a class="action-button" href="https://www.roblox.com/users/${encodeURIComponent(user.id)}/profile" target="_blank" rel="noreferrer">ROBLOX PROFILE ↗</a>
        <button class="action-button" type="button" data-copy-profile="${escapeHtml(user.id)}">COPY LINK</button>
        <button class="action-button" type="button" data-refresh-profile="true">REFRESH</button>
        <a class="action-button" href="#/">SEARCH</a>
      </div>
    </div>
  </section>`;

  const stats = `<section class="profile-card" aria-label="Profile statistics"><div class="stats-row">
    <div class="stat"><strong>${profile.friends.length}</strong><span>FRIENDS SHOWN</span></div>
    <div class="stat"><strong>${profile.badges.length}</strong><span>BADGES SHOWN</span></div>
    <div class="stat"><strong>${profile.favoriteGames.length}</strong><span>FAVORITE GAMES</span></div>
    <div class="stat"><strong>${profile.createdGames.length}</strong><span>CREATED GAMES</span></div>
  </div></section>`;

  const avatarItems = section('착용 중인 아이템', profile.wearableAssets.length, wearableCards(profile.wearableAssets, profile.wearableThumbnails), 'avatar');
  const friends = section('Friends', profile.friends.length, friendCards(profile.friends, profile.friendHeadshots), 'friends');
  const badges = section('Roblox Badges', profile.badges.length, badgeCards(profile.badges, profile.badgeIcons), 'badges');
  const favoriteGames = section('Favorite Games', profile.favoriteGames.length, gameCards(profile.favoriteGames, profile.gameIcons), 'favorite-games');
  const favoriteAssets = section('Favorite Items', profile.favoriteAssets.length, itemCards(profile.favoriteAssets, profile.assetThumbnails), 'favorite-items');
  const createdGames = section('Created Games', profile.createdGames.length, gameCards(profile.createdGames, profile.gameIcons), 'created-games');
  const places = section('Places', profile.places.length, placeCards(profile.places, profile.placeIcons), 'places');

  return `<div class="profile-page">${hero}${profileNav()}${stats}${avatarItems}${friends}${badges}${favoriteGames}${favoriteAssets}${createdGames}${places}
    <section class="profile-card"><div class="profile-footnote"><span>MAX ${CONFIG.MAX_ITEMS} ITEMS PER SECTION</span><span>GAMES USE NAME + THUMBNAIL ONLY</span><span>NO 3D MODEL DATA</span></div></section>
  </div>`;
}

export function renderLoading() {
  document.title = 'Loading — Roblox User Website';
  return `<div class="profile-page">
    <section class="profile-card"><div class="loading-grid"><div class="loading-line short"></div><div class="loading-line wide"></div><div class="loading-line mid"></div><div class="loading-line wide"></div></div></section>
    <section class="profile-card"><div class="loading-grid"><div class="loading-line mid"></div><div class="loading-line wide"></div><div class="loading-line wide"></div><div class="loading-line short"></div></div></section>
    <section class="profile-card"><div class="loading-grid"><div class="loading-line wide"></div><div class="loading-line wide"></div><div class="loading-line mid"></div></div></section>
  </div>`;
}

export function renderError(message) {
  document.title = 'Profile Error — Roblox User Website';
  return `<section class="error-card profile-card"><span class="eyebrow">PROFILE ERROR</span><h1>프로필을 열 수 없습니다.</h1><p class="hero-text">${escapeHtml(message)}</p><p style="margin-top:18px"><a class="action-button" href="#/">홈으로 돌아가기</a></p></section>`;
}
