/* =========================================================
   Loader — premium with percentage
   ========================================================= */

(function () {
  const loader = document.getElementById('loader');
  if (!loader) return;
  const bar = loader.querySelector('.loader-bar > span');
  const pctEl = document.getElementById('loader-pct');
  let pct = 0;
  const timer = setInterval(() => {
    pct = Math.min(100, pct + Math.random() * 18 + 7);
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
    const prog = loader.querySelector('.loader-bar');
    if(prog) prog.setAttribute('aria-valuenow', String(Math.round(pct)));
    if (pct >= 100) {
      clearInterval(timer);
      setTimeout(() => {
        loader.classList.add('loader--done');
        document.body.classList.add('is-loaded');
        setTimeout(() => loader.remove(), 750);
      }, 280);
    }
  }, 150);
})();
