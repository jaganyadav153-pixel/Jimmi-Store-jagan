/* =========================================================
   App — global UI behaviour & bootstrap (PRO)
   Handles header, theme, voice, drawer, cart, wishlist, etc.
   ========================================================= */

(function () {
  function reveals() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(e => io.observe(e));
  }

  function headerShadow() {
    const h = document.querySelector('.header');
    if (!h) return;
    const onScroll = () => {
      h.classList.toggle('header--scrolled', window.scrollY > 10);
      // scroll progress
      const prog = document.getElementById('scroll-progress');
      if(prog){
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max>0 ? (window.scrollY / max * 100) : 0;
        prog.style.width = pct + '%';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const links = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const ids = Array.from(links).map(a=> a.getAttribute('href'));
    const sections = ids.map(id=> document.querySelector(id)).filter(Boolean);
    const io2 = new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        if(en.isIntersecting){
          const id = '#'+en.target.id;
          links.forEach(a=> a.classList.toggle('active', a.getAttribute('href')===id));
        }
      });
    }, { rootMargin:'-45% 0px -45% 0px', threshold:0 });
    sections.forEach(s=> io2.observe(s));
  }

  function backToTop() {
    const btn = document.getElementById('to-top');
    if (!btn) return;
    const toggle = () => btn.classList.toggle('show', window.scrollY > 600);
    window.addEventListener('scroll', toggle, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    toggle();
  }

  function stats() {
    const nodes = document.querySelectorAll('[data-count]');
    if(!nodes.length) return;
    if(!('IntersectionObserver' in window)){ nodes.forEach(n=> n.textContent=n.dataset.count+(n.dataset.suffix||'')); return;}
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const end = parseInt(el.dataset.count, 10);
        const dur = 1200; const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          el.textContent = Math.round(end * p) + (el.dataset.suffix || '');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    nodes.forEach(n => io.observe(n));
  }

  function showUserPhoto(){
    try{
      const u = JSON.parse(localStorage.getItem('jimmi_user')||'{}');
      const headerImg = document.getElementById('header-user-photo');
      const topBanner = document.getElementById('top-photo-banner');
      const topImg = document.getElementById('top-photo-img');
      const topName = document.getElementById('top-photo-name');
      const loginBtn = document.getElementById('open-login');
      if(u.photo){
        if(headerImg){ headerImg.src = u.photo; headerImg.classList.add('show'); }
        if(topBanner){ topBanner.classList.remove('hide'); }
        if(topImg) topImg.src = u.photo;
        if(topName) topName.textContent = u.name ? u.name : 'Welcome';
        if(loginBtn){
          const span = loginBtn.querySelector('span');
          if(span && u.name) span.textContent = 'Hi, ' + u.name.split(' ')[0];
          const img = loginBtn.querySelector('img');
          if(img) img.style.display='none';
        }
      } else if(u.name || u.phone){
        if(topBanner){ topBanner.classList.remove('hide'); }
        if(topName) topName.textContent = u.name ? u.name : (u.phone||'Welcome');
        if(headerImg) headerImg.classList.remove('show');
        if(loginBtn){
          const span = loginBtn.querySelector('span');
          if(span && u.name) span.textContent = 'Hi, ' + u.name.split(' ')[0];
        }
      } else {
        if(headerImg) headerImg.classList.remove('show');
        if(topBanner) topBanner.classList.add('hide');
      }
    }catch(e){}
  }

  function themeToggle(){
    const btn=document.getElementById('theme-toggle');
    if(!btn) return;
    const saved=localStorage.getItem('jimmi_theme');
    if(saved==='dark'){ document.documentElement.setAttribute('data-theme','dark'); btn.textContent='☀️'; }
    btn.addEventListener('click',()=>{
      const isDark=document.documentElement.getAttribute('data-theme')==='dark';
      if(isDark){ document.documentElement.removeAttribute('data-theme'); localStorage.setItem('jimmi_theme','light'); btn.textContent='🌙'; Store.toast('Light mode ☀️'); }
      else { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('jimmi_theme','dark'); btn.textContent='☀️'; Store.toast('Dark mode 🌙'); }
    });
  }

  function mobileDrawer(){
    const ham=document.getElementById('hamburger');
    const drawer=document.getElementById('mobile-drawer');
    const overlay=document.getElementById('mobile-overlay');
    const closeBtn=document.getElementById('close-drawer');
    if(!ham||!drawer||!overlay) return;
    function open(){ drawer.classList.add('open'); overlay.classList.add('show'); ham.setAttribute('aria-expanded','true'); drawer.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
    function close(){ drawer.classList.remove('open'); overlay.classList.remove('show'); ham.setAttribute('aria-expanded','false'); drawer.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
    ham.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach(a=>a.addEventListener('click', close));
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && drawer.classList.contains('open')) close(); });
  }

  function voiceSearch(){
    const btn=document.getElementById('voice-search');
    const input=document.getElementById('search-input');
    if(!btn||!input) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ btn.style.display='none'; return; }
    const rec = new SR();
    rec.lang='en-IN'; rec.interimResults=false; rec.maxAlternatives=1;
    btn.addEventListener('click', ()=>{
      btn.classList.add('listening');
      btn.textContent='●';
      try{ rec.start(); }catch(e){ btn.classList.remove('listening'); }
    });
    rec.addEventListener('result', e=>{
      const txt=e.results[0][0].transcript;
      input.value=txt;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      Store.toast('Heard: "'+txt+'" 🎙️');
    });
    rec.addEventListener('end', ()=>{ btn.classList.remove('listening'); btn.textContent='🎙️'; });
    rec.addEventListener('error', ()=>{ btn.classList.remove('listening'); btn.textContent='🎙️'; Store.toast('Voice not heard, try typing'); });
  }

  function handleLogout(){
    const btn=document.getElementById('logout-btn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      localStorage.removeItem('jimmi_user');
      Store.toast('Logged out');
      setTimeout(()=> location.reload(), 600);
    });
  }

  function handleNewsletter(){
    const form=document.getElementById('newsletter-form');
    if(!form) return;
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const email=document.getElementById('newsletter-email');
      const val=email? email.value.trim():'';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){ Store.toast('Enter a valid email'); email?.focus(); return; }
      Store.toast('Subscribed! Check your inbox 💚');
      form.reset();
      try{ let list=JSON.parse(localStorage.getItem('jimmi_newsletter')||'[]'); list.push(val); localStorage.setItem('jimmi_newsletter', JSON.stringify(list)); }catch(err){}
    });
  }

  function handleDeliverTo(){
    const btn=document.getElementById('deliver-to');
    const pinEl=document.getElementById('deliver-pincode');
    if(!btn||!pinEl) return;
    function refresh(){
      try{
        const u=JSON.parse(localStorage.getItem('jimmi_user')||'{}');
        const pin=u.pincode||localStorage.getItem('jimmi_pincode')||'600001';
        pinEl.textContent = pin + ' • 60 min';
      }catch(e){ pinEl.textContent='600001 • 60 min'; }
    }
    refresh();
    window.addEventListener('storage', refresh);
    btn.addEventListener('click', ()=>{
      const cur=(pinEl.textContent.split(' ')[0]||'600001');
      const next=prompt('Enter delivery pincode (6 digits):', cur);
      if(next===null) return;
      if(!/^\d{6}$/.test(next.trim())){ Store.toast('Enter valid 6-digit pincode'); return; }
      const pin=next.trim();
      localStorage.setItem('jimmi_pincode', pin);
      try{ const u=JSON.parse(localStorage.getItem('jimmi_user')||'{}'); u.pincode=pin; localStorage.setItem('jimmi_user', JSON.stringify(u)); }catch(e){}
      pinEl.textContent=pin+' • 60 min';
      Store.toast('Delivering to '+pin+' ✓');
    });
  }

  function handleOffers(){
    document.querySelectorAll('.offer-pill').forEach(pill=>{
      pill.style.cursor='pointer';
      pill.title='Click to copy coupon';
      pill.addEventListener('click', ()=>{
        const txt=pill.textContent.trim();
        const codeMatch=txt.match(/[A-Z]{3,}\d+/);
        const code=codeMatch? codeMatch[0] : txt.split('—')[0].trim();
        if(navigator.clipboard && code){
          navigator.clipboard.writeText(code).then(()=> Store.toast('Copied '+code+' ✓')).catch(()=> Store.toast(code+' — use at checkout'));
        } else {
          Store.toast(code+' — use at checkout');
        }
        // also fill checkout coupon if open
        const inp=document.getElementById('co-coupon-input');
        if(inp && code) inp.value=code;
      });
    });
  }

  function fruit3D(){
    const cards = document.querySelectorAll('.card');
    if(!cards.length) return;
    const isTouch = 'ontouchstart' in window;
    cards.forEach(card=>{
      const media = card.querySelector('.card-media');
      if(!media) return;
      if(!isTouch){
        card.addEventListener('mousemove', e=>{
          const r = card.getBoundingClientRect();
          const x = e.clientX - r.left;
          const y = e.clientY - r.top;
          const cx = r.width/2, cy = r.height/2;
          const rx = (y - cy) / 14;
          const ry = (cx - x) / 14;
          media.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px) scale(1.04)`;
        });
        card.addEventListener('mouseleave', ()=>{
          media.style.transform = '';
        });
      } else {
        card.addEventListener('touchstart', ()=>{
          card.classList.add('tilt');
          media.style.transform = 'rotateY(10deg) rotateX(-6deg) scale(1.03)';
        }, {passive:true});
        card.addEventListener('touchend', ()=>{
          card.classList.remove('tilt');
          media.style.transform = '';
          setTimeout(()=> card.classList.remove('tilt'), 300);
        }, {passive:true});
      }
    });
    const heroImg = document.querySelector('.hero-img');
    if(heroImg && !isTouch){
      heroImg.addEventListener('mousemove', e=>{
        const r = heroImg.getBoundingClientRect();
        const x = (e.clientX - r.left)/r.width - 0.5;
        const y = (e.clientY - r.top)/r.height - 0.5;
        const img = heroImg.querySelector('img');
        if(img) img.style.transform = `scale(1.06) rotateY(${x*6}deg) rotateX(${-y*6}deg)`;
      });
      heroImg.addEventListener('mouseleave', ()=>{
        const img = heroImg.querySelector('img');
        if(img) img.style.transform = '';
      });
    }
  }

  function loginModal() {
    const open = document.getElementById('open-login');
    const modal = document.getElementById('login-modal');
    if (!open || !modal) return;
    const close = modal.querySelector('.modal-close');
    const step1 = modal.querySelector('#login-step1');
    const step2 = modal.querySelector('#login-step2');
    const phone = modal.querySelector('#login-phone');
    const otpHidden = modal.querySelector('#login-otp');
    const otpBoxes = modal.querySelectorAll('.login-otp-input');
    const otpDisplay = document.getElementById('login-otp-display');
    const send = modal.querySelector('#login-send');
    const verify = modal.querySelector('#login-verify');
    const resend = document.getElementById('login-resend');
    let demoOTP = '';

    function genOTP(){ return String(Math.floor(1000 + Math.random()*9000)); }
    function openModal(){
      modal.classList.add('modal--open');
      modal.setAttribute('aria-hidden','false');
      document.body.style.overflow='hidden';
      step1.classList.remove('hide'); step2.classList.add('hide');
      phone.value=''; otpBoxes.forEach(b=> b.value=''); if(otpHidden) otpHidden.value='';
      setTimeout(()=> phone.focus(), 120);
    }
    function closeModal(){
      modal.classList.remove('modal--open');
      modal.setAttribute('aria-hidden','true');
      document.body.style.overflow='';
      step1.classList.remove('hide'); step2.classList.add('hide');
    }
    open.addEventListener('click', openModal);
    close.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e=> { if(e.key==='Escape' && modal.classList.contains('modal--open')) closeModal(); });

    send.addEventListener('click', () => {
      const v = phone.value.replace(/\D/g,'');
      if (!/^[6-9]\d{9}$/.test(v)) { Store.toast('Enter a valid 10-digit mobile number'); phone.focus(); return; }
      demoOTP = genOTP();
      if (otpDisplay) otpDisplay.textContent = demoOTP;
      if (otpHidden) otpHidden.value = demoOTP;
      otpBoxes.forEach(b=> b.value='');
      step1.classList.add('hide'); step2.classList.remove('hide');
      setTimeout(()=> otpBoxes[0]?.focus(), 150);
      Store.toast('OTP sent — demo: ' + demoOTP);
    });
    phone.addEventListener('keydown', e=> { if(e.key==='Enter') send.click(); });

    otpBoxes.forEach((box,i)=>{
      box.addEventListener('input', e=>{
        const v = e.target.value.replace(/\D/g,''); e.target.value=v;
        if (v && i<3) otpBoxes[i+1].focus();
        syncOTP();
        if ([...otpBoxes].every(b=>b.value)) setTimeout(()=> verify.click(), 180);
      });
      box.addEventListener('keydown', e=>{
        if(e.key==='Backspace' && !e.target.value && i>0) otpBoxes[i-1].focus();
        if(e.key==='Enter') verify.click();
      });
      box.addEventListener('paste', e=>{
        e.preventDefault();
        const paste = (e.clipboardData||window.clipboardData).getData('text').replace(/\D/g,'');
        if(paste.length>=4){
          otpBoxes.forEach((b,idx)=> b.value = paste[idx]||'');
          syncOTP(); otpBoxes[3].focus();
        }
      });
    });
    function syncOTP(){
      const code = [...otpBoxes].map(b=>b.value).join('');
      if(otpHidden) otpHidden.value = code;
    }
    verify.addEventListener('click', () => {
      const code = [...otpBoxes].map(b=>b.value).join('');
      if (code.length<4) { Store.toast('Enter complete OTP'); return; }
      if (code===demoOTP) {
        const prev = JSON.parse(localStorage.getItem('jimmi_user')||'{}');
        localStorage.setItem('jimmi_user', JSON.stringify({ ...prev, phone: phone.value.trim() }));
        closeModal();
        Store.toast('Logged in successfully ✓');
        showUserPhoto();
        const span = open.querySelector('span');
        if(span) span.textContent = 'Hi, ' + (prev.name||'there');
      } else {
        Store.toast('Wrong OTP — try ' + demoOTP);
        otpBoxes.forEach(b=> b.value=''); otpBoxes[0].focus();
      }
    });
    if(resend) resend.addEventListener('click', e=>{
      e.preventDefault();
      demoOTP = genOTP();
      if(otpDisplay) otpDisplay.textContent = demoOTP;
      if(otpHidden) otpHidden.value = demoOTP;
      otpBoxes.forEach(b=> b.value=''); otpBoxes[0].focus();
      Store.toast('New OTP: ' + demoOTP);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    try{ Store.init(); }catch(e){ console.warn('Store init failed',e); }
    try{ Chat.init(); }catch(e){}
    reveals();
    headerShadow();
    backToTop();
    stats();
    themeToggle();
    mobileDrawer();
    voiceSearch();
    handleLogout();
    handleNewsletter();
    handleDeliverTo();
    handleOffers();
    loginModal();
    showUserPhoto();
    setTimeout(fruit3D, 650);
    const mo = new MutationObserver(()=> fruit3D());
    const cat = document.getElementById('catalog');
    if(cat) mo.observe(cat, {childList:true, subtree:true});
    // also observe recently viewed
    const rv = document.getElementById('recently-viewed');
    if(rv) new MutationObserver(()=> fruit3D()).observe(rv,{childList:true});
  });
})();
