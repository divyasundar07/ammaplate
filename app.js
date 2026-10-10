'use strict';
/* AmmaPlate - home-cooked meal ordering PWA (E-Business Management, Assignment 2)
   Data is stored in the browser (localStorage). Payment, notifications and WhatsApp are SIMULATED. */

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rupee = n => '\u20B9' + Math.round(n);
const DB = {
  get(k, d) { try { const v = localStorage.getItem('ap_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ap_' + k, JSON.stringify(v)); } catch (e) { toast('Could not save data (storage blocked)', 'err'); } }
};
let toastTimer;
function toast(msg, type) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show ' + (type || '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = ''; }, 2600);
}
function loading(on, msg) { $('#loader').hidden = !on; if (msg) $('#loadmsg').textContent = msg; }
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- constants & sample data ---------- */
const SUPPORT_PHONE = '919999999999'; // demo number - replace with the real business number
const ADMIN_PIN = '1234';             // demo PIN only; a real app needs server-side login
const STAGES = ['Order placed', 'Cooking', 'Out for delivery', 'Delivered'];
const STAGE_ICONS = ['\uD83D\uDCDD', '\uD83C\uDF73', '\uD83D\uDEF5', '\u2705'];
const STAGE_MS = 10000; // demo: auto-advance every 10 s
const SLOTS = ['12:00 - 1:00 PM', '1:00 - 2:00 PM', '7:00 - 8:00 PM', '8:00 - 9:00 PM'];
const CATS = ['All', 'Tiffin', 'Lunch', 'Dinner', 'Sweets'];

// Sample data: cooks and ratings are fictional demo content.
const DISHES = [
  { id: 1, name: 'Curd Rice Combo', cook: 'Lakshmi Amma', cat: 'Lunch', price: 90, portions: 12, veg: true, emoji: '\uD83C\uDF5A', rating: 4.6, count: 18, desc: 'Creamy curd rice with pomegranate, mango pickle and appalam.' },
  { id: 2, name: 'Sambar Rice + Poriyal', cook: 'Lakshmi Amma', cat: 'Lunch', price: 110, portions: 10, veg: true, emoji: '\uD83C\uDF72', rating: 4.5, count: 22, desc: 'Home-style sambar rice with seasonal vegetable poriyal.' },
  { id: 3, name: 'Chicken Biryani', cook: "Fathima's Kitchen", cat: 'Lunch', price: 160, portions: 8, veg: false, emoji: '\uD83C\uDF57', rating: 4.8, count: 31, desc: 'Seeraga samba biryani, slow-cooked, served with raita.' },
  { id: 4, name: 'Mutton Kuzhambu Meals', cook: "Fathima's Kitchen", cat: 'Lunch', price: 220, portions: 5, veg: false, emoji: '\uD83C\uDF56', rating: 4.7, count: 12, desc: 'Spicy mutton kuzhambu with rice, rasam and a fry.' },
  { id: 5, name: 'Chapati + Paneer Butter Masala', cook: 'Meena Aunty', cat: 'Dinner', price: 130, portions: 9, veg: true, emoji: '\uD83E\uDED3', rating: 4.4, count: 15, desc: '3 soft chapatis with rich, mildly spiced paneer gravy.' },
  { id: 6, name: 'Egg Dosa (2 pcs)', cook: "Fathima's Kitchen", cat: 'Dinner', price: 80, portions: 14, veg: false, emoji: '\uD83C\uDF73', rating: 4.3, count: 9, desc: 'Crisp dosas topped with spiced egg, with chutney.' },
  { id: 7, name: 'Idli (4) + Sambar', cook: 'Lakshmi Amma', cat: 'Tiffin', price: 60, portions: 20, veg: true, emoji: '\uD83E\uDDC6', rating: 4.7, count: 40, desc: 'Soft idlis with hot sambar and two chutneys.' },
  { id: 8, name: 'Ghee Pongal', cook: 'Meena Aunty', cat: 'Tiffin', price: 70, portions: 15, veg: true, emoji: '\uD83E\uDD63', rating: 4.5, count: 17, desc: 'Peppery pongal finished with cashew and ghee.' },
  { id: 9, name: 'Rava Kesari', cook: 'Meena Aunty', cat: 'Sweets', price: 50, portions: 15, veg: true, emoji: '\uD83C\uDF6E', rating: 4.6, count: 11, desc: 'Saffron-coloured sooji sweet, ghee roasted.' },
  { id: 10, name: 'Semiya Payasam (cup)', cook: 'Lakshmi Amma', cat: 'Sweets', price: 45, portions: 18, veg: true, emoji: '\uD83E\uDD5B', rating: 4.8, count: 14, desc: 'Vermicelli payasam with milk, cardamom and raisins.' }
];
const dishById = id => DISHES.find(d => d.id === Number(id));

/* ---------- state ---------- */
let user = DB.get('user', null);
let cart = DB.get('cart', {});
let orders = DB.get('orders', []);
let reviews = DB.get('reviews', []);
let points = DB.get('points', 0);
let stock = DB.get('stock', null);
if (!stock) { stock = {}; DISHES.forEach(d => stock[d.id] = d.portions); DB.set('stock', stock); }
const S = { view: 'home', param: null, cat: 'All', q: '', veg: false, coupon: null, usePts: false, pay: 'upi', chat: [], dq: 1, adminOk: false, stars: 0 };

const save = () => { DB.set('user', user); DB.set('cart', cart); DB.set('orders', orders); DB.set('reviews', reviews); DB.set('points', points); DB.set('stock', stock); };
const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);

function ratingOf(d) {
  const r = reviews.filter(x => x.dishIds.includes(d.id));
  const n = d.count + r.length;
  const total = d.rating * d.count + r.reduce((a, b) => a + b.stars, 0);
  return { avg: (total / n).toFixed(1), n };
}

/* ---------- navigation ---------- */
function go(view, param) {
  S.view = view; S.param = param === undefined ? null : param;
  if (view === 'detail') S.dq = 1;
  if (view === 'feedback') S.stars = 0;
  render(); window.scrollTo(0, 0);
}
const BACK = { detail: 'home', checkout: 'cart', track: 'orders', feedback: 'orders', admin: 'profile', chat: 'profile', success: 'home' };

function render() {
  if (!user) { renderTop('AmmaPlate'); $('#nav').style.display = 'none'; $('#main').innerHTML = loginView(); return; }
  renderTop(); renderNav();
  const v = S.view;
  const views = { home: homeView, detail: detailView, cart: cartView, checkout: checkoutView, success: successView, orders: ordersView, track: trackView, feedback: feedbackView, profile: profileView, admin: adminView, chat: chatView };
  $('#main').innerHTML = (views[v] || homeView)();
  if (v === 'home') drawList();
}
const TITLES = { home: '\uD83C\uDF5B AmmaPlate', detail: 'Dish details', cart: 'Your cart', checkout: 'Checkout', success: 'Order confirmed', orders: 'My orders', track: 'Track order', feedback: 'Rate your order', profile: 'My profile', admin: 'Admin dashboard', chat: 'Help & FAQ' };
function renderTop(t) {
  const back = BACK[S.view] && user;
  $('#top').innerHTML = (back ? `<button onclick="go('${BACK[S.view]}')" aria-label="Back">\u2190</button>` : '') + `<h1>${t || TITLES[S.view] || 'AmmaPlate'}</h1>` +
    (user && S.view === 'home' ? `<button onclick="go('cart')" aria-label="Cart">\uD83D\uDED2 ${cartCount()}</button>` : '');
}
function renderNav() {
  const n = $('#nav'); n.style.display = 'flex';
  const tabs = [['home', '\uD83C\uDFE0', 'Home'], ['cart', '\uD83D\uDED2', 'Cart'], ['orders', '\uD83D\uDCE6', 'Orders'], ['profile', '\uD83D\uDC64', 'Profile']];
  const active = { detail: 'home', checkout: 'cart', success: 'orders', track: 'orders', feedback: 'orders', admin: 'profile', chat: 'profile' }[S.view] || S.view;
  n.innerHTML = tabs.map(t => `<button class="${active === t[0] ? 'on' : ''}" onclick="go('${t[0]}')"><span class="ic">${t[1]}</span>${t[2]}${t[0] === 'cart' && cartCount() ? `<span class="badge">${cartCount()}</span>` : ''}</button>`).join('');
}

/* ---------- login / sign-up (CRM) ---------- */
function loginView() {
  return `<div class="hero"><div class="logo">\uD83C\uDF5B</div><h2 style="margin:6px 0">AmmaPlate</h2>
  <p class="muted">Fresh, home-cooked meals from your neighbourhood home cooks.</p></div>
  <form class="card" onsubmit="return signup(event)" novalidate>
    <label for="nm">Your name</label><input id="nm" autocomplete="name" placeholder="e.g. Priya Raman" maxlength="40">
    <div class="err" id="e-nm"></div>
    <label for="ph">Mobile number</label><input id="ph" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="10-digit mobile number" maxlength="10">
    <div class="err" id="e-ph"></div>
    <label for="rf">Referral code (optional)</label><input id="rf" placeholder="e.g. AMMA1234" maxlength="8" style="text-transform:uppercase">
    <div class="err" id="e-rf"></div>
    <label class="row" style="font-weight:400;margin-top:14px"><input type="checkbox" id="cs" style="width:auto">
      <span class="small">I agree that AmmaPlate may use my name and phone number only to process my orders and delivery (DPDP Act 2023 consent).</span></label>
    <div class="err" id="e-cs"></div>
    <button class="btn" type="submit">Sign up / Log in</button>
  </form>
  <p class="note">Demo app: your data stays only in this browser. Do not enter real card details anywhere.</p>`;
}
function setErr(id, msg) { const e = $('#e-' + id); if (e) e.textContent = msg || ''; const f = $('#' + id); if (f) f.parentElement.classList.toggle('field-err', !!msg); }
async function signup(ev) {
  ev.preventDefault();
  const name = $('#nm').value.trim(), ph = $('#ph').value.trim(), rf = $('#rf').value.trim().toUpperCase();
  let ok = true;
  if (!/^[A-Za-z][A-Za-z .'-]{1,39}$/.test(name)) { setErr('nm', 'Enter your name (letters only, min 2 characters).'); ok = false; } else setErr('nm');
  if (!/^[6-9]\d{9}$/.test(ph)) { setErr('ph', 'Enter a valid 10-digit Indian mobile number.'); ok = false; } else setErr('ph');
  let bonus = 0;
  if (rf) {
    if (!/^AMMA\d{4}$/.test(rf)) { setErr('rf', 'Referral code looks like AMMA1234.'); ok = false; }
    else if (rf === 'AMMA' + ph.slice(-4)) { setErr('rf', 'You cannot use your own referral code.'); ok = false; }
    else { setErr('rf'); bonus = 50; }
  } else setErr('rf');
  if (!$('#cs').checked) { $('#e-cs').textContent = 'Please accept the consent to continue.'; ok = false; } else $('#e-cs').textContent = '';
  if (!ok) { toast('Please fix the highlighted fields', 'err'); return false; }
  loading(true, 'Creating your account...'); await wait(900); loading(false);
  user = { name, phone: ph, joined: Date.now(), referral: 'AMMA' + ph.slice(-4), usedReferral: bonus > 0 };
  if (bonus) points += bonus;
  save(); toast(bonus ? 'Welcome! +50 bonus points added \uD83C\uDF89' : 'Welcome to AmmaPlate!', 'ok');
  go('home'); return false;
}

/* ---------- home / catalogue + search ---------- */
function homeView() {
  return `<div class="banner"><b>Welcome ${esc(user.name.split(' ')[0])}! \uD83D\uDC4B</b><br>Use code <b>WELCOME20</b> for 20% off your first order. Free delivery above ${rupee(300)}.</div>
  <input id="q" type="search" placeholder="\uD83D\uDD0D Search dishes or cooks..." value="${esc(S.q)}" oninput="S.q=this.value;drawList()" aria-label="Search">
  <div class="chips">${CATS.map(c => `<button class="chip ${S.cat === c ? 'on' : ''}" onclick="setCat('${c}')">${c}</button>`).join('')}
  <button class="chip ${S.veg ? 'on' : ''}" onclick="S.veg=!S.veg;render()">\uD83C\uDF3F Veg only</button></div>
  <div id="list"></div>`;
}
function setCat(c) { S.cat = c; render(); }
function drawList() {
  const box = $('#list'); if (!box) return;
  const q = S.q.trim().toLowerCase();
  const items = DISHES.filter(d => (S.cat === 'All' || d.cat === S.cat) && (!S.veg || d.veg) && (!q || (d.name + ' ' + d.cook + ' ' + d.cat).toLowerCase().includes(q)));
  if (!items.length) { box.innerHTML = `<div class="empty"><div class="big">\uD83D\uDE15</div><p>No dishes match "${esc(S.q)}". Try another word or category.</p></div>`; return; }
  box.innerHTML = items.map(d => {
    const left = stock[d.id], r = ratingOf(d);
    const tag = left <= 0 ? '<span class="tag out">Sold out</span>' : left <= 3 ? `<span class="tag low">Only ${left} left!</span>` : `<span class="tag ok">${left} portions left today</span>`;
    return `<div class="card dish" onclick="go('detail',${d.id})"><div class="emoji">${d.emoji}</div><div class="grow">
      <div class="row between"><b>${esc(d.name)}</b><span class="tag ${d.veg ? 'veg' : 'nv'}">${d.veg ? 'VEG' : 'NON-VEG'}</span></div>
      <div class="muted small">by ${esc(d.cook)} \u00B7 \u2B50 ${r.avg} (${r.n})</div>
      <div class="row between" style="margin-top:6px"><span class="price">${rupee(d.price)}</span>${tag}</div></div></div>`;
  }).join('');
}

/* ---------- product details ---------- */
function detailView() {
  const d = dishById(S.param); if (!d) return homeView();
  const left = stock[d.id], r = ratingOf(d), inCart = cart[d.id] || 0;
  const rv = reviews.filter(x => x.dishIds.includes(d.id)).slice(-3).reverse();
  return `<div class="emoji big">${d.emoji}</div>
  <div class="card" style="margin-top:12px"><div class="row between"><h3>${esc(d.name)}</h3><span class="tag ${d.veg ? 'veg' : 'nv'}">${d.veg ? 'VEG' : 'NON-VEG'}</span></div>
  <div class="muted">Cooked by <b>${esc(d.cook)}</b> \u00B7 \u2B50 ${r.avg} (${r.n} ratings)</div>
  <p>${esc(d.desc)}</p>
  <div class="row between"><span class="price" style="font-size:1.3rem">${rupee(d.price)}</span>
  <span class="tag ${left <= 0 ? 'out' : left <= 3 ? 'low' : 'ok'}">${left <= 0 ? 'Sold out' : left + ' portions left'}</span></div>
  ${inCart ? `<p class="muted small">${inCart} already in your cart</p>` : ''}
  ${left > 0 ? `<div class="row between" style="margin-top:12px"><div class="stepper"><button onclick="dq(-1)" aria-label="Less">\u2212</button><b id="dq">${S.dq}</b><button onclick="dq(1)" aria-label="More">+</button></div>
  <button class="btn sm" onclick="addToCart(${d.id},S.dq)">Add to cart</button></div>` : '<button class="btn" disabled>Sold out for today</button>'}
  </div>
  <h2>Recent reviews</h2>
  ${rv.length ? rv.map(x => `<div class="card"><b>${'\u2605'.repeat(x.stars)}${'\u2606'.repeat(5 - x.stars)}</b> <span class="muted small">by ${esc(x.name)}</span><p style="margin:6px 0 0">${esc(x.text) || '<span class="muted">No comment</span>'}</p></div>`).join('') : '<p class="muted">No reviews yet from AmmaPlate customers. Order and be the first!</p>'}`;
}
function dq(n) {
  const d = dishById(S.param), max = stock[d.id] - (cart[d.id] || 0);
  const v = S.dq + n;
  if (v < 1) return;
  if (v > max) { toast('Only ' + stock[d.id] + ' portions available', 'err'); return; }
  S.dq = v; $('#dq').textContent = v;
}
function addToCart(id, qty) {
  const have = cart[id] || 0;
  if (have + qty > stock[id]) { toast('Sorry, only ' + stock[id] + ' portions left', 'err'); return; }
  cart[id] = have + qty; save(); toast('Added to cart \uD83D\uDED2', 'ok'); go('home');
}

/* ---------- cart & pricing ---------- */
function validateCoupon(code, subtotal) {
  code = (code || '').trim().toUpperCase();
  if (code === 'WELCOME20') {
    if (orders.length > 0) return { ok: false, msg: 'WELCOME20 is only for your first order.' };
    return { ok: true, amt: Math.min(subtotal * 0.2, 80) };
  }
  if (code === 'AMMA50') {
    if (subtotal < 400) return { ok: false, msg: 'AMMA50 needs a cart value of ' + rupee(400) + ' or more.' };
    return { ok: true, amt: 50 };
  }
  return { ok: false, msg: 'Invalid coupon code.' };
}
function calc() {
  let subtotal = 0; const lines = [];
  for (const id in cart) { const d = dishById(id); if (!d) continue; subtotal += d.price * cart[id]; lines.push({ id: d.id, name: d.name, price: d.price, qty: cart[id], emoji: d.emoji }); }
  let discount = 0;
  if (S.coupon) { const c = validateCoupon(S.coupon, subtotal); if (c.ok) discount = c.amt; else S.coupon = null; }
  let ptsDisc = 0, ptsUsed = 0;
  if (S.usePts && points >= 100) { ptsDisc = Math.min(Math.floor(points / 100) * 10, Math.max(0, subtotal - discount)); ptsUsed = ptsDisc * 10; }
  const delivery = subtotal === 0 ? 0 : subtotal >= 300 ? 0 : 30;
  const total = Math.max(0, subtotal - discount - ptsDisc + delivery);
  return { lines, subtotal, discount, ptsDisc, ptsUsed, delivery, total };
}
function billHtml(c) {
  return `<div class="bill"><div><span>Subtotal</span><span>${rupee(c.subtotal)}</span></div>
  ${c.discount ? `<div style="color:var(--green)"><span>Coupon (${esc(S.coupon)})</span><span>\u2212${rupee(c.discount)}</span></div>` : ''}
  ${c.ptsDisc ? `<div style="color:var(--green)"><span>Points redeemed</span><span>\u2212${rupee(c.ptsDisc)}</span></div>` : ''}
  <div><span>Delivery fee</span><span>${c.delivery ? rupee(c.delivery) : 'FREE'}</span></div>
  <div class="tot"><span>Total</span><span>${rupee(c.total)}</span></div></div>`;
}
function cartView() {
  const c = calc();
  if (!c.lines.length) return `<div class="empty"><div class="big">\uD83D\uDED2</div><p>Your cart is empty.</p><button class="btn sm" onclick="go('home')">Browse dishes</button></div>`;
  return c.lines.map(l => `<div class="card row"><div class="emoji" style="width:52px;height:52px;font-size:1.7rem">${l.emoji}</div>
    <div class="grow"><b>${esc(l.name)}</b><div class="muted small">${rupee(l.price)} each</div></div>
    <div class="stepper"><button onclick="chg(${l.id},-1)" aria-label="Less">\u2212</button><b>${l.qty}</b><button onclick="chg(${l.id},1)" aria-label="More">+</button></div></div>`).join('') +
    `<div class="card"><label for="cp" style="margin-top:0">Have a coupon?</label>
    <div class="row"><input id="cp" placeholder="WELCOME20 or AMMA50" value="${esc(S.coupon || '')}" style="text-transform:uppercase"><button class="btn sm" onclick="applyCoupon()">Apply</button></div>
    <div class="err" id="e-cp"></div>
    ${points >= 100 ? `<label class="row" style="font-weight:400"><input type="checkbox" style="width:auto" ${S.usePts ? 'checked' : ''} onchange="S.usePts=this.checked;render()"> Use points (you have ${points}; 100 points = ${rupee(10)})</label>` : `<p class="muted small" style="margin:6px 0 0">Loyalty points: ${points} (earn 1 point per ${rupee(10)}; redeem from 100)</p>`}</div>
    <div class="card">${billHtml(c)}${c.subtotal < 300 ? `<p class="muted small">Add ${rupee(300 - c.subtotal)} more for free delivery.</p>` : ''}</div>
    <button class="btn" onclick="go('checkout')">Proceed to checkout \u2192</button>`;
}
function chg(id, n) {
  const v = (cart[id] || 0) + n;
  if (v <= 0) delete cart[id];
  else if (v > stock[id]) { toast('Only ' + stock[id] + ' portions left', 'err'); return; }
  else cart[id] = v;
  save(); render();
}
function applyCoupon() {
  const code = $('#cp').value.trim().toUpperCase();
  if (!code) { $('#e-cp').textContent = 'Please type a coupon code.'; return; }
  const c = validateCoupon(code, calc().subtotal);
  if (!c.ok) { $('#e-cp').textContent = c.msg; toast(c.msg, 'err'); return; }
  S.coupon = code; toast('Coupon applied \uD83C\uDF89', 'ok'); render();
}

/* ---------- checkout & simulated payment ---------- */
function checkoutView() {
  const c = calc();
  if (!c.lines.length) return cartView();
  return `<div class="card"><h3>Delivery details</h3>
    <label for="ad">Address</label><textarea id="ad" rows="3" placeholder="House no., street, area" maxlength="150"></textarea><div class="err" id="e-ad"></div>
    <label for="pn">PIN code</label><input id="pn" type="tel" inputmode="numeric" maxlength="6" placeholder="6-digit PIN code"><div class="err" id="e-pn"></div>
    <label for="sl">Delivery slot</label><select id="sl">${SLOTS.map(s => `<option>${s}</option>`).join('')}</select></div>
  <div class="card"><h3>Payment method <span class="tag ok">SIMULATED</span></h3>
    ${[['upi', '\uD83D\uDCF1 UPI'], ['card', '\uD83D\uDCB3 Debit / Credit card'], ['cod', '\uD83D\uDCB5 Cash on delivery']].map(p => `<label class="radio ${S.pay === p[0] ? 'on' : ''}" style="font-weight:500;margin:0 0 8px"><input type="radio" name="pay" value="${p[0]}" ${S.pay === p[0] ? 'checked' : ''} onchange="setPay('${p[0]}')"> ${p[1]}</label>`).join('')}
    <div id="payf">${payFields()}</div>
    <p class="note">No real money is charged. Card details typed here are checked on your phone and are <b>never stored or sent anywhere</b>. Use test card 4111 1111 1111 1111. Type "fail" in the UPI ID to see a failed-payment message.</p></div>
  <div class="card">${billHtml(c)}</div>
  <p class="muted small">Refund policy: if a meal is wrong or not delivered, contact support within 2 hours for a refund (Consumer Protection (E-Commerce) Rules 2020).</p>
  <button class="btn green" id="paybtn" onclick="placeOrder()">${S.pay === 'cod' ? 'Place order' : 'Pay ' + rupee(c.total)}</button>`;
}
function payFields() {
  if (S.pay === 'upi') return `<label for="upi">UPI ID</label><input id="upi" placeholder="name@bank" autocapitalize="off" autocomplete="off"><div class="err" id="e-upi"></div>`;
  if (S.pay === 'card') return `<label for="cn">Card number</label><input id="cn" type="tel" inputmode="numeric" maxlength="19" autocomplete="off" placeholder="4111 1111 1111 1111" oninput="this.value=this.value.replace(/\\D/g,'').replace(/(.{4})/g,'$1 ').trim()"><div class="err" id="e-cn"></div>
    <div class="row"><div class="grow"><label for="ce">Expiry (MM/YY)</label><input id="ce" type="tel" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="MM/YY" oninput="this.value=this.value.replace(/\\D/g,'').replace(/^(\\d{2})(\\d)/,'$1/$2')"><div class="err" id="e-ce"></div></div>
    <div class="grow"><label for="cv">CVV</label><input id="cv" type="password" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="***"><div class="err" id="e-cv"></div></div></div>`;
  return `<p class="muted">Pay in cash to the delivery person. Please keep the exact amount ready.</p>`;
}
function setPay(p) { S.pay = p; $('#payf').innerHTML = payFields(); document.querySelectorAll('.radio').forEach(r => r.classList.toggle('on', r.querySelector('input').value === p)); $('#paybtn').textContent = p === 'cod' ? 'Place order' : 'Pay ' + rupee(calc().total); }
function luhn(num) { let s = 0, alt = false; for (let i = num.length - 1; i >= 0; i--) { let n = +num[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0; }
async function placeOrder() {
  const c = calc(); let ok = true;
  const ad = $('#ad').value.trim(), pn = $('#pn').value.trim(), slot = $('#sl').value;
  if (ad.length < 10) { setErr('ad', 'Please enter your full address (at least 10 characters).'); ok = false; } else setErr('ad');
  if (!/^\d{6}$/.test(pn)) { setErr('pn', 'Enter a valid 6-digit PIN code.'); ok = false; } else setErr('pn');
  if (S.pay === 'upi') {
    const u = $('#upi').value.trim();
    if (!/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(u)) { setErr('upi', 'Enter a valid UPI ID like name@bank.'); ok = false; } else setErr('upi');
  } else if (S.pay === 'card') {
    const n = $('#cn').value.replace(/\s/g, ''), e = $('#ce').value, v = $('#cv').value;
    if (!/^\d{13,19}$/.test(n) || !luhn(n)) { setErr('cn', 'Card number is not valid.'); ok = false; } else setErr('cn');
    const m = /^(\d{2})\/(\d{2})$/.exec(e); const now = new Date();
    if (!m || +m[1] < 1 || +m[1] > 12 || (2000 + +m[2]) * 12 + +m[1] < now.getFullYear() * 12 + now.getMonth() + 1) { setErr('ce', 'Enter a valid, future expiry date.'); ok = false; } else setErr('ce');
    if (!/^\d{3}$/.test(v)) { setErr('cv', '3-digit CVV required.'); ok = false; } else setErr('cv');
  }
  if (!ok) { toast('Please fix the highlighted fields', 'err'); return; }
  for (const l of c.lines) if (l.qty > stock[l.id]) { toast(l.name + ' is no longer available in that quantity. Please update your cart.', 'err'); go('cart'); return; }
  $('#paybtn').disabled = true;
  loading(true, S.pay === 'cod' ? 'Placing your order...' : 'Processing payment securely...'); await wait(1800);
  if (S.pay === 'upi' && /fail/i.test($('#upi').value)) {
    loading(false); $('#paybtn').disabled = false; toast('Payment failed (simulated). Please try another UPI ID or method.', 'err'); setErr('upi', 'Payment declined by bank (simulated).'); return;
  }
  const id = 'AP' + String(Math.floor(10000 + Math.random() * 90000));
  const order = { id, items: c.lines.map(l => ({ id: l.id, name: l.name, price: l.price, qty: l.qty })), subtotal: c.subtotal, discount: c.discount, ptsDisc: c.ptsDisc, delivery: c.delivery, total: c.total, coupon: c.discount ? S.coupon : null,
    slot, address: ad, pin: pn, pay: S.pay === 'upi' ? 'UPI' : S.pay === 'card' ? 'Card' : 'Cash on delivery', paid: S.pay !== 'cod', created: Date.now(), stage: 0, stageAt: Date.now(), cancelled: false, rated: false, name: user.name, phone: user.phone };
  c.lines.forEach(l => stock[l.id] -= l.qty);
  points = points - c.ptsUsed + Math.floor(c.total / 10);
  orders.unshift(order); cart = {}; S.coupon = null; S.usePts = false; save();
  loading(false); toast('Order placed successfully! \uD83C\uDF89', 'ok'); go('success', id);
}
function successView() {
  const o = orders.find(x => x.id === S.param); if (!o) return ordersView();
  return `<div class="success"><div class="tick">\u2705</div><h2>Thank you, ${esc(user.name.split(' ')[0])}!</h2>
  <p>Your order <b>${o.id}</b> is confirmed.</p><p class="muted">Delivery slot: ${esc(o.slot)}<br>Paid via: ${o.pay}${o.paid ? ' (simulated)' : ''}<br>Total: <b>${rupee(o.total)}</b></p>
  <p class="muted small">\uD83D\uDD14 A confirmation message would be sent by SMS/WhatsApp in the real app (simulated here).</p>
  <button class="btn" onclick="go('track','${o.id}')">Track my order</button>
  <button class="btn sec" onclick="go('home')">Order more</button></div>`;
}

/* ---------- orders, tracking, feedback ---------- */
function ordersView() {
  if (!orders.length) return `<div class="empty"><div class="big">\uD83D\uDCE6</div><p>No orders yet. Your first home-cooked meal is waiting!</p><button class="btn sm" onclick="go('home')">Order now</button></div>`;
  return orders.map(o => {
    const st = o.cancelled ? '<span class="tag nv">Cancelled</span>' : o.stage === 3 ? '<span class="tag veg">Delivered</span>' : `<span class="tag low">${STAGES[o.stage]}</span>`;
    return `<div class="card"><div class="row between"><b>${o.id}</b>${st}</div>
    <div class="muted small">${new Date(o.created).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
    <p style="margin:6px 0">${o.items.map(i => esc(i.name) + ' \u00D7 ' + i.qty).join(', ')}</p>
    <div class="row between"><b class="price">${rupee(o.total)}</b><div class="row">
      ${!o.cancelled && o.stage < 3 ? `<button class="btn sm" onclick="go('track','${o.id}')">Track</button>` : ''}
      ${!o.cancelled && o.stage === 0 ? `<button class="btn sm sec" onclick="cancelOrder('${o.id}')">Cancel</button>` : ''}
      ${o.stage === 3 && !o.cancelled ? `<button class="btn sm sec" onclick="reorder('${o.id}')">Reorder</button>` : ''}
      ${o.stage === 3 && !o.rated && !o.cancelled ? `<button class="btn sm" onclick="go('feedback','${o.id}')">Rate</button>` : ''}
    </div></div></div>`;
  }).join('');
}
function trackView() {
  const o = orders.find(x => x.id === S.param); if (!o) return ordersView();
  if (o.cancelled) return `<div class="card"><h3>${o.id}</h3><p>This order was cancelled. Any prepaid amount would be refunded in 3-5 working days (simulated).</p></div>`;
  return `<div class="card"><div class="row between"><h3>Order ${o.id}</h3><b class="price">${rupee(o.total)}</b></div>
  <div class="muted small">Slot: ${esc(o.slot)} \u00B7 ${o.pay}</div>
  <div class="track" style="margin-top:16px">${STAGES.map((s, i) => `<div class="step ${i < o.stage ? 'done' : ''} ${i === o.stage ? (o.stage === 3 ? 'done' : 'now') : ''}"><div class="dot">${i <= o.stage ? STAGE_ICONS[i] : i + 1}</div><div><b>${s}</b><div class="muted small">${i < o.stage ? 'Completed' : i === o.stage ? (o.stage === 3 ? 'Enjoy your meal!' : 'In progress...') : 'Waiting'}</div></div></div>`).join('')}</div>
  <p class="muted small">Demo mode: status updates automatically every ${STAGE_MS / 1000} seconds. In the real app the home cook updates it.</p></div>
  <div class="card"><b>Items</b><p style="margin:6px 0 0">${o.items.map(i => esc(i.name) + ' \u00D7 ' + i.qty + ' \u2014 ' + rupee(i.price * i.qty)).join('<br>')}</p></div>
  <button class="btn sec" onclick="whatsapp('${o.id}')">\uD83D\uDCAC Chat with support on WhatsApp</button>`;
}
function cancelOrder(id) {
  const o = orders.find(x => x.id === id);
  if (!o || o.stage !== 0 || o.cancelled) { toast('This order can no longer be cancelled.', 'err'); return; }
  if (!confirm('Cancel order ' + id + '?')) return;
  o.cancelled = true; o.items.forEach(i => stock[i.id] += i.qty); points = Math.max(0, points - Math.floor(o.total / 10) + Math.round((o.ptsDisc || 0) * 10));
  save(); toast('Order cancelled', 'ok'); render();
}
function reorder(id) {
  const o = orders.find(x => x.id === id); let added = 0, skipped = 0;
  o.items.forEach(i => { const have = cart[i.id] || 0; const can = Math.min(i.qty, stock[i.id] - have); if (can > 0) { cart[i.id] = have + can; added++; } else skipped++; });
  save(); toast(added ? 'Items added to cart' + (skipped ? ' (' + skipped + ' sold out)' : '') : 'These dishes are sold out today', added ? 'ok' : 'err'); if (added) go('cart');
}
function feedbackView() {
  const o = orders.find(x => x.id === S.param); if (!o) return ordersView();
  if (o.rated) return `<div class="empty"><div class="big">\uD83D\uDE4F</div><p>You already rated this order. Thank you!</p></div>`;
  return `<div class="card"><h3>How was order ${o.id}?</h3>
  <div class="stars" id="stars">${[1, 2, 3, 4, 5].map(n => `<button onclick="setStars(${n})" aria-label="${n} stars">\u2605</button>`).join('')}</div><div class="err" id="e-st"></div>
  <label for="fc">Comments (optional)</label><textarea id="fc" rows="3" maxlength="200" placeholder="Tell us about taste, packing, delivery..."></textarea>
  <button class="btn" onclick="submitFeedback('${o.id}')">Submit feedback</button></div>`;
}
function setStars(n) { S.stars = n; document.querySelectorAll('#stars button').forEach((b, i) => b.classList.toggle('on', i < n)); $('#e-st').textContent = ''; }
async function submitFeedback(id) {
  if (!S.stars) { $('#e-st').textContent = 'Please tap a star rating.'; toast('Please choose a star rating', 'err'); return; }
  const o = orders.find(x => x.id === id), text = $('#fc').value.trim();
  loading(true, 'Saving feedback...'); await wait(600); loading(false);
  reviews.push({ orderId: id, stars: S.stars, text, name: user.name.split(' ')[0], dishIds: o.items.map(i => i.id), date: Date.now() });
  o.rated = true; points += 5; save(); toast('Thanks for your feedback! +5 points', 'ok'); go('orders');
}
function whatsapp(id) {
  const msg = encodeURIComponent('Hi AmmaPlate, I need help with order ' + id);
  window.open('https://wa.me/' + SUPPORT_PHONE + '?text=' + msg, '_blank', 'noopener');
}

/* live order progress (simulated kitchen updates) */
function tick() {
  let changed = false;
  orders.forEach(o => {
    if (!o.cancelled && o.stage < 3 && Date.now() - o.stageAt >= STAGE_MS) {
      o.stage++; o.stageAt = Date.now(); changed = true;
      toast('\uD83D\uDD14 Order ' + o.id + ': ' + STAGES[o.stage] + ' (simulated notification)');
    }
  });
  if (changed) { save(); if (user && ['track', 'orders', 'admin'].includes(S.view)) render(); }
}
setInterval(tick, 2000);

/* ---------- profile, CRM, referral, FAQ ---------- */
function profileView() {
  const spent = orders.filter(o => !o.cancelled).reduce((a, b) => a + b.total, 0);
  return `<div class="card row"><div class="emoji" style="border-radius:50%">\uD83D\uDE0B</div><div class="grow"><b>${esc(user.name)}</b><div class="muted">+91 ${esc(user.phone)}</div></div></div>
  <div class="kpi"><div class="card"><b>${points}</b><span class="muted small">Loyalty points</span></div><div class="card"><b>${orders.filter(o => !o.cancelled).length}</b><span class="muted small">Orders (${rupee(spent)})</span></div></div>
  <div class="card" style="margin-top:12px"><h3>\uD83C\uDF81 Refer a friend</h3><p class="muted small">Share your code. Your friend gets 50 bonus points when signing up.</p>
  <div class="row between"><b style="font-size:1.2rem;letter-spacing:2px">${user.referral}</b><button class="btn sm" onclick="share()">Share</button></div></div>
  <div class="card"><button class="btn sec" style="margin-top:0" onclick="go('chat')">\u2753 Help & FAQ chatbot</button>
  <button class="btn sec" onclick="whatsapp('general')">\uD83D\uDCAC WhatsApp support</button>
  <a class="btn sec" style="text-decoration:none;text-align:center" href="tel:+${SUPPORT_PHONE}">\uD83D\uDCDE Call support</a></div>
  <div class="card"><button class="btn sec" style="margin-top:0" onclick="adminLogin()">\uD83D\uDEE0\uFE0F Admin dashboard (owner)</button>
  <button class="btn sec" onclick="logout()">Log out</button></div>
  <div class="note"><b>Privacy:</b> AmmaPlate stores only your name, phone, address and orders, in this browser, to run the service. Card details are never stored. You can delete everything from "Reset demo data" in Admin.</div>`;
}
async function share() {
  const text = 'Order home-cooked meals on AmmaPlate! Use my referral code ' + user.referral + ' to get 50 bonus points. ' + location.href;
  try { if (navigator.share) { await navigator.share({ title: 'AmmaPlate', text }); } else { await navigator.clipboard.writeText(text); toast('Referral message copied!', 'ok'); } }
  catch (e) { if (e && e.name !== 'AbortError') toast('Could not share. Copy your code manually.', 'err'); }
}
function logout() { if (!confirm('Log out? Your orders stay saved on this device.')) return; user = null; DB.set('user', null); S.adminOk = false; render(); }
const FAQ = [
  ['How do I order?', 'Pick a dish on Home, add it to the cart, choose a delivery slot at checkout and pay (UPI, card or cash on delivery).'],
  ['Is my payment safe?', 'In this demo, payments are simulated and nothing is charged. A real version would use an RBI-compliant gateway such as Razorpay, and card numbers would never touch our app.'],
  ['What is "portions left"?', 'Home cooks prepare a limited number of portions each day. When the count reaches zero, the dish is sold out until the cook restocks.'],
  ['How do loyalty points work?', 'You earn 1 point for every \u20B910 spent and 5 points for each rating. 100 points = \u20B910 off at checkout.'],
  ['Can I cancel my order?', 'Yes, but only while the status is "Order placed", before cooking starts.'],
  ['What is the refund policy?', 'If a meal is wrong or not delivered, contact support within 2 hours for a refund.']
];
function chatView() {
  return `<div class="card">${S.chat.length ? S.chat.map(m => `<div class="bubble ${m.t}">${esc(m.x)}</div>`).join('') : '<div class="bubble a">Hi! \uD83D\uDC4B I am the AmmaPlate help bot. Tap a question below.</div>'}</div>
  ${FAQ.map((f, i) => `<button class="chip" style="display:block;width:100%;text-align:left;margin-bottom:8px;white-space:normal" onclick="ask(${i})">${esc(f[0])}</button>`).join('')}`;
}
function ask(i) { S.chat.push({ t: 'q', x: FAQ[i][0] }, { t: 'a', x: FAQ[i][1] }); render(); window.scrollTo(0, document.body.scrollHeight); }

/* ---------- admin dashboard (operations & analytics) ---------- */
function adminLogin() {
  if (S.adminOk) { go('admin'); return; }
  const pin = prompt('Owner PIN (demo PIN is ' + ADMIN_PIN + '):');
  if (pin === null) return;
  if (pin === ADMIN_PIN) { S.adminOk = true; toast('Welcome, owner', 'ok'); go('admin'); } else toast('Wrong PIN', 'err');
}
function adminView() {
  if (!S.adminOk) return '<div class="empty">Access denied.</div>';
  const live = orders.filter(o => !o.cancelled);
  const revenue = live.reduce((a, b) => a + b.total, 0);
  const aov = live.length ? revenue / live.length : 0;
  const qty = {}; live.forEach(o => o.items.forEach(i => qty[i.name] = (qty[i.name] || 0) + i.qty));
  const top = Object.entries(qty).sort((a, b) => b[1] - a[1]).slice(0, 5); const mx = top.length ? top[0][1] : 1;
  const avg = reviews.length ? (reviews.reduce((a, b) => a + b.stars, 0) / reviews.length).toFixed(1) : '\u2014';
  const coupons = live.filter(o => o.coupon).length;
  return `<div class="kpi"><div class="card"><b>${live.length}</b><span class="muted small">Orders</span></div><div class="card"><b>${rupee(revenue)}</b><span class="muted small">Sales</span></div>
  <div class="card"><b>${rupee(aov)}</b><span class="muted small">Avg order value</span></div><div class="card"><b>${avg}</b><span class="muted small">Avg app rating (${reviews.length})</span></div></div>
  <p class="muted small">Coupons used: ${coupons}</p>
  <h2>Top dishes</h2><div class="card">${top.length ? top.map(t => `<div style="margin-bottom:8px"><div class="row between small"><span>${esc(t[0])}</span><b>${t[1]}</b></div><div class="bar" style="width:${Math.max(4, t[1] / mx * 100)}%"></div></div>`).join('') : '<span class="muted">No sales data yet. Place a test order first.</span>'}</div>
  <h2>Manage orders</h2>
  ${live.filter(o => o.stage < 3).length ? live.filter(o => o.stage < 3).map(o => `<div class="card"><div class="row between"><b>${o.id}</b><span class="tag low">${STAGES[o.stage]}</span></div><div class="muted small">${esc(o.name)} \u00B7 ${esc(o.phone)} \u00B7 ${rupee(o.total)}</div>
   <button class="btn sm" style="margin-top:8px" onclick="advance('${o.id}')">Move to: ${STAGES[o.stage + 1]}</button></div>`).join('') : '<p class="muted">No active orders.</p>'}
  <h2>Today's portions</h2>
  ${DISHES.map(d => `<div class="card row between"><div><b>${esc(d.name)}</b><div class="muted small">${stock[d.id]} left</div></div><button class="btn sm sec" onclick="restock(${d.id})">Restock</button></div>`).join('')}
  <button class="btn sec" onclick="resetData()">Reset demo data (delete everything)</button>`;
}
function advance(id) { const o = orders.find(x => x.id === id); if (o && o.stage < 3) { o.stage++; o.stageAt = Date.now(); save(); toast('Order ' + id + ' moved to "' + STAGES[o.stage] + '"', 'ok'); render(); } }
function restock(id) { const d = dishById(id); stock[id] = d.portions; save(); toast(d.name + ' restocked to ' + d.portions, 'ok'); render(); }
function resetData() {
  if (!confirm('This will delete your account, orders, reviews and points on this device. Continue?')) return;
  Object.keys(localStorage).filter(k => k.startsWith('ap_')).forEach(k => localStorage.removeItem(k));
  location.reload();
}

/* ---------- start ---------- */
window.addEventListener('error', () => { loading(false); });
(function init() {
  // catch up missed progress if app was closed
  orders.forEach(o => { if (!o.cancelled && o.stage < 3) { const steps = Math.floor((Date.now() - o.stageAt) / STAGE_MS); if (steps > 0) { o.stage = Math.min(3, o.stage + steps); o.stageAt = Date.now(); } } });
  save();
  if (user) {
    // skeleton loading state for first paint
    $('#main').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    renderTop(); renderNav();
    setTimeout(render, 500);
  } else render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
