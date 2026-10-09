/* =========================================================
   cube.js — revolving 3D product cube (Three.js / WebGL)
   Each face shows a store category with real product photos.
   ========================================================= */

(function () {
  const stage = document.getElementById('cube-stage');
  if (!stage) return;

  if (!window.THREE) {
    stage.innerHTML = '<div class="cube-fallback">Could not load the 3D cube (Three.js needs an internet connection). The rest of the store works fine.</div>';
    return;
  }

  const SIZE = 512;
  const BRAND_IMG = '1767032916116-2460bbd4a27d';

  const catName = id => (CATEGORIES.find(c => c.id === id) || {}).name || id;

  /* load a remote (CORS-enabled) image as a promise */
  function loadImg(photoId, w = 400) {
    return new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${w}&q=70`;
    });
  }

  /* rounded-rect path */
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* draw an image covering a rect (aspect preserved) */
  function cover(ctx, img, x, y, w, h) {
    if (!img) { ctx.fillStyle = '#2e8b57'; ctx.fillRect(x, y, w, h); return; }
    const ir = img.width / img.height, tr = w / h;
    let sx, sy, sw, sh;
    if (ir > tr) { sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2; sy = 0; }
    else { sw = img.width; sh = sw / tr; sx = 0; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  /* build one canvas face for a category */
  function drawCategoryFace(cat, imgs) {
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const ctx = c.getContext('2d');

    const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    g.addColorStop(0, '#1d5638'); g.addColorStop(1, '#2e8b57');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = '#fff';
    ctx.font = '700 34px Poppins, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cat.name, SIZE / 2, 50);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.font = '500 16px Poppins, Segoe UI, sans-serif';
    ctx.fillText('Tap a face · fresh daily', SIZE / 2, 74);

    const items = PRODUCTS.filter(p => p.cat === cat.id).slice(0, 4);
    const pad = 26, gap = 18;
    const cell = (SIZE - pad * 2 - gap) / 2;
    items.forEach((p, i) => {
      const col = i % 2, row = (i / 2) | 0;
      const x = pad + col * (cell + gap);
      const y = 96 + row * (cell + gap);
      rrect(ctx, x, y, cell, cell, 16); ctx.save(); ctx.clip();
      cover(ctx, imgs[i], x, y, cell, cell);
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y + cell - 54, cell, 54);
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.font = '600 17px Poppins, Segoe UI, sans-serif';
      ctx.fillText(p.name, x + 12, y + cell - 30);
      ctx.fillStyle = '#ffd9b0';
      ctx.font = '700 16px Poppins, Segoe UI, sans-serif';
      ctx.fillText('₹' + p.price, x + 12, y + cell - 10);
    });
    return c;
  }

  /* brand face */
  function drawBrandFace(img) {
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const ctx = c.getContext('2d');
    cover(ctx, img, 0, 0, SIZE, SIZE);
    ctx.fillStyle = 'rgba(15,23,19,.55)'; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = '700 46px Georgia, serif';
    ctx.fillText('Jimmi Store', SIZE / 2, SIZE / 2 - 6);
    ctx.fillStyle = '#bfe0cd';
    ctx.font = '500 20px Poppins, Segoe UI, sans-serif';
    ctx.fillText('Fresh groceries, 60-min delivery', SIZE / 2, SIZE / 2 + 34);
    return c;
  }

  /* face order for BoxGeometry: +x, -x, +y, -y, +z, -z */
  const order = ['fresh', 'dairy', 'sweet', 'pantry', 'beverage', 'brand'];

  Promise.all(order.map(id => {
    if (id === 'brand') return loadImg(BRAND_IMG, 500).then(drawBrandFace);
    const cat = CATEGORIES.find(c => c.id === id);
    const items = PRODUCTS.filter(p => p.cat === id).slice(0, 4);
    return Promise.all(items.map(p => loadImg(p.photo))).then(imgs => drawCategoryFace(cat, imgs));
  })).then(faces => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stage.appendChild(renderer.domElement);

    const geo = new THREE.BoxGeometry(2.4, 2.4, 2.4);
    const mats = faces.map(cv => new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
    const cube = new THREE.Mesh(geo, mats);
    cube.rotation.x = 0.35;
    scene.add(cube);

    let paused = false;
    renderer.domElement.addEventListener('mouseenter', () => paused = true);
    renderer.domElement.addEventListener('mouseleave', () => paused = false);

    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    (function loop() {
      requestAnimationFrame(loop);
      if (!paused) { cube.rotation.y += 0.007; cube.rotation.x += 0.0016; }
      renderer.render(scene, camera);
    })();
  }).catch(() => {
    stage.innerHTML = '<div class="cube-fallback">The 3D cube could not start. Please check your connection.</div>';
  });
})();
