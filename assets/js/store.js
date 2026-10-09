/* =========================================================
   Store — rendering, cart, wishlist, search, deal rotation (PRO)
   Added: ratings, stock, MRP, filters, sort, quick-view, recently viewed, autocomplete
   ========================================================= */

const Store = (function () {
  const FREE_DELIVERY_MIN = 99;
  const cart = [];            // { id, qty }
  const wishlist = new Set(JSON.parse(localStorage.getItem('jimmi_wishlist')||'[]'));
  let activeFilter = 'all';
  let sortBy = 'default';
  let searchQuery = '';
  // advanced filters
  let advPriceMax = 500;
  let advVegOnly = false;
  let advInStock = false;
  let advHighRating = false;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function saveWishlist(){ try{ localStorage.setItem('jimmi_wishlist', JSON.stringify([...wishlist])); }catch(e){} }
  function saveRecentSearch(term){
    try{
      let arr = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY||'jimmi_recent_searches')||'[]');
      arr = arr.filter(t=>t!==term); arr.unshift(term); arr = arr.slice(0,6);
      localStorage.setItem(RECENT_SEARCH_KEY||'jimmi_recent_searches', JSON.stringify(arr));
    }catch(e){}
  }
  function pushRecentView(id){
    try{
      let arr = JSON.parse(localStorage.getItem(RECENT_VIEW_KEY||'jimmi_recent_views')||'[]');
      arr = arr.filter(x=>x!==id); arr.unshift(id); arr = arr.slice(0,8);
      localStorage.setItem(RECENT_VIEW_KEY||'jimmi_recent_views', JSON.stringify(arr));
      renderRecentlyViewed();
    }catch(e){}
  }

  /* ---------- Product card — PRO ---------- */
  function stars(r){
    const full = Math.floor(r); const half = r%1>=0.45?1:0; const empty = 5-full-half;
    return '★'.repeat(full) + (half?'½':'') + '☆'.repeat(empty);
  }
  function cardHTML(p) {
    const inCart = cart.find(c => c.id === p.id);
    const qty = inCart ? inCart.qty : 0;
    const saved = wishlist.has(p.id);
    const badge = p.badge ? `<span class="badge badge--${p.badge.type}">${p.badge.text}</span>` : '';
    const wishCls = saved ? 'is-saved' : '';
    const wishLabel = saved ? 'Saved' : 'Save';
    const mrp = p.mrp && p.mrp>p.price ? `<span class="card-mrp">₹${p.mrp}</span><span class="card-discount">${Math.round((1-p.price/p.mrp)*100)}% off</span>` : '';
    const rating = p.rating ? `<div class="card-rating"><span class="card-stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)}<small>(${p.reviews})</small></div>` : '';
    const stockCls = p.stock<=0? 'card-stock--out' : p.stock<6? 'card-stock--low' : 'card-stock--in';
    const stockTxt = p.stock<=0? 'Out of stock' : p.stock<6? `Only ${p.stock} left!` : 'In stock • Fresh';
    const vegIcon = p.veg ? '<span class="veg-dot"><i></i></span>' : '<span class="veg-dot non-veg"><i></i></span>';
    const footAction = p.stock<=0
      ? `<button class="card-add" disabled style="opacity:.55;cursor:not-allowed">Out of stock</button>`
      : qty > 0
      ? `<div class="stepper" data-stepper="${p.id}">
           <button class="step minus" data-step="-1" aria-label="Decrease">–</button>
           <span class="qty">${qty}</span>
           <button class="step plus" data-step="1" aria-label="Increase">+</button>
         </div>`
      : `<button class="card-add" data-add="${p.id}" aria-label="Add to cart">Add +</button>
         <div class="stepper hide" data-stepper="${p.id}">
           <button class="step minus" data-step="-1" aria-label="Decrease">–</button>
           <span class="qty">0</span>
           <button class="step plus" data-step="1" aria-label="Increase">+</button>
         </div>`;
    return `
      <article class="card reveal ${qty>0?'card--added':''}" data-id="${p.id}" data-cat="${p.cat}" tabindex="0">
        ${badge}
        <button class="wish ${wishCls}" data-wish="${p.id}" aria-label="Save item">
          <span class="wish-heart"></span><span class="wish-label">${wishLabel}</span>
        </button>
        <div class="card-media" data-qv="${p.id}" style="cursor:pointer">
          <img src="${U(p.photo)}" alt="${p.name}" loading="lazy"
               onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
          <button class="card-qv" data-qv="${p.id}" type="button">👁 Quick view</button>
        </div>
        <div class="card-body">
          <h3 class="card-title">${p.name}</h3>
          <p class="card-meta">${vegIcon} ${p.meta}</p>
          ${rating}
          <div class="card-foot">
            <span class="price">₹${p.price}${mrp}</span>
            ${footAction}
          </div>
          <span class="card-stock ${stockCls}">${stockTxt}</span>
        </div>
      </article>`;
  }

  function getFilteredProducts(){
    let list = PRODUCTS.slice();
    // search
    if(searchQuery){
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.meta.toLowerCase().includes(q) || (CATEGORIES.find(c=>c.id===p.cat).name.toLowerCase().includes(q)) || (p.desc && p.desc.toLowerCase().includes(q)));
    }
    // category chip
    if(activeFilter!=='all') list = list.filter(p=>p.cat===activeFilter);
    // advanced
    if(advPriceMax < 500) list = list.filter(p=> p.price <= advPriceMax);
    if(advVegOnly) list = list.filter(p=> p.veg);
    if(advInStock) list = list.filter(p=> p.stock>0);
    if(advHighRating) list = list.filter(p=> (p.rating||0) >= 4.5);
    // sort
    if(sortBy==='price-low') list.sort((a,b)=>a.price-b.price);
    else if(sortBy==='price-high') list.sort((a,b)=>b.price-a.price);
    else if(sortBy==='rating') list.sort((a,b)=>(b.rating||0)-(a.rating||0));
    else if(sortBy==='discount') list.sort((a,b)=> ((b.mrp-b.price)/b.mrp||0) - ((a.mrp-a.price)/a.mrp||0) );
    return list;
  }

  /* ---------- Render sections — PRO with filters ---------- */
  function renderSections() {
    const wrap = $('#catalog');
    const skel = $('#skeleton-grid');
    if (!wrap) return;
    const list = getFilteredProducts();
    // results count — now includes advanced + sort for 100% clarity
    const rc = $('#results-count');
    if(rc){
      const adv=[];
      if(advPriceMax<500) adv.push('≤₹'+advPriceMax);
      if(advVegOnly) adv.push('Veg');
      if(advInStock) adv.push('In-stock');
      if(advHighRating) adv.push('★4.5+');
      const sortLabel = sortBy!=='default' ? ({'price-low':'Price↑','price-high':'Price↓','rating':'Rated','discount':'Discount'}[sortBy]||sortBy) : '';
      let txt = list.length + ' products';
      if(activeFilter!=='all') txt += ' • '+CATEGORIES.find(c=>c.id===activeFilter).name;
      if(adv.length) txt += ' • '+adv.join(' • ');
      if(sortLabel) txt += ' • '+sortLabel;
      rc.textContent = txt;
      rc.title = txt;
    }

    // skeleton hide after first render
    if(skel) skel.style.display='none';

    if(!list.length){
      wrap.innerHTML = `<div style="text-align:center;padding:36px;background:#fff;border:1px dashed var(--line);border-radius:16px;color:var(--muted)"><div style="font-size:2rem">🔍</div><h3 style="margin:8px 0 6px">No products found</h3><p>Try another search or filter. <button class="link" onclick="Store.clearFilters()" style="margin-top:10px">Clear filters</button></p></div>`;
      return;
    }

    // build active filter summary for count + visual active state
    const advParts=[];
    if(advPriceMax<500) advParts.push('≤₹'+advPriceMax);
    if(advVegOnly) advParts.push('Veg');
    if(advInStock) advParts.push('In stock');
    if(advHighRating) advParts.push('★4.5+');
    const advSuffix = advParts.length ? ' • '+advParts.join(' • ') : '';
    const sortSuffix = sortBy!=='default' ? ' • '+ ({'price-low':'Price ↓','price-high':'Price ↑','rating':'Rating ★','discount':'Discount %'}[sortBy]||sortBy) : '';
    const advBar=$('#advanced-filters');
    if(advBar){
      advBar.classList.toggle('has-active', advParts.length>0);
      const clearBtn=$('#clear-adv-filters');
      if(clearBtn) clearBtn.style.display = advParts.length? 'inline-flex':'none';
    }

    // group by category (if all, no search, default sort) — sorted view is flat for true global sort (100% correct)
    const shouldGroup = activeFilter==='all' && !searchQuery && sortBy==='default';
    if(shouldGroup){
      // list already filtered by advanced (price/veg/stock/rating) but not sorted, keep category order
      if(!advParts.length){
        wrap.innerHTML = CATEGORIES.map(cat => {
          const items = list.filter(p => p.cat === cat.id);
          if(!items.length) return '';
          const cards = items.map(cardHTML).join('');
          return `
            <section class="section" id="cat-${cat.id}">
              <div class="section-head">
                <div class="cat-chip">
                  <img src="${U(cat.photo, 120)}" alt="${cat.name}" loading="lazy"
                       onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
                  <div><h2>${cat.name}</h2><small>${items.length} items · ${cat.desc||'Farm fresh'}</small></div>
                </div>
                <a class="link" href="#cat-${cat.id}">View all</a>
              </div>
              <div class="grid">${cards}</div>
            </section>`;
        }).join('');
      } else {
        // advanced filters active — show filtered grouped view with summary
        const html = CATEGORIES.map(cat => {
          const items = list.filter(p => p.cat === cat.id);
          if(!items.length) return '';
          const cards = items.map(cardHTML).join('');
          return `
            <section class="section" id="cat-${cat.id}">
              <div class="section-head">
                <div class="cat-chip">
                  <img src="${U(cat.photo, 120)}" alt="${cat.name}" loading="lazy"
                       onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
                  <div><h2>${cat.name}</h2><small>${items.length} items · ${cat.desc||'Farm fresh'} • ${advParts.join(' • ')}</small></div>
                </div>
                <a class="link" href="#cat-${cat.id}">View all</a>
              </div>
              <div class="grid">${cards}</div>
            </section>`;
        }).join('');
        if(html.trim()){
          wrap.innerHTML = html;
        } else {
          wrap.innerHTML = `<div style="text-align:center;padding:36px;background:#fff;border:1px dashed var(--line);border-radius:16px;color:var(--muted)"><div style="font-size:2rem">🔍</div><h3 style="margin:8px 0 6px">No products match filters</h3><p>Active: ${advParts.join(', ')} • ${list.length} products total</p><button class="link" onclick="Store.clearFilters()" style="margin-top:10px">Clear filters</button></div>`;
        }
      }
    } else {
      // flat grid — sorted or category/search focused (100% sort-correct: global order)
      wrap.innerHTML = `<section class="section" style="padding-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap"><span style="font-size:.82rem;color:var(--muted);font-weight:600">${list.length} products found${advSuffix}${sortSuffix}</span><button class="btn btn--ghost btn--sm" onclick="Store.clearFilters()" style="padding:6px 10px;font-size:.74rem">Clear filters</button></div><div class="grid">${list.map(cardHTML).join('')}</div></section>`;
    }
    // reveal + 3D tilt will be bound by app.js
    updateWishlistCount();
  }

  function clearFilters(){
    activeFilter='all'; sortBy='default'; searchQuery=''; advPriceMax=500; advVegOnly=false; advInStock=false; advHighRating=false;
    $$('.chip').forEach(c=>c.classList.toggle('active', c.dataset.filter==='all'));
    const sel=$('#sort-select'); if(sel) sel.value='default';
    const inp=$('#search-input'); if(inp) inp.value='';
    const pr=$('#price-range'); if(pr) pr.value=500; const pv=$('#price-val'); if(pv) pv.textContent='₹500';
    const veg=$('#filter-veg'); if(veg) veg.checked=false;
    const stk=$('#filter-stock'); if(stk) stk.checked=false;
    const rat=$('#filter-rating'); if(rat) rat.checked=false;
    $('#search-msg')?.classList.remove('show');
    renderSections();
    toast('Filters cleared');
  }
  function setAdvFilters({priceMax, vegOnly, inStock, highRating}){
    if(priceMax!==undefined) advPriceMax=priceMax;
    if(vegOnly!==undefined) advVegOnly=vegOnly;
    if(inStock!==undefined) advInStock=inStock;
    if(highRating!==undefined) advHighRating=highRating;
    renderSections();
  }

  /* ---------- Quick view ---------- */
  function openQuickView(id){
    const p = PRODUCTS.find(x=>x.id===id);
    if(!p) return;
    pushRecentView(id);
    const modal = $('#quick-view');
    const content = $('#quick-view-content');
    if(!modal || !content) return;
    const mrp = p.mrp && p.mrp>p.price ? `<span class="card-mrp">₹${p.mrp}</span><span class="card-discount">${Math.round((1-p.price/p.mrp)*100)}% OFF</span>` : '';
    const inCart = cart.find(c=>c.id===p.id);
    const qty = inCart?inCart.qty:0;
    content.innerHTML = `
      <div class="quick-view-media">
        <img id="qv-main-img" src="${U(p.photo, 640)}" alt="${p.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
        <div class="quick-view-thumbs">
          ${[p.photo, CATEGORIES.find(c=>c.id===p.cat).photo, '1767032916116-2460bbd4a27d'].map((ph,i)=>`<img src="${U(ph,200)}" alt="" class="${i===0?'active':''}" data-thumb="${ph}">`).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
          <span class="card-stock ${p.stock<6?'card-stock--low':'card-stock--in'}">${p.stock<=0?'Out of stock': p.stock<6?`Only ${p.stock} left!`:'In stock'}</span>
          <span style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:.72rem;font-weight:800;padding:4px 8px;border-radius:999px">✓ FSSAI • 60-min</span>
        </div>
      </div>
      <div class="quick-view-info">
        <div style="display:flex;gap:8px;align-items:center"><span class="veg-dot ${p.veg?'':'non-veg'}"><i></i></span><small style="color:var(--muted);font-weight:600">${p.cat.toUpperCase()} • ${p.meta}</small></div>
        <h2>${p.name}</h2>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span class="price" style="font-size:1.25rem">₹${p.price} ${mrp}</span>
          <span class="card-rating"><span class="card-stars">${stars(p.rating||4.5)}</span> ${(p.rating||4.5).toFixed(1)} <small>(${p.reviews||0} reviews)</small></span>
        </div>
        <p class="quick-desc">${p.desc||p.meta} <br><br><b>Origin:</b> ${p.meta.split('·')[1]||'India'} • <b>Storage:</b> Keep refrigerated • <b>Shelf:</b> 2-3 days fresh</p>
        <div class="quick-actions">
          ${p.stock<=0? `<button class="btn" disabled style="opacity:.55">Out of stock</button>` : qty>0? `<div class="stepper" data-stepper="${p.id}"><button class="step minus" data-step="-1">–</button><span class="qty">${qty}</span><button class="step plus" data-step="1">+</button></div><span style="align-self:center;font-weight:700;color:var(--green-700)">₹${p.price*qty} • ${qty} in cart</span>` : `<button class="btn" data-add="${p.id}" style="flex:1;justify-content:center">Add to basket • ₹${p.price}</button><button class="btn btn--ghost" data-wish="${p.id}">${wishlist.has(p.id)?'♥ Saved':'♡ Save'}</button>`}
        </div>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
          <span style="font-size:.76rem;color:var(--muted)">🚚 Free delivery above ₹99</span>
          <span style="font-size:.76rem;color:var(--muted)">↩️ 24h returns</span>
          <span style="font-size:.76rem;color:var(--muted)">🔒 Secure</span>
        </div>
        <details style="margin-top:8px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px"><summary style="font-weight:700;cursor:pointer">Nutrition & info</summary><p style="margin-top:8px;color:var(--muted);font-size:.86rem;line-height:1.6">Energy approx. per 100g: 45 kcal • Rich in vitamins, fibre. Sourced from ${CATEGORIES.find(c=>c.id===p.cat).name}. Quality checked at Jimmi farm hub. <br><b>SKU:</b> ${p.id.toUpperCase()} • <b>HSN:</b> 0709</p></details>
      </div>`;
    modal.classList.add('modal--open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
    // thumbs
    content.querySelectorAll('[data-thumb]').forEach(im=>{
      im.addEventListener('click',()=>{ content.querySelectorAll('[data-thumb]').forEach(x=>x.classList.remove('active')); im.classList.add('active'); const main=$('#qv-main-img'); if(main) main.src=U(im.dataset.thumb,640); });
    });
  }
  function closeQuickView(){ const m=$('#quick-view'); if(m){ m.classList.remove('modal--open'); m.setAttribute('aria-hidden','true'); document.body.style.overflow=''; } }

  /* ---------- Recently viewed ---------- */
  function renderRecentlyViewed(){
    const sec=$('#recently-viewed-section'); const grid=$('#recently-viewed'); if(!sec||!grid) return;
    try{
      const ids=JSON.parse(localStorage.getItem(RECENT_VIEW_KEY||'jimmi_recent_views')||'[]');
      if(!ids.length){ sec.classList.add('hide'); return; }
      sec.classList.remove('hide');
      const items=ids.map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean);
      grid.innerHTML=items.map(p=>`
        <article class="card" data-id="${p.id}">
          <div class="card-media" data-qv="${p.id}" style="cursor:pointer"><img src="${U(p.photo,300)}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"></div>
          <div class="card-body"><h3 class="card-title" style="font-size:.88rem">${p.name}</h3><span class="price">₹${p.price}</span><button class="card-add" data-add="${p.id}" style="margin-top:8px;width:100%;justify-content:center">Add +</button></div>
        </article>`).join('');
    }catch(e){ sec.classList.add('hide'); }
  }

  /* ---------- Trending & Combos ---------- */
  function renderTrending(){
    const grid=$('#trending-grid'); if(!grid) return;
    const ids = (typeof TRENDING_IDS!=='undefined'? TRENDING_IDS : PRODUCTS.filter(p=>p.rating>=4.7).map(p=>p.id).slice(0,6));
    const items = ids.map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean);
    grid.innerHTML = items.map(p=> cardHTML(p)).join('');
  }
  function renderCombos(){
    const wrap=$('#combos-grid'); if(!wrap) return;
    const groups = (typeof COMBO_GROUPS!=='undefined'? COMBO_GROUPS : []);
    if(!groups.length){ wrap.innerHTML=''; return; }
    wrap.innerHTML = groups.map(g=>{
      const items=g.ids.map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean);
      const total = items.reduce((s,p)=>s+p.price,0);
      const save = g.save||Math.round(total*0.08);
      const pay = total - save;
      return `<div class="co-card" style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;align-items:center"><b>${g.title}</b><span style="background:#fef3c7;border:1px solid #fde68a;color:#92400e;font-size:.72rem;font-weight:800;padding:4px 8px;border-radius:999px">Save ₹${save}</span></div>
        <div style="display:flex;gap:8px;overflow:auto">${items.map(p=>`<div style="flex:1;min-width:92px;text-align:center"><img src="${U(p.photo,200)}" alt="${p.name}" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:12px;border:1px solid var(--line)"><small style="display:block;font-weight:700;margin-top:6px;font-size:.78rem">${p.name}</small><small style="color:var(--muted)">₹${p.price}</small></div>`).join('<span style="align-self:center;font-weight:800;color:var(--muted)">+</span>')}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 12px;border-radius:12px"><span><small style="color:var(--muted);text-decoration:line-through">₹${total}</small> <b style="color:var(--green-700);margin-left:6px">₹${pay}</b> • ${items.length} items</span><button class="btn btn--sm" data-combo="${g.title}">Add combo</button></div>
      </div>`;
    }).join('');
    // attach proper listeners for add combo buttons (fallback if inline fails)
    wrap.querySelectorAll('.btn').forEach((btn, idx)=>{
      const g=groups[idx];
      btn.addEventListener('click', ()=>{ g.ids.forEach(id=> addToCart(id)); toast('Combo "'+g.title+'" added 🧺'); });
    });
  }

  /* ---------- Wishlist ---------- */
  function updateWishlistCount(){
    const n=wishlist.size;
    const el=$('#wishlist-count');
    if(el){ el.textContent=n; el.style.display=n?'grid':'none'; }
  }
  function renderWishlist(){
    const body=$('#wishlist-body'); if(!body) return;
    if(!wishlist.size){
      body.innerHTML=`<div class="cart-empty"><div class="cart-empty-icon">♡</div><h4>No saved items yet</h4><p>Tap ♡ on any product to save for later.</p></div>`;
      return;
    }
    body.innerHTML=[...wishlist].map(id=>{
      const p=PRODUCTS.find(x=>x.id===id); if(!p) return '';
      return `<div class="cart-line"><img src="${U(p.photo,140)}" alt="${p.name}"><div class="cart-line-info"><h4>${p.name}</h4><span class="price">${p.meta} • ₹${p.price}</span><button class="card-add" data-add="${p.id}" style="margin-top:6px">Add to basket</button></div><button class="cart-item-remove" data-wish="${p.id}" style="background:#fff;border:1px solid var(--line);color:var(--muted)">×</button></div>`;
    }).join('');
  }
  function toggleWish(id) {
    if (wishlist.has(id)) { wishlist.delete(id); toast('Removed from saved'); }
    else { wishlist.add(id); toast('Saved for later ♥'); }
    saveWishlist(); updateWishlistCount(); renderWishlist();
    $$(`[data-wish="${id}"]`).forEach(btn => {
      const on = wishlist.has(id);
      btn.classList.toggle('is-saved', on);
      const lab=btn.querySelector('.wish-label'); if(lab) lab.textContent = on ? 'Saved' : 'Save';
      if(btn.classList.contains('card-add')||btn.classList.contains('btn')) btn.textContent = on ? '♥ Saved' : '♡ Save';
    });
    // also update card wishlist buttons
    document.querySelectorAll(`.wish[data-wish="${id}"]`).forEach(b=>{ b.classList.toggle('is-saved', wishlist.has(id)); const l=b.querySelector('.wish-label'); if(l) l.textContent=wishlist.has(id)?'Saved':'Save'; });
  }

  /* ---------- Cart (keep) + fly animation (pro) ---------- */
  function flyToCart(id){
    try{
      const card = document.querySelector(`.card[data-id="${id}"] .card-media img`) || document.querySelector(`[data-id="${id}"] img`);
      const cartBtn = document.getElementById('open-cart') || document.getElementById('cart-count')?.parentElement;
      if(!card || !cartBtn) return;
      const r1 = card.getBoundingClientRect();
      const r2 = cartBtn.getBoundingClientRect();
      const fly = card.cloneNode(true);
      fly.style.position='fixed';
      fly.style.left=r1.left+'px'; fly.style.top=r1.top+'px';
      fly.style.width=r1.width+'px'; fly.style.height=r1.height+'px';
      fly.style.objectFit='cover';
      fly.style.borderRadius='12px';
      fly.style.zIndex='9999';
      fly.style.pointerEvents='none';
      fly.style.boxShadow='0 12px 30px rgba(31,42,36,.18)';
      fly.style.transition='all .68s cubic-bezier(.45,0,.55,1)';
      document.body.appendChild(fly);
      requestAnimationFrame(()=> requestAnimationFrame(()=>{
        fly.style.left=(r2.left + r2.width/2 - 14)+'px';
        fly.style.top=(r2.top + 6)+'px';
        fly.style.width='26px'; fly.style.height='26px';
        fly.style.opacity='.42';
        fly.style.transform='rotate(18deg) scale(.9)';
      }));
      setTimeout(()=> fly.remove(), 720);
      // cart bump is handled in updateCartCount
      // confetti tiny
      if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
    }catch(e){}
  }
  function addToCart(id) {
    const p=PRODUCTS.find(x=>x.id===id); if(p && p.stock<=0){ toast('Out of stock'); return; }
    const line = cart.find(c => c.id === id);
    if (line) { if(p && line.qty>=p.stock){ toast('Only '+p.stock+' in stock'); return; } line.qty++; }
    else cart.push({ id, qty: 1 });
    flyToCart(id);
    syncStepper(id);
    renderCart();
    updateCartCount();
    updateMobileBar();
    if ($('#checkout-overlay')?.classList.contains('show')) { renderOrderSummary(); updateBilling(); }
    if(p) toast(`Added "${p.name}" to cart • ${line?line.qty:1} in basket`);
  }

  function changeQty(id, delta) {
    const line = cart.find(c => c.id === id);
    if (!line) { if (delta > 0) addToCart(id); return; }
    const p=PRODUCTS.find(x=>x.id===id);
    if(delta>0 && p && line.qty>=p.stock){ toast('Only '+p.stock+' left!'); return; }
    line.qty += delta;
    if (line.qty <= 0) cart.splice(cart.indexOf(line), 1);
    syncStepper(id);
    renderCart();
    updateCartCount();
    updateMobileBar();
    if ($('#checkout-overlay')?.classList.contains('show')) {
      renderOrderSummary();
      if (checkout.couponCode === 'FREEDEL') { checkout.discount = getDeliveryFee(); }
      if (checkout.couponCode === 'FRESH10') { const sub = getSubtotal(); checkout.discount = Math.min(Math.round(sub*0.10), 100); }
      updateBilling();
    }
  }

  function syncStepper(id) {
    const line = cart.find(c => c.id === id);
    const qty = line ? line.qty : 0;
    $$(`.stepper[data-stepper="${id}"] .qty`).forEach(el => el.textContent = qty);
    document.querySelectorAll(`[data-id="${id}"]`).forEach(card=>{
      const add = card.querySelector(`[data-add="${id}"]`);
      const stepper = card.querySelector(`.stepper[data-stepper="${id}"]`);
      if (qty>0) {
        if (add) add.classList.add('hide');
        if (stepper) stepper.classList.remove('hide');
        card.classList.add('card--added');
      } else {
        if (add) add.classList.remove('hide');
        if (stepper) stepper.classList.add('hide');
        card.classList.remove('card--added');
      }
    });
    // also update quick view if open
    const qv=$('#quick-view-content'); if(qv && qv.innerHTML.includes(`data-stepper="${id}"`)){
      const p=PRODUCTS.find(x=>x.id===id); if(p) openQuickView(id);
    }
  }

  function updateCartCount() {
    const n = cart.reduce((s, c) => s + c.qty, 0);
    const el = $('#cart-count');
    if (el) {
      el.textContent = n;
      el.style.display = n? 'grid':'none';
      el.classList.remove('bump');
      void el.offsetWidth;
      if(n) el.classList.add('bump');
    }
    updateMobileBar();
  }
  function updateMobileBar(){
    const bar=$('#mobile-bar'); if(!bar) return;
    const n=cart.reduce((s,c)=>s+c.qty,0);
    const total=getSubtotal();
    if(n>0){ bar.classList.add('show'); bar.setAttribute('aria-hidden','false'); const c=$('#mobile-bar-count'); const t=$('#mobile-bar-total'); if(c) c.textContent=n+' item'+(n>1?'s':''); if(t) t.textContent='₹'+total; }
    else { bar.classList.remove('show'); bar.setAttribute('aria-hidden','true'); }
  }

  function renderCart() {
    const body = $('#cart-body');
    const totalEl = $('#cart-total');
    const FREE = FREE_DELIVERY_MIN;
    if (!body) return;
    if (!cart.length) {
      body.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🧺</div>
          <h4>Your basket is empty</h4>
          <p>Fresh fruits, dairy & pantry staples are waiting for you.</p>
          <a href="#cat-fresh" class="btn btn--sm" onclick="document.getElementById('cart')?.classList.remove('cart--open');document.getElementById('cart-overlay')?.classList.remove('show')">Start shopping</a>
        </div>`;
      if (totalEl) totalEl.textContent = '₹0';
      const fd = document.querySelector('.cart-free');
      if (fd) fd.remove();
      const footMuted = document.querySelector('.cart-foot .row--muted');
      if (footMuted) footMuted.innerHTML = `<span>Delivery</span><span>—</span>`;
      updateMobileBar();
      return;
    }
    let total = 0;
    let freeCard = document.querySelector('.cart-free');
    if (!freeCard) {
      freeCard = document.createElement('div');
      freeCard.className = 'cart-free';
      body.parentElement.insertBefore(freeCard, body);
    }
    body.innerHTML = cart.map(line => {
      const p = PRODUCTS.find(x => x.id === line.id);
      total += p.price * line.qty;
      return `
        <div class="cart-line">
          <img src="${U(p.photo, 140)}" alt="${p.name}" loading="lazy"
               onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
          <div class="cart-line-info">
            <h4 title="${p.name}">${p.name}</h4>
            <span class="price">${p.meta} · ₹${p.price}</span>
            <div class="stepper stepper--sm" data-stepper="${p.id}">
              <button class="step minus" data-step="-1" aria-label="Decrease">–</button>
              <span class="qty">${line.qty}</span>
              <button class="step plus" data-step="1" aria-label="Increase">+</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
            <span class="cart-line-amt">₹${p.price * line.qty}</span>
            <button class="cart-item-remove" data-remove="${p.id}" aria-label="Remove">×</button>
          </div>
        </div>`;
    }).join('');
    if (totalEl) totalEl.textContent = '₹' + total;

    const pct = Math.min(100, Math.round(total / FREE * 100));
    const remain = Math.max(0, FREE - total);
    const subsDisc = getSubsDiscount();
    freeCard.innerHTML = `
      <div class="cart-free-icon">🚚</div>
      <div class="cart-free-copy" style="flex:1">
        ${remain === 0 ? `<b>You've unlocked FREE delivery! 🎉</b><small>Yay, no delivery fee on this order</small>`
                        : `<b>Add ₹${remain} more for FREE delivery</b><small>Free delivery on orders above ₹${FREE}</small>`}
        <div class="cart-free-bar"><div class="cart-free-fill" style="width:${pct}%"></div></div>
        ${subsDisc? `<div style="margin-top:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:.72rem;font-weight:700;padding:6px 8px;border-radius:999px;display:inline-flex;gap:6px;align-items:center">🗓️ Subs save ₹${subsDisc} (5% off)</div>`:''}
      </div>
    `;
    const footMuted = document.querySelector('.cart-foot .row--muted');
    if (footMuted) {
      if (remain === 0) footMuted.innerHTML = `<span>Delivery</span><span style="color:#16a34a;font-weight:700">Free ✓</span>`;
      else footMuted.innerHTML = `<span>Delivery</span><span>₹25</span>`;
    }
    // update total to reflect subs discount in cart foot? keep subtotal but show saving hint
    const totalPriceEl = document.querySelector('.cart-foot .row:not(.row--muted) .price');
    if(totalPriceEl && subsDisc){ totalPriceEl.title = `Subs save ₹${subsDisc} applied at checkout`; }
    updateMobileBar();
    // if checkout open, refresh billing to show subs
    if ($('#checkout-overlay')?.classList.contains('show')) { renderOrderSummary(); updateBilling(); }
  }

  /* ---------- Search + Autocomplete ---------- */
  function renderSuggestions(q){
    const box=$('#search-suggestions'); if(!box) return;
    if(!q){ 
      // show trending + recent
      try{
        const recent=JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY||'jimmi_recent_searches')||'[]');
        const trending=(typeof TRENDING_SEARCHES!=='undefined'?TRENDING_SEARCHES:[]).slice(0,5);
        let html='';
        if(recent.length) html+= `<div class="sugg-head">Recent searches</div>` + recent.map(t=>`<div class="sugg-item" data-sugg="${t}" style="justify-content:space-between"><span style="display:flex;gap:8px;align-items:center"><span>🕒</span><b>${t}</b></span><small style="margin-left:auto;background:#f3efe7;padding:2px 6px;border-radius:999px">↩</small></div>`).join('');
        html+= `<div class="sugg-head">Trending • tap to search</div>` + trending.map(t=>`<div class="sugg-item" data-sugg="${t}"><span>🔥</span><b>${t}</b><small style="margin-left:auto;color:var(--green)">Search →</small></div>`).join('');
        html+= `<div class="sugg-head">Popular — quick add</div>` + PRODUCTS.slice(0,3).map(p=>`<div class="sugg-item" data-sugg="${p.name.toLowerCase()}" style="justify-content:space-between"><div style="display:flex;gap:10px;align-items:center"><img src="${U(p.photo,80)}" alt=""><div><b>${p.name}</b><small>${p.meta} • ₹${p.price}</small></div></div><button class="btn btn--sm" data-add="${p.id}" style="padding:6px 10px;font-size:.72rem" onclick="event.stopPropagation()">Add +</button></div>`).join('');
        box.innerHTML=html; box.classList.add('show');
      }catch(e){ box.classList.remove('show'); }
      return;
    }
    const ql=q.toLowerCase();
    const hits=PRODUCTS.filter(p=>p.name.toLowerCase().includes(ql)||p.meta.toLowerCase().includes(ql)).slice(0,6);
    if(!hits.length){ box.classList.remove('show'); return; }
    box.innerHTML = `<div class="sugg-head">Products • ${hits.length} found — tap to add</div>` + hits.map(p=>`<div class="sugg-item" data-sugg="${p.name.toLowerCase()}" data-id="${p.id}" style="justify-content:space-between"><div style="display:flex;gap:10px;align-items:center"><img src="${U(p.photo,80)}" alt=""><div><b>${p.name}</b><small>${p.meta} • ₹${p.price} • ★${(p.rating||4.5).toFixed(1)}</small></div></div><button class="btn btn--sm" data-add="${p.id}" style="padding:6px 10px;font-size:.72rem" onclick="event.stopPropagation()">Add +</button></div>`).join('');
    box.classList.add('show');
  }

  function search(term) {
    searchQuery = term.trim().toLowerCase();
    if(searchQuery) saveRecentSearch(searchQuery);
    renderSections();
    const msg = $('#search-msg');
    if (!msg) return;
    if (!searchQuery) { msg.textContent = ''; msg.classList.remove('show'); }
    else {
      const hits = getFilteredProducts().length;
      if (hits === 0) {
        msg.textContent = `Sorry, "${term}" is not available in our shop yet. Try mangoes, milk, or biscuits.`;
        msg.classList.add('show', 'show--no');
      } else {
        msg.textContent = `Found ${hits} item${hits > 1 ? 's' : ''} for "${term}" — sorted by ${sortBy}.`;
        msg.classList.add('show');
        msg.classList.remove('show--no');
        if(hits) $('#catalog').scrollIntoView({ behavior: 'smooth' });
      }
    }
    const sugg=$('#search-suggestions'); if(sugg) sugg.classList.remove('show');
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(text) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    const sr=$('#sr-announcer'); if(sr) sr.textContent=text;
  }

  /* ---------- Deal rotation + live timer ---------- */
  function startDeals() {
    const dealsEl = $('#deal-offers');
    if (dealsEl) {
      const deals = PRODUCTS.filter(p => p.badge && p.badge.type === 'off').slice(0, 4);
      let i = 0;
      function paint() {
        const p = deals[i % deals.length];
        dealsEl.innerHTML = `
          <div class="deal-card">
            <img src="${U(p.photo, 240)}" alt="${p.name}" loading="lazy"
                 onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
            <div class="deal-info">
              <span class="deal-tag">Deal of the day • ${Math.round((1-p.price/p.mrp)*100)}% off</span>
              <h3>${p.name}</h3>
              <p class="price">₹${p.price} <small style="text-decoration:line-through;opacity:.7">₹${p.mrp}</small></p>
              <button class="btn btn--sm" data-deal="${p.id}">Add to cart • ${p.rating? '★'+p.rating.toFixed(1):''}</button>
            </div>
          </div>`;
        i++;
      }
      paint();
      setInterval(paint, 3500);
    }
    const hEl = $('#deal-h'), mEl = $('#deal-m'), sEl = $('#deal-s');
    if (hEl && mEl && sEl) {
      function tick(){
        const now = new Date();
        const end = new Date(); end.setHours(23,59,59,999);
        let diff = Math.max(0, end - now);
        const h = String(Math.floor(diff/3.6e6)).padStart(2,'0');
        const m = String(Math.floor(diff%3.6e6/6e4)).padStart(2,'0');
        const s = String(Math.floor(diff%6e4/1e3)).padStart(2,'0');
        hEl.textContent = h; mEl.textContent = m; sEl.textContent = s;
      }
      tick(); setInterval(tick, 1000);
    }
  }

  /* =========================================================
     CHECKOUT (kept PRO)
     ========================================================= */
  const COUPONS = {
    FRESH10:  { type: 'percent', value: 10, max: 100, label: '10% off' },
    SAVE50:   { type: 'flat', value: 50, label: '₹50 off' },
    FREEDEL:  { type: 'delivery', value: 0, label: 'Free delivery' },
  };

  const checkout = {
    step: 1,
    slot: 'express',
    tip: 30,
    giftWrap: false,
    giftMsg: '',
    deliveryInstr: '',
    couponCode: '',
    discount: 0,
    loyaltyDiscount: 0,
    payment: 'upi',
  };

  function getSubtotal() {
    return cart.reduce((s, line) => {
      const p = PRODUCTS.find(x => x.id === line.id);
      return s + (p ? p.price * line.qty : 0);
    }, 0);
  }

  function getDeliveryFee() {
    if (getSubtotal() >= FREE_DELIVERY_MIN) return 0;
    if (checkout.slot === 'express') return 25;
    return 0;
  }
  function getSubsDiscount(){
    try{
      const subs=JSON.parse(localStorage.getItem('jimmi_subs')||'[]');
      if(!subs.length) return 0;
      let disc=0;
      cart.forEach(line=>{
        if(subs.includes(line.id)){
          const p=PRODUCTS.find(x=>x.id===line.id);
          if(p) disc += Math.round(p.price * line.qty * 0.05);
        }
      });
      return disc;
    }catch(e){ return 0; }
  }

  function getTotal() {
    let total = getSubtotal() + getDeliveryFee() + checkout.tip;
    if (checkout.giftWrap) total += 25;
    total -= checkout.discount;
    total -= checkout.loyaltyDiscount || 0;
    total -= getSubsDiscount();
    return Math.max(0, total);
  }

  function applyCoupon(code) {
    const c = COUPONS[code.toUpperCase()];
    const msg = $('#co-coupon-msg');
    const pill = $('#co-coupon-pill');
    if (!c) {
      if (msg) { msg.textContent = 'Invalid coupon — try FRESH10, SAVE50 or FREEDEL'; msg.className = 'co-coupon-msg show error'; }
      checkout.discount = 0;
      checkout.couponCode = '';
      if (pill) pill.textContent = '';
      updateBilling();
      return;
    }
    const sub = getSubtotal();
    if (c.type === 'percent') {
      checkout.discount = Math.min(Math.round(sub * c.value / 100), c.max || Infinity);
    } else if (c.type === 'flat') {
      checkout.discount = c.value;
    } else if (c.type === 'delivery') {
      checkout.discount = getDeliveryFee();
    }
    checkout.couponCode = code.toUpperCase();
    if (msg) { msg.textContent = `✓ Coupon applied — ${c.label}`; msg.className = 'co-coupon-msg show success'; }
    if (pill) pill.textContent = checkout.couponCode;
    updateBilling();
  }

  function updateBilling() {
    const sub = getSubtotal();
    const del = getDeliveryFee();
    const tip = checkout.tip;
    const gift = checkout.giftWrap ? 25 : 0;
    const disc = checkout.discount;
    const loyalty = checkout.loyaltyDiscount || 0;
    const subs = getSubsDiscount();
    const total = Math.max(0, sub + del + tip + gift - disc - loyalty - subs);
    const saving = disc + loyalty + subs + (del === 0 && checkout.slot !== 'express' ? 25 : 0);

    const el = id => $(id);
    if (el('#co-subtotal')) el('#co-subtotal').textContent = '₹' + sub;
    if (el('#co-delivery-fee')) {
      const e = el('#co-delivery-fee');
      e.textContent = del === 0 ? 'Free' : '₹' + del;
      e.style.color = del === 0 ? '#16a34a' : '';
      e.style.fontWeight = del === 0 ? '800' : '';
    }
    if (el('#co-tip-amount')) el('#co-tip-amount').textContent = '₹' + tip;
    if (el('#co-total')) el('#co-total').textContent = '₹' + total;
    if (el('#co-final-total')) el('#co-final-total').textContent = '₹' + total;
    if (el('#co-pay-amount')) el('#co-pay-amount').textContent = '₹' + total;

    const count = cart.reduce((s,c)=>s+c.qty,0);
    const countLabel = count + ' item' + (count!==1?'s':'');
    if (el('#co-items-count')) el('#co-items-count').textContent = countLabel;
    if (el('#co-items-count-side')) el('#co-items-count-side').textContent = countLabel;

    const giftRow = el('#co-gift-row');
    if (giftRow) giftRow.classList.toggle('hide', !checkout.giftWrap);
    const discRow = el('#co-discount-row');
    if (discRow) {
      discRow.classList.toggle('hide', disc === 0);
      const val = discRow.querySelector('.co-discount-val');
      if (val) val.textContent = '-₹' + disc;
      const pill = el('#co-coupon-pill');
      if (pill && checkout.couponCode) pill.textContent = checkout.couponCode;
    }
    // subs row
    const subsRow = el('#co-subs-row');
    if(subsRow){
      subsRow.classList.toggle('hide', subs===0);
      const v3=subsRow.querySelector('#co-subs-val') || subsRow.querySelector('.co-discount-val');
      if(v3) v3.textContent='-₹'+subs;
    }
    // loyalty row
    const loyaltyRow = el('#co-loyalty-row');
    if (loyaltyRow) {
      loyaltyRow.classList.toggle('hide', loyalty === 0);
      const v2 = loyaltyRow.querySelector('.co-discount-val');
      if (v2) v2.textContent = '-₹' + loyalty;
    }

    const savingEl = el('#co-saving');
    if (savingEl) {
      if (saving > 0 || disc > 0 || loyalty>0 || subs>0) {
        const parts=[];
        if(disc>0) parts.push(`₹${disc} coupon`);
        if(loyalty>0) parts.push(`₹${loyalty} coins`);
        if(subs>0) parts.push(`₹${subs} subs`);
        if(parts.length) savingEl.textContent = `You save ₹${saving} (${parts.join(' + ')}) 🎉`;
        else savingEl.textContent = `You save ₹25 on delivery`;
        savingEl.classList.add('show');
      } else {
        savingEl.classList.remove('show');
      }
    }

    const addrBadge = el('#co-addr-badge');
    if (addrBadge) {
      const user = JSON.parse(localStorage.getItem('jimmi_user') || '{}');
      const ok = !!(user.name && user.address);
      addrBadge.textContent = ok ? '✓ Saved' : 'Required';
      addrBadge.style.background = ok ? '#f0fdf4' : '#fef2f2';
      addrBadge.style.color = ok ? '#166534' : '#991b1b';
      addrBadge.style.borderColor = ok ? '#bbf7d0' : '#fecaca';
    }
  }

  function renderOrderSummary() {
    const wrap = $('#co-order-items');
    if (!wrap) return;
    if (!cart.length) {
      wrap.innerHTML = `<div style="text-align:center;padding:18px;color:#6b7a72;font-size:.88rem">No items yet — add some fresh goodies!</div>`;
      return;
    }
    wrap.innerHTML = cart.map(line => {
      const p = PRODUCTS.find(x => x.id === line.id);
      if (!p) return '';
      return `
        <div class="co-order-item">
          <img src="${U(p.photo, 120)}" alt="${p.name}" loading="lazy"
               onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
          <div class="co-order-item-info">
            <h5>${p.name}</h5>
            <small>${p.meta} • ★${(p.rating||4.5).toFixed(1)}</small>
          </div>
          <span class="co-order-item-qty">×${line.qty}</span>
          <span class="co-order-item-price">₹${p.price * line.qty}</span>
        </div>`;
    }).join('');
    updateBilling();
  }

  function loadAddress() {
    const user = JSON.parse(localStorage.getItem('jimmi_user') || '{}');
    const text = $('#co-address-text');
    const display = $('#co-address-display');
    const form = $('#co-address-form');

    if (user.name && user.address) {
      const landmark = user.landmark ? ` · ${user.landmark}` : '';
      text.innerHTML = `<b>${user.name}</b> · 📞 ${user.phone || ''}<br>${user.address}${landmark}, <b>${user.pincode || ''}</b>`;
      if (display) display.classList.remove('hide');
      if (form) form.classList.add('hide');
    } else {
      if (text) text.textContent = 'No address saved — please add your delivery address.';
      if (display) display.classList.remove('hide');
      if (form) form.classList.remove('hide');
      if (display) display.style.borderStyle = 'dashed';
    }
    updateBilling();
  }

  function goCOStep(n) {
    checkout.step = n;
    $$('.co-panel').forEach((p, i) => p.classList.toggle('active', i === n - 1));
    $$('.co-step').forEach((s, i) => {
      s.classList.toggle('active', i === n - 1);
      s.classList.toggle('done', i < n - 1);
    });
    $$('.co-step-line i').forEach((line, i) => {
      line.style.width = i < n - 1 ? '100%' : '0%';
    });
    const prog = $('#checkout-overlay .checkout-steps');
    if (prog) prog.setAttribute('aria-valuenow', String(n));
    const body = $('.co-pro-body');
    if (body) body.scrollTop = 0;
    updateBilling();
  }

  function openCheckout() {
    if (!cart.length) { toast('Your cart is empty!'); return; }
    const overlay = $('#checkout-overlay');
    if (!overlay) return;
    renderOrderSummary();
    loadAddress();
    goCOStep(1);
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeCheckout() {
    const overlay = $('#checkout-overlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  function bindCheckout() {
    document.addEventListener('click', e => {
      const coBtn = e.target.closest('#cart-checkout-btn') || e.target.closest('.cart-foot .btn');
      if (coBtn && cart.length && e.target.closest('#cart')) { e.preventDefault(); openCheckout(); closeCartDrawer(); return; }
    });
    const closeBtn = $('#close-checkout');
    if (closeBtn) closeBtn.addEventListener('click', closeCheckout);
    const overlay = $('#checkout-overlay');
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeCheckout(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay && overlay.classList.contains('show')) closeCheckout(); });

    const editAddr = $('#co-edit-address');
    if (editAddr) editAddr.addEventListener('click', () => {
      const form = $('#co-address-form');
      const isHidden = form.classList.contains('hide');
      form.classList.remove('hide');
      if (isHidden) {
        const user = JSON.parse(localStorage.getItem('jimmi_user') || '{}');
        if ($('#co-name')) $('#co-name').value = user.name || '';
        if ($('#co-phone')) $('#co-phone').value = user.phone || '';
        if ($('#co-full-address')) $('#co-full-address').value = user.address || '';
        if ($('#co-pincode')) $('#co-pincode').value = user.pincode || '';
        if ($('#co-landmark')) $('#co-landmark').value = user.landmark || '';
        $('#co-name')?.focus();
      } else {
        const user = JSON.parse(localStorage.getItem('jimmi_user') || '{}');
        if (user.name && user.address) form.classList.add('hide');
      }
    });

    const editCart = $('#co-edit-cart');
    if (editCart) editCart.addEventListener('click', () => { closeCheckout(); setTimeout(()=>{ $('#cart')?.classList.add('cart--open'); $('#cart-overlay')?.classList.add('show'); }, 180); });

    const saveAddr = $('#co-save-address');
    if (saveAddr) saveAddr.addEventListener('click', () => {
      const name = $('#co-name')?.value.trim() || '';
      const phone = $('#co-phone')?.value.trim() || '';
      const address = $('#co-full-address')?.value.trim() || '';
      const pincode = $('#co-pincode')?.value.trim() || '';
      if (!name || name.length < 2) { toast('Please enter your name'); $('#co-name')?.focus(); return; }
      if (!/^\d{10}$/.test(phone)) { toast('Enter a valid 10-digit phone'); $('#co-phone')?.focus(); return; }
      if (!address || address.length < 10) { toast('Please enter a full address'); $('#co-full-address')?.focus(); return; }
      if (!/^\d{6}$/.test(pincode)) { toast('Enter a valid 6-digit pincode'); $('#co-pincode')?.focus(); return; }
      const prev = JSON.parse(localStorage.getItem('jimmi_user') || '{}');
      const profile = {
        name, phone, address, pincode,
        landmark: $('#co-landmark')?.value.trim() || '',
        age: prev.age || '',
        email: prev.email || '',
        photo: prev.photo || '',
      };
      localStorage.setItem('jimmi_user', JSON.stringify(profile));
      loadAddress();
      $('#co-address-form')?.classList.add('hide');
      toast('Address saved ✓');
    });

    const applyBtn = $('#co-apply-coupon');
    const couponInput = $('#co-coupon-input');
    if (applyBtn) applyBtn.addEventListener('click', () => {
      const code = couponInput ? couponInput.value.trim() : '';
      if (code) applyCoupon(code);
      else toast('Enter a coupon code');
    });
    if (couponInput) couponInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyBtn?.click(); } });
    $$('.co-coupon-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        if (couponInput) couponInput.value = tag.dataset.code;
        applyCoupon(tag.dataset.code);
      });
    });

    $$('.co-tip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.co-tip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.tip;
        if (val === 'custom') {
          $('#co-tip-custom').classList.remove('hide');
          return;
        }
        $('#co-tip-custom').classList.add('hide');
        checkout.tip = parseInt(val, 10);
        updateBilling();
      });
    });
    const setTip = $('#co-set-tip');
    if (setTip) setTip.addEventListener('click', () => {
      const v = parseInt($('#co-custom-tip').value, 10);
      if (v >= 0) { checkout.tip = v; updateBilling(); toast('Tip set to ₹' + v); }
    });

    const giftToggle = $('#co-gift-wrap');
    if (giftToggle) giftToggle.addEventListener('change', () => {
      checkout.giftWrap = giftToggle.checked;
      const msg = $('#co-gift-message');
      if (msg) {
        msg.classList.toggle('hide', !giftToggle.checked);
        if (!msg.classList.contains('hide')) setTimeout(()=> msg.focus(), 120);
      }
      updateBilling();
    });
    const giftMsg = $('#co-gift-message');
    if (giftMsg) giftMsg.addEventListener('input', () => { checkout.giftMsg = giftMsg.value; });
    const deliInstr = $('#co-delivery-instr');
    if (deliInstr) deliInstr.addEventListener('input', () => { checkout.deliveryInstr = deliInstr.value; });

    $$('.co-slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.co-slot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        checkout.slot = btn.dataset.slot;
        $('#co-schedule-picker')?.classList.toggle('hide', checkout.slot !== 'scheduled');
        if (checkout.couponCode === 'FREEDEL') {
          checkout.discount = getDeliveryFee();
          const msg = $('#co-coupon-msg');
          if (msg) msg.textContent = `✓ Coupon applied — Free delivery`;
        }
        updateBilling();
      });
    });

    $$('.co-payment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.co-payment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        checkout.payment = btn.dataset.pay;
        $$('.co-pay-form').forEach(f => f.classList.remove('active'));
        const form = $(`#co-form-${checkout.payment}`);
        if (form) form.classList.add('active');
      });
    });

    const toSlot = $('#co-to-slot');
    if (toSlot) toSlot.addEventListener('click', () => {
      const user = JSON.parse(localStorage.getItem('jimmi_user') || '{}');
      if (!user.name || !user.address) {
        toast('Please save your delivery address first');
        $('#co-address-form')?.classList.remove('hide');
        $('#co-name')?.focus();
        return;
      }
      if (!cart.length) { toast('Your cart is empty'); return; }
      goCOStep(2);
    });
    const toPayment = $('#co-to-payment');
    if (toPayment) toPayment.addEventListener('click', () => goCOStep(3));
    const backAddr = $('#co-back-address');
    if (backAddr) backAddr.addEventListener('click', () => goCOStep(1));
    const backSlot = $('#co-back-slot');
    if (backSlot) backSlot.addEventListener('click', () => goCOStep(2));

    const placeOrder = $('#co-place-order');
    if (placeOrder) placeOrder.addEventListener('click', () => {
      if (!cart.length) { toast('Cart is empty'); return; }
      const orig = placeOrder.innerHTML;
      placeOrder.innerHTML = '<span>Processing…</span>';
      placeOrder.disabled = true;
      placeOrder.style.opacity = '.7';
      setTimeout(() => {
        const orderId = 'JM-' + String(Math.floor(100000 + Math.random() * 900000));
        const oid = $('#co-order-id');
        if (oid) oid.textContent = 'Order #' + orderId;
        $$('.co-panel').forEach(p => p.classList.remove('active'));
        $('#co-panel-success')?.classList.add('active');
        $$('.checkout-steps .co-step').forEach(s=> s.classList.add('done'));
        // store order history
        try{
          let hist=JSON.parse(localStorage.getItem('jimmi_orders')||'[]');
          hist.unshift({id:orderId, total:getTotal(), items:[...cart], date:new Date().toISOString()});
          localStorage.setItem('jimmi_orders', JSON.stringify(hist.slice(0,20)));
        }catch(e){}
        cart.length = 0;
        renderCart();
        updateCartCount();
        renderOrderSummary();
        updateBilling();
        toast('Order placed successfully! 🎉');
        placeOrder.innerHTML = orig;
        placeOrder.disabled = false;
        placeOrder.style.opacity = '';
      }, 1300);
    });

    const doneBtn = $('#co-done');
    if (doneBtn) doneBtn.addEventListener('click', () => {
      closeCheckout();
      checkout.couponCode = ''; checkout.discount = 0; checkout.loyaltyDiscount = 0; checkout.tip = 30; checkout.giftWrap = false;
      const couponMsg = $('#co-coupon-msg'); if (couponMsg) couponMsg.className = 'co-coupon-msg hide';
      const couponInput = $('#co-coupon-input'); if (couponInput) couponInput.value = '';
      setTimeout(()=> location.reload(), 200);
    });
  }

  /* ---------- Event wiring ---------- */
  function closeCartDrawer() {
    const cartEl = $('#cart');
    const overlay = $('#cart-overlay');
    if (cartEl) cartEl.classList.remove('cart--open');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow='';
  }
  function openWishlistDrawer(){
    renderWishlist();
    $('#wishlist')?.classList.add('wishlist--open');
    $('#wishlist-overlay')?.classList.add('show');
    document.body.style.overflow='hidden';
  }
  function closeWishlistDrawer(){
    $('#wishlist')?.classList.remove('wishlist--open');
    $('#wishlist-overlay')?.classList.remove('show');
    document.body.style.overflow='';
  }

  function bind() {
    document.addEventListener('click', e => {
      const qv = e.target.closest('[data-qv]');
      if (qv && !e.target.closest('[data-add]') && !e.target.closest('[data-wish]') && !e.target.closest('.step')) {
        const id = qv.dataset.qv;
        if(id) { openQuickView(id); return; }
      }
      const add = e.target.closest('[data-add]');
      if (add) { addToCart(add.dataset.add); return; }
      const step = e.target.closest('[data-step]');
      if (step) {
        const id = step.closest('[data-stepper]').dataset.stepper;
        changeQty(id, parseInt(step.dataset.step, 10));
        return;
      }
      const rm = e.target.closest('[data-remove]');
      if (rm) {
        const id = rm.dataset.remove;
        const idx = cart.findIndex(c=>c.id===id);
        if (idx>-1) cart.splice(idx,1);
        renderCart(); updateCartCount();
        if ($('#checkout-overlay')?.classList.contains('show')) { renderOrderSummary(); updateBilling(); }
        toast('Removed from basket');
        return;
      }
      const wish = e.target.closest('[data-wish]');
      if (wish) { toggleWish(wish.dataset.wish); return; }
      const deal = e.target.closest('[data-deal]');
      if (deal) { addToCart(deal.dataset.deal); return; }
      const openCart = e.target.closest('#open-cart') || e.target.closest('#mobile-bar-checkout');
      if (openCart) { $('#cart').classList.add('cart--open'); $('#cart-overlay').classList.add('show'); document.body.style.overflow='hidden'; return; }
      const closeCart = e.target.closest('#close-cart') || e.target.closest('#cart-overlay');
      if (closeCart) { closeCartDrawer(); return; }
      const openWish = e.target.closest('#open-wishlist');
      if (openWish){ openWishlistDrawer(); return; }
      const closeWish = e.target.closest('#close-wishlist') || e.target.closest('#wishlist-overlay') || e.target.closest('#wishlist-shop');
      if (closeWish){ closeWishlistDrawer(); return; }
      const wishClear = e.target.closest('#wishlist-clear');
      if(wishClear){ if(!wishlist.size){ toast('Wishlist empty'); return; } if(confirm('Clear wishlist?')){ wishlist.clear(); saveWishlist(); updateWishlistCount(); renderWishlist(); document.querySelectorAll('.wish.is-saved').forEach(b=>{ b.classList.remove('is-saved'); const l=b.querySelector('.wish-label'); if(l) l.textContent='Save'; }); toast('Wishlist cleared'); } return; }
      const wishAddAll = e.target.closest('#wishlist-addall');
      if(wishAddAll){ if(!wishlist.size){ toast('Wishlist empty'); return; } let added=0; [...wishlist].forEach(id=>{ const p=PRODUCTS.find(x=>x.id===id); if(p && p.stock>0){ addToCart(id); added++; } }); if(added) toast(`Added ${added} wishlist items to cart 🧺`); return; }
      const sugg = e.target.closest('[data-sugg]');
      if(sugg && sugg.closest('#search-suggestions')){
        const term=sugg.dataset.sugg;
        const inp=$('#search-input'); if(inp) inp.value=term;
        search(term);
        $('#search-suggestions')?.classList.remove('show');
        return;
      }
      // close suggestions when clicking outside
      if(!e.target.closest('.search-wrap')) $('#search-suggestions')?.classList.remove('show');
    });

    // chips
    $$('.chip').forEach(chip=>{
      chip.addEventListener('click',()=>{
        $$('.chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter=chip.dataset.filter;
        renderSections();
      });
    });
    // sort
    const sortSel=$('#sort-select');
    if(sortSel) sortSel.addEventListener('change',e=>{ sortBy=e.target.value; renderSections(); const label=e.target.options[e.target.selectedIndex]?.text||sortBy; toast(`Sorted: ${label}`); });
    // advanced filters
    const priceRange=$('#price-range'); const priceVal=$('#price-val');
    if(priceRange){ 
      priceRange.addEventListener('input', e=>{ advPriceMax=parseInt(e.target.value,10); if(priceVal) priceVal.textContent='₹'+advPriceMax; renderSections(); });
      priceRange.addEventListener('change', e=>{ const cnt=getFilteredProducts().length; toast(`Price ≤₹${advPriceMax} — ${cnt} products`); });
    }
    const vegCb=$('#filter-veg'); if(vegCb) vegCb.addEventListener('change', e=>{ advVegOnly=e.target.checked; renderSections(); toast(advVegOnly? 'Veg only — showing vegetarian' : 'Veg filter off'); });
    const stockCb=$('#filter-stock'); if(stockCb) stockCb.addEventListener('change', e=>{ advInStock=e.target.checked; renderSections(); toast(advInStock? 'In stock only' : 'Showing all stock'); });
    const ratingCb=$('#filter-rating'); if(ratingCb) ratingCb.addEventListener('change', e=>{ advHighRating=e.target.checked; renderSections(); toast(advHighRating? '★4.5+ only' : 'All ratings'); });
    $('#clear-adv-filters')?.addEventListener('click', ()=>{ clearFilters(); });
    // clear recent
    $('#clear-recent')?.addEventListener('click',()=>{ localStorage.removeItem(RECENT_VIEW_KEY||'jimmi_recent_views'); renderRecentlyViewed(); toast('Cleared recently viewed'); });

    // quick view close
    $('#close-quickview')?.addEventListener('click', closeQuickView);
    $('#quick-view')?.addEventListener('click', e=>{ if(e.target.id==='quick-view') closeQuickView(); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ closeQuickView(); closeWishlistDrawer(); } });

    const sb = $('#search-input');
    const sclear = $('#search-clear');
    const suggBox=$('#search-suggestions');
    if (sb) {
      sb.addEventListener('input', e => {
        const v=e.target.value;
        searchQuery=v.trim().toLowerCase();
        renderSuggestions(v.trim());
        if (sclear) sclear.classList.toggle('show', v.length>0);
        // live filter (debounce style — immediate for pro feel)
        renderSections();
        const msg=$('#search-msg');
        if(!v) { if(msg) msg.classList.remove('show'); }
      });
      sb.addEventListener('focus', ()=> renderSuggestions(sb.value.trim()));
      sb.addEventListener('keydown', e=> {
        if(e.key==='Escape'){ sb.value=''; searchQuery=''; renderSections(); sclear?.classList.remove('show'); suggBox?.classList.remove('show'); sb.blur(); const msg=$('#search-msg'); if(msg) msg.classList.remove('show'); }
        if(e.key==='Enter'){ e.preventDefault(); search(sb.value); }
      });
      // keyboard shortcut: press "/" to focus search when not typing
      document.addEventListener('keydown', e=>{
        if(e.key==='/' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName!=='INPUT' && document.activeElement.tagName!=='TEXTAREA' && !document.querySelector('.modal--open') && !document.getElementById('checkout-overlay')?.classList.contains('show')){
          e.preventDefault();
          sb.focus();
          sb.select();
          renderSuggestions(sb.value.trim());
        }
        if(e.key==='k' && (e.ctrlKey||e.metaKey)){
          e.preventDefault();
          sb.focus();
        }
      });
    }
    if (sclear) sclear.addEventListener('click', ()=> { if(sb){ sb.value=''; searchQuery=''; renderSections(); sclear.classList.remove('show'); suggBox?.classList.remove('show'); sb.focus(); const msg=$('#search-msg'); if(msg) msg.classList.remove('show'); }});
    const sbBtn = $('#search-btn');
    if (sbBtn) sbBtn.addEventListener('click', () => search($('#search-input').value));
  }

  function getCart() { return cart; }
  function findProductByName(q) {
    const t = q.toLowerCase();
    return PRODUCTS.filter(p => (p.name + ' ' + p.meta + ' ' + (p.desc||'')).toLowerCase().includes(t));
  }
  function getProductById(id){ return PRODUCTS.find(p=>p.id===id); }

  function init() {
    renderSections();
    renderCart();
    updateCartCount();
    updateWishlistCount();
    renderWishlist();
    renderRecentlyViewed();
    renderTrending();
    renderCombos();
    startDeals();
    bind();
    bindCheckout();
    const skel=$('#skeleton-grid'); if(skel) setTimeout(()=> skel.style.display='none', 700);
  }

  return { init, toast, addToCart, changeQty, getCart, findProductByName, getProductById, getSubtotal, getDeliveryFee, getTotal, checkout, cart, wishlist, clearFilters, openQuickView, closeQuickView, renderWishlist, updateWishlistCount, updateBilling, renderOrderSummary, setAdvFilters, getFilteredProducts };
})();
