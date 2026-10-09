/* =========================================================
   features.js — NEW Pro features for Jimmi Store
   - Order History drawer (reorder / cancel / track)
   - Compare products (up to 3)
   - Share product (Web Share + copy)
   - Reviews (localStorage, quick-view integrated)
   - Loyalty coins (1 per ₹10)
   - Notify when back in stock
   ========================================================= */
(function(){
'use strict';
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

// ---- Helpers to access globals safely ----
function getProds(){ try{ return typeof PRODUCTS!=='undefined'?PRODUCTS:window.PRODUCTS||[];}catch(e){return[];}}
function getCats(){ try{ return typeof CATEGORIES!=='undefined'?CATEGORIES:window.CATEGORIES||[];}catch(e){return[];}}
function getU(){ try{ return typeof U!=='undefined'?U:window.U;}catch(e){return (id,w)=> 'https://images.unsplash.com/photo-'+id+'?auto=format&fit=crop&w='+(w||400)+'&q=70';}}
let Ufn = null; try{ Ufn = getU(); }catch(e){}
function imgSrc(id,w){ if(Ufn) try{ return Ufn(id,w);}catch(e){} return 'https://images.unsplash.com/photo-'+id+'?auto=format&fit=crop&w='+(w||400)+'&q=70';}
const FALLBACK = (function(){ try{ return typeof FALLBACK_IMG!=='undefined'?FALLBACK_IMG:imgSrc('1767032916116-2460bbd4a27d',400);}catch(e){return '';}})();

// ---- Loyalty ----
const LOYALTY_KEY='jimmi_loyalty';
const NOTIFY_KEY='jimmi_notify';
const REVIEWS_KEY='jimmi_reviews';
const COMPARE_KEY='jimmi_compare';
const SUBS_KEY='jimmi_subs';
const REFER_KEY='jimmi_refer';
const REFER_CODE_KEY='jimmi_refer_code';

function getLoyalty(){ try{ return parseInt(localStorage.getItem(LOYALTY_KEY)||'0',10)||0;}catch(e){return 0;}}
function setLoyalty(v){ try{ localStorage.setItem(LOYALTY_KEY, String(v)); }catch(e){}}
function updateLoyaltyChip(){
  const el=$('#loyalty-points');
  if(el) el.textContent = getLoyalty();
  const chip=$('#loyalty-chip');
  if(chip) chip.title = getLoyalty()+' coins — redeem at checkout (10 coins = ₹10 off)';
}
function earnCoins(amount){
  if(!amount||amount<=0) return;
  const coins = Math.floor(amount/10);
  if(!coins) return;
  const cur=getLoyalty()+coins;
  setLoyalty(cur);
  updateLoyaltyChip();
  showCoinPop(`+${coins} coins earned! 🪙`);
  try{ if(window.Store&&Store.toast) Store.toast(`Earned ${coins} loyalty coins 🪙`);}catch(e){}
}
function showCoinPop(text){
  let el=document.getElementById('coin-pop');
  if(!el){
    el=document.createElement('div');
    el.id='coin-pop';
    el.className='coin-pop';
    document.body.appendChild(el);
  }
  el.textContent=text;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t=setTimeout(()=> el.classList.remove('show'), 2200);
}

// ---- Orders ----
function getOrders(){
  try{
    let arr=JSON.parse(localStorage.getItem('jimmi_orders')||'[]');
    if(!arr.length){
      // seed demo if empty (from chat.js demo)
      arr=[
        { id:'88271', items:[{id:'p1',qty:1},{id:'p2',qty:2}], total:327, slot:'2026-08-29 18:00', status:'unfulfilled', date:new Date(Date.now()-3600000).toISOString(), payment:'upi' },
        { id:'55491', items:[{id:'p6',qty:1}], total:79, slot:'2026-08-29 19:00', status:'unfulfilled', date:new Date(Date.now()-7200000).toISOString(), payment:'card' },
        { id:'44591', items:[{id:'p13',qty:1}], total:189, slot:'2026-08-29 10:00', status:'delivered', date:new Date(Date.now()-86400000).toISOString(), payment:'cod' }
      ];
      localStorage.setItem('jimmi_orders', JSON.stringify(arr));
    }
    return arr;
  }catch(e){ return []; }
}
function saveOrders(arr){ try{ localStorage.setItem('jimmi_orders', JSON.stringify(arr)); }catch(e){} }
function renderOrders(){
  const body=$('#orders-body');
  const countEl=$('#orders-count');
  if(!body) return;
  const orders=getOrders();
  if(countEl){
    countEl.textContent=orders.length;
    countEl.style.display=orders.length?'grid':'none';
  }
  if(!orders.length){
    body.innerHTML=`<div class="cart-empty"><div class="cart-empty-icon">📦</div><h4>No orders yet</h4><p>Your fresh deliveries will appear here. Add items and checkout — we’ll track everything.</p><a href="#cat-fresh" class="btn btn--sm" onclick="closeOrdersDrawer();document.getElementById('catalog').scrollIntoView({behavior:'smooth'})">Start shopping</a></div>`;
    return;
  }
  body.innerHTML=orders.map(o=>{
    const date = o.date? new Date(o.date).toLocaleString('en-IN',{dateStyle:'medium', timeStyle:'short'}): o.slot||'';
    const items = Array.isArray(o.items)? o.items : [];
    const itemCount = items.reduce((s,it)=> s+(it.qty||1),0);
    const products = items.map(it=>{
      const p=getProds().find(x=>x.id===it.id) || {name:it.name||it.id, photo:'1767032916116-2460bbd4a27d', price:0};
      const qty=it.qty||1;
      return `<div class="order-item-mini"><img src="${imgSrc(p.photo,120)}" alt="${p.name}" onerror="this.onerror=null;this.src='${FALLBACK}'"><small>${p.name}</small><small style="color:#1d5638;font-weight:800">×${qty}</small></div>`;
    }).join('');
    const total = o.total || items.reduce((s,it)=>{ const p=getProds().find(x=>x.id===it.id); return s+(p? p.price * (it.qty||1):0);},0);
    const statusCls = o.status==='delivered'?'order-status--delivered': o.status==='cancelled'?'order-status--cancelled':'order-status--unfulfilled';
    const canCancel = o.status==='unfulfilled';
    const canReorder = true;
    return `<div class="order-card">
      <div class="order-card-head"><div><b>#${o.id}</b><div style="font-size:.76rem;color:var(--muted)">${date} • ${itemCount} items • ${o.payment||'upi'} • ₹${total}</div></div><span class="order-status ${statusCls}">${o.status}</span></div>
      <div class="order-items">${products || '<small style="color:var(--muted)">Items: '+(o.items?.join?.(', ') || JSON.stringify(o.items))+'</small>'}</div>
      <div class="order-actions">
        <button class="btn btn--sm" data-reorder="${o.id}" type="button">Reorder</button>
        <button class="btn btn--ghost btn--sm" data-track="${o.id}" type="button">Track</button>
        ${canCancel?`<button class="btn btn--ghost btn--sm" data-cancel="${o.id}" type="button" style="color:#dc2626;border-color:#fecaca;background:#fef2f2">Cancel</button>`:''}
        <button class="btn btn--ghost btn--sm" data-invoice="${o.id}" type="button">Invoice</button>
      </div>
    </div>`;
  }).join('');
}
function openOrdersDrawer(){ renderOrders(); $('#orders-drawer')?.classList.add('wishlist--open'); $('#orders-overlay')?.classList.add('show'); document.body.style.overflow='hidden'; }
function closeOrdersDrawer(){ $('#orders-drawer')?.classList.remove('wishlist--open'); $('#orders-overlay')?.classList.remove('show'); document.body.style.overflow=''; }
function reorderOrder(id){
  const orders=getOrders();
  const o=orders.find(x=> String(x.id)===String(id));
  if(!o){ Store.toast('Order not found'); return; }
  const prods=getProds();
  let added=0;
  (o.items||[]).forEach(it=>{
    const pid=it.id||it;
    const qty=it.qty||1;
    const p=prods.find(x=>x.id===pid);
    if(p){
      for(let i=0;i<qty;i++) Store.addToCart(p.id);
      added+=qty;
    }
  });
  if(added) Store.toast(`Reordered #${o.id} — ${added} items added 🧺`);
  closeOrdersDrawer();
  setTimeout(()=> $('#cart')?.classList.add('cart--open'), 400);
}
function cancelOrder(id){
  let orders=getOrders();
  const o=orders.find(x=> String(x.id)===String(id));
  if(!o) return;
  if(o.status!=='unfulfilled'){ Store.toast('Only unfulfilled orders can be cancelled'); return; }
  if(!confirm(`Cancel order #${o.id}? Refund in 3–5 days.`)) return;
  o.status='cancelled';
  saveOrders(orders);
  renderOrders();
  Store.toast(`Order #${o.id} cancelled ✓`);
}
function trackOrder(id){
  const steps=['Order placed','Packed','Out for delivery','Delivered'];
  const o=getOrders().find(x=> String(x.id)===String(id));
  const cur = o?.status==='delivered'?3: o?.status==='cancelled'?-1: Math.floor(Math.random()*2)+1;
  let html=`<div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px">`;
  steps.forEach((s,i)=>{
    const done = cur>=i;
    const active = cur===i;
    html+=`<div style="flex:1;text-align:center"><div style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;margin:0 auto 6px;font-weight:800;font-size:.8rem;${done? 'background:#16a34a;color:#fff;border:2px solid #16a34a':'background:#fff;border:2px solid #ece3d6;color:#9ab0a3'}">${done?'✓':i+1}</div><small style="font-weight:${active?'800':'600'};color:${done?'#166534':'#6b7a72'}">${s}</small></div>`;
    if(i<steps.length-1) html+=`<div style="flex:0 0 24px;height:3px;background:${cur>i?'#16a34a':'#ece3d6'};align-self:center;margin-top:-16px;border-radius:999px"></div>`;
  });
  html+=`</div>`;
  if(o?.status==='cancelled') html=`<div style="text-align:center;padding:18px;background:#fef2f2;border:1px solid #fecaca;border-radius:14px;color:#991b1b;font-weight:700;margin-top:12px">This order was cancelled — refund initiated.</div>`+html;
  Store.toast('Tracking #' + id);
  // show in modal-ish via orders drawer detail
  const body=$('#orders-body');
  // inject a temporary tracking card at top
  const trackCard=document.createElement('div');
  trackCard.className='order-card';
  trackCard.style.borderColor='#bbf7d0';
  trackCard.style.background='linear-gradient(180deg,#fff,#f0fdf4)';
  trackCard.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#1d5638">Tracking #${id}</b><button class="cart-close" onclick="this.closest('.order-card').remove()" style="width:28px;height:28px">×</button></div><div style="font-size:.82rem;color:var(--muted);margin-top:4px">Rider: Ravi • +91 90000 12345 • ETA 38 min • ${o?.slot||'60-min delivery'}</div>${html}<div style="margin-top:12px;display:flex;gap:8px"><a href="tel:+919000012345" class="btn btn--sm" style="flex:1;justify-content:center">Call rider</a><button class="btn btn--ghost btn--sm" onclick="this.closest('.order-card').remove()" style="flex:1">Close</button></div>`;
  body.prepend(trackCard);
  trackCard.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function invoiceOrder(id){
  const orders=getOrders();
  const o=orders.find(x=> String(x.id)===String(id));
  if(!o) return;
  const prods=getProds();
  const total=o.total||0;
  const lines=(o.items||[]).map(it=>{
    const p=prods.find(x=>x.id===it.id) || {name:it.id, price:0};
    return `${p.name} ×${it.qty||1} — ₹${p.price * (it.qty||1)}`;
  }).join('\n');
  const text=`Jimmi Store — Invoice #${o.id}\nDate: ${o.date? new Date(o.date).toLocaleString(): ''}\n\n${lines}\n\nTotal: ₹${total}\nPayment: ${o.payment||'upi'}\n\nThank you for shopping! 🌱`;
  const blob=new Blob([text],{type:'text/plain'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`Jimmi_Invoice_${o.id}.txt`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
  Store.toast(`Invoice #${o.id} downloaded`);
}

// ---- Compare ----
let compareIds = [];
try{ compareIds = JSON.parse(localStorage.getItem(COMPARE_KEY)||'[]'); if(!Array.isArray(compareIds)) compareIds=[]; }catch(e){ compareIds=[]; }
function saveCompare(){ try{ localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds)); }catch(e){} }
function isInCompare(id){ return compareIds.includes(id); }
function toggleCompare(id){
  const idx=compareIds.indexOf(id);
  if(idx>-1){ compareIds.splice(idx,1); Store.toast('Removed from compare'); }
  else {
    if(compareIds.length>=3){ Store.toast('Compare up to 3 items only — remove one first'); return; }
    compareIds.push(id);
    Store.toast('Added to compare — '+compareIds.length+'/3');
  }
  saveCompare();
  renderCompareTray();
  // update buttons
  document.querySelectorAll(`[data-compare="${id}"]`).forEach(b=>{
    b.classList.toggle('active', isInCompare(id));
    b.textContent = isInCompare(id)? '✓ Comparing' : '⇄ Compare';
  });
}
function renderCompareTray(){
  const tray=$('#compare-tray');
  const grid=$('#compare-tray-grid');
  const countEl=$('#compare-count');
  if(!tray||!grid) return;
  if(countEl) countEl.textContent= compareIds.length+'/3';
  if(!compareIds.length){
    tray.classList.remove('show');
    tray.setAttribute('aria-hidden','true');
    return;
  }
  tray.classList.add('show');
  tray.setAttribute('aria-hidden','false');
  grid.innerHTML = [0,1,2].map(i=>{
    const id=compareIds[i];
    if(!id) return `<div class="compare-slot empty"><span>+ Add product</span><small>Tap ⇄ on any card</small></div>`;
    const p=getProds().find(x=>x.id===id);
    if(!p) return `<div class="compare-slot"><small>Not found</small></div>`;
    return `<div class="compare-slot"><button class="remove-compare" data-remove-compare="${p.id}" type="button">×</button><img src="${imgSrc(p.photo,200)}" alt="${p.name}" onerror="this.onerror=null;this.src='${FALLBACK}'"><b>${p.name}</b><small>₹${p.price} • ★${(p.rating||4.5).toFixed(1)}</small><button class="card-add" data-add="${p.id}" style="margin-top:6px;padding:6px 10px;font-size:.72rem">Add +</button></div>`;
  }).join('');
}
function openCompareModal(){
  if(compareIds.length<2){ Store.toast('Add at least 2 items to compare'); return; }
  const modal=$('#compare-modal');
  const body=$('#compare-modal-body');
  if(!modal||!body) return;
  const prods=compareIds.map(id=> getProds().find(x=>x.id===id)).filter(Boolean);
  const rows=[
    {label:'Product', key:'photo'},
    {label:'Price', key:'price'},
    {label:'MRP', key:'mrp'},
    {label:'Discount', key:'discount'},
    {label:'Rating', key:'rating'},
    {label:'Stock', key:'stock'},
    {label:'Category', key:'cat'},
    {label:'Meta', key:'meta'},
    {label:'Description', key:'desc'}
  ];
  let html=`<table class="compare-table"><thead><tr><th>Feature</th>${prods.map(p=>`<th>${p.name}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(r=>{
    html+=`<tr><th>${r.label}</th>`;
    prods.forEach(p=>{
      let val='';
      if(r.key==='photo') val=`<img src="${imgSrc(p.photo,200)}" alt="${p.name}" onerror="this.onerror=null;this.src='${FALLBACK}'"><div style="margin-top:6px;font-weight:700">${p.name}</div><small style="color:var(--muted)">${p.meta}</small>`;
      else if(r.key==='price') val=`<b style="color:#1d5638">₹${p.price}</b>`;
      else if(r.key==='mrp') val=`₹${p.mrp||'-'}`;
      else if(r.key==='discount') val= p.mrp? `${Math.round((1-p.price/p.mrp)*100)}% off`: '-';
      else if(r.key==='rating') val=`★${(p.rating||4.5).toFixed(1)} (${p.reviews||0})`;
      else if(r.key==='stock') val= p.stock<=0?'Out': p.stock<6? `Only ${p.stock} left`:'In stock';
      else if(r.key==='cat') val= (getCats().find(c=>c.id===p.cat)||{}).name||p.cat;
      else val= p[r.key]||'-';
      html+=`<td>${val}</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</tbody></table><div style="display:flex;gap:10px;margin-top:16px;justify-content:center;flex-wrap:wrap">${prods.map(p=>`<button class="btn btn--sm" data-add="${p.id}">Add ${p.name.split(' ')[0]} →</button>`).join('')}<button class="btn btn--ghost btn--sm" id="compare-clear-modal">Clear all</button></div>`;
  body.innerHTML=html;
  modal.classList.add('modal--open');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  $('#compare-clear-modal')?.addEventListener('click', ()=>{ compareIds=[]; saveCompare(); renderCompareTray(); closeCompareModal(); });
}
function closeCompareModal(){ const m=$('#compare-modal'); if(m){ m.classList.remove('modal--open'); m.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }}

// ---- Share ----
function shareProduct(id){
  const p=getProds().find(x=>x.id===id);
  if(!p) return;
  const url = location.origin + location.pathname + '#product-'+p.id;
  const text = `${p.name} — ${p.meta} at ₹${p.price} on Jimmi Store 🧺 ${url}`;
  if(navigator.share){
    navigator.share({title:p.name, text: `${p.name} — ₹${p.price}`, url}).catch(()=>{});
  } else if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(()=> Store.toast(`Link copied for ${p.name} ✓`)).catch(()=> Store.toast(text));
  } else {
    prompt('Copy share link:', text);
  }
}

// ---- Reviews ----
function getReviewsMap(){
  try{ return JSON.parse(localStorage.getItem(REVIEWS_KEY)||'{}'); }catch(e){return {};}
}
function saveReviewsMap(m){ try{ localStorage.setItem(REVIEWS_KEY, JSON.stringify(m)); }catch(e){} }
function getReviewsFor(id){
  const map=getReviewsMap();
  return map[id]||[];
}
function addReview(id, rating, name, text){
  const map=getReviewsMap();
  if(!map[id]) map[id]=[];
  map[id].unshift({rating, name: name||'Guest', text, date:new Date().toISOString()});
  saveReviewsMap(map);
}
function renderReviewsInQuickView(p){
  const reviews=getReviewsFor(p.id);
  const avg = reviews.length? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : (p.rating||4.5).toFixed(1);
  const total = reviews.length? reviews.length : (p.reviews||0);
  // distribution
  const dist=[5,4,3,2,1].map(star=>{
    const cnt= reviews.length? reviews.filter(r=> r.rating===star).length : (p.rating>=star ? Math.round((p.reviews||0)* (star===5?0.55: star===4?0.25:0.08)):0);
    const pct= total? Math.round(cnt/total*100):0;
    return {star,cnt,pct};
  });
  const listHtml = reviews.length? reviews.slice(0,5).map(r=>{
    const d=new Date(r.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
    const stars='★'.repeat(r.rating)+'☆'.repeat(5-r.rating);
    return `<div class="review-item"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${r.name}</b><small>${d}</small></div><div style="color:#f59e0b;font-size:.78rem;letter-spacing:1px">${stars} <span style="color:var(--muted);font-size:.72rem">${r.rating}.0</span></div><p>${r.text}</p></div>`;
  }).join('') : `<div class="review-item"><p style="color:var(--muted)">No reviews yet — be the first! The catalog rating ${(p.rating||4.5).toFixed(1)} is from our farm partners.</p></div>`;

  return `
  <div class="review-block" id="qv-reviews">
    <h4 style="font-size:.95rem;margin-bottom:10px">Customer reviews</h4>
    <div class="review-summary">
      <div class="review-big">${avg}<small style="font-size:.72rem;color:var(--muted);font-weight:600;display:block">out of 5</small></div>
      <div style="color:#f59e0b;letter-spacing:2px;font-size:.9rem">${'★'.repeat(Math.round(parseFloat(avg)))}<span style="color:#ece3d6">${'★'.repeat(5-Math.round(parseFloat(avg)))}</span><div style="color:var(--muted);font-size:.72rem;letter-spacing:0;margin-top:2px">${total} reviews</div></div>
      <div class="review-bars">
        ${dist.map(d=>`<div class="review-bar"><span style="width:14px;text-align:right;font-weight:700">${d.star}★</span><i><em style="width:${d.pct}%"></em></i><span style="min-width:28px;text-align:right">${d.pct}%</span></div>`).join('')}
      </div>
    </div>
    <div id="qv-reviews-list">${listHtml}</div>
    <form class="review-form" id="qv-review-form" onsubmit="return false">
      <div style="font-weight:700;font-size:.86rem">Write a review</div>
      <div class="star-input" id="qv-star-input" role="radiogroup" aria-label="Rating">
        ${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}" aria-label="${n} stars">★</button>`).join('')}
      </div>
      <input type="hidden" id="qv-rating-val" value="">
      <input type="text" id="qv-review-name" placeholder="Your name">
      <textarea id="qv-review-text" placeholder="Share your experience with this product…" rows="2"></textarea>
      <button class="btn btn--sm" id="qv-submit-review" type="button">Submit review</button>
      <small style="color:var(--muted);font-size:.72rem">Reviews are stored locally on this device (demo) — in production they'd be moderated.</small>
    </form>
  </div>`;
}
function bindQuickViewReviews(p){
  const form=$('#qv-review-form');
  if(!form) return;
  const starBtns=$$('#qv-star-input button');
  const ratingInput=$('#qv-rating-val');
  let chosen=0;
  starBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      chosen=parseInt(btn.dataset.star,10);
      ratingInput.value=chosen;
      starBtns.forEach((b,i)=> b.classList.toggle('active', i<chosen));
    });
    btn.addEventListener('mouseenter', ()=>{
      const h=parseInt(btn.dataset.star,10);
      starBtns.forEach((b,i)=> b.style.color = i<h? '#f59e0b':'#ece3d6');
    });
  });
  $('#qv-star-input')?.addEventListener('mouseleave', ()=>{
    starBtns.forEach((b,i)=> b.style.color = b.classList.contains('active')? '#f59e0b':'#ece3d6');
  });
  const submit=$('#qv-submit-review');
  if(submit) submit.addEventListener('click', ()=>{
    const rating=parseInt(ratingInput.value,10);
    const name=$('#qv-review-name')?.value.trim()||'Guest';
    const text=$('#qv-review-text')?.value.trim()||'';
    if(!rating){ Store.toast('Select stars first ★'); return; }
    if(text.length<6){ Store.toast('Write a bit more (6+ chars)'); $('#qv-review-text')?.focus(); return; }
    addReview(p.id, rating, name, text);
    Store.toast('Review added — thank you! ★');
    // re-render
    const reviewsEl=$('#qv-reviews');
    if(reviewsEl){
      const newHtml=renderReviewsInQuickView(p);
      const temp=document.createElement('div');
      temp.innerHTML=newHtml;
      reviewsEl.replaceWith(temp.firstElementChild);
      bindQuickViewReviews(p);
      document.getElementById('qv-reviews')?.scrollIntoView({behavior:'smooth', block:'nearest'});
    }
  });
}

// ---- Notify me ----
function getNotifyList(){ try{ return JSON.parse(localStorage.getItem(NOTIFY_KEY)||'[]'); }catch(e){return [];} }
function setNotifyList(a){ try{ localStorage.setItem(NOTIFY_KEY, JSON.stringify(a)); }catch(e){} }
function toggleNotify(id){
  let list=getNotifyList();
  if(list.includes(id)){
    list=list.filter(x=>x!==id);
    setNotifyList(list);
    Store.toast('Removed notify — you will not be notified');
  } else {
    list.push(id);
    setNotifyList(list);
    Store.toast('We’ll notify you when back in stock 🔔');
  }
  // update button
  document.querySelectorAll(`[data-notify="${id}"]`).forEach(b=>{
    const on = getNotifyList().includes(id);
    b.textContent = on? '🔔 Notifying' : '🔔 Notify me';
    b.classList.toggle('active', on);
  });
}

// ---- Subscribe & Save ----
function getSubs(){ try{ return JSON.parse(localStorage.getItem(SUBS_KEY)||'[]'); }catch(e){return [];} }
function setSubs(a){ try{ localStorage.setItem(SUBS_KEY, JSON.stringify(a)); }catch(e){} }
function isSubscribed(id){ return getSubs().includes(id); }
function toggleSub(id){
  const p=getProds().find(x=>x.id===id);
  if(!p) return;
  const eligible = ['dairy','pantry'].includes(p.cat);
  if(!eligible){ Store.toast('Subscribe available for Dairy & Pantry (weekly essentials)'); return; }
  let list=getSubs();
  if(list.includes(id)){
    list=list.filter(x=>x!==id);
    setSubs(list);
    Store.toast(`Unsubscribed ${p.name} — no longer weekly`);
  } else {
    list.push(id);
    setSubs(list);
    Store.toast(`Subscribed ${p.name} — 5% off weekly 🗓️`);
  }
  document.querySelectorAll(`[data-sub="${id}"]`).forEach(b=>{
    const on=isSubscribed(id);
    b.classList.toggle('active', on);
    b.innerHTML = on? '✓ Subscribed • 5% off' : '🗓️ Subscribe • 5% off';
  });
  // update cart + checkout billing live for 100% working
  try{
    if(window.Store){
      if(Store.renderCart) Store.renderCart();
      if(document.getElementById('checkout-overlay')?.classList.contains('show')){
        if(Store.updateBilling) Store.updateBilling();
        if(Store.renderOrderSummary) Store.renderOrderSummary();
      }
    }
  }catch(e){}
}

// ---- Refer & Earn ----
function getReferCode(){
  try{
    let code=localStorage.getItem(REFER_CODE_KEY);
    if(!code){
      const u=JSON.parse(localStorage.getItem('jimmi_user')||'{}');
      const base=(u.phone||u.name||'JIMMI').toString().replace(/\D/g,'').slice(-4) || Math.floor(1000+Math.random()*9000);
      code='JIMMI'+String(base).slice(-4);
      localStorage.setItem(REFER_CODE_KEY, code);
    }
    return code;
  }catch(e){ return 'JIMMI50'; }
}
function openRefer(){ const code=getReferCode(); const link=location.origin+location.pathname+'?ref='+code; const el=$('#refer-code'); if(el) el.textContent=code; const lk=$('#refer-link'); if(lk) lk.textContent=link; $('#refer-modal')?.classList.add('modal--open'); $('#refer-modal')?.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
function closeRefer(){ $('#refer-modal')?.classList.remove('modal--open'); $('#refer-modal')?.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }

// ---- Buy Again ----
function getBuyAgainIds(){
  const orders=getOrders();
  const freq={};
  orders.forEach(o=>{
    (o.items||[]).forEach(it=>{
      const id=it.id||it;
      freq[id]=(freq[id]||0)+(it.qty||1);
    });
  });
  // also include recently viewed if no orders
  if(!Object.keys(freq).length){
    try{
      const recent=JSON.parse(localStorage.getItem('jimmi_recent_views')||'[]');
      recent.forEach(id=> freq[id]=(freq[id]||0)+1);
    }catch(e){}
  }
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id])=>id);
}
function renderBuyAgain(){
  const sec=$('#buy-again-section'); const grid=$('#buy-again-grid'); if(!sec||!grid) return;
  const ids=getBuyAgainIds();
  if(!ids.length){ sec.classList.add('hide'); return; }
  sec.classList.remove('hide');
  const items=ids.map(id=> getProds().find(p=>p.id===id)).filter(Boolean);
  if(!items.length){ sec.classList.add('hide'); return; }
  grid.innerHTML=items.map(p=>{
    const subActive=isSubscribed(p.id);
    return `<article class="card" data-id="${p.id}" style="position:relative">
      <div class="card-media" data-qv="${p.id}" style="cursor:pointer"><img src="${imgSrc(p.photo,300)}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK}'"><span class="subs-badge" style="position:absolute;top:8px;left:8px;display:${subActive?'inline-block':'none'}">🗓️ 5% off</span></div>
      <div class="card-body"><h3 class="card-title" style="font-size:.88rem">${p.name}</h3><span class="price">₹${p.price}</span><div class="card-stock ${p.stock<6?'card-stock--low':'card-stock--in'}" style="margin-top:6px">${p.stock<=0?'Out of stock': p.stock<6?`Only ${p.stock} left!`:'In stock'}</div><button class="card-add" data-add="${p.id}" style="margin-top:8px;width:100%;justify-content:center">Add +</button><button class="subs-btn ${subActive?'active':''}" data-sub="${p.id}" type="button">${subActive?'✓ Subscribed • 5% off':'🗓️ Subscribe • 5% off'}</button></div>
    </article>`;
  }).join('');
}

// ---- Stock Flash Countdown ----
function initStockTimers(){
  // update every second for low-stock items
  setInterval(()=>{
    document.querySelectorAll('.card-stock--low').forEach(el=>{
      if(el.dataset.timer) return; // already has timer
      const card=el.closest('.card');
      if(!card) return;
      const stockText=el.textContent;
      const m=stockText.match(/Only\s+(\d+)/);
      if(!m) return;
      // create timer span if not exists
      let timer=el.querySelector('.stock-timer');
      if(!timer){
        timer=document.createElement('span');
        timer.className='stock-timer';
        timer.style.cssText='margin-left:6px;background:#fff;color:#92400e;border:1px solid #fde68a;padding:2px 6px;border-radius:999px;font-size:.62rem;font-weight:800;';
        el.appendChild(timer);
        el.dataset.timer='1';
      }
      // simple countdown from 2h
      const end=Date.now()+2*3600*1000 - (Math.random()*3600*1000|0);
      const update=()=>{
        const diff=Math.max(0, end-Date.now());
        const h=String(Math.floor(diff/3600000)).padStart(2,'0');
        const m2=String(Math.floor(diff%3600000/60000)).padStart(2,'0');
        const s=String(Math.floor(diff%60000/1000)).padStart(2,'0');
        if(timer) timer.textContent=` ends in ${h}:${m2}:${s}`;
        if(diff>0) requestAnimationFrame(update);
      };
      update();
    });
  }, 1000);
}

// ---- Pincode Serviceability ----
function initPincodeService(){
  const btn=$('#deliver-to');
  if(!btn) return;
  // enhance toast after app.js prompt: intercept by listening to storage change
  // also add inline validation on input prompt via monkey-patch
  // we hook by wrapping the existing click handler: add second listener that validates after prompt
  btn.addEventListener('click', ()=>{
    setTimeout(()=>{
      try{
        const pinEl=$('#deliver-pincode');
        const txt=pinEl? pinEl.textContent.split(' ')[0].trim():'';
        if(!/^\d{6}$/.test(txt)) return;
        const serviceable = /^(600|110|400|560|191|080|700|500)\d{3}$/.test(txt) || ['600001','110001','400001','560001','500001'].includes(txt);
        if(!serviceable){
          // show warning but keep pincode
          if(window.Store) Store.toast(`⚠️ ${txt} — delivery in 90 min may not be available, standard 60-min still possible`);
        } else {
          if(window.Store) Store.toast(`✓ Delivering to ${txt} — 60-min active`);
        }
      }catch(e){}
    }, 600);
  });
}

// ---- Cart Upsell ----
function renderCartUpsell(){
  const cartBody=$('#cart-body');
  if(!cartBody) return;
  let upsell=$('#cart-upsell');
  if(!upsell){
    upsell=document.createElement('div');
    upsell.id='cart-upsell';
    upsell.style.cssText='margin:10px 0 0;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px;';
    cartBody.parentElement.insertBefore(upsell, cartBody.nextSibling);
  }
  try{
    const cartIds = (window.Store && Store.cart) ? Store.cart.map(c=>c.id) : [];
    if(!cartIds.length){ upsell.style.display='none'; return; }
    upsell.style.display='block';
    const candidates=getProds().filter(p=> !cartIds.includes(p.id) && p.stock>0).sort(()=>0.5-Math.random()).slice(0,2);
    if(!candidates.length){ upsell.style.display='none'; return; }
    upsell.innerHTML=`<div style="font-weight:800;font-size:.82rem;margin-bottom:8px">Frequently bought together</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${candidates.map(p=>`<div style=\"background:#fdfcf8;border:1px solid var(--line);border-radius:12px;padding:8px;text-align:center\"><img src=\"${imgSrc(p.photo,120)}\" alt=\"${p.name}\" style=\"width:56px;height:56px;border-radius:10px;object-fit:cover;margin:0 auto;border:1px solid #f0e8d8\"><div style=\"font-weight:700;font-size:.74rem;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">${p.name}</div><div style=\"color:var(--muted);font-size:.72rem\">₹${p.price}</div><button class=\"btn btn--sm\" data-add=\"${p.id}\" style=\"margin-top:6px;padding:5px 10px;font-size:.70rem;width:100%;justify-content:center\">Add +</button></div>`).join('')}</div>`;
  }catch(e){ upsell.style.display='none'; }
}

// ---- Enhance cards after render ----
function enhanceCards(){
  const cards=$$('.card');
  cards.forEach(card=>{
    const id=card.dataset.id;
    if(!id) return;
    if(card.querySelector('.card-actions-row')) return; // already enhanced
    const p=getProds().find(x=>x.id===id);
    if(!p) return;
    const foot=card.querySelector('.card-foot');
    if(!foot) return;
    const row=document.createElement('div');
    row.className='card-actions-row';
    const compareActive = isInCompare(id);
    // Share + Compare always
    row.innerHTML = `
      <button class="card-mini-btn" data-share="${id}" type="button" title="Share">↗ Share</button>
      <button class="card-mini-btn ${compareActive?'active':''}" data-compare="${id}" type="button" title="Compare">${compareActive?'✓ Comparing':'⇄ Compare'}</button>
    `;
    foot.insertAdjacentElement('afterend', row);
    // subscribe for dairy/pantry
    if(['dairy','pantry'].includes(p.cat)){
      const subBtn=document.createElement('button');
      subBtn.className='subs-btn'+(isSubscribed(id)?' active':'');
      subBtn.dataset.sub=id;
      subBtn.type='button';
      subBtn.innerHTML = isSubscribed(id)? '✓ Subscribed • 5% off' : '🗓️ Subscribe • 5% off';
      subBtn.title='Weekly delivery — save 5%';
      row.insertAdjacentElement('afterend', subBtn);
    }
    // stock urgency pulse
    const stockEl=card.querySelector('.card-stock');
    if(stockEl && p.stock>0 && p.stock<6){
      stockEl.classList.add('stock-pulse');
      stockEl.title='Hurry — few left!';
    }
    // notify for out-of-stock
    if(p.stock<=0){
      const nb=document.createElement('button');
      nb.className='notify-btn';
      nb.dataset.notify=id;
      const on=getNotifyList().includes(id);
      nb.textContent= on? '🔔 Notifying' : '🔔 Notify when available';
      if(on) nb.classList.add('active');
      row.insertAdjacentElement('afterend', nb);
    }
  });
}

// ---- Patch Store.openQuickView ----
function patchQuickView(){
  if(!window.Store||!Store.openQuickView) return;
  const orig = Store.openQuickView;
  Store.openQuickView = function(id){
    orig.call(Store, id);
    // inject after original render
    setTimeout(()=>{
      const p=getProds().find(x=>x.id===id);
      if(!p) return;
      const content=$('#quick-view-content');
      if(!content) return;
      // add share/compare + reviews if not already
      if(content.querySelector('#qv-extra-actions')) return;
      const actions = content.querySelector('.quick-actions');
      if(actions){
        const extra=document.createElement('div');
        extra.id='qv-extra-actions';
        extra.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:4px';
        const compActive=isInCompare(p.id);
        let html=`<button class="card-mini-btn" data-share="${p.id}" type="button">↗ Share</button><button class="card-mini-btn ${compActive?'active':''}" data-compare="${p.id}" type="button">${compActive?'✓ Comparing':'⇄ Compare'}</button>`;
        if(['dairy','pantry'].includes(p.cat)){
          const on=isSubscribed(p.id);
          html+=`<button class="subs-btn ${on?'active':''}" data-sub="${p.id}" type="button" style="margin-top:0;flex:1">${on?'✓ Subscribed':'🗓️ Subscribe 5% off'}</button>`;
        }
        extra.innerHTML=html;
        actions.insertAdjacentElement('afterend', extra);
      }
      // add reviews block at end of info
      const info=content.querySelector('.quick-view-info');
      if(info && !info.querySelector('#qv-reviews')){
        const revHtml=renderReviewsInQuickView(p);
        info.insertAdjacentHTML('beforeend', revHtml);
        bindQuickViewReviews(p);
      }
    }, 60);
  };
}

// ---- Bind global click handlers ----
function bindEvents(){
  document.addEventListener('click', (e)=>{
    const share=e.target.closest('[data-share]');
    if(share){ shareProduct(share.dataset.share); return; }
    const comp=e.target.closest('[data-compare]');
    if(comp){ toggleCompare(comp.dataset.compare); return; }
    const rem=e.target.closest('[data-remove-compare]');
    if(rem){ toggleCompare(rem.dataset.removeCompare); return; }
    const notify=e.target.closest('[data-notify]');
    if(notify){ toggleNotify(notify.dataset.notify); return; }
    const sub=e.target.closest('[data-sub]');
    if(sub){ toggleSub(sub.dataset.sub); renderBuyAgain(); return; }
    const reorder=e.target.closest('[data-reorder]');
    if(reorder){ reorderOrder(reorder.dataset.reorder); return; }
    const cancel=e.target.closest('[data-cancel]');
    if(cancel){ cancelOrder(cancel.dataset.cancel); return; }
    const track=e.target.closest('[data-track]');
    if(track){ trackOrder(track.dataset.track); return; }
    const invoice=e.target.closest('[data-invoice]');
    if(invoice){ invoiceOrder(invoice.dataset.invoice); return; }
    const openOrders=e.target.closest('#open-orders');
    if(openOrders){ e.preventDefault(); openOrdersDrawer(); return; }
    const closeOrders=e.target.closest('#close-orders')||e.target.closest('#orders-overlay')||e.target.closest('#orders-shop');
    if(closeOrders){ closeOrdersDrawer(); return; }
    const clearOrders=e.target.closest('#orders-clear');
    if(clearOrders){ if(confirm('Clear all order history?')){ saveOrders([]); renderOrders(); Store.toast('History cleared'); renderBuyAgain(); } return; }
    const compareNow=e.target.closest('#compare-open-btn');
    if(compareNow){ openCompareModal(); return; }
    const clearComp=e.target.closest('#compare-clear');
    if(clearComp){ compareIds=[]; saveCompare(); renderCompareTray(); Store.toast('Compare cleared'); return; }
    const closeCompTray=e.target.closest('#compare-close');
    if(closeCompTray){ compareIds=[]; saveCompare(); renderCompareTray(); return; }
    const closeCompareModalBtn=e.target.closest('#close-compare')|| (e.target.id==='compare-modal' && e.target===document.getElementById('compare-modal'));
    if(closeCompareModalBtn){ closeCompareModal(); return; }
    const openReferBtn=e.target.closest('#open-refer');
    if(openReferBtn){ openRefer(); return; }
    const closeReferBtn=e.target.closest('#close-refer') || (e.target.id==='refer-modal' && e.target===document.getElementById('refer-modal'));
    if(closeReferBtn){ closeRefer(); return; }
    const copyReferBtn=e.target.closest('#copy-refer');
    if(copyReferBtn){ const code=getReferCode(); const link=location.origin+location.pathname+'?ref='+code; if(navigator.clipboard) navigator.clipboard.writeText(link).then(()=> Store.toast('Invite link copied ✓')).catch(()=> Store.toast(link)); else Store.toast(link); return; }
    const shareReferBtn=e.target.closest('#share-refer');
    if(shareReferBtn){ const code=getReferCode(); const link=location.origin+location.pathname+'?ref='+code; const text=`Shop fresh at Jimmi Store — use ${code} for ₹50 off 🧺 ${link}`; if(navigator.share) navigator.share({title:'Jimmi Store Invite', text, url:link}).catch(()=>{}); else if(navigator.clipboard) navigator.clipboard.writeText(text).then(()=> Store.toast('Invite copied ✓')); return; }
    const claimReferBtn=e.target.closest('#refer-claim');
    if(claimReferBtn){ const cur=getLoyalty(); setLoyalty(cur+50); updateLoyaltyChip(); closeRefer(); showCoinPop('+50 coins referral bonus! 🎁'); Store.toast('50 coins added — invite more!'); return; }
  });
  // also click on overlay for compare modal
  $('#compare-modal')?.addEventListener('click', e=>{ if(e.target.id==='compare-modal') closeCompareModal(); });
  $('#refer-modal')?.addEventListener('click', e=>{ if(e.target.id==='refer-modal') closeRefer(); });
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){
      closeCompareModal();
      closeOrdersDrawer();
      closeRefer();
    }
  });
  $('#orders-overlay')?.addEventListener('click', closeOrdersDrawer);
  // loyalty redeem handling
  function updateLoyaltyRedeemRow(){
    const availEl=$('#co-loyalty-available');
    if(!availEl) return;
    const avail=getLoyalty();
    availEl.textContent=String(avail);
    const btn=$('#co-redeem-coins');
    if(btn){
      const used = window.Store?.checkout?.loyaltyDiscount||0;
      if(used>0){
        btn.textContent='Remove';
        btn.classList.remove('btn');
        btn.classList.add('btn--ghost');
        btn.style.borderColor='#fecaca';
        btn.style.color='#dc2626';
        btn.style.background='#fef2f2';
      } else {
        btn.textContent = avail>=10? `Redeem ${Math.min(avail,100)} coins` : 'Need 10+ coins';
        btn.disabled = avail<10;
        btn.style.opacity = avail<10? '.55':'';
        btn.classList.add('btn');
        btn.classList.remove('btn--ghost');
        btn.style.background='';
        btn.style.color='';
        btn.style.borderColor='';
      }
    }
  }
  document.addEventListener('click', e=>{
    const redeem=e.target.closest('#co-redeem-coins');
    if(redeem){
      const avail=getLoyalty();
      if(window.Store?.checkout?.loyaltyDiscount){
        // remove
        setLoyalty(avail + window.Store.checkout.loyaltyDiscount);
        window.Store.checkout.loyaltyDiscount=0;
        updateLoyaltyChip();
        updateLoyaltyRedeemRow();
        try{ Store.toast('Coins redemption removed'); }catch(err){}
        try{ if(window.Store && window.Store.checkout){ window.Store.checkout.loyaltyDiscount=0; if(window.Store.updateBilling) window.Store.updateBilling(); } }catch(err){}
        try{
          const total = window.Store? Store.getTotal():0;
          const totalEl=$('#co-total'); if(totalEl) totalEl.textContent='₹'+total;
          const finalEl=$('#co-final-total'); if(finalEl) finalEl.textContent='₹'+total;
          const payEl=$('#co-pay-amount'); if(payEl) payEl.textContent='₹'+total;
          const row=$('#co-loyalty-row'); if(row) row.classList.add('hide');
        }catch(err){}
        return;
      }
      if(avail<10){ Store.toast('Need at least 10 coins to redeem'); return; }
      // max redeem: up to 20% of subtotal or avail, whichever smaller, at least 10
      let maxBySub=0;
      try{ maxBySub = Math.floor((window.Store? Store.getSubtotal():0)*0.2); }catch(err){}
      let toRedeem = Math.min(avail, maxBySub||avail, 100);
      // round down to 10s? allow any amount but 1 coin = ₹1
      if(toRedeem<10) toRedeem= Math.min(avail,10);
      if(toRedeem>avail) toRedeem=avail;
      setLoyalty(avail - toRedeem);
      if(window.Store && window.Store.checkout){
        window.Store.checkout.loyaltyDiscount = toRedeem;
        try{ if(window.Store.updateBilling) window.Store.updateBilling(); }catch(err){}
        // fallback manual if updateBilling not yet
        try{
          const total = window.Store.getTotal();
          const row=$('#co-loyalty-row');
          if(row){
            row.classList.remove('hide');
            const v=row.querySelector('.co-discount-val');
            if(v) v.textContent='-₹'+toRedeem;
          }
          const totalEl=$('#co-total'); if(totalEl) totalEl.textContent='₹'+total;
          const finalEl=$('#co-final-total'); if(finalEl) finalEl.textContent='₹'+total;
          const payEl=$('#co-pay-amount'); if(payEl) payEl.textContent='₹'+total;
        }catch(err){}
      }
      updateLoyaltyChip();
      updateLoyaltyRedeemRow();
      Store.toast(`Redeemed ${toRedeem} coins → ₹${toRedeem} off 🪙`);
      return;
    }
  });
  // update redeem row when checkout opens or cart changes
  const roObserver = new MutationObserver(()=> updateLoyaltyRedeemRow());
  const coOverlay=$('#checkout-overlay');
  if(coOverlay) roObserver.observe(coOverlay, {attributes:true, attributeFilter:['class']});
  // also observe cart changes via interval
  setInterval(()=>{ if(coOverlay && coOverlay.classList.contains('show')) updateLoyaltyRedeemRow(); }, 1200);
  // initial
  setTimeout(updateLoyaltyRedeemRow, 900);

  // hook checkout success for loyalty
  document.addEventListener('click', e=>{
    if(e.target.closest('#co-place-order')){
      // will earn after 1.4s when Store creates order
      setTimeout(()=>{
        try{
          const orders=getOrders();
          const latest=orders[0];
          if(latest && latest.total) earnCoins(latest.total);
          else {
            // fallback: compute from cart subtotal
            const sub = window.Store? Store.getSubtotal() : 0;
            if(sub) earnCoins(sub);
          }
          // deduct already redeemed loyalty is already deducted; reset for next order
          if(window.Store && window.Store.checkout){
            window.Store.checkout.loyaltyDiscount=0;
          }
          updateLoyaltyChip();
          updateLoyaltyRedeemRow();
        }catch(err){}
      }, 1600);
    }
  });
  // reset loyaltyDiscount on checkout close/done
  document.addEventListener('click', e=>{
    if(e.target.closest('#close-checkout')|| e.target.closest('#co-done')){
      setTimeout(()=>{ if(window.Store && window.Store.checkout){ window.Store.checkout.loyaltyDiscount=0; } updateLoyaltyRedeemRow(); }, 300);
    }
  });
}

// ---- Init ----
function init(){
  // bootstrap loyalty from past orders if first time
  try{
    if(getLoyalty()===0){
      const orders=getOrders();
      if(orders.length){
        const sum=orders.reduce((s,o)=> s+(o.total||0),0);
        const coins=Math.floor(sum/10);
        if(coins) setLoyalty(coins);
      }
    }
  }catch(e){}
  updateLoyaltyChip();
  renderCompareTray();
  renderBuyAgain();
  try{ initStockTimers(); }catch(e){}
  try{ initPincodeService(); }catch(e){}
  try{ renderCartUpsell(); }catch(e){}
  // show refer code
  try{ getReferCode(); }catch(e){}
  patchQuickView();
  bindEvents();
  // enhance cards initially and on mutations
  const enhance = ()=> { try{ enhanceCards(); }catch(e){} };
  document.addEventListener('DOMContentLoaded', enhance);
  // also observe catalog changes
  const obsTarget=document.getElementById('catalog');
  if(obsTarget){
    const mo=new MutationObserver(enhance);
    mo.observe(obsTarget,{childList:true, subtree:true});
  }
  // also observe trending etc
  const trending=document.getElementById('trending-grid');
  if(trending) new MutationObserver(enhance).observe(trending,{childList:true});
  const rv=document.getElementById('recently-viewed');
  if(rv) new MutationObserver(enhance).observe(rv,{childList:true});
  // initial after short delay
  setTimeout(enhance, 800);
  setTimeout(enhance, 1500);
  // intercept order creation from Store checkout: already handled via click timeout
  // also update orders count after any order change
  window.addEventListener('storage', (e)=>{
    if(e.key==='jimmi_orders'){ renderOrders(); renderBuyAgain(); }
    if(e.key===LOYALTY_KEY) updateLoyaltyChip();
    if(e.key===SUBS_KEY) renderBuyAgain();
  });
  // also re-render buy again when cart changes (via custom event)
  setInterval(()=>{ try{ renderBuyAgain(); renderCartUpsell(); }catch(e){} }, 3000);
  // observe cart for upsell
  const cartBody=document.getElementById('cart-body');
  if(cartBody){
    const mo2=new MutationObserver(()=>{ try{ renderCartUpsell(); }catch(e){} });
    mo2.observe(cartBody,{childList:true, subtree:true});
  }
  // expose for debug
  window.Features={ getOrders, reorderOrder, toggleCompare, shareProduct, getLoyalty, earnCoins, renderOrders: renderOrders, getSubs, toggleSub, getReferCode, renderBuyAgain, renderCartUpsell };
  console.log('Features.js loaded — orders, compare, share, reviews, loyalty, notify, subs, refer, buy-again, stock-timers, pincode, upsell ready');
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
