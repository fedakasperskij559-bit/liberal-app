const STORAGE_KEY = 'liberal_api_key';

const $ = (id) => document.getElementById(id);

function setStatus(text, type = 'muted') {
  const el = $('authStatus');
  el.textContent = text;
  el.className = `status ${type}`;
}

function prettify(data) {
  return JSON.stringify(data, null, 2);
}

function getToken() {
  return sessionStorage.getItem(STORAGE_KEY) || '';
}

function saveToken(token) {
  sessionStorage.setItem(STORAGE_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(STORAGE_KEY);
}

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = { ok: false, error: 'Сервер вернул не JSON.' };
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || 'Ошибка запроса.');
  }

  return data;
}

function fillProfile(user) {
  $('userId').textContent = user.id ?? '—';
  $('username').textContent = user.username ? '@' + String(user.username).replace(/^@/, '') : '—';
  $('balance').textContent = typeof user.balance_rub === 'number' || typeof user.balance === 'number'
    ? `${user.balance_rub ?? user.balance} ₽`
    : '—';
}

async function loginWithToken(token) {
  setStatus('Проверяем API ключ…');
  const data = await postJSON('/api/auth/login', { apiKey: token });
  saveToken(token);
  $('loginCard').classList.add('hidden');
  $('dashboard').classList.remove('hidden');
  fillProfile(data.user);
  setStatus('Вход выполнен.', 'success');
  await loadStarsRate().catch(() => {});
}

async function refreshBalance() {
  const token = getToken();
  const data = await postJSON('/api/client/balance', { token });
  fillProfile({
    id: data.user_id,
    username: data.username,
    balance_rub: data.balance_rub
  });
}

async function loadStarsRate() {
  const token = getToken();
  const data = await postJSON('/api/client/stars/rate', { token });
  $('starPrice').textContent = `${data.price_per_star_rub} ₽`;
  $('starMin').textContent = data.min_quantity;
  $('starMax').textContent = data.max_quantity;
  $('starsEnabled').textContent = data.stars_enabled ? 'Включено' : 'Выключено';
}

async function checkUsername() {
  const token = getToken();
  const username = $('checkUsername').value.trim();
  const type = $('checkType').value;
  const months = $('checkMonths').value;
  const data = await postJSON('/api/client/username/check', { token, username, type, months });
  $('checkResult').textContent = prettify(data);
}

async function buyStars() {
  const token = getToken();
  const username = $('starsUsername').value.trim();
  const quantity = Number($('starsQuantity').value);
  const data = await postJSON('/api/orders/stars', { token, username, quantity });
  $('starsResult').textContent = prettify(data);
  await refreshBalance().catch(() => {});
}

async function buyPremium() {
  const token = getToken();
  const username = $('premiumUsername').value.trim();
  const months = Number($('premiumMonths').value);
  const data = await postJSON('/api/orders/premium', { token, username, months });
  $('premiumResult').textContent = prettify(data);
  await refreshBalance().catch(() => {});
}

async function getOrderInfo() {
  const token = getToken();
  const orderId = Number($('orderId').value);
  const data = await postJSON('/api/orders/info', { token, orderId });
  $('orderResult').textContent = prettify(data);
}

async function loadCollections() {
  const token = getToken();
  const data = await postJSON('/api/nft/collections', { token });
  $('collectionsResult').textContent = prettify(data);
}

function logout() {
  clearToken();
  $('dashboard').classList.add('hidden');
  $('loginCard').classList.remove('hidden');
  $('apiKey').value = '';
  setStatus('Вы вышли из аккаунта.');
}

function bind() {
  $('loginBtn').addEventListener('click', async () => {
    try {
      const token = $('apiKey').value.trim();
      if (!token) return setStatus('Вставь API ключ.', 'error');
      await loginWithToken(token);
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  $('clearBtn').addEventListener('click', () => {
    $('apiKey').value = '';
    setStatus('Поле очищено.');
  });

  $('refreshBalanceBtn').addEventListener('click', async () => {
    try {
      await refreshBalance();
      setStatus('Баланс обновлён.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  $('loadRateBtn').addEventListener('click', async () => {
    try {
      await loadStarsRate();
      setStatus('Курс обновлён.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  $('checkBtn').addEventListener('click', async () => {
    try {
      await checkUsername();
      setStatus('Проверка выполнена.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
      $('checkResult').textContent = error.message;
    }
  });

  $('buyStarsBtn').addEventListener('click', async () => {
    try {
      await buyStars();
      setStatus('Заказ Stars создан.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
      $('starsResult').textContent = error.message;
    }
  });

  $('buyPremiumBtn').addEventListener('click', async () => {
    try {
      await buyPremium();
      setStatus('Заказ Premium создан.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
      $('premiumResult').textContent = error.message;
    }
  });

  $('orderInfoBtn').addEventListener('click', async () => {
    try {
      await getOrderInfo();
      setStatus('Информация по заказу получена.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
      $('orderResult').textContent = error.message;
    }
  });

  $('loadCollectionsBtn').addEventListener('click', async () => {
    try {
      await loadCollections();
      setStatus('NFT коллекции загружены.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
      $('collectionsResult').textContent = error.message;
    }
  });

  $('logoutBtn').addEventListener('click', logout);
}

async function bootstrap() {
  bind();
  const saved = getToken();
  if (!saved) return;
  $('apiKey').value = saved;
  try {
    await loginWithToken(saved);
  } catch (error) {
    clearToken();
    setStatus('Сохранённый ключ больше не работает. Войди заново.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
