/* =========================================================
   JIMMI STORE — LOADER ORCHESTRATION + BASIC STORE LOGIC
   ========================================================= */

(function loaderSequence(){
  const fallZone   = document.getElementById('fallZone');
  const basket     = document.getElementById('basket');
  const logoReveal = document.getElementById('logoReveal');
  const caption    = document.getElementById('loaderCaption');
  const fill       = document.getElementById('loaderFill');
  const loader     = document.getElementById('loader');
  const site       = document.getElementById('site');

  const produce   = ['🍎','🍇','🥕','🍅','🥦','🍓','🍌','🥑','🍊','🍋','🍐','🍒'];

  // Respect reduced-motion: skip straight to the site.
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced){
    loader.classList.add('hide');
    site.classList.add('show');
    return;
  }

  const dropDist = fallZone.clientHeight + 8;

  function spawnItem(emoji, xPercent, delay){
    const el = document.createElement('span');
    el.className = 'fall-item';
    el.textContent = emoji;
    el.style.left = xPercent + '%';
    el.style.setProperty('--fall-dist', dropDist + 'px');
    el.style.setProperty('--fall-rot', (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random()*120) + 'deg');
    el.style.animationDelay = delay + 'ms';
    el.style.animationDuration = (1000 + Math.random()*300) + 'ms';
    fallZone.appendChild(el);
    setTimeout(() => el.remove(), delay + 1500);
  }

  function setProgress(pct){ fill.style.width = pct + '%'; }

  // Fruits drop neatly into the basket, one after another.
  const count = 7;
  const step  = 160;
  caption.textContent = 'Packing fresh produce…';
  for (let i = 0; i < count; i++){
    spawnItem(produce[Math.floor(Math.random() * produce.length)], 40 + Math.random() * 20, i * step);
  }
  setProgress(35);

  // The basket catches the haul.
  setTimeout(() => {
    caption.textContent = 'Catching it all in the basket…';
    basket.classList.add('land');
    setProgress(72);
  }, count * step + 200);

  // Basket morphs into the Jimmi Store wordmark.
  setTimeout(() => {
    caption.textContent = 'Packing your basket…';
    setProgress(92);
    basket.classList.remove('land');
    basket.classList.add('pop');
    logoReveal.classList.add('show');
  }, count * step + 1150);

  setTimeout(() => {
    setProgress(100);
    caption.textContent = 'Welcome to Jimmi Store!';
  }, count * step + 1550);

  setTimeout(() => {
    loader.classList.add('hide');
    site.classList.add('show');
  }, count * step + 2150);
})();


/* =========================================================
   PRODUCT DATA + RENDERING
   ========================================================= */

const IMG = '?auto=format&fit=crop&w=400&q=70';

const freshProducts = [
  { name:'Alphonso Mangoes',   meta:'1 kg · Ratnagiri',   price:249, emoji:'🥭', img:'https://images.unsplash.com/photo-1550825488-af28862c0df5' + IMG, badge:{ text:'Best Seller', type:'best' } },
  { name:'Baby Spinach',       meta:'200 g · Pesticide-free', price:39, emoji:'🥬', img:'https://images.unsplash.com/photo-1519995672084-d21490e86ba6' + IMG, badge:{ text:'Fresh', type:'fresh' } },
  { name:'Red Tomatoes',       meta:'1 kg · Farm fresh',  price:45, emoji:'🍅', img:'https://images.unsplash.com/photo-1553877679-66548171b5f5' + IMG, badge:{ text:'-10%', type:'off' } },
  { name:'Broccoli',           meta:'500 g · Hill-grown', price:69, emoji:'🥦', img:'https://images.unsplash.com/photo-1685504445355-0e7bdf90d415' + IMG, badge:{ text:'Fresh', type:'fresh' } },
  { name:'Carrots',            meta:'500 g · Ooty',       price:35, emoji:'🥕', img:'https://images.unsplash.com/photo-1748118869623-9607a2d4e5f9' + IMG },
  { name:'Seedless Grapes',    meta:'500 g · Nashik',     price:79, emoji:'🍇', img:'https://images.unsplash.com/photo-1736333568797-48339dc1b042' + IMG, badge:{ text:'Best Seller', type:'best' } },
];

const sweetProducts = [
  { name:'Dark Chocolate 70%', meta:'100 g bar',          price:189, emoji:'🍫', img:'https://images.unsplash.com/photo-1575377427642-087cf684f29d' + IMG, badge:{ text:'-15%', type:'off' } },
  { name:'Butter Biscuits',    meta:'Pack of 2',          price:59,  emoji:'🍪', img:'https://images.unsplash.com/photo-1513519683267-4ee6761728ac' + IMG },
  { name:'Assorted Truffles',  meta:'Box of 12',          price:349, emoji:'🍬', img:'https://images.unsplash.com/photo-1771416073813-7abe46dc55ae' + IMG, badge:{ text:'Best Seller', type:'best' } },
  { name:'Choco-chip Muffins', meta:'Pack of 4',          price:129, emoji:'🧁', img:'https://images.unsplash.com/photo-1647617587049-559e8ae530e6' + IMG, badge:{ text:'Fresh', type:'fresh' } },
  { name:'Digestive Biscuits', meta:'Family pack',        price:75, emoji:'🍪', img:'https://images.unsplash.com/photo-1587131782738-de30ea91a542' + IMG },
  { name:'Milk Chocolate',     meta:'80 g bar',           price:99, emoji:'🍫', img:'https://images.unsplash.com/photo-1679143121542-8d84d5f3b7e2' + IMG, badge:{ text:'-10%', type:'off' } },
];

const wishlist = new Set();
let cart = [];

function renderGrid(containerId, items){
  const grid = document.getElementById(containerId);
  grid.innerHTML = items.map((p, i) => `
    <div class="product-card">
      ${p.badge ? `<span class="product-badge badge-${p.badge.type}">${p.badge.text}</span>` : ''}
      <button class="product-wish" data-wish="${p.name}" aria-label="Add to wishlist"><span>${wishlist.has(p.name) ? '❤️' : '🤍'}</span></button>
      <div class="product-media">
        <img class="product-img" src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\\'product-emoji\\'>${p.emoji}</div>'">
      </div>
      <div class="product-name">${p.name}</div>
      <div class="product-meta">${p.meta}</div>
      <div class="product-row">
        <span class="product-price">₹${p.price}</span>
        <button class="add-btn" data-container="${containerId}" data-index="${i}">Add</button>
      </div>
    </div>
  `).join('');
}

renderGrid('freshGrid', freshProducts);
renderGrid('sweetGrid', sweetProducts);

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-btn');
  if (!btn) return;
  const source = btn.dataset.container === 'freshGrid' ? freshProducts : sweetProducts;
  const product = source[Number(btn.dataset.index)];
  addToCart(product);
});

/* =========================================================
    TOAST NOTIFICATIONS
    ========================================================= */
const toastStack = document.getElementById('toastStack');
function showToast(message, emoji){
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast-emoji">${emoji || '🧺'}</span>${message}`;
  toastStack.appendChild(el);
  setTimeout(() => el.remove(), 2900);
}

/* =========================================================
    WISHLIST HEARTS
    ========================================================= */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-wish]');
  if (!btn) return;
  const name = btn.dataset.wish;
  if (wishlist.has(name)){
    wishlist.delete(name);
    btn.classList.remove('active');
    btn.querySelector('span').textContent = '🤍';
    showToast('Removed from wishlist', '🤍');
  } else {
    wishlist.add(name);
    btn.classList.add('active');
    btn.querySelector('span').textContent = '❤️';
    showToast('Saved to wishlist', '❤️');
  }
});

/* =========================================================
    HERO BUTTONS + SCROLL REVEAL + HEADER SHADOW + BACK TO TOP
    ========================================================= */
const headerEl   = document.querySelector('.site-header');
const backToTop  = document.getElementById('backToTop');

document.getElementById('shopNowBtn').addEventListener('click', () => {
  document.getElementById('fresh').scrollIntoView({ behavior:'smooth' });
});
document.getElementById('harvestBtn').addEventListener('click', () => {
  document.getElementById('fresh').scrollIntoView({ behavior:'smooth' });
});

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  headerEl.classList.toggle('scrolled', y > 8);
  backToTop.classList.toggle('show', y > 420);
}, { passive: true });

backToTop.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){ entry.target.classList.add('in-view'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in-view'));
}

/* count-up stats */
function animateCount(el){
  const target = Number(el.dataset.count);
  const dur = 1200; const start = performance.now();
  function step(now){
    const t = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
const statEls = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window){
  const statIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){ animateCount(entry.target); statIO.unobserve(entry.target); }
    });
  }, { threshold: 0.5 });
  statEls.forEach(el => statIO.observe(el));
} else {
  statEls.forEach(el => el.textContent = Number(el.dataset.count).toLocaleString());
}

/* =========================================================
   CART DRAWER
   ========================================================= */

const cartBtn      = document.getElementById('cartBtn');
const cartDrawer    = document.getElementById('cartDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const closeCart     = document.getElementById('closeCart');
const cartItemsEl   = document.getElementById('cartItems');
const cartTotalEl   = document.getElementById('cartTotal');
const cartCountEl   = document.getElementById('cartCount');

function addToCart(product){
  const existing = cart.find(item => item.name === product.name);
  if (existing) existing.qty += 1;
  else cart.push({ ...product, qty: 1 });
  renderCart();
  openCart();
}

function removeFromCart(name){
  cart = cart.filter(item => item.name !== name);
  renderCart();
}

function renderCart(){
  const totalCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
  cartCountEl.textContent = totalCount;
  cartTotalEl.textContent = '₹' + totalPrice;

  if (cart.length === 0){
    cartItemsEl.innerHTML = `<p class="cart-empty">Your basket is empty. Add something fresh 🍎</p>`;
    return;
  }
  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      ${item.img ? `<img class="cart-item-emoji" src="${item.img}" alt="${item.name}" loading="lazy">` : `<span class="cart-item-emoji">${item.emoji}</span>`}
      <span class="cart-item-body">
        <span class="cart-item-name">${item.name}</span><br>
        <span class="cart-item-price">₹${item.price * item.qty}</span>
      </span>
      <span class="qty">
        <button data-dec="${item.name}" aria-label="Decrease">−</button>
        <span>${item.qty}</span>
        <button data-inc="${item.name}" aria-label="Increase">+</button>
      </span>
      <button class="cart-item-remove" data-remove="${item.name}">Remove</button>
    </div>
  `).join('');
}

function openCart(){
  cartDrawer.classList.add('open');
  drawerOverlay.classList.add('show');
}
function closeCartDrawer(){
  cartDrawer.classList.remove('open');
  drawerOverlay.classList.remove('show');
}

cartBtn.addEventListener('click', openCart);
closeCart.addEventListener('click', closeCartDrawer);
drawerOverlay.addEventListener('click', () => { closeCartDrawer(); closeLoginModal(); });
cartItemsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-remove]');
  if (btn){ removeFromCart(btn.dataset.remove); return; }
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  if (inc){ changeQty(inc.dataset.inc, 1); }
  if (dec){ changeQty(dec.dataset.dec, -1); }
});

function changeQty(name, delta){
  const item = cart.find(i => i.name === name);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.name !== name);
  renderCart();
}

/* =========================================================
    DEAL OF THE DAY + COUNTDOWN
    ========================================================= */
const dealOffers = [
  { name:'Alphonso Mangoes',  desc:'Sweet, sun-ripened Ratnagiri mangoes at their lowest price this season.', price:249, emoji:'🥭', img: freshProducts[0].img },
  { name:'Choco-chip Muffins', desc:'Soft, bakery-fresh muffins loaded with chocolate chips — today only.',     price:129, emoji:'🧁', img: sweetProducts[3].img },
  { name:'Assorted Truffles',  desc:'Handmade Belgian truffles in a 12-piece box, perfect for gifting.',        price:349, emoji:'🍬', img: sweetProducts[2].img },
];
let dealIndex = 0;
let dealProduct = dealOffers[0];

const dealTitleEl = document.getElementById('dealTitle');
const dealDescEl  = document.getElementById('dealDesc');
const dealPriceEl = document.getElementById('dealPrice');

function renderDeal(){
  dealProduct = dealOffers[dealIndex];
  dealTitleEl.textContent = dealProduct.name + ' — crate price';
  dealDescEl.textContent  = dealProduct.desc;
  dealPriceEl.textContent = '₹' + dealProduct.price;
  dealTitleEl.parentElement.classList.remove('deal-swap');
  void dealTitleEl.offsetWidth;
  dealTitleEl.parentElement.classList.add('deal-swap');
}
renderDeal();
setInterval(() => {
  dealIndex = (dealIndex + 1) % dealOffers.length;
  renderDeal();
}, 4500);

document.getElementById('dealAddBtn').addEventListener('click', () => {
  addToCart(dealProduct);
  showToast('Deal added to your basket!', '⚡');
});

const tH = document.getElementById('tH');
const tM = document.getElementById('tM');
const tS = document.getElementById('tS');
let dealEnds = new Date().setHours(23, 59, 59, 0); // ends at midnight tonight

function tickDeal(){
  let diff = Math.max(0, dealEnds - Date.now());
  const h = Math.floor(diff / 3.6e6);
  const m = Math.floor((diff % 3.6e6) / 6e4);
  const s = Math.floor((diff % 6e4) / 1000);
  const pad = n => String(n).padStart(2, '0');
  tH.textContent = pad(h); tM.textContent = pad(m); tS.textContent = pad(s);
}
tickDeal();
setInterval(tickDeal, 1000);

/* =========================================================
   LOGIN MODAL
   ========================================================= */

const loginBtn     = document.getElementById('loginBtn');
const loginOverlay = document.getElementById('loginOverlay');
const closeLoginBtn= document.getElementById('closeLogin');

function openLoginModal(){ loginOverlay.classList.add('show'); }
function closeLoginModal(){ loginOverlay.classList.remove('show'); }

loginBtn.addEventListener('click', openLoginModal);
closeLoginBtn.addEventListener('click', closeLoginModal);
loginOverlay.addEventListener('click', (e) => { if (e.target === loginOverlay) closeLoginModal(); });