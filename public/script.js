const BACKEND_URL = 'https://liberal-app.onrender.com';
const STORAGE_KEY = 'liberal_api_key';

function $(id) { return document.getElementById(id); }
function token() { return sessionStorage.getItem(STORAGE_KEY) || ''; }
function status(text, type='muted') { const el=$('authStatus'); if(el){ el.textContent=text; el.className='status '+type; } }
function show(obj) { return JSON.stringify(obj, null, 2); }

async function post(path, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('Сервер вернул не JSON: ' + text.slice(0, 120)); }
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

function fillUser(user) {
  $('userId').textContent = user.id ?? '—';
  $('username').textContent = user.username ? '@' + String(user.username).replace(/^@/, '') : '—';
  $('balance').textContent = `${user.balance_rub ?? user.balance ?? '—'} ₽`;
}

async function login() {
  const apiKey = $('apiKey').value.trim();
  if (!apiKey) return status('Вставь API ключ.', 'error');
  try {
    status('Проверяем ключ...');
    const data = await post('/api/auth/login', { apiKey });
    sessionStorage.setItem(STORAGE_KEY, apiKey);
    fillUser(data.user);
    $('loginCard').classList.add('hidden');
    $('dashboard').classList.remove('hidden');
    status('Вход выполнен.', 'success');
    loadStarsRate().catch(()=>{});
  } catch (e) { status(e.message, 'error'); }
}

function clearLogin(){ sessionStorage.removeItem(STORAGE_KEY); $('apiKey').value=''; status('Очищено.'); }
function logout(){ sessionStorage.removeItem(STORAGE_KEY); $('dashboard').classList.add('hidden'); $('loginCard').classList.remove('hidden'); status('Вы вышли.'); }

async function refreshBalance(){ try{ const data=await post('/api/client/balance',{token:token()}); fillUser({id:data.user_id,username:data.username,balance_rub:data.balance_rub}); status('Баланс обновлен.','success'); }catch(e){status(e.message,'error');} }
async function loadStarsRate(){ const data=await post('/api/client/stars/rate',{token:token()}); $('starPrice').textContent=data.price_per_star_rub+' ₽'; $('starMin').textContent=data.min_quantity; $('starMax').textContent=data.max_quantity; $('starsEnabled').textContent=data.stars_enabled?'Включено':'Выключено'; }
async function checkUsername(){ try{ const data=await post('/api/client/username/check',{token:token(),username:$('checkUsername').value.trim(),type:$('checkType').value,months:$('checkMonths').value}); $('checkResult').textContent=show(data); }catch(e){ $('checkResult').textContent=e.message; } }
async function buyStars(){ try{ const data=await post('/api/orders/stars',{token:token(),username:$('starsUsername').value.trim(),quantity:Number($('starsQuantity').value)}); $('starsResult').textContent=show(data); refreshBalance().catch(()=>{}); }catch(e){ $('starsResult').textContent=e.message; } }
async function buyPremium(){ try{ const data=await post('/api/orders/premium',{token:token(),username:$('premiumUsername').value.trim(),months:Number($('premiumMonths').value)}); $('premiumResult').textContent=show(data); refreshBalance().catch(()=>{}); }catch(e){ $('premiumResult').textContent=e.message; } }
async function getOrderInfo(){ try{ const data=await post('/api/orders/info',{token:token(),orderId:Number($('orderId').value)}); $('orderResult').textContent=show(data); }catch(e){ $('orderResult').textContent=e.message; } }

document.addEventListener('DOMContentLoaded', () => {
  status('Готов к входу.');
  const saved = token();
  if (saved) $('apiKey').value = saved;
});
