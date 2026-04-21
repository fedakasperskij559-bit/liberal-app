const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = 'https://franchise2.tgstars.tg';

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function cleanToken(token) {
  return String(token || '').trim();
}

function ensureToken(req, res) {
  const token = cleanToken(req.body?.apiKey || req.body?.token);
  if (!token) {
    res.status(400).json({ ok: false, error: 'Вставь API ключ.' });
    return null;
  }
  return token;
}

async function upstream(method, endpoint, token, body, query) {
  const url = new URL(`${API_BASE}${endpoint}`);
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    }
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json'
  };

  const options = { method, headers };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const raw = await response.text();

  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  return {
    status: response.status,
    ok: response.ok,
    data
  };
}

function relay(res, upstreamResponse, fallbackMessage) {
  const { status, ok, data } = upstreamResponse;
  if (!ok || data?.success === false) {
    return res.status(status || 500).json({
      ok: false,
      error: data?.error || data?.message || fallbackMessage
    });
  }
  return res.json({ ok: true, ...data });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'LIBERAL', apiBase: API_BASE });
});

app.post('/api/auth/login', async (req, res) => {
  const token = ensureToken(req, res);
  if (!token) return;
  try {
    const result = await upstream('GET', '/api/v1/client/balance', token);
    if (!result.ok || result.data?.success === false) {
      return res.status(result.status || 401).json({
        ok: false,
        error: result.data?.error || result.data?.message || 'Неверный API ключ.'
      });
    }

    return res.json({
      ok: true,
      user: {
        id: result.data.user_id,
        username: result.data.username,
        balance_rub: result.data.balance_rub,
        balance_nano: result.data.balance_nano
      }
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + error.message });
  }
});

app.post('/api/client/balance', async (req, res) => {
  const token = ensureToken(req, res);
  if (!token) return;
  try {
    const result = await upstream('GET', '/api/v1/client/balance', token);
    return relay(res, result, 'Не удалось получить баланс.');
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + error.message });
  }
});

app.post('/api/client/stars/rate', async (req, res) => {
  const token = ensureToken(req, res);
  if (!token) return;
  try {
    const result = await upstream('GET', '/api/v1/client/stars/rate', token);
    return relay(res, result, 'Не удалось получить курс Stars.');
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + error.message });
  }
});

app.post('/api/client/username/check', async (req, res) => {
  const token = ensureToken(req, res);
  if (!token) return;
  const { username, type, months } = req.body || {};

  if (!username || !type) {
    return res.status(400).json({ ok: false, error: 'Нужно указать username и type.' });
  }

  try {
    const result = await upstream('GET', '/api/v1/client/username/check', token, undefined, {
      username,
      type,
      months
    });
    return relay(res, result, 'Не удалось проверить username.');
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + error.message });
  }
});

app.post('/api/orders/stars', async (req, res) => {
  const token = ensureToken(req, res);
  if (!token) return;
  const { username, quantity } = req.body || {};

  if (!username || !quantity) {
    return res.status(400).json({ ok: false, error: 'Нужно указать username и quantity.' });
  }

  try {
    const result = await upstream('POST', '/api/v1/client/orders/stars', token, {
      username: String(username).replace(/^@/, ''),
      quantity: Number(quantity)
    });
    return relay(res, result, 'Не удалось создать заказ на Stars.');
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + error.message });
  }
});

app.post('/api/orders/premium', async (req, res) => {
  const token = ensureToken(req, res);
  if (!token) return;
  const { username, months } = req.body || {};

  if (!username || !months) {
    return res.status(400).json({ ok: false, error: 'Нужно указать username и months.' });
  }

  try {
    const result = await upstream('POST', '/api/v1/client/orders/premium', token, {
      username: String(username).replace(/^@/, ''),
      months: Number(months)
    });
    return relay(res, result, 'Не удалось создать заказ на Premium.');
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + error.message });
  }
});

app.post('/api/orders/info', async (req, res) => {
  const token = ensureToken(req, res);
  if (!token) return;
  const { orderId } = req.body || {};

  if (!orderId) {
    return res.status(400).json({ ok: false, error: 'Нужно указать ID заказа.' });
  }

  try {
    const result = await upstream('GET', `/api/v1/client/orders/${Number(orderId)}`, token);
    return relay(res, result, 'Не удалось получить информацию о заказе.');
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + error.message });
  }
});

app.post('/api/nft/collections', async (req, res) => {
  const token = ensureToken(req, res);
  if (!token) return;
  try {
    const result = await upstream('GET', '/api/v1/client/nft/buy/collections', token);
    return relay(res, result, 'Не удалось получить коллекции NFT.');
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + error.message });
  }
});

app.post('/api/nft/list', async (req, res) => {
  const token = ensureToken(req, res);
  if (!token) return;
  const { collection_address, sort_order, min_price, max_price, cursor } = req.body || {};
  try {
    const result = await upstream('GET', '/api/v1/client/nft/buy/list', token, undefined, {
      collection_address,
      sort_order,
      min_price,
      max_price,
      cursor
    });
    return relay(res, result, 'Не удалось получить NFT список.');
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LIBERAL запущен: http://localhost:${PORT}`);
});
