const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = 'https://franchise2.tgstars.tg';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function cleanToken(token) {
  return String(token || '').trim();
}

function getToken(req, res) {
  const token = cleanToken(req.body?.apiKey || req.body?.token);
  if (!token) {
    res.status(400).json({ ok: false, error: 'Вставь API ключ.' });
    return null;
  }
  return token;
}

async function callApi(method, endpoint, token, body, query) {
  const url = new URL(`${API_BASE}${endpoint}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, String(v));
    });
  }
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  const options = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
  return { status: response.status, ok: response.ok, data };
}

function sendResult(res, r, fallback) {
  if (!r.ok || r.data?.success === false) {
    return res.status(r.status || 500).json({
      ok: false,
      error: r.data?.error || r.data?.message || fallback
    });
  }
  return res.json({ ok: true, ...r.data });
}

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'LIBERAL' }));

app.post('/api/auth/login', async (req, res) => {
  const token = getToken(req, res); if (!token) return;
  try {
    const r = await callApi('GET', '/api/v1/client/balance', token);
    if (!r.ok || r.data?.success === false) {
      return res.status(r.status || 401).json({ ok: false, error: r.data?.error || r.data?.message || 'Неверный API ключ.' });
    }
    return res.json({ ok: true, user: { id: r.data.user_id, username: r.data.username, balance_rub: r.data.balance_rub, balance_nano: r.data.balance_nano } });
  } catch (e) { return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + e.message }); }
});

app.post('/api/client/balance', async (req, res) => {
  const token = getToken(req, res); if (!token) return;
  try { return sendResult(res, await callApi('GET', '/api/v1/client/balance', token), 'Не удалось получить баланс.'); }
  catch (e) { return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + e.message }); }
});

app.post('/api/client/stars/rate', async (req, res) => {
  const token = getToken(req, res); if (!token) return;
  try { return sendResult(res, await callApi('GET', '/api/v1/client/stars/rate', token), 'Не удалось получить курс Stars.'); }
  catch (e) { return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + e.message }); }
});

app.post('/api/client/username/check', async (req, res) => {
  const token = getToken(req, res); if (!token) return;
  const { username, type = 'stars', months } = req.body || {};
  if (!username) return res.status(400).json({ ok: false, error: 'Введи username.' });
  try { return sendResult(res, await callApi('GET', '/api/v1/client/username/check', token, undefined, { username, type, months }), 'Не удалось проверить username.'); }
  catch (e) { return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + e.message }); }
});

app.post('/api/orders/stars', async (req, res) => {
  const token = getToken(req, res); if (!token) return;
  const { username, quantity } = req.body || {};
  if (!username || !quantity) return res.status(400).json({ ok: false, error: 'Нужно указать username и quantity.' });
  try { return sendResult(res, await callApi('POST', '/api/v1/client/orders/stars', token, { username: String(username).replace(/^@/, ''), quantity: Number(quantity) }), 'Не удалось создать заказ Stars.'); }
  catch (e) { return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + e.message }); }
});

app.post('/api/orders/premium', async (req, res) => {
  const token = getToken(req, res); if (!token) return;
  const { username, months } = req.body || {};
  if (!username || !months) return res.status(400).json({ ok: false, error: 'Нужно указать username и months.' });
  try { return sendResult(res, await callApi('POST', '/api/v1/client/orders/premium', token, { username: String(username).replace(/^@/, ''), months: Number(months) }), 'Не удалось создать заказ Premium.'); }
  catch (e) { return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + e.message }); }
});

app.post('/api/orders/info', async (req, res) => {
  const token = getToken(req, res); if (!token) return;
  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ ok: false, error: 'Введи ID заказа.' });
  try { return sendResult(res, await callApi('GET', `/api/v1/client/orders/${Number(orderId)}`, token), 'Не удалось получить заказ.'); }
  catch (e) { return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + e.message }); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`LIBERAL запущен на порту ${PORT}`));
