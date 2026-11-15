/* Kolade Fajimi · portfolio · drawing-sheet behaviour */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = 0.866, S = 0.5;

  // The machine, top to bottom. `tab` is the claims panel a part opens.
  // h is the full height; `deck` is the height of the surface the next part looks down on.
  const PARTS = [
    { n: 10, label: 'Gateway', sub: 'LiteLLM', name: 'Gateway, LiteLLM', w: 150, h: 14, tab: 'litellm', side: 1 },
    { n: 20, label: 'Router', sub: 'Semantic Router', name: 'Router, vLLM Semantic Router', w: 120, h: 12, tab: 'router', side: -1 },
    { n: 30, label: 'Runtime', sub: 'SGLang', name: 'Runtime, SGLang', w: 150, h: 34, deck: 12, tab: 'sglang', side: 1 },
    { n: 40, label: 'Weights', sub: 'quantized, W4A16', name: 'Weights, SGLang', w: 132, h: 12, tab: 'sglang', side: -1 },
    { n: 50, label: 'Trainer', sub: 'AReaL', name: 'Trainer, AReaL', w: 176, h: 14, tab: 'areal', side: 1 },
  ];
  const flowDots = [];

  const el = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  };

  function buildStack(svg, { s = 1, gap = 60, lx = 170, width = 580 } = {}) {
    const iso = (x, y, z) => [((x - y) * C * s).toFixed(1), (((x + y) * S - z) * s).toFixed(1)];
    const pts = (arr) => arr.map((p) => iso(...p).join(',')).join(' ');
    const stackH = PARTS.reduce((a, p) => a + p.h, 0);
    const top = PARTS[0], base = PARTS[PARTS.length - 1];
    const by = stackH * s + (PARTS.length - 1) * gap + top.w * S * s + 18;
    const H = by + base.w * S * s + 22;
    const cx = width / 2;

    svg.setAttribute('viewBox', `0 0 ${width} ${H.toFixed(0)}`);
    svg.style.setProperty('--gap', gap);
    svg.style.setProperty('--t', reduce ? 1 : 0);

    // a block: left face, right face, top, from z0 to z1 with half-width a
    const block = (g, a, z0, z1, { hatchLeft = false, hatchTop = '' } = {}) => {
      const left = [[-a, a, z1], [a, a, z1], [a, a, z0], [-a, a, z0]];
      const right = [[a, a, z1], [a, -a, z1], [a, -a, z0], [a, a, z0]];
      const topF = [[-a, -a, z1], [a, -a, z1], [a, a, z1], [-a, a, z1]];
      el('polygon', { class: 'backer', points: pts(left) }, g);
      el('polygon', { class: 'face' + (hatchLeft ? ' h' : ''), points: pts(left) }, g);
      el('polygon', { class: 'face', points: pts(right) }, g);
      el('polygon', { class: 'face', points: pts(topF) }, g);
      if (hatchTop) el('polygon', { class: 'det ' + hatchTop, points: pts(topF) }, g);
    };
    // short legs under the two visible edges, like the leads of a chip package
    const pins = (g, a, z, len, step) => {
      let d = '';
      for (let k = -a + step / 2; k < a; k += step) {
        d += `M${iso(k, a, z).join(' ')}L${iso(k, a, z - len).join(' ')}`;
        d += `M${iso(a, k, z).join(' ')}L${iso(a, k, z - len).join(' ')}`;
      }
      el('path', { class: 'det pin', d }, g);
    };

    let z = 0;
    [...PARTS].reverse().forEach((p, j) => {
      const a = p.w / 2, deck = p.deck || p.h;
      const outer = el('g', { transform: `translate(${cx} ${(by - z * s).toFixed(1)})` }, svg);
      const mv = el('g', { class: 'mv', style: `--j:${j}` }, outer);
      const link = el('a', { href: `#panel-${p.tab}`, 'aria-label': `${p.name}. Show its merged pull requests.` }, mv);
      const g = el('g', { class: 'part', 'data-part': p.n, 'data-tab': p.tab }, link);

      if (p.n === 30) pins(g, a, 0, 9, 10);
      if (p.n === 40) pins(g, a, 0, 6, 6);
      block(g, a, 0, deck, { hatchLeft: p.n === 50 });

      // details drawn flat, then laid onto the deck
      const t = el('g', { transform: `matrix(${C * s} ${S * s} ${-C * s} ${S * s} 0 ${-deck * s})` }, g);
      const flat = (tag, attrs, cls = 'det') => el(tag, { class: cls, ...attrs }, t);
      if (p.n === 10) {
        // gateway: rows of sockets the callers plug into
        for (const y of [-40, 0, 40]) for (const x of [-46, 0, 46]) {
          flat('rect', { x: x - 16, y: y - 10, width: 32, height: 20, rx: 2 });
          flat('path', { d: `M${x - 9} ${y}h18` }, 'det socket-mark');
        }
      } else if (p.n === 20) {
        // router: one switch, traces out to four pads
        flat('path', { d: 'M-12 0H-30V-40M12 0H30V40M0-12V-30H40M0 12V30H-40' });
        flat('rect', { x: -12, y: -12, width: 24, height: 24 }, 'face');
        flat('rect', { x: -12, y: -12, width: 24, height: 24 }, 'det h');
        for (const [x, y] of [[-30, -40], [30, 40], [40, -30], [-40, 30]]) flat('circle', { cx: x, cy: y, r: 5.5 }, 'face');
      } else if (p.n === 30) {
        // runtime: the accelerator. Substrate with contact pads, the die raised on top.
        let d = '';
        for (let k = -60; k <= 60; k += 12) d += `M${k}-66v6M${k} 60v6M-66 ${k}h6M60 ${k}h6`;
        flat('path', { d });
        flat('circle', { cx: -58, cy: 58, r: 3 });
      } else if (p.n === 40) {
        // weights: a memory array, cells hatched by their 4-bit level
        const c = 22, o = -55, n = 5;
        const fills = ['h', 'hf', 'hw', 'hx'];
        [[0, 0, 0], [2, 0, 1], [4, 0, 2], [1, 1, 3], [3, 1, 0], [0, 2, 2], [2, 2, 3], [4, 2, 1], [1, 3, 1], [3, 3, 2], [0, 4, 3], [2, 4, 0], [4, 4, 3]]
          .forEach(([i, k, f]) => flat('rect', { x: o + i * c, y: o + k * c, width: c, height: c }, 'det ' + fills[f]));
        let d = `M${o} ${o}h${c * n}v${c * n}h${-c * n}z`;
        for (let i = 1; i < n; i++) d += `M${o + i * c} ${o}v${c * n}M${o} ${o + i * c}h${c * n}`;
        flat('path', { d });
        for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
          flat('rect', { x: o + col * c + 2, y: o + row * c + 2, width: c - 4, height: c - 4, style: `--i:${(row * 7 + col * 3) % 11}` }, 'weight-cell');
        }
      } else {
        // trainer: the board everything sits on, with the feedback loop traced into it
        flat('circle', { cx: 0, cy: 0, r: 62 }); flat('circle', { cx: 0, cy: 0, r: 50 });
        flat('path', { d: 'M49-4l7-11 7 11M-63 4l7 11 7-11' });
        for (const [x, y] of [[-74, -74], [74, 74], [-74, 74], [74, -74]]) flat('circle', { cx: x, cy: y, r: 5 });
        // the training loop turns on its own, whatever the request above is doing
        const lap = flat('circle', { r: 4 }, 'pulse loop');
        el('animateMotion', { dur: '7s', repeatCount: 'indefinite', path: 'M0-56a56 56 0 1 1 0 112a56 56 0 1 1 0-112' }, lap);
      }
      if (p.n === 30) block(g, 34, deck, p.h, { hatchLeft: true, hatchTop: 'hx' });

      // Original straight connector with one travelling dot per gap.
      if (j < PARTS.length - 1) {
        const y1 = (46 - deck) * s, y0 = y1 - gap;
        const flow = el('g', { class: 'flow', 'aria-hidden': 'true' }, g);
        el('path', { class: 'flow-ln', d: `M0 ${y0}V${y1}` }, flow);
        el('circle', { class: 'flow-end', cx: 0, cy: y1, r: 2.2 }, flow);
        const dot = el('circle', { class: 'pulse', cx: 0, cy: y0, r: 3.4 }, flow);
        flowDots.push({ dot, y0, y1, part: p.n });
      }

      // numeral on a curved leader
      const lab = el('g', { class: 'lab' }, g);
      const [ax, ay] = iso(p.side > 0 ? a : -a, p.side > 0 ? 0 : a, deck).map(Number);
      const ex = ax - p.side * 10 * s, ey = ay - 5 * s;
      const tx = p.side * lx, ty = ey - 26 * s;
      const sx = tx - p.side * 6, sy = ty - 4;
      const curve = `M${sx} ${sy}Q${(ex + p.side * 44 * s).toFixed(1)} ${(sy - 16 * s).toFixed(1)} ${ex} ${ey}`;
      const taut = `M${sx} ${sy}Q${((sx + ex) / 2).toFixed(1)} ${((sy + ey) / 2).toFixed(1)} ${ex} ${ey}`;
      const lead = el('path', { class: 'lead', d: curve }, lab);
      lead.dataset.curve = curve; lead.dataset.taut = taut;
      el('circle', { class: 'dot', cx: ex, cy: ey, r: 2.6 }, lab);
      const anchor = p.side > 0 ? 'start' : 'end';
      el('text', { class: 'num', x: tx, y: ty, 'text-anchor': anchor }, lab).textContent = p.label;
      el('text', { class: 'sub', x: tx, y: ty + 15, 'text-anchor': anchor }, lab).textContent = p.sub;
      el('rect', { x: p.side > 0 ? tx - 6 : tx - 104, y: ty - 16, width: 110, height: 36, fill: 'transparent' }, lab);

      z += p.h;
    });
  }

  /* Fig. 1 */
  const stack = document.getElementById('stack');
  buildStack(stack, matchMedia('(max-width: 760px)').matches ? { s: 0.86, gap: 52, lx: 140, width: 470 } : {});
  const btn = document.getElementById('explode');
  let exploded = true;
  const setExploded = (on) => {
    exploded = on;
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'Assemble' : 'Explode';
    stack.style.setProperty('--t', on ? 1 : 0);
    stack.classList.toggle('is-assembled', !on);
  };
  if (!reduce) setTimeout(() => { if (exploded) stack.style.setProperty('--t', 1); }, 550);
  btn.addEventListener('click', () => setExploded(!exploded));

  /* One request, start to finish: an illustrative trace, in step with the drawing. */
  const trace = document.getElementById('trace');
  const status = document.getElementById('flow-status');
  const pause = document.getElementById('pause-flow');
  const PROMPT = ['The', 'capital', 'of', 'France', 'is'];
  const IDS = [791, 6864, 315, 9822, 374];
  const STEPS = [
    { pick: ' Paris', bars: [['Paris', 0.92], ['the', 0.03], ['Lyon', 0.02], ['a', 0.01]] },
    { pick: '.', bars: [['.', 0.88], [',', 0.06], ['and', 0.03], ['!', 0.01]] },
    { pick: '', bars: [['<eos>', 0.97], ['It', 0.01], ['The', 0.01], ['He', 0.01]] },
  ];
  const html = (tag, cls, parent, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; parent.appendChild(n); return n; };
  const toks = trace.querySelector('.tr-toks');
  PROMPT.forEach((w, k) => { const chip = html('span', '', toks); chip.style.setProperty('--k', k); html('b', '', chip, w); chip.append(IDS[k]); });
  const kv = trace.querySelector('.tr-kv');
  const kvCells = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) { const c = html('i', '', kv); c.dataset.col = col; c.style.setProperty('--c', col); kvCells.push(c); }
  const bars = [0, 1, 2, 3].map(() => { const b = html('span', 'bar', trace.querySelector('.tr-bars')); return { b, name: html('em', '', b), fill: html('i', '', b), p: html('b', '', b) }; });
  const out = trace.querySelector('.tr-out');
  const stageEls = [...trace.querySelectorAll('.tr')];
  const allParts = [...stack.querySelectorAll('.part')];

  const setStage = (name, live, text) => {
    stageEls.forEach((n) => n.classList.toggle('is-on', n.dataset.stage === name));
    allParts.forEach((n) => n.classList.toggle('is-live', live.includes(+n.dataset.part)));
    stack.classList.toggle('is-matmul', live.includes(40));
    status.textContent = text;
  };
  const setKV = (n, fresh) => kvCells.forEach((c) => {
    c.classList.toggle('on', +c.dataset.col < n);
    c.classList.toggle('new', !!fresh && +c.dataset.col === n - 1);
  });
  const setBars = (step, picked) => bars.forEach(({ b, name, fill, p }, i) => {
    const row = step && step.bars[i];
    name.textContent = row ? row[0] : '';
    p.textContent = row ? row[1].toFixed(2).slice(1) : '';
    fill.style.setProperty('--p', row ? row[1] : 0);
    b.classList.toggle('pick', !!picked && i === 0);
  });
  const shoot = (part, up, delay = 0) => {
    const f = flowDots.find((d) => d.part === part);
    if (!f || !f.dot.animate) return;
    const d = f.y1 - f.y0;
    f.dot.animate([
      { transform: `translateY(${up ? d : 0}px)`, opacity: 1 },
      { transform: `translateY(${up ? 0 : d}px)`, opacity: 1 },
    ], { duration: 850, delay, easing: 'cubic-bezier(0.5, 0, 0.2, 1)' });
  };

  let run = 0; // bumps on every pause or restart, so late callbacks from an old run do nothing
  const later = (fn, ms) => { const mine = run; setTimeout(() => { if (mine === run) fn(); }, ms); };
  const decode = (k) => () => {
    const last = k === STEPS.length - 1;
    setStage('softmax', [30, 40], last ? 'Decode: the model predicts end of sequence and stops' : k ? 'Decode again, reusing the cache instead of recomputing' : 'Decode: softmax over the vocabulary, one token is sampled');
    setBars(STEPS[k], false);
    later(() => {
      setBars(STEPS[k], true);
      out.textContent += STEPS[k].pick;
      if (!last) setKV(PROMPT.length + k + 1, true);
    }, 600);
  };
  const SEQ = [
    [500, () => { trace.className = 'trace'; out.textContent = ''; setKV(0); setBars(null); setStage('', [], 'Waiting for a request'); }],
    [1300, () => { trace.classList.add('s-prompt'); setStage('gateway', [10], 'A request arrives at the gateway'); }],
    [1200, () => { shoot(20); trace.classList.add('s-route'); setStage('router', [20], 'The router picks a model for it'); }],
    [1500, () => { shoot(30); trace.classList.add('s-toks'); setStage('tokenize', [30], 'The runtime splits the prompt into tokens'); }],
    [1700, () => { shoot(40); setKV(PROMPT.length); setStage('cache', [30, 40], 'Prefill: attention keys and values are cached for every token'); }],
    [1500, decode(0)], [1400, decode(1)], [1300, decode(2)],
    [3200, () => { shoot(40, true); shoot(30, true, 250); shoot(20, true, 500); setStage('gateway', [10], 'The tokens stream back out through the gateway'); }],
  ];
  let step = 0, timer = 0, paused = reduce;
  function advance() {
    timer = 0;
    if (paused || !exploded || document.hidden) return;
    const [ms, fn] = SEQ[step];
    fn();
    step = (step + 1) % SEQ.length;
    timer = setTimeout(advance, ms);
  }
  const resumeFlow = () => { if (!timer) advance(); };
  const syncPause = () => { pause.textContent = paused ? 'Play' : 'Pause'; pause.setAttribute('aria-pressed', String(paused)); };
  pause.addEventListener('click', () => {
    paused = !paused; run++;
    clearTimeout(timer); timer = 0;
    syncPause(); resumeFlow();
  });
  syncPause();
  document.addEventListener('visibilitychange', resumeFlow);
  new MutationObserver(resumeFlow).observe(stack, { attributes: true, attributeFilter: ['class'] });
  if (reduce) {
    // no motion: show the finished trace
    trace.classList.add('s-prompt', 's-route', 's-toks');
    setKV(PROMPT.length + 2); setBars(STEPS[0], true); out.textContent = ' Paris.';
    status.textContent = 'Request, route, tokenize, prefill, decode, stream';
  } else setTimeout(resumeFlow, 2100);

  /* parts and tabs select the same claims panel */
  const parts = [...stack.querySelectorAll('.part')];
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"]')];
  let current = null, hovered = null;

  const paint = () => {
    parts.forEach((node) => {
      const active = node.dataset.tab === current;
      const hover = node.dataset.tab === hovered;
      node.classList.toggle('is-active', active);
      node.classList.toggle('is-hover', hover && !active);
      const lead = node.querySelector('.lead');
      lead.style.d = `path("${active || hover ? lead.dataset.taut : lead.dataset.curve}")`;
    });
  };

  // Compact the profile when needed; claims panels keep their drawings and scroll.
  const oneScreen = matchMedia('(min-width: 1100px) and (min-height: 600px)');
  const who = document.querySelector('.who');
  const spills = (node) => node.scrollHeight > node.clientHeight + 1;
  function fit() {
    who.classList.remove('tight', 'tighter');
    if (!oneScreen.matches) return;
    if (spills(who)) who.classList.add('tight');
    if (spills(who)) who.classList.add('tighter');
  }

  function select(key, focusTab = false) {
    if (key === current) return;
    current = key;
    tabs.forEach((t) => {
      const on = t.dataset.tab === key;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus();
    });
    panels.forEach((p) => {
      const on = p.id === `panel-${key}`;
      p.hidden = !on;
      p.classList.remove('in');
      const svg = p.querySelector('svg');
      if (on) {
        p.parentElement.scrollTop = 0;
        void p.offsetWidth; // restart the line drawing
        p.classList.add('in');
        if (svg.setCurrentTime && !reduce) { svg.setCurrentTime(0); svg.unpauseAnimations(); }
      } else if (svg.pauseAnimations) svg.pauseAnimations();
    });
    paint();
    fit();
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { select(t.dataset.tab); if (!exploded) setExploded(true); });
    t.addEventListener('pointerenter', () => { hovered = t.dataset.tab; paint(); });
    t.addEventListener('pointerleave', () => { hovered = null; paint(); });
    t.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      select(tabs[(i + step + tabs.length) % tabs.length].dataset.tab, true);
    });
  });

  // a click on the drawing: explode if assembled, open a different part, otherwise assemble
  stack.addEventListener('click', (e) => {
    const node = e.target.closest('.part');
    e.preventDefault();
    if (!exploded) { setExploded(true); if (node) select(node.dataset.tab); return; }
    if (node && node.dataset.tab !== current) {
      select(node.dataset.tab);
      if (matchMedia('(max-width: 1099px)').matches) document.querySelector('.panel').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    setExploded(false);
  });
  const over = (e) => { const node = e.target.closest('.part'); hovered = node ? node.dataset.tab : null; paint(); };
  stack.addEventListener('pointerover', over);
  stack.addEventListener('focusin', over);
  stack.addEventListener('pointerleave', () => { hovered = null; paint(); });
  stack.addEventListener('focusout', () => { hovered = null; paint(); });

  // line drawing needs unit path lengths; claim numbering continues across panels
  document.querySelectorAll('.fig-art .draw .ln').forEach((n) => n.setAttribute('pathLength', '1'));
  document.querySelectorAll('.claims').forEach((ol) => ol.style.setProperty('--start', ol.getAttribute('start') || 1));
  if (reduce) document.querySelectorAll('svg').forEach((s) => s.pauseAnimations && s.pauseAnimations());

  const fromHash = (location.hash.match(/^#panel-(\w+)$/) || [])[1];
  select(tabs.some((t) => t.dataset.tab === fromHash) ? fromHash : 'sglang');

  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
