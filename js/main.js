/* =========================================================
   PRISME LAB — shared interactions (both pages)
   ========================================================= */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Page enter / leave transition ---------- */
  requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  window.addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));
  $$('a[href$=".html"]').forEach(a => {
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || a.target === '_blank') return;
      e.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(() => { window.location.href = a.href; }, 320);
    });
  });

  /* ---------- Liquid background parallax ---------- */
  const blobs = $$('.blob');
  let tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('pointermove', e => {
    tx = e.clientX / innerWidth - 0.5;
    ty = e.clientY / innerHeight - 0.5;
  });
  (function loop() {
    cx += (tx - cx) * 0.04;
    cy += (ty - cy) * 0.04;
    const s = scrollY * 0.08;
    blobs.forEach(b => {
      const d = +b.dataset.depth || 30;
      b.style.transform = `translate3d(${cx * d}px, ${cy * d - s * (d / 40)}px, 0)`;
    });
    if (!reduced) requestAnimationFrame(loop);
  })();

  /* ---------- Specular highlight on glass ---------- */
  document.addEventListener('pointermove', e => {
    const g = e.target.closest && e.target.closest('.glass');
    if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty('--mx', `${e.clientX - r.left}px`);
    g.style.setProperty('--my', `${e.clientY - r.top}px`);
  });

  /* ---------- 3D tilt ---------- */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${-y * 8}deg) rotateY(${x * 10}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Animated counters ---------- */
  const animateCount = el => {
    const target = parseFloat(el.dataset.count);
    const dec = +el.dataset.decimals || 0;
    const suffix = el.dataset.suffix || '';
    const dur = 1800;
    const t0 = performance.now();
    const fmt = v => v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    (function step(t) {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(target * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  };

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-visible');
      $$('[data-count]', en.target).forEach(animateCount);
      if (en.target.matches('[data-count]')) animateCount(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.15 });
  $$('[data-reveal]').forEach(el => io.observe(el));
  // counters outside of a reveal block
  $$('[data-count]').forEach(el => { if (!el.closest('[data-reveal]')) io.observe(el); });

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 40);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    $('#burger')?.addEventListener('click', () => nav.classList.toggle('open'));
    $$('.nav-links a', nav).forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

    // active link by section
    const links = $$('.nav-links a[href^="#"]', nav);
    const secObs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(l => { const s = $(l.getAttribute('href')); if (s) secObs.observe(s); });
  }

  /* =========================================================
     LANDING-ONLY: hero viewer
     ========================================================= */
  const heroTc = $('#heroTc');
  if (heroTc) {
    // running SMPTE timecode at 24 fps
    const start = performance.now();
    const pad = n => String(n).padStart(2, '0');
    const playhead = $('#playhead');
    const tl = $('#timeline');
    setInterval(() => {
      const f = Math.floor((performance.now() - start) / (1000 / 24));
      const fr = f % 24, s = Math.floor(f / 24) % 60, m = Math.floor(f / 1440) % 60;
      heroTc.textContent = `01:${pad(m)}:${pad(s)}:${pad(fr)}`;
      if (playhead && tl) playhead.style.left = `${((f % 480) / 480) * tl.clientWidth}px`;
    }, 1000 / 24);

    // color wheels drift
    const dots = $$('.wheel i');
    setInterval(() => {
      dots.forEach(d => {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 12;
        d.style.transform = `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px)`;
      });
    }, 1600);
  }

  // RGB parade (canvas)
  const parade = $('#parade');
  if (parade) {
    const ctx = parade.getContext('2d');
    const size = () => {
      const dpr = devicePixelRatio || 1;
      parade.width = parade.clientWidth * dpr;
      parade.height = parade.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    addEventListener('resize', size);
    const cols = ['255,90,90', '90,255,140', '90,160,255'];
    let t = 0;
    (function draw() {
      const w = parade.clientWidth, h = parade.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, h * i / 4); ctx.lineTo(w, h * i / 4); ctx.stroke(); }
      const cw = w / 3;
      cols.forEach((c, ci) => {
        ctx.fillStyle = `rgba(${c},.18)`;
        for (let x = 0; x < cw - 4; x += 1.5) {
          const nx = x / cw;
          const base = 0.5 + 0.28 * Math.sin(nx * 6 + t + ci) + 0.12 * Math.sin(nx * 17 - t * 1.4);
          for (let k = 0; k < 5; k++) {
            const y = h * (1 - Math.min(0.97, Math.max(0.03, base + (Math.random() - 0.5) * 0.35)));
            ctx.fillRect(ci * cw + 2 + x, y, 1.2, 1.2);
          }
        }
      });
      t += 0.015;
      if (!reduced) requestAnimationFrame(draw);
    })();
  }

  // infra bars
  const bars = $('#bars');
  if (bars) {
    const n = 24;
    for (let i = 0; i < n; i++) bars.appendChild(document.createElement('i'));
    const items = $$('i', bars);
    const fill = () => items.forEach((b, i) => {
      const v = 35 + 40 * Math.sin(i / 3.4) ** 2 + Math.random() * 22;
      b.style.height = `${Math.min(100, v)}%`;
    });
    new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { fill(); setInterval(fill, 2600); o.disconnect(); } }).observe(bars);
  }
})();
