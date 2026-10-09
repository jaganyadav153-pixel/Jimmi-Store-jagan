/* =========================================================
   cube.js — PRO revolving 3D product cube
   WebGL (Three.js) when available → CSS 3D fallback (100% works offline)
   Always rotating, drag + inertia, click face to shop,
   premium lighting / shadows / floating.
   ========================================================= */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var stage = document.getElementById('cube-stage');
    if (!stage) return;

    var ORDER = ['fresh', 'sweet', 'dairy', 'pantry', 'beverage', 'brand'];
    var SIZE = 512;
    var BRAND_IMG = '1767032916116-2460bbd4a27d';

    // show loading immediately (professional)
    stage.innerHTML = '<div class="cube-loading"><i></i><span>Loading 3D store…</span></div>';

    // helpers to access global data safely (const globals are window lexical, not properties)
    function getCats() { try { return typeof CATEGORIES !== 'undefined' ? CATEGORIES : (window.CATEGORIES || []); } catch(e){ return []; } }
    function getProds() { try { return typeof PRODUCTS !== 'undefined' ? PRODUCTS : (window.PRODUCTS || []); } catch(e){ return []; } }
    function getU() { try { return typeof U !== 'undefined' ? U : (window.U || null); } catch(e){ return null; } }

    function Uphoto(photoId, w) {
      w = w || 400;
      if (!photoId) return FALLBACK;
      var s = String(photoId);
      if (s.indexOf('http') === 0) {
        if (s.indexOf('source.unsplash') !== -1) {
          // map each source.unsplash pantry to a verified id using hash
          var hash = 0; for(var i=0;i<s.length;i++) hash = ((hash<<5)-hash)+s.charCodeAt(i);
          var verified = ['1550825488-af28862c0df5','1519995672084-d21490e86ba6','1553877679-66548171b5f5','1685504445355-0e7bdf90d415','1587314168485-3236d6710814','1623345260599-6f5cba600f6a','1621506284645-9e021e85cf47','1624553669111-515a8b021a24','1576092762793-c0b9396b14ae','1442557702544-d3364f08ef5e'];
          var pick = verified[Math.abs(hash)%verified.length];
          return 'https://images.unsplash.com/photo-' + pick + '?auto=format&fit=crop&w=' + w + '&q=70';
        }
        return s;
      }
      return 'https://images.unsplash.com/photo-' + s + '?auto=format&fit=crop&w=' + w + '&q=70';
    }
    var Ufn = getU();
    function imgSrc(photoId, w) {
      if (Ufn) try { return Ufn(photoId, w); } catch(e) {}
      return Uphoto(photoId, w);
    }
    var FALLBACK = (function(){ try { return typeof FALLBACK_IMG !== 'undefined' ? FALLBACK_IMG : imgSrc(BRAND_IMG, 800); } catch(e){ return imgSrc(BRAND_IMG,800);} })();

    // ---------- CSS fallback (guaranteed) ----------
    function buildCSSCube() {
      var cats = getCats();
      var prods = getProds();
      if (!cats.length) {
        stage.innerHTML = '<div class="cube-fallback">Fresh picks loading… scroll down to shop 🧺</div>';
        return;
      }
      var scene = document.createElement('div');
      scene.className = 'css-cube-scene';
      var cube = document.createElement('div');
      cube.className = 'css-cube';
      cube.setAttribute('role', 'img');
      cube.setAttribute('aria-label', '3D cube showing product categories — hover to pause, click to shop');

      ORDER.forEach(function (id, idx) {
        var face = document.createElement('div');
        face.className = 'css-face';
        face.dataset.cat = id;
        face.style.cursor = 'pointer';
        if (id === 'brand') {
          face.classList.add('css-brand-face');
          face.innerHTML = '<div><b>Jimmi Store</b><p>Fresh groceries, 60-min delivery</p><small>Click any face to shop →</small></div>';
        } else {
          var cat = cats.find(function (c) { return c.id === id; });
          if (!cat) cat = { id: id, name: id };
          var items = prods.filter(function (p) { return p.cat === id; }).slice(0, 4);
          // pad to 4
          while (items.length < 4) items.push({ name: 'Fresh pick', photo: BRAND_IMG, price: '' });
          var grid = '<div class="css-face-head">' + cat.name + '<small>' + items.length + ' fresh picks · tap to shop</small></div><div class="css-face-grid">';
          items.forEach(function (p, i) {
            var src = imgSrc(p.photo, 240);
            var price = p.price ? '₹' + p.price : '';
            var badge = (p.badge && p.badge.text) ? '<em>' + p.badge.text + '</em>' : '';
            grid += '<div class="css-mini"><img src="' + src + '" alt="' + p.name + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + FALLBACK + '\'">' + badge + '<span>' + p.name + (price ? ' · ' + price : '') + '</span></div>';
          });
          grid += '</div>';
          face.innerHTML = grid;
        }
        // click -> scroll to category
        face.addEventListener('click', function () {
          if (id === 'brand') {
            var el = document.getElementById('catalog');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            if (window.Store && Store.toast) Store.toast('Spinning fresh picks for you 🧺');
            return;
          }
          var sec = document.getElementById('cat-' + id);
          if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.Store && Store.toast) {
              var cname = (cats.find(function (c) { return c.id === id; }) || {}).name || id;
              Store.toast('Showing ' + cname + ' →');
            }
            sec.style.transition = 'box-shadow .35s';
            sec.style.boxShadow = '0 0 0 3px rgba(46,139,87,.22)';
            setTimeout(function () { sec.style.boxShadow = ''; }, 1400);
          }
        });
        cube.appendChild(face);
      });

      scene.appendChild(cube);

      // hud
      var hud = document.createElement('div');
      hud.className = 'cube-hud';
      hud.innerHTML = '<span>3D • Interactive</span><span>Drag · Click face</span>';
      // pause toggle on click of scene (not face) — toggles animation
      var paused = false;
      scene.addEventListener('dblclick', function () {
        paused = !paused;
        cube.style.animationPlayState = paused ? 'paused' : 'running';
      });

      stage.innerHTML = '';
      stage.appendChild(scene);
      stage.appendChild(hud);
      // expose
      window.__jimmiCube = { mode: 'css', el: cube, scene: scene };
    }

    // If THREE missing or WebGL not supported → CSS cube immediately (but try to load THREE async first)
    function hasWebGL() {
      try {
        var c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
      } catch (e) { return false; }
    }

    var threeTried = false;
    function tryThreeOrFallback() {
      // give CDN 2.5s to load, otherwise go CSS (guaranteed)
      if (window.THREE && hasWebGL()) {
        buildWebGLCube();
      } else if (!threeTried) {
        threeTried = true;
        // try dynamic load of jsdelivr as backup if unpkg blocked
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
        s.onload = function () { setTimeout(function () { if (window.THREE && hasWebGL()) buildWebGLCube(); else buildCSSCube(); }, 120); };
        s.onerror = function () { buildCSSCube(); };
        document.head.appendChild(s);
        // timeout fallback
        setTimeout(function () { if (!window.__jimmiCube) buildCSSCube(); }, 2600);
      } else {
        buildCSSCube();
      }
    }

    // ---------- WebGL PRO cube ----------
    function buildWebGLCube() {
      if (!window.THREE || !hasWebGL()) { buildCSSCube(); return; }
      var cats = getCats(), prods = getProds();
      if (!cats.length || !prods.length) {
        // data not ready yet — retry
        setTimeout(buildWebGLCube, 180);
        return;
      }

      var THREE = window.THREE;
      // detect reduced-motion
      var prefersReduced = false;
      try { prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

      // image loader with timeout + 100% fallback (never green)
      var _fallbackImg = null;
      function getFallbackImg(){
        if(_fallbackImg && _fallbackImg.complete && _fallbackImg.naturalWidth) return _fallbackImg;
        return null;
      }
      // preload fallback once
      (function preloadFallback(){
        var fi = new Image(); fi.crossOrigin='anonymous';
        fi.onload=function(){ _fallbackImg=fi; };
        fi.src = FALLBACK;
      })();
      function loadImg(photoId, w) {
        w = w || 420;
        return new Promise(function (res) {
          var img = new Image();
          var done = false;
          var primarySrc = Uphoto(photoId, w);
          var t = setTimeout(function () {
            if (done) return; done = true;
            // timeout -> try fallback
            tryFallback();
          }, 3600);
          function tryFallback(){
            var fb = getFallbackImg();
            if(fb){
              clearTimeout(t); res(fb);
              return;
            }
            // load fallback image as fallback
            var f2 = new Image(); f2.crossOrigin='anonymous';
            f2.onload=function(){ _fallbackImg=f2; res(f2); };
            f2.onerror=function(){ res(null); };
            f2.src = FALLBACK;
          }
          img.crossOrigin = 'anonymous';
          img.onload = function () { if (done) return; done = true; clearTimeout(t); res(img); };
          img.onerror = function () {
            if (done) return;
            // on error, try fallback immediately
            clearTimeout(t); done = true;
            tryFallback();
          };
          img.src = primarySrc;
        });
      }

      function rrect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }
      function cover(ctx, img, x, y, w, h) {
        // 100% working: fallback to preloaded fallback image if primary missing
        if (!img || !img.width || !img.naturalWidth) {
          var fb = getFallbackImg();
          if (fb && fb.complete && fb.naturalWidth) img = fb;
          else { ctx.fillStyle = '#2e8b57'; ctx.fillRect(x, y, w, h); return; }
        }
        var ir = img.width / img.height, tr = w / h;
        var sx, sy, sw, sh;
        if (ir > tr) { sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2; sy = 0; }
        else { sw = img.width; sh = sw / tr; sx = 0; sy = (img.height - sh) / 2; }
        try { ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); } catch (e) {
          var fb2 = getFallbackImg();
          if (fb2) { try{ ctx.drawImage(fb2, x, y, w, h); return; }catch(e2){} }
          ctx.fillStyle = '#2e8b57'; ctx.fillRect(x, y, w, h);
        }
      }

      function drawCategoryFace(cat, imgs) {
        var c = document.createElement('canvas');
        c.width = c.height = SIZE;
        var ctx = c.getContext('2d');
        // premium bg with subtle grain
        var g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
        g.addColorStop(0, '#143a26'); g.addColorStop(0.5, '#1d5638'); g.addColorStop(1, '#2e8b57');
        ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE);
        // top highlight
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.fillRect(0, 0, SIZE, 88);
        // title
        ctx.fillStyle = '#fff';
        ctx.font = '800 32px Poppins, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
        ctx.fillText(cat.name, SIZE / 2, 50);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(255,255,255,.82)';
        ctx.font = '600 13px Poppins, Segoe UI, sans-serif';
        ctx.letterSpacing = '0.04em';
        ctx.fillText('TAP FACE TO SHOP  •  FRESH DAILY', SIZE / 2, 72);

        var items = prods.filter(function (p) { return p.cat === cat.id; }).slice(0, 4);
        while (items.length < 4) items.push({ name: 'Fresh pick', photo: BRAND_IMG, price: '' });
        var pad = 22, gap = 16;
        var cell = (SIZE - pad * 2 - gap) / 2;
        items.forEach(function (p, i) {
          var col = i % 2, row = (i / 2) | 0;
          var x = pad + col * (cell + gap);
          var y = 94 + row * (cell + gap);
          // card shadow
          ctx.fillStyle = 'rgba(0,0,0,.18)';
          rrect(ctx, x + 2, y + 4, cell, cell, 18); ctx.fill();
          // card
          rrect(ctx, x, y, cell, cell, 16); ctx.save(); ctx.clip();
          cover(ctx, imgs[i], x, y, cell, cell);
          // scrim
          var scr = ctx.createLinearGradient(x, y + cell - 70, x, y + cell);
          scr.addColorStop(0, 'rgba(0,0,0,0)'); scr.addColorStop(1, 'rgba(0,0,0,.62)');
          ctx.fillStyle = scr; ctx.fillRect(x, y + cell - 70, cell, 70);
          // badge
          if (p.badge && p.badge.text) {
            ctx.fillStyle = p.badge.type === 'off' ? '#ff8a3d' : (p.badge.type === 'fresh' ? '#16a34a' : '#1d5638');
            ctx.fillRect(x, y, 58, 20);
            ctx.fillStyle = '#fff'; ctx.font = '700 9px Poppins, sans-serif'; ctx.textAlign = 'left';
            ctx.fillText(p.badge.text.toUpperCase(), x + 6, y + 13);
          }
          ctx.restore();
          // border
          ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.2;
          rrect(ctx, x, y, cell, cell, 16); ctx.stroke();
          // text
          ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
          ctx.font = '700 15px Poppins, Segoe UI, sans-serif';
          var name = p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name;
          ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 6;
          ctx.fillText(name, x + 10, y + cell - 26);
          ctx.fillStyle = '#ffd9b0';
          ctx.font = '800 14px Poppins, Segoe UI, sans-serif';
          if (p.price) ctx.fillText('₹' + p.price, x + 10, y + cell - 10);
          ctx.shadowColor = 'transparent';
        });
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.font = '700 10px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK TO SHOP  →', SIZE / 2, SIZE - 12);
        return c;
      }

      function drawBrandFace(img) {
        var c = document.createElement('canvas');
        c.width = c.height = SIZE;
        var ctx = c.getContext('2d');
        cover(ctx, img, 0, 0, SIZE, SIZE);
        // premium overlay
        var g2 = ctx.createLinearGradient(0, 0, 0, SIZE);
        g2.addColorStop(0, 'rgba(20,58,38,.18)'); g2.addColorStop(0.5, 'rgba(15,23,19,.48)'); g2.addColorStop(1, 'rgba(15,23,19,.62)');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,.32)'; ctx.shadowBlur = 14;
        ctx.font = '800 46px Georgia, serif';
        ctx.fillText('Jimmi Store', SIZE / 2, SIZE / 2 - 8);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#bfe0cd';
        ctx.font = '600 18px Poppins, Segoe UI, sans-serif';
        ctx.fillText('Fresh groceries, 60-min delivery', SIZE / 2, SIZE / 2 + 30);
        // pills
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.strokeStyle = 'rgba(255,255,255,.22)';
        rrect(ctx, SIZE / 2 - 92, SIZE / 2 + 56, 184, 28, 999); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '700 10px Poppins, sans-serif';
        ctx.fillText('CLICK TO EXPLORE  →', SIZE / 2, SIZE / 2 + 74);
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '700 10px Poppins, sans-serif';
        ctx.fillText('ALWAYS FRESH  •  TAP ANY FACE', SIZE / 2, SIZE - 14);
        return c;
      }

      Promise.all(ORDER.map(function (id) {
        if (id === 'brand') return loadImg(BRAND_IMG, 560).then(drawBrandFace);
        var cat = cats.find(function (c) { return c.id === id; });
        if (!cat) cat = { id: id, name: id };
        var items = prods.filter(function (p) { return p.cat === id; }).slice(0, 4);
        return Promise.all(items.map(function (p) { return loadImg(p.photo, 420); })).then(function (imgs) { return drawCategoryFace(cat, imgs); });
      })).then(function (faces) {
        // ---------- Three setup PRO ----------
        var scene = new THREE.Scene();
        // keep transparent so stage gradient shows; add subtle fog for depth
        scene.fog = new THREE.Fog(0xfff8ef, 7, 12);

        var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(0, 0.35, 4.9);
        camera.lookAt(0, 0, 0);

        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
        renderer.setClearColor(0x000000, 0);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        // tone mapping for premium look
        try { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.06; } catch (e) {}

        stage.innerHTML = '';
        stage.appendChild(renderer.domElement);
        renderer.domElement.style.cursor = 'grab';
        renderer.domElement.setAttribute('role', 'img');
        renderer.domElement.setAttribute('aria-label', 'Drag to rotate, click a face to shop. Double-click to pause.');

        // lighting — professional
        var amb = new THREE.AmbientLight(0xfff8ef, 0.95);
        scene.add(amb);
        var dir = new THREE.DirectionalLight(0xffffff, 1.05);
        dir.position.set(3.2, 5.5, 4.0);
        dir.castShadow = true;
        dir.shadow.mapSize.set(1024, 1024);
        dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 12;
        dir.shadow.bias = -0.0006;
        scene.add(dir);
        var fill = new THREE.DirectionalLight(0xffe9c8, 0.42);
        fill.position.set(-3.5, 2.2, -2.8);
        scene.add(fill);
        var hemi = new THREE.HemisphereLight(0xffffff, 0x1d5638, 0.18);
        scene.add(hemi);

        // ground that receives shadow (subtle)
        var groundGeo = new THREE.PlaneGeometry(12, 12);
        var groundMat = new THREE.ShadowMaterial({ opacity: 0.14 });
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.55;
        ground.receiveShadow = true;
        scene.add(ground);
        // contact shadow ellipse (soft fake)
        var shadowGeo = new THREE.CircleGeometry(1.42, 32);
        var shadowMat = new THREE.MeshBasicMaterial({ color: 0x1d5638, transparent: true, opacity: 0.10 });
        var contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
        contactShadow.rotation.x = -Math.PI / 2;
        contactShadow.position.y = -1.54;
        scene.add(contactShadow);

        // cube — PRO materials (Standard + roughness for real lighting)
        var geo = new THREE.BoxGeometry(2.36, 2.36, 2.36);
        // bevel feel: add slight env without needing RoundedBox
        var mats = faces.map(function (cv) {
          var tex = new THREE.CanvasTexture(cv);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
          tex.needsUpdate = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          return new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.56,
            metalness: 0.04,
            emissive: 0x000000,
            emissiveIntensity: 0
          });
        });
        var cube = new THREE.Mesh(geo, mats);
        cube.castShadow = true;
        cube.receiveShadow = false;
        cube.rotation.x = -0.18;
        cube.rotation.y = 0.62;
        cube.position.y = 0.06;
        scene.add(cube);
        // subtle edge line for premium definition
        var edges = new THREE.EdgesGeometry(geo);
        var lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 });
        var line = new THREE.LineSegments(edges, lineMat);
        cube.add(line);

        // HUD
        var hud = document.createElement('div');
        hud.className = 'cube-hud';
        hud.innerHTML = '<span>3D • Interactive</span><span>Drag · Click face</span>';
        stage.appendChild(hud);

        // state
        var isPointerDown = false, dragging = false, hasDragged = false;
        var lastX = 0, lastY = 0, velX = 0, velY = 0;
        var autoY = prefersReduced ? 0.0035 : 0.008;
        var autoX = prefersReduced ? 0.0007 : 0.0012;
        var hoverSlow = false;
        var pausedByUser = false;
        var idleResumeTimer = null;

        function setPaused(v) { pausedByUser = v; }

        // hover → slow down 55% (not full stop → always rotating)
        renderer.domElement.addEventListener('mouseenter', function () { hoverSlow = true; });
        renderer.domElement.addEventListener('mouseleave', function () { hoverSlow = false; if (isPointerDown) return; isPointerDown = false; dragging = false; hasDragged = false; renderer.domElement.style.cursor = 'grab'; });

        renderer.domElement.addEventListener('pointerdown', function (e) {
          isPointerDown = true; dragging = true; hasDragged = false;
          lastX = e.clientX; lastY = e.clientY; velX = 0; velY = 0;
          renderer.domElement.setPointerCapture(e.pointerId);
          renderer.domElement.style.cursor = 'grabbing';
          clearTimeout(idleResumeTimer);
        });
        renderer.domElement.addEventListener('pointermove', function (e) {
          if (!isPointerDown) return;
          var dx = e.clientX - lastX;
          var dy = e.clientY - lastY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDragged = true;
          cube.rotation.y += dx * 0.0052;
          cube.rotation.x += dy * 0.0052;
          cube.rotation.x = Math.max(-0.82, Math.min(0.82, cube.rotation.x));
          velX = dx * 0.0052; velY = dy * 0.0052;
          lastX = e.clientX; lastY = e.clientY;
        });
        function endDrag(e) {
          if (!isPointerDown) return;
          isPointerDown = false;
          renderer.domElement.style.cursor = 'grab';
          // inertia then resume auto
          var t = 22;
          (function inertia() {
            if (t-- <= 0) { dragging = false; return; }
            if (!isPointerDown) {
              cube.rotation.y += velX * 0.55;
              cube.rotation.x += velY * 0.55;
              cube.rotation.x = Math.max(-0.82, Math.min(0.82, cube.rotation.x));
              velX *= 0.90; velY *= 0.90;
            }
            requestAnimationFrame(inertia);
          })();
          // if not dragged, treat as click
          if (!hasDragged) handleClick(e);
          // resume auto after 1.6s
          clearTimeout(idleResumeTimer);
          idleResumeTimer = setTimeout(function () { dragging = false; hasDragged = false; }, 1600);
          setTimeout(function () { hasDragged = false; }, 320);
        }
        renderer.domElement.addEventListener('pointerup', endDrag);
        renderer.domElement.addEventListener('pointercancel', endDrag);
        renderer.domElement.addEventListener('dblclick', function () { pausedByUser = !pausedByUser; hud.innerHTML = pausedByUser ? '<span style=\"background:#991b1b;border-color:#991b1b\">⏸ Paused</span><span>Double-click to resume</span>' : '<span>3D • Interactive</span><span>Drag · Click face</span>'; });

        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();
        function handleClick(e) {
          var rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);
          var hits = raycaster.intersectObject(cube);
          if (!hits.length) return;
          var matIndex = hits[0].face ? hits[0].face.materialIndex : 0;
          var targetId = ORDER[matIndex];
          // visual feedback: emissive flash
          try {
            var m = mats[matIndex];
            if (m) { m.emissive.setHex(0x1d5638); m.emissiveIntensity = 0.18; setTimeout(function(){ m.emissiveIntensity = 0; }, 220); }
          } catch (err) {}
          if (!targetId) return;
          if (targetId === 'brand') {
            var el = document.getElementById('catalog');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            if (window.Store && Store.toast) Store.toast('Spinning fresh picks for you 🧺');
            return;
          }
          var sec = document.getElementById('cat-' + targetId);
          if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.Store && Store.toast) {
              var cname = (cats.find(function (c) { return c.id === targetId; }) || {}).name || targetId;
              Store.toast('Showing ' + cname + ' →');
            }
            sec.style.transition = 'box-shadow .35s'; sec.style.boxShadow = '0 0 0 3px rgba(46,139,87,.22)';
            setTimeout(function () { sec.style.boxShadow = ''; }, 1500);
          }
        }

        // pause when hidden, but always rotate when visible (unless user paused)
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) hoverSlow = true;
          else hoverSlow = false;
        });
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
              // when out of view, slow to save battery but keep ticking
              if (!en.isIntersecting) hoverSlow = true;
              else if (!pausedByUser) hoverSlow = false;
            });
          }, { threshold: 0.04 });
          io.observe(stage);
        }

        function resize() {
          var w = stage.clientWidth, h = stage.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        resize();
        window.addEventListener('resize', resize);

        var t0 = performance.now();
        (function loop() {
          requestAnimationFrame(loop);
          if (!pausedByUser) {
            var s = hoverSlow ? 0.32 : 1; // always rotating, just slower on hover
            if (!isPointerDown) {
              cube.rotation.y += autoY * s;
              cube.rotation.x += autoX * s;
            }
          }
          // floating
          var t = (performance.now() - t0) * 0.0007;
          cube.position.y = 0.06 + Math.sin(t) * 0.055;
          contactShadow.material.opacity = 0.11 - Math.abs(cube.position.y - 0.06) * 0.55;
          contactShadow.scale.setScalar(1 + Math.abs(cube.position.y - 0.06) * 2.2);
          ground.material.opacity = 0.12 + Math.sin(t * 0.9) * 0.015;
          renderer.render(scene, camera);
        })();

        window.__jimmiCube = { mode: 'webgl', scene: scene, camera: camera, renderer: renderer, cube: cube, mats: mats };
      }).catch(function (err) {
        console.warn('WebGL cube failed → CSS fallback', err);
        buildCSSCube();
      });
    }

    // kick off — wait for data.js then attempt WebGL
    var attempts = 0;
    function waitForData() {
      var cats = getCats(), prods = getProds();
      if (cats.length && prods.length) {
        tryThreeOrFallback();
      } else if (attempts++ < 40) {
        setTimeout(waitForData, 120);
      } else {
        // data never arrived → still show CSS cube with whatever we have
        buildCSSCube();
      }
    }
    waitForData();
  });
})();
