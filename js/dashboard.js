/* =========================================================
   PRISME LAB — Dashboard (simulated live data)
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(rand(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = n => String(n).padStart(2, '0');
  const css = getComputedStyle(document.documentElement);
  const C = name => css.getPropertyValue('--' + name).trim();
  const COLORS = { cyan: C('cyan'), violet: C('violet'), pink: C('pink'), lime: C('lime'), amber: C('amber'), red: C('red') };
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };
  const fr = (v, d = 0) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

  function setupCanvas(cv) {
    const dpr = devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // smooth path through points
  function smoothPath(ctx, pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i][0] + pts[i + 1][0]) / 2;
      const yc = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
    }
    const l = pts[pts.length - 1];
    ctx.lineTo(l[0], l[1]);
  }

  function tweenNumber(el, to, { dur = 1400, dec = 0 } = {}) {
    const from = parseFloat(el.dataset.v || '0');
    const t0 = performance.now();
    el.dataset.v = to;
    (function step(t) {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fr(from + (to - from) * e, dec);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- Clock & date ---------- */
  const clock = $('#clock');
  setInterval(() => {
    const d = new Date();
    const f = Math.floor(d.getMilliseconds() / 40); // 25 fps
    clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${pad(f)}`;
  }, 40);
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#today').textContent = today.charAt(0).toUpperCase() + today.slice(1) + ' · Studio Paris 11e';

  /* ---------- Sidebar (mobile) ---------- */
  const sidebar = $('#sidebar');
  $('#menuBtn').addEventListener('click', e => { e.stopPropagation(); sidebar.classList.toggle('open'); });
  document.addEventListener('click', e => { if (!sidebar.contains(e.target)) sidebar.classList.remove('open'); });
  $$('.side-nav a[href^="#"]').forEach(a => a.addEventListener('click', () => {
    $$('.side-nav a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    sidebar.classList.remove('open');
  }));

  /* =========================================================
     SPARKLINES
     ========================================================= */
  const sparks = $$('canvas[data-spark]').map(cv => {
    const data = [];
    let v = rand(40, 60);
    for (let i = 0; i < 30; i++) { v = clamp(v + rand(-8, 8), 10, 90); data.push(v); }
    return { cv, data, color: COLORS[cv.dataset.spark] };
  });
  function drawSpark(s) {
    const { ctx, w, h } = setupCanvas(s.cv);
    const pts = s.data.map((v, i) => [i / (s.data.length - 1) * w, h - (v / 100) * h * 0.9]);
    ctx.beginPath(); smoothPath(ctx, pts);
    ctx.strokeStyle = s.color; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, hexA(s.color, .35)); g.addColorStop(1, hexA(s.color, 0));
    ctx.fillStyle = g; ctx.fill();
  }
  sparks.forEach(drawSpark);
  setInterval(() => sparks.forEach(s => {
    s.data.shift();
    s.data.push(clamp(s.data[s.data.length - 1] + rand(-9, 9), 10, 90));
    drawSpark(s);
  }), 2000);

  /* =========================================================
     MAIN CHART — farm utilisation
     ========================================================= */
  const mainCv = $('#mainChart');
  const tip = $('#tip');
  const RANGES = {
    1:   { n: 60, stepMin: 1 },
    24:  { n: 96, stepMin: 15 },
    168: { n: 84, stepMin: 120 },
  };
  let range = 24, series, chartProgress = 0, hoverIdx = -1;

  function farmLoad(date) {
    // renders peak overnight (artists submit before leaving)
    const h = date.getHours() + date.getMinutes() / 60;
    const night = Math.cos(((h - 2) / 24) * Math.PI * 2) * 0.5 + 0.5;
    return clamp(48 + night * 42 + rand(-6, 6), 8, 99);
  }
  function genSeries(r) {
    const { n, stepMin } = RANGES[r];
    const now = Date.now();
    const out = { t: [], gpu: [], cpu: [], fpm: [] };
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now - i * stepMin * 60000);
      const g = farmLoad(d);
      out.t.push(d);
      out.gpu.push(g);
      out.cpu.push(clamp(g * 0.62 + rand(-8, 8), 5, 95));
      out.fpm.push(clamp(g * 0.8 + rand(-10, 10), 5, 98));
    }
    return out;
  }
  series = genSeries(range);

  function fmtTick(d) {
    if (range === 168) return d.toLocaleDateString('fr-FR', { weekday: 'short' }) + ' ' + pad(d.getHours()) + 'h';
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function drawMain() {
    const { ctx, w, h } = setupCanvas(mainCv);
    const L = 34, R = 8, T = 10, B = 26;
    const cw = w - L - R, ch = h - T - B;
    const n = series.t.length;
    const X = i => L + (i / (n - 1)) * cw;
    const Y = v => T + ch - (v / 100) * ch;

    // grid
    ctx.font = '500 10.5px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(154,163,199,.7)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = 0; v <= 100; v += 25) {
      ctx.strokeStyle = v === 0 ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)';
      ctx.setLineDash(v === 0 ? [] : [3, 5]);
      ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke();
      ctx.fillText(v, L - 8, Y(v));
    }
    ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const ticks = w < 500 ? 4 : 7;
    for (let k = 0; k <= ticks; k++) {
      const i = Math.round(k / ticks * (n - 1));
      ctx.fillText(fmtTick(series.t[i]), clamp(X(i), L + 18, w - R - 24), h - B + 9);
    }

    // reveal clip
    ctx.save();
    ctx.beginPath(); ctx.rect(L, 0, cw * chartProgress, h); ctx.clip();

    const lines = [
      { key: 'fpm', color: COLORS.amber, fill: false, width: 1.4, dash: [4, 4] },
      { key: 'cpu', color: COLORS.pink, fill: false, width: 1.6 },
      { key: 'gpu', color: COLORS.cyan, fill: true, width: 2.2 },
    ];
    lines.forEach(l => {
      const pts = series[l.key].map((v, i) => [X(i), Y(v)]);
      ctx.beginPath(); smoothPath(ctx, pts);
      ctx.setLineDash(l.dash || []);
      ctx.strokeStyle = l.color; ctx.lineWidth = l.width;
      ctx.shadowColor = l.color; ctx.shadowBlur = l.fill ? 12 : 0;
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.setLineDash([]);
      if (l.fill) {
        ctx.lineTo(X(n - 1), Y(0)); ctx.lineTo(X(0), Y(0)); ctx.closePath();
        const g = ctx.createLinearGradient(0, T, 0, T + ch);
        g.addColorStop(0, hexA(l.color, .28)); g.addColorStop(1, hexA(l.color, 0));
        ctx.fillStyle = g; ctx.fill();
      }
    });
    ctx.restore();

    // live dot
    if (chartProgress >= 1) {
      const x = X(n - 1), y = Y(series.gpu[n - 1]);
      const pulse = (performance.now() / 1000) % 1;
      ctx.beginPath(); ctx.arc(x, y, 4 + pulse * 10, 0, Math.PI * 2);
      ctx.fillStyle = hexA(COLORS.cyan, .35 * (1 - pulse)); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
    }

    // hover
    if (hoverIdx >= 0) {
      const x = X(hoverIdx);
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + ch); ctx.stroke();
      [['gpu', COLORS.cyan], ['cpu', COLORS.pink], ['fpm', COLORS.amber]].forEach(([k, c]) => {
        ctx.beginPath(); ctx.arc(x, Y(series[k][hoverIdx]), 4, 0, Math.PI * 2);
        ctx.fillStyle = c; ctx.fill();
        ctx.strokeStyle = '#0b0d16'; ctx.lineWidth = 2; ctx.stroke();
      });
      tip.innerHTML = `${fmtTick(series.t[hoverIdx])}<br>` +
        `<span style="color:${COLORS.cyan}">GPU ${fr(series.gpu[hoverIdx])} %</span> · ` +
        `<span style="color:${COLORS.pink}">CPU ${fr(series.cpu[hoverIdx])} %</span><br>` +
        `<span style="color:${COLORS.amber}">${fr(series.fpm[hoverIdx] * 10)} frames/min</span>`;
      tip.style.left = `${clamp(x, 90, w - 90)}px`;
      tip.style.top = `${Y(series.gpu[hoverIdx])}px`;
      tip.classList.add('show');
    } else tip.classList.remove('show');

    mainCv._geom = { L, cw, n };
  }

  function animateChart() {
    chartProgress = 0;
    const t0 = performance.now();
    (function step(t) {
      const p = Math.min((t - t0) / 1400, 1);
      chartProgress = 1 - Math.pow(1 - p, 3);
      drawMain();
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  // keep live dot pulsing (~20 fps)
  setInterval(() => { if (chartProgress >= 1) drawMain(); }, 50);

  mainCv.addEventListener('pointermove', e => {
    const g = mainCv._geom; if (!g) return;
    const r = mainCv.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - g.L) / g.cw) * (g.n - 1));
    hoverIdx = clamp(i, 0, g.n - 1);
  });
  mainCv.addEventListener('pointerleave', () => { hoverIdx = -1; });

  $$('#range button').forEach(b => b.addEventListener('click', () => {
    $$('#range button').forEach(x => x.classList.toggle('on', x === b));
    range = +b.dataset.r;
    series = genSeries(range);
    animateChart();
  }));

  // live update
  setInterval(() => {
    const last = series.gpu[series.gpu.length - 1];
    const g = clamp(last + rand(-5, 5), 20, 99);
    ['t', 'gpu', 'cpu', 'fpm'].forEach(k => series[k].shift());
    series.t.push(new Date());
    series.gpu.push(g);
    series.cpu.push(clamp(g * 0.62 + rand(-8, 8), 5, 95));
    series.fpm.push(clamp(g * 0.8 + rand(-10, 10), 5, 98));
    tweenNumber($('#kpiGpu'), Math.round(g), { dur: 800 });
    $('#kpiGpuTrend').innerHTML = `${Math.round(g / 100 * 64)} / 64 <span>GPU actifs</span>`;
  }, 3000);

  /* =========================================================
     STORAGE DONUT
     ========================================================= */
  const TOTAL = 2400;
  const storage = [
    { label: 'Projets actifs', v: 812, color: COLORS.violet },
    { label: 'Rushes caméra', v: 536, color: COLORS.cyan },
    { label: 'Cache VFX', v: 224, color: COLORS.pink },
    { label: 'Staging LTO', v: 112, color: COLORS.amber },
  ];
  const usedTotal = () => storage.reduce((a, s) => a + s.v, 0);
  const donutCv = $('#donut');
  let donutP = 0;
  function drawDonut() {
    const { ctx, w, h } = setupCanvas(donutCv);
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 10, lw = 16;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = lw; ctx.stroke();
    let a = -Math.PI / 2;
    const gap = 0.05;
    storage.forEach(s => {
      const span = (s.v / TOTAL) * Math.PI * 2 * donutP;
      if (span > gap) {
        ctx.beginPath(); ctx.arc(cx, cy, r, a + gap / 2, a + span - gap / 2);
        ctx.strokeStyle = s.color; ctx.lineWidth = lw;
        ctx.shadowColor = s.color; ctx.shadowBlur = 10;
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      a += span;
    });
  }
  function renderStorageList() {
    const used = usedTotal();
    $('#storageList').innerHTML = storage.map(s =>
      `<div><i style="background:${s.color}"></i><span>${s.label}</span><b>${fr(s.v)} To</b></div>`).join('') +
      `<div><i style="background:rgba(255,255,255,.15)"></i><span>Libre</span><b>${fr(TOTAL - used)} To</b></div>`;
    $('#donutPct').textContent = fr(used / TOTAL * 100, 1) + ' %';
    tweenNumber($('#kpiSan'), used, { dur: 900 });
  }
  function animateDonut() {
    const t0 = performance.now();
    (function step(t) {
      const p = Math.min((t - t0) / 1600, 1);
      donutP = 1 - Math.pow(1 - p, 3);
      drawDonut();
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  renderStorageList();
  setInterval(() => {
    // writes accumulate on active projects & cache
    storage[0].v += irand(0, 1); storage[2].v += irand(-1, 2);
    renderStorageList(); drawDonut();
  }, 6000);
  setInterval(() => {
    $('#ioR').textContent = fr(rand(4.2, 9.6), 1);
    $('#ioW').textContent = fr(rand(1.1, 3.8), 1);
  }, 1200);

  /* =========================================================
     TEAM (declared early: used by the queue & log)
     ========================================================= */
  const TEAM = [
    { name: 'Camille Roux', role: 'Étalonneuse senior', task: 'Nord · bobine 3 HDR', st: COLORS.lime, c: COLORS.cyan, where: 'Salle Grade 1' },
    { name: 'Yanis Benali', role: 'Compositeur Nuke', task: 'Lumen sh0420 v012', st: COLORS.lime, c: COLORS.amber, where: 'VFX 04' },
    { name: 'Inès Morel', role: 'Monteuse', task: 'Méridien · séquence 7', st: COLORS.lime, c: COLORS.violet, where: 'Avid 2' },
    { name: 'Hugo Lefèvre', role: 'Artiste FX Houdini', task: 'Odyssée · FLIP eau', st: COLORS.amber, c: COLORS.pink, where: 'VFX 07' },
    { name: 'Sarah Kim', role: 'Mixeuse Atmos', task: 'Aura · stems finaux', st: COLORS.lime, c: COLORS.lime, where: 'Audi Atmos' },
    { name: 'Théo Garnier', role: 'Data wrangler', task: 'Ingest J12 · 4,2 To', st: COLORS.lime, c: COLORS.cyan, where: 'Machine room' },
  ];
  $('#teamList').innerHTML = TEAM.map(m => {
    const ini = m.name.split(' ').map(s => s[0]).join('');
    return `<div class="member"><div class="av" style="background:${m.c};--st:${m.st}">${ini}</div>
      <div><b>${m.name}</b><small>${m.role} — ${m.task}</small></div><em>${m.where}</em></div>`;
  }).join('');

  /* =========================================================
     LIVE LOG
     ========================================================= */
  const logEl = $('#log');
  function addLog(level, html, time = new Date()) {
    const li = document.createElement('li');
    li.className = 'enter';
    li.innerHTML = `<time>${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}</time>
      <p><span class="lv ${level}">${level.toUpperCase()}</span>${html}</p>`;
    logEl.prepend(li);
    while (logEl.children.length > 9) logEl.lastElementChild.remove();
  }
  const AMBIENT = [
    ['info', () => `Checksum MD5 validé · <b>A0${irand(10, 99)}_C0${irand(10, 99)}.braw</b>`],
    ['ok',   () => `<b>${pick(TEAM).name}</b> a publié une nouvelle version sur ShotGrid`],
    ['info', () => `Sauvegarde LTO-9 · bande <b>PRL${irand(100, 400)}</b> à ${irand(20, 95)} %`],
    ['warn', () => `<b>rnd-b${pad(irand(1, 12))}</b> température GPU ${irand(82, 87)} °C`],
    ['ok',   () => `Client a validé <b>${pick(['Aura sh005 v09', 'Lumen sh0380 v06', 'Odyssée EP02 grade'])}</b>`],
    ['info', () => `Aspera : réception de <b>${fr(rand(20, 380), 1)} Go</b> depuis le plateau`],
  ];
  const start = Date.now();
  for (let i = 6; i > 0; i--) { const [l, f] = pick(AMBIENT); addLog(l, f(), new Date(start - i * 47000)); }
  $$('li', logEl).forEach(li => li.classList.remove('enter'));
  setInterval(() => { const [l, f] = pick(AMBIENT); addLog(l, f()); }, 4200);

  /* =========================================================
     RENDER QUEUE
     ========================================================= */
  const APPS = {
    nuke:     { code: 'NK', label: 'Nuke 15',      color: COLORS.amber },
    houdini:  { code: 'HO', label: 'Houdini 20.5', color: COLORS.pink },
    resolve:  { code: 'DR', label: 'Resolve 19',   color: COLORS.cyan },
    redshift: { code: 'RS', label: 'Redshift',     color: COLORS.red },
    ffmpeg:   { code: 'FF', label: 'Transcode',    color: COLORS.lime },
  };
  const NODES = Array.from({ length: 24 }, (_, i) => `rnd-${i < 12 ? 'a' : 'b'}${pad((i % 12) + 1)}`);
  const POOL = [
    ['LUMEN_S01E04_sh0420_comp_v012', 'Lumen — S01E04 · compositing', 'nuke'],
    ['LUMEN_S01E05_sh0110_fx_smoke_v004', 'Lumen — S01E05 · sim fumée', 'houdini'],
    ['NORD_FEATURE_R3_grade_HDR_v07', 'Nord (long-métrage) · bobine 3', 'resolve'],
    ['AURA_SPOT30_master_ProRes4444', 'Aura — spot TV 30s · master', 'ffmpeg'],
    ['NORD_FEATURE_sh1280_cleanup_v03', 'Nord · cleanup câbles', 'nuke'],
    ['ODYSSEE_EP02_env_city_v021', 'Odyssée — EP02 · env 3D', 'redshift'],
    ['LUMEN_S01E04_DCP_check', 'Lumen — S01E04 · DCP QC', 'ffmpeg'],
    ['AURA_SPOT30_sh005_beauty_v09', 'Aura · beauty retouch', 'nuke'],
    ['ODYSSEE_EP02_fx_water_v013', 'Odyssée — EP02 · FLIP eau', 'houdini'],
    ['NORD_FEATURE_R4_grade_SDR_v02', 'Nord · bobine 4 · trim SDR', 'resolve'],
    ['MERIDIEN_DOC_proxy_ingest_D12', 'Méridien (doc) · proxys J12', 'ffmpeg'],
    ['ODYSSEE_EP03_sh0230_comp_v005', 'Odyssée — EP03 · compositing', 'nuke'],
  ];
  let jobId = 0;
  const jobs = [];
  function makeJob(status = 'wait', progress = 0) {
    const [name, desc, app] = POOL[jobId % POOL.length];
    jobId++;
    return {
      id: jobId, name, desc, app,
      node: status === 'wait' ? '—' : pick(NODES),
      prio: irand(40, 100),
      frames: irand(48, 1400),
      progress, status,
      speed: rand(0.6, 3.2),
      doneAt: 0,
    };
  }
  [['run', 72], ['run', 41], ['run', 88], ['run', 12], ['err', 63], ['wait', 0], ['wait', 0], ['run', 55], ['wait', 0]]
    .forEach(([s, p]) => jobs.push(makeJob(s, p)));

  const tbody = $('#queueBody');
  const rows = new Map();
  let filter = 'all', query = '';
  const STATUS = { run: 'En cours', wait: 'En attente', done: 'Terminé', err: 'Erreur' };

  function etaText(j) {
    if (j.status === 'done') return '—';
    if (j.status === 'err') return 'bloqué';
    const mins = Math.round((100 - j.progress) / j.speed * (j.status === 'wait' ? 1.6 : 1));
    return mins >= 60 ? `${Math.floor(mins / 60)} h ${pad(mins % 60)}` : `${mins} min`;
  }
  function rowHTML(j) {
    const a = APPS[j.app];
    const done = Math.round(j.frames * j.progress / 100);
    const barColor = j.status === 'err' ? 'background:var(--red)' : j.status === 'done' ? 'background:var(--lime)' : '';
    return `
      <td class="job">${j.name}<small>${j.desc}</small></td>
      <td><span class="app"><i style="background:${a.color}">${a.code}</i>${a.label}</span></td>
      <td class="job" style="color:var(--muted)">${j.node}</td>
      <td><span class="prio ${j.prio > 80 ? 'hi' : ''}">${j.prio}</span></td>
      <td><div class="progress"><i style="width:${j.progress}%;${barColor}"></i></div>
          <div class="pct"><span>${fr(j.progress, 1)} %</span><span>${done} / ${j.frames} fr</span></div></td>
      <td class="job">${etaText(j)}</td>
      <td><span class="status ${j.status}">${STATUS[j.status]}</span></td>`;
  }
  function renderQueue() {
    const alive = new Set(jobs.map(j => j.id));
    rows.forEach((tr, id) => { if (!alive.has(id)) { tr.remove(); rows.delete(id); } });
    jobs.forEach(j => {
      let tr = rows.get(j.id);
      if (!tr) {
        tr = document.createElement('tr');
        tr.classList.add('enter');
        tr.innerHTML = rowHTML(j);
        rows.set(j.id, tr);
        tbody.appendChild(tr);
      } else {
        // update cells in place so the progress bar transition stays smooth
        const tmp = document.createElement('tr');
        tmp.innerHTML = rowHTML(j);
        [...tmp.children].forEach((td, i) => { if (i !== 4) tr.children[i].innerHTML = td.innerHTML; });
        tr.querySelector('.progress i').style.cssText = tmp.querySelector('.progress i').style.cssText;
        tr.querySelector('.pct').innerHTML = tmp.querySelector('.pct').innerHTML;
      }
      const matchF = filter === 'all' || j.status === filter;
      const matchQ = !query || (j.name + j.desc + j.node).toLowerCase().includes(query);
      tr.hidden = !(matchF && matchQ);
    });
    const running = jobs.filter(j => j.status === 'run').length;
    const waiting = jobs.filter(j => j.status === 'wait').length;
    const errs = jobs.filter(j => j.status === 'err').length;
    $('#queueHint').textContent = `${running} en cours · ${waiting} en attente · ${errs} erreur${errs > 1 ? 's' : ''}`;
    $('#errBadge').textContent = errs;
    $('#errBadge').hidden = errs === 0;
    const kj = $('#kpiJobs');
    const pending = running + waiting + errs + 38; // + jobs plus bas dans la file
    if (+kj.dataset.v !== pending) tweenNumber(kj, pending, { dur: 600 });
  }

  function tickQueue() {
    const now = Date.now();
    jobs.forEach(j => {
      if (j.status === 'run') {
        j.progress = clamp(j.progress + j.speed * rand(0.4, 1.2), 0, 100);
        if (j.progress >= 100) {
          j.status = 'done'; j.doneAt = now;
          addLog('ok', `<b>${j.name}</b> terminé sur ${j.node}`);
        } else if (Math.random() < 0.004) {
          j.status = 'err';
          addLog('err', `<b>${j.node}</b> : ${pick(['CUDA out of memory', 'licence Nuke indisponible', 'frame 1042 corrompue', 'timeout NFS'])} — ${j.name}`);
        }
      } else if (j.status === 'err' && Math.random() < 0.03) {
        j.status = 'wait'; j.node = '—';
        addLog('warn', `Requeue automatique de <b>${j.name}</b>`);
      }
    });
    // start waiting jobs if capacity available
    const running = jobs.filter(j => j.status === 'run').length;
    if (running < 6) {
      const next = jobs.filter(j => j.status === 'wait').sort((a, b) => b.prio - a.prio)[0];
      if (next) {
        next.status = 'run'; next.node = pick(NODES);
        addLog('info', `<b>${next.node}</b> a démarré ${next.name}`);
      }
    }
    // remove finished jobs & submit new ones
    for (let i = jobs.length - 1; i >= 0; i--) {
      if (jobs[i].status === 'done' && now - jobs[i].doneAt > 7000) jobs.splice(i, 1);
    }
    while (jobs.length < 9) {
      const j = makeJob('wait');
      jobs.push(j);
      addLog('info', `Nouveau job soumis par <b>${pick(TEAM).name.split(' ')[0]}</b> : ${j.name}`);
    }
    renderQueue();
  }

  $$('#filter button').forEach(b => b.addEventListener('click', () => {
    $$('#filter button').forEach(x => x.classList.toggle('on', x === b));
    filter = b.dataset.f; renderQueue();
  }));
  const search = $('#search');
  search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); renderQueue(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
  });

  /* =========================================================
     NODES
     ========================================================= */
  const nodesEl = $('#nodes');
  const nodeState = NODES.map((name, i) => ({ name, load: rand(30, 95), temp: rand(55, 78), off: i === 17 }));
  nodesEl.innerHTML = nodeState.map(n => `<div class="node-tile${n.off ? ' off' : ''}"><span>${n.name.replace('rnd-', '')}</span><div class="fill"></div><b></b></div>`).join('');
  const tiles = $$('.node-tile', nodesEl);
  function renderNodes() {
    let tSum = 0, on = 0;
    nodeState.forEach((n, i) => {
      const t = tiles[i];
      if (!n.off) {
        n.load = clamp(n.load + rand(-12, 12), 5, 100);
        n.temp = clamp(45 + n.load * 0.38 + rand(-3, 3), 38, 89);
        tSum += n.temp; on++;
      }
      const c = n.load > 88 ? COLORS.pink : n.load > 55 ? COLORS.violet : COLORS.cyan;
      t.style.setProperty('--nc', c);
      t.querySelector('.fill').style.height = `${n.load}%`;
      t.querySelector('b').textContent = n.off ? 'OFF' : Math.round(n.load);
      t.title = n.off ? `${n.name} — hors ligne (maintenance)` : `${n.name}\nGPU ${Math.round(n.load)} %\n${Math.round(n.temp)} °C · RTX 6000 Ada ×${i < 12 ? 4 : 2}`;
    });
    $('#tempAvg').textContent = `${Math.round(tSum / on)} °C`;
    $('#power').textContent = `${fr(on * 0.92 * (tSum / on) / 65, 1)} kW`;
    $('#offline').textContent = nodeState.filter(n => n.off).length;
  }

  /* =========================================================
     PROJECTS
     ========================================================= */
  const PHASE_COLORS = [COLORS.cyan, COLORS.violet, COLORS.pink, COLORS.amber, COLORS.lime];
  const projects = [
    { name: 'Lumen — Saison 1', client: 'Plateforme SVOD', due: 'Livraison 28 nov.', phases: [100, 100, 82, 64, 30], chip: ['ok', 'Dans les temps'] },
    { name: 'Nord — Long-métrage', client: 'Production indé', due: 'DCP 12 déc.', phases: [100, 100, 56, 41, 12], chip: ['ok', 'Dans les temps'] },
    { name: 'Odyssée — EP02/03', client: 'Chaîne TV', due: 'PAD 22 nov.', phases: [100, 88, 34, 52, 0], chip: ['late', 'Retard 2 j'] },
    { name: 'Aura — Spot 30s', client: 'Agence pub', due: 'Master 19 nov.', phases: [100, 100, 100, 92, 85], chip: ['ok', 'Validation client'] },
    { name: 'Méridien — Documentaire', client: 'Coproduction', due: 'Offline 15 janv.', phases: [46, 0, 0, 0, 0], chip: ['', 'Montage'] },
  ];
  $('#projectList').innerHTML = projects.map((p, pi) => {
    const avg = Math.round(p.phases.reduce((a, b) => a + b, 0) / p.phases.length);
    return `<div class="project">
      <div class="project-top"><b>${p.name}</b><small>${p.due}</small></div>
      <div class="phases">${p.phases.map((v, i) => `<i data-p="${pi}-${i}" style="--pc:${PHASE_COLORS[i]}"></i>`).join('')}</div>
      <div class="project-meta"><span>${p.client} · <b class="avg" data-pi="${pi}" style="color:var(--text);font-weight:600">${avg}</b> %</span><span class="chip ${p.chip[0]}">${p.chip[1]}</span></div>
    </div>`;
  }).join('');
  function renderProjects() {
    projects.forEach((p, pi) => {
      p.phases.forEach((v, i) => $(`[data-p="${pi}-${i}"]`).style.setProperty('--w', v + '%'));
      $(`.avg[data-pi="${pi}"]`).textContent = Math.round(p.phases.reduce((a, b) => a + b, 0) / p.phases.length);
    });
  }
  setInterval(() => {
    const p = pick(projects);
    const i = p.phases.findIndex(v => v < 100);
    if (i >= 0 && p.phases[i] > 0) { p.phases[i] = Math.min(100, p.phases[i] + irand(1, 3)); renderProjects(); }
  }, 5000);

  /* =========================================================
     NETWORK CHART
     ========================================================= */
  const netCv = $('#netChart');
  const net = Array.from({ length: 60 }, (_, i) => 30 + 25 * Math.sin(i / 7) + rand(-8, 8));
  function drawNet() {
    const { ctx, w, h } = setupCanvas(netCv);
    const max = 100;
    const bw = w / net.length;
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(154,163,199,.6)';
    [25, 50, 75].forEach(v => {
      const y = h - (v / max) * h;
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillText(v, 2, y - 4);
    });
    net.forEach((v, i) => {
      const bh = (v / max) * h;
      const g = ctx.createLinearGradient(0, h - bh, 0, h);
      g.addColorStop(0, hexA(COLORS.violet, .95)); g.addColorStop(1, hexA(COLORS.cyan, .15));
      ctx.fillStyle = g;
      const x = i * bw + 1.5, wdt = Math.max(1, bw - 3), y = h - bh;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, wdt, bh, [3, 3, 0, 0]); else ctx.rect(x, y, wdt, bh);
      ctx.fill();
    });
    const last = net[net.length - 1];
    ctx.fillStyle = '#fff';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${fr(last, 1)} Gb/s`, w - 4, 14);
  }
  setInterval(() => {
    net.shift();
    net.push(clamp(net[net.length - 1] + rand(-12, 12), 6, 96));
    drawNet();
  }, 1000);

  /* =========================================================
     BOOT
     ========================================================= */
  animateChart();
  animateDonut();
  renderQueue();
  renderNodes();
  drawNet();
  setTimeout(renderProjects, 400);
  tweenNumber($('#kpiGpu'), Math.round(series.gpu[series.gpu.length - 1]));
  tweenNumber($('#kpiDel'), 17);
  $('#ioR').textContent = fr(6.4, 1); $('#ioW').textContent = fr(2.1, 1);
  setInterval(tickQueue, 1000);
  setInterval(renderNodes, 2000);

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { drawMain(); drawDonut(); drawNet(); sparks.forEach(drawSpark); }, 120);
  });
})();
