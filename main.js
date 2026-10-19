/* NM Labs — interacciones. Sin dependencias.
 * Todo lo animado se apaga con prefers-reduced-motion y se pausa fuera de pantalla. */
(() => {
  'use strict';

  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Header ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Título: una palabra por span ---------- */
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.style.setProperty('--i', i++);
            w.textContent = part;
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
  }
  if (motion) $$('.split').forEach(splitWords);

  // Arranque cuando están las fuentes (con tope), así la entrada no salta al cambiar de tipografía.
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 700))]).then(ready);

  /* ---------- Parallax de los tres gatos ---------- */
  const cats = $$('.hero-mark .cat');
  if (motion && finePointer && cats.length) {
    const depth = { 'cat-1': -5, 'cat-2': 3, 'cat-3': 8 }; // px máximos, en unidades del viewBox
    const target = { x: 0, y: 0 }; const cur = { x: 0, y: 0 };
    let raf = 0;
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      cats.forEach((c) => {
        const d = depth[[...c.classList].find((k) => depth[k] !== undefined)] || 0;
        c.setAttribute('transform', `translate(${(cur.x * d).toFixed(2)} ${(cur.y * d * 0.6).toFixed(2)})`);
      });
      raf = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointermove', (e) => {
      target.x = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
      target.y = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }

  /* ---------- Revelado al hacer scroll ---------- */
  const revealEls = $$('[data-reveal]');
  revealEls.forEach((el) => el.dataset.d && el.style.setProperty('--d', el.dataset.d));
  if (motion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  // Ayuda: corre fn(visible) cuando el elemento entra/sale de pantalla.
  const onVisible = (el, fn, margin = '0px') => {
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver(([e]) => fn(e.isIntersecting), { rootMargin: margin }).observe(el);
  };

  /* ---------- Máquina de escribir del hero ---------- */
  const typer = $('.typer-word');
  if (typer && motion) {
    const words = typer.dataset.words.split('|');
    let wi = 0, ci = words[0].length, phase = 'hold', visible = true, timer = 0;
    const step = () => {
      timer = 0;
      if (!visible) return;
      let delay = 34;
      if (phase === 'hold') phase = 'delete';
      else if (phase === 'delete') {
        typer.textContent = words[wi].slice(0, --ci);
        if (ci === 0) { wi = (wi + 1) % words.length; phase = 'type'; delay = 260; }
      } else {
        typer.textContent = words[wi].slice(0, ++ci);
        delay = 55 + Math.random() * 45;
        if (ci === words[wi].length) { phase = 'hold'; delay = 2000; }
      }
      timer = setTimeout(step, delay);
    };
    onVisible($('.hero'), (v) => {
      visible = v;
      if (v && !timer) timer = setTimeout(step, 2200);
    });
  }

  /* ---------- Enrutador de costo (canvas) ---------- */
  const canvas = $('#router');
  if (canvas && canvas.getContext) initRouter(canvas, $('#router-count'));

  function initRouter(cv, counter) {
    const ctx = cv.getContext('2d');
    const C = {
      ink: css('--ink'), muted: css('--muted'), line: css('--line'),
      orange: css('--orange'), bg: css('--bg'),
    };
    // Proporciones ilustrativas: la mayoría lo resuelven reglas, pocas llegan al modelo grande.
    const LANES = [
      { name: 'reglas', short: 'reglas', cost: '$', weight: 0.6, speed: 260, dwell: 0, color: C.muted, r: 2.3 },
      { name: 'modelo liviano', short: 'liviano', cost: '$$', weight: 0.31, speed: 200, dwell: 160, color: C.ink, r: 2.7 },
      { name: 'modelo de frontera', short: 'frontera', cost: '$$$', weight: 0.09, speed: 150, dwell: 700, color: C.orange, r: 3.6 },
    ];
    let W = 0, H = 0, dpr = 1, geo = null, parts = [], running = false, raf = 0, last = 0, spawnAcc = 0, count = 0, shown = -1;

    const bez = (p0, p1, p2, p3, t) => {
      const u = 1 - t;
      return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      };
    };

    function layout() {
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // En pantallas angostas el flujo va de arriba hacia abajo y los carriles son columnas.
      const vertical = matchMedia('(max-width: 600px)').matches; // igual que el CSS
      const F = vertical ? H : W;         // largo del flujo
      const A = vertical ? W : H;         // ancho transversal
      const map = vertical ? (u, v) => ({ x: v, y: u }) : (u, v) => ({ x: u, y: v });
      const c = vertical ? A * 0.5 : A / 2;
      const uS = 10, uR = F * (vertical ? 0.16 : 0.2), uLs = F * (vertical ? 0.36 : 0.36);
      const uLe = F * (vertical ? 0.62 : 0.7), uO = F * (vertical ? 0.84 : 0.86), uE = F - 10;
      const vs = vertical ? [0.18, 0.5, 0.82] : [0.24, 0.52, 0.8];
      geo = {
        vertical, S: map(uS, c), R: map(uR, c), O: map(uO, c), E: map(uE, c),
        lanes: LANES.map((lane, i) => {
          const v = A * vs[i];
          const pts = [];
          let chipIdx = 0;
          const push = (u, vv) => pts.push(map(u, vv));
          const bz = (u0, v0, u1, v1, t) => {
            const q = bez({ x: u0, y: v0 }, { x: (u0 + u1) / 2, y: v0 }, { x: (u0 + u1) / 2, y: v1 }, { x: u1, y: v1 }, t);
            push(q.x, q.y);
          };
          for (let t = 0; t <= 1; t += 0.05) push(uS + (uR - uS) * t, c);
          for (let t = 0.04; t <= 1; t += 0.04) bz(uR, c, uLs, v, t);
          for (let k = 1; k <= 20; k++) { push(uLs + (uLe - uLs) * (k / 20), v); if (k === 10) chipIdx = pts.length - 1; }
          for (let t = 0.04; t <= 1; t += 0.04) bz(uLe, v, uO, c, t);
          for (let t = 0.05; t <= 1.0001; t += 0.05) push(uO + (uE - uO) * t, c);
          const cum = [0];
          for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
          return {
            ...lane, pts, cum, len: cum[cum.length - 1], chip: pts[chipIdx], chipD: cum[chipIdx],
            start: map(uLs, v), end: map(uLe, v), busy: 0,
          };
        }),
      };
    }

    function at(lane, d) {
      const { pts, cum } = lane;
      d = clamp(d, 0, lane.len);
      let lo = 0, hi = cum.length - 1;
      while (lo < hi - 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; }
      const t = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
      return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * t, y: pts[lo].y + (pts[hi].y - pts[lo].y) * t };
    }

    function pickLane() {
      let r = Math.random();
      for (let i = 0; i < LANES.length; i++) { if ((r -= LANES[i].weight) <= 0) return i; }
      return 0;
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function draw() {
      const g = geo; if (!g) return;
      ctx.clearRect(0, 0, W, H);
      const fs = g.vertical ? 10.5 : 11;
      ctx.font = `500 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'alphabetic';

      // Carriles
      ctx.lineWidth = 1;
      g.lanes.forEach((l) => {
        ctx.strokeStyle = C.line;
        ctx.beginPath(); ctx.moveTo(l.pts[0].x, l.pts[0].y);
        for (let k = 1; k < l.pts.length; k++) ctx.lineTo(l.pts[k].x, l.pts[k].y);
        ctx.stroke();
      });

      // Chips de proceso
      const vert = g.vertical;
      g.lanes.forEach((l) => {
        const w = vert ? 16 : 38, h = vert ? 30 : 16;
        roundRect(l.chip.x - w / 2, l.chip.y - h / 2, w, h, 3);
        ctx.fillStyle = C.bg; ctx.fill();
        if (l.busy > 0) {
          ctx.globalAlpha = Math.min(1, l.busy) * 0.18; ctx.fillStyle = l.color; ctx.fill(); ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = l.color; ctx.stroke();
        // etiqueta y costo relativo
        const costColor = l.color === C.orange ? C.orange : C.ink;
        ctx.fillStyle = C.muted;
        if (vert) {
          ctx.textAlign = 'center';
          ctx.fillText(l.short, l.start.x, l.start.y - 10);
          ctx.fillStyle = costColor; ctx.fillText(l.cost, l.end.x, l.end.y + 18);
        } else {
          ctx.textAlign = 'left'; ctx.fillText(l.name, l.start.x, l.start.y - 14);
          ctx.textAlign = 'right'; ctx.fillStyle = costColor; ctx.fillText(l.cost, l.end.x, l.end.y - 14);
        }
      });

      // Nodos
      ctx.fillStyle = C.ink; ctx.strokeStyle = C.ink;
      ctx.beginPath(); ctx.arc(g.S.x, g.S.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(g.R.x, g.R.y); ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -6, 12, 12); ctx.restore();
      ctx.beginPath(); ctx.arc(g.O.x, g.O.y, 6, 0, Math.PI * 2); ctx.fillStyle = C.bg; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(g.O.x, g.O.y, 2.5, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
      ctx.fillStyle = C.muted;
      if (vert) {
        ctx.textAlign = 'left';
        ctx.fillText('solicitud', g.S.x + 12, g.S.y + 4);
        ctx.fillText('enrutador', g.R.x + 14, g.R.y + 4);
        ctx.fillText('respuesta', g.O.x + 14, g.O.y + 4);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText('solicitud', g.S.x - 2, g.S.y + 22);
        ctx.textAlign = 'center';
        ctx.fillText('enrutador', g.R.x, g.R.y + 24);
        ctx.fillText('respuesta verificada', g.O.x, g.O.y + 24);
      }

      // Partículas con estela corta
      parts.forEach((p) => {
        const l = g.lanes[p.lane];
        for (let k = 3; k >= 0; k--) {
          const q = at(l, p.d - k * 5);
          ctx.globalAlpha = k === 0 ? 1 : 0.18 * (4 - k) / 3;
          ctx.fillStyle = l.color;
          ctx.beginPath(); ctx.arc(q.x, q.y, l.r * (k === 0 ? 1 : 0.8), 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      spawnAcc += dt * 7.5;
      while (spawnAcc >= 1) { spawnAcc -= 1; parts.push({ lane: pickLane(), d: 0, wait: -1 }); }
      geo.lanes.forEach((l) => { l.busy = Math.max(0, l.busy - dt * 3); });
      parts = parts.filter((p) => {
        const l = geo.lanes[p.lane];
        if (p.wait > 0) { p.wait -= dt * 1000; l.busy = 1; return true; }
        const next = p.d + l.speed * dt;
        if (p.wait === -1 && l.dwell > 0 && next >= l.chipD) { p.d = l.chipD; p.wait = l.dwell; return true; }
        p.d = next;
        if (p.d >= l.len) { count++; return false; }
        return true;
      });
      if (counter && count !== shown) { shown = count; counter.textContent = `${count.toLocaleString('es-AR')} ${count === 1 ? 'solicitud' : 'solicitudes'}`; }
      draw();
      if (running) raf = requestAnimationFrame(frame);
    }

    function start() { if (running || !motion) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    function staticFrame() {
      // Una foto fija: algunas solicitudes en cada carril.
      parts = [];
      const g = geo;
      [[0, 0.1], [0, 0.3], [0, 0.52], [0, 0.7], [0, 0.9], [1, 0.38], [1, 0.62], [1, 0.84], [2, 0.5]].forEach(([lane, f]) => {
        parts.push({ lane, d: g.lanes[lane].len * f, wait: 0 });
      });
      if (counter) counter.textContent = '';
      draw();
    }

    layout();
    if (motion) draw(); else staticFrame();
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => { layout(); if (!running) (motion ? draw() : staticFrame()); }).observe(cv);
    }
    if (document.fonts) document.fonts.ready.then(() => { if (!running) (motion ? draw() : staticFrame()); });
    let inView = false;
    onVisible(cv, (v) => { inView = v; v && !document.hidden ? start() : stop(); }, '100px');
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : inView && start(); });
  }

  /* ---------- Demo de Nexus ---------- */
  const demo = $('#demo');
  if (demo && motion) {
    const ai = $('#demo-ai'), file = $('#demo-file');
    const segments = [...ai.childNodes].map((n) => (n.nodeType === Node.TEXT_NODE
      ? { text: n.textContent } : { cite: n.textContent }));
    let state = 'idle', timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const reset = () => {
      timers.forEach(clearTimeout); timers = [];
      ai.innerHTML = '<span class="thinking" aria-hidden="true"><i></i><i></i><i></i></span>';
      file.classList.remove('is-on');
    };
    const play = () => {
      state = 'playing'; reset();
      later(() => {
        ai.textContent = '';
        const caret = document.createElement('span'); caret.className = 'caret'; ai.append(caret);
        let si = 0, ci = 0, node = null;
        const tick = () => {
          if (si >= segments.length) {
            caret.remove();
            later(() => { file.classList.add('is-on'); state = 'done'; }, 350);
            return;
          }
          const seg = segments[si];
          if (seg.cite) {
            const c = document.createElement('span'); c.className = 'cite pop'; c.textContent = seg.cite;
            ai.insertBefore(c, caret); si++; node = null;
            later(tick, 160);
            return;
          }
          if (!node) { node = document.createTextNode(''); ai.insertBefore(node, caret); ci = 0; }
          const n = 1 + Math.floor(Math.random() * 3);
          node.textContent += seg.text.slice(ci, ci + n); ci += n;
          if (ci >= seg.text.length) { si++; node = null; }
          later(tick, 18 + Math.random() * 22);
        };
        tick();
      }, 1100);
    };
    reset();
    onVisible(demo, (v) => {
      if (v && state !== 'playing') play();
      else if (!v && state === 'done') state = 'idle';
    }, '-15% 0px');
  }

  /* ---------- Línea del método ---------- */
  const steps = $('#steps');
  if (steps) {
    const items = $$('.step', steps);
    const vertical = matchMedia('(max-width: 860px)');
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = steps.getBoundingClientRect();
      const p = motion ? clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.6), 0, 1) : 1;
      steps.style.setProperty('--progress', p.toFixed(3));
      items.forEach((it) => {
        const pos = vertical.matches ? it.offsetTop / steps.clientHeight : it.offsetLeft / steps.clientWidth;
        it.classList.toggle('is-lit', p >= pos + 0.01 || p === 1);
      });
    };
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    let bound = false;
    onVisible(steps, (v) => {
      if (v && !bound) { addEventListener('scroll', req, { passive: true }); bound = true; req(); }
      else if (!v && bound) { removeEventListener('scroll', req); bound = false; req(); }
    }, '200px');
    addEventListener('resize', req, { passive: true });
    update();
  }
})();
