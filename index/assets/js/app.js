import { getRoute, openUser } from './router.js';
import { renderHome, renderLoading, renderError, renderProfile } from './render.js';
import { getUserById, loadProfile, searchUserByName } from './api.js';
import { isUserId } from './utils.js';
import { cacheClearAll } from './cache.js';

const main = document.getElementById('main');

function bindHome() {
  const form = document.getElementById('search-form');
  const status = document.getElementById('home-status');
  if (!form || !status) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const value = String(new FormData(form).get('user') || '').trim();
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
      if (!user?.id) throw new Error('해당 username을 찾지 못했습니다.');
      openUser(user.id);
    } catch (error) {
      status.textContent = `오류: ${error.message}`;
      status.classList.add('error');
    }
  });
}

function bindProfileActions() {
  const copyButton = document.querySelector('[data-copy-profile]');
  const refreshButton = document.querySelector('[data-refresh-profile]');

  copyButton?.addEventListener('click', async () => {
    const userId = copyButton.getAttribute('data-copy-profile');
    const url = `${window.location.origin}${window.location.pathname}?user=${encodeURIComponent(userId)}`;
    try {
      await navigator.clipboard.writeText(url);
      copyButton.textContent = 'COPIED ✓';
      setTimeout(() => { copyButton.textContent = 'COPY LINK'; }, 1400);
    } catch {
      copyButton.textContent = 'COPY FAILED';
      setTimeout(() => { copyButton.textContent = 'COPY LINK'; }, 1400);
    }
  });

  refreshButton?.addEventListener('click', async () => {
    cacheClearAll();
    refreshButton.disabled = true;
    const original = refreshButton.textContent;
    refreshButton.textContent = 'REFRESHING…';
    try {
      await renderCurrentRoute();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      // renderCurrentRoute replaces the button DOM, so this only applies if it survives.
      const nextButton = document.querySelector('[data-refresh-profile]');
      if (nextButton) nextButton.textContent = original || 'REFRESH';
    }
  });
}

async function renderCurrentRoute() {
  const route = getRoute();
  if (route.page === 'home') {
    main.innerHTML = renderHome();
    bindHome();
    return;
  }
  if (route.page !== 'profile') {
    main.innerHTML = renderError('지원하지 않는 주소입니다.');
    return;
  }

  const query = route.query.trim();
  main.innerHTML = renderLoading();

  try {
    let userId = query;
    if (!isUserId(query)) {
      const user = await searchUserByName(query);
      if (!user?.id) throw new Error(`"${query}" 사용자를 찾지 못했습니다.`);
      userId = user.id;
    }
    const profile = await loadProfile(userId);
    main.innerHTML = renderProfile(profile);
    bindProfileActions();
  } catch (error) {
    main.innerHTML = renderError(error.message || 'Roblox API 요청에 실패했습니다.');
  }
}

window.addEventListener('hashchange', renderCurrentRoute);
window.addEventListener('DOMContentLoaded', renderCurrentRoute);
