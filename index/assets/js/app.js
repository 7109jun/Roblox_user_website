
import { getRoute, openUser } from './router.js';

import {
  renderHome,
  renderLoading,
  renderError,
  renderProfile
} from './render.js';

import {
  getUserById,
  loadProfile,
  searchUserByName
} from './api.js';

import { isUserId } from './utils.js';
import { cacheClearAll } from './cache.js';

const main = document.getElementById('main');

/**
 * 홈 화면의 검색 폼을 연결합니다.
 */
function bindHome() {
  const form = document.getElementById('search-form');
  const status = document.getElementById('home-status');

  if (!form || !status) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const value = String(
      new FormData(form).get('user') || ''
    ).trim();

    if (!value) return;

    status.textContent = '사용자를 찾는 중…';
    status.classList.remove('error');

    try {
      if (isUserId(value)) {
        await getUserById(value);
        openUser(value);
        return;
      }

      const user = await searchUserByName(value);

      if (!user?.id) {
        throw new Error('해당 username을 찾지 못했습니다.');
      }

      openUser(user.id);
    } catch (error) {
      status.textContent = `오류: ${error.message}`;
      status.classList.add('error');
    }
  });
}

/**
 * SEARCH 링크의 동작을 처리합니다.
 *
 * 홈 화면:
 *   현재 주소를 다시 로드하지 않고 검색창에 포커스
 *
 * 프로필 화면:
 *   홈 화면으로 이동
 *
 * 오류 화면:
 *   홈 화면으로 이동
 */
function bindSearchNavigation() {
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href="#/"]');

    if (!link) return;

    // Roblox 공식 사이트 등 외부 링크는 처리하지 않습니다.
    if (link.origin !== window.location.origin) return;

    const route = getRoute();

    if (route.page === 'home') {
      event.preventDefault();

      const searchInput = document.querySelector(
        '#search-form input[name="user"]'
      );

      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }

      return;
    }

    // 프로필 또는 오류 화면에서 홈으로 이동합니다.
    event.preventDefault();

    if (window.location.hash === '#/') {
      renderCurrentRoute();
    } else {
      window.location.hash = '/';
    }
  });
}

/**
 * 프로필 화면의 버튼을 연결합니다.
 */
function bindProfileActions() {
  const copyButton = document.querySelector(
    '[data-copy-profile]'
  );

  const refreshButton = document.querySelector(
    '[data-refresh-profile]'
  );

  copyButton?.addEventListener('click', async () => {
    const userId = copyButton.getAttribute(
      'data-copy-profile'
    );

    const url =
      `${window.location.origin}${window.location.pathname}` +
      `#/u/${encodeURIComponent(userId)}`;

    try {
      await navigator.clipboard.writeText(url);

      copyButton.textContent = 'COPIED ✓';

      setTimeout(() => {
        copyButton.textContent = 'COPY LINK';
      }, 1400);
    } catch {
      copyButton.textContent = 'COPY FAILED';

      setTimeout(() => {
        copyButton.textContent = 'COPY LINK';
      }, 1400);
    }
  });

  refreshButton?.addEventListener('click', async () => {
    cacheClearAll();

    refreshButton.disabled = true;

    const original = refreshButton.textContent;
    refreshButton.textContent = 'REFRESHING…';

    try {
      await renderCurrentRoute();

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } finally {
      const nextButton = document.querySelector(
        '[data-refresh-profile]'
      );

      if (nextButton) {
        nextButton.textContent = original || 'REFRESH';
        nextButton.disabled = false;
      }
    }
  });
}

/**
 * 현재 URL에 맞는 화면을 렌더링합니다.
 */
async function renderCurrentRoute() {
  const route = getRoute();

  if (route.page === 'home') {
    main.innerHTML = renderHome();
    bindHome();
    return;
  }

  if (route.page !== 'profile') {
    main.innerHTML = renderError(
      '지원하지 않는 주소입니다.'
    );
    return;
  }

  const query = route.query.trim();

  main.innerHTML = renderLoading();

  try {
    let userId = query;

    if (!isUserId(query)) {
      const user = await searchUserByName(query);

      if (!user?.id) {
        throw new Error(
          `"${query}" 사용자를 찾지 못했습니다.`
        );
      }

      userId = user.id;
    }

    const profile = await loadProfile(userId);

    main.innerHTML = renderProfile(profile);

    bindProfileActions();
  } catch (error) {
    main.innerHTML = renderError(
      error.message || 'Roblox API 요청에 실패했습니다.'
    );
  }
}

/**
 * 앱 초기화
 */
function initializeApp() {
  bindSearchNavigation();
  renderCurrentRoute();
}

window.addEventListener(
  'hashchange',
  renderCurrentRoute
);

if (document.readyState === 'loading') {
  window.addEventListener(
    'DOMContentLoaded',
    initializeApp,
    { once: true }
  );
} else {
  initializeApp();
}
