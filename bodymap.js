// GG Gains: front/back muscle figure, drawn for GG Gains in a classic muscle-chart style.
// The figure is built from parts (torso, arms, legs…). Each part is scaled from the person's sex, height,
// weight (BMI) and strength, so the figure looks like them and gets more muscular as their lifts go up.
// GGBody.svg({ view: 'front'|'back'|'both', fill: { chest: '#E8473C', ... }, body: { sex, heightCm, weightKg, mu, ml }, tap, cls })
(function () {
  'use strict';
  // ---- parts: dark body shapes, left half (viewer's left), mirrored around x = 100
  const P = {
    neck: 'M88,38 L100,38 L100,68 L85,69 C88,62 89,54 88,46Z',
    upper: 'M100,58 L89,61 C77,64 61,67 54,75 C56,92 60,106 62,118 C64,130 65,142 66,154 L100,154Z',
    lower: { m: 'M100,148 L74,148 C69,164 68,182 67,193 C64,204 62,214 62,229 C71,238 86,241 100,243Z', f: 'M100,148 L76,148 C73,160 75,172 74,186 C68,200 57,212 57,230 C67,241 86,244 100,246Z' },
    delt: 'M59,71 C46,72 37,85 37,104 C37,111 42,116 49,115 C55,106 61,96 63,84 C63,77 62,72 59,71Z',
    uarm: 'M40,98 C35,115 33,140 34,161 C40,168 50,167 54,160 C57,146 60,128 61,112 C59,103 48,96 40,98Z',
    farm: 'M35,157 C29,177 24,200 22,224 C26,231 36,231 40,224 C45,206 51,186 54,163 C49,155 40,153 35,157Z',
    hand: 'M22,221 C18,234 17,248 20,258 C24,266 33,265 35,257 C37,247 38,236 40,224Z',
    thigh: 'M62,220 C59,250 62,290 67,322 L94,324 C97,296 99,262 100,240 C90,236 74,228 62,220Z',
    knee: 'M67,314 C66,324 67,334 69,341 L93,341 C94,332 95,323 94,314Z',
    shin: 'M69,333 C63,352 64,373 71,399 L91,401 C96,378 98,354 94,333Z',
    foot: 'M71,396 C70,408 66,418 70,427 L93,427 C95,418 93,408 91,398Z'
  };
  // ---- muscles: [muscle key, part, view ('f' front | 'b' back | 'fb'), path]
  const MUS = [
    ['neck', 'neck', 'f', 'M91,45 C92,53 94,60 98,67 L95,68 C91,62 89,54 89,46Z'],
    ['traps', 'upper', 'f', 'M88,63 C80,66 68,69 58,74 C68,76 80,75 91,71Z'],
    ['chest', 'upper', 'f', 'M98,78 C88,74 70,74 60,82 C56,90 56,104 62,114 C72,121 88,122 98,116Z'],
    ['shoulders', 'delt', 'f', 'M57,74 C47,76 40,88 39,104 C41,109 45,111 48,109 C53,100 58,92 61,85 C61,79 60,75 57,74Z'],
    ['biceps', 'uarm', 'f', 'M45,111 C40,124 39,142 42,156 C46,161 50,159 52,153 C55,140 57,126 57,116 C54,110 48,108 45,111Z'],
    ['triceps', 'uarm', 'f', 'M39,111 C36,126 36,144 38,157 C39,144 40,128 42,112Z'],
    ['forearms', 'farm', 'fb', 'M37,163 C32,180 28,199 26,219 C29,221 32,221 34,219 C38,201 43,183 47,166 C44,161 40,160 37,163Z'],
    ['forearms', 'farm', 'fb', 'M49,167 C46,184 42,201 38,219 C40,221 41,220 42,218 C46,201 50,185 52,170Z'],
    ['abdominals', 'lower', 'f', 'M87,121 L98,121 L98,135 L87,135 C86,130 86,125 87,121Z'],
    ['abdominals', 'lower', 'f', 'M87,138 L98,138 L98,152 L87,152Z'],
    ['abdominals', 'lower', 'f', 'M87,155 L98,155 L98,170 L87,170Z'],
    ['abdominals', 'lower', 'f', 'M87,173 L98,173 L98,214 C93,210 89,202 87,194Z'],
    ['abdominals', 'lower', 'f', 'M67,134 C73,136 79,138 84,142 L84,198 C80,205 75,210 70,214 C70,192 69,164 67,140Z'],
    ['abdominals', 'upper', 'f', 'M63,118 C68,119 72,121 75,124 L66,128 C65,125 64,121 63,118Z'],
    ['abdominals', 'upper', 'f', 'M65,130 C70,130 75,131 79,134 L67,138 C66,135 65,133 65,130Z'],
    ['abdominals', 'lower', 'f', 'M70,217 C76,212 82,206 86,200 C88,210 92,222 97,232 C88,232 78,228 70,217Z'],
    ['abductors', 'lower', 'f', 'M63,212 C61,224 62,234 66,241 C67,231 67,221 65,212Z'],
    ['quadriceps', 'thigh', 'f', 'M64,226 C60,256 63,292 70,316 C74,306 76,288 76,262 C74,246 70,234 64,226Z'],
    ['quadriceps', 'thigh', 'f', 'M72,228 C75,252 78,282 80,308 C84,300 87,278 87,256 C85,242 80,232 72,228Z'],
    ['quadriceps', 'thigh', 'f', 'M86,281 C83,295 82,308 86,318 C91,318 94,310 93,296 C92,288 90,282 86,281Z'],
    ['adductors', 'thigh', 'f', 'M88,243 C92,255 96,267 96,283 C93,276 90,264 86,251Z'],
    ['calves', 'shin', 'f', 'M70,342 C66,356 67,372 72,389 C75,376 77,360 76,344Z'],
    ['calves', 'shin', 'f', 'M78,343 C79,361 80,379 81,396 C83,380 84,362 83,343Z'],
    ['calves', 'shin', 'f', 'M87,342 C93,354 94,372 90,391 C88,376 86,358 86,344Z'],
    // back
    ['traps', 'upper', 'b', 'M100,50 L92,50 C91,59 82,66 60,74 C70,78 80,84 86,92 C90,106 95,124 100,146Z'],
    ['shoulders', 'delt', 'b', 'M57,74 C47,76 40,88 39,104 C41,109 45,111 48,109 C53,100 58,92 61,85 C61,79 60,75 57,74Z'],
    ['triceps', 'uarm', 'b', 'M43,109 C38,125 37,144 41,158 C45,154 48,146 49,136 C50,126 48,116 43,109Z'],
    ['triceps', 'uarm', 'b', 'M50,113 C53,123 54,140 51,156 C55,154 58,144 59,130 C59,122 56,115 50,113Z'],
    ['middle back', 'upper', 'b', 'M63,81 C58,92 59,104 64,112 C72,116 81,114 88,108 C86,98 80,88 72,82 C68,79 65,79 63,81Z'],
    ['lats', 'upper', 'b', 'M63,116 C66,134 69,152 73,168 C76,178 79,186 83,192 C88,184 92,170 94,154 C95,146 95,138 93,128 C86,120 75,116 63,116Z'],
    ['lower back', 'lower', 'b', 'M99,150 C95,162 92,178 91,194 C92,201 96,205 99,207Z'],
    ['glutes', 'lower', 'b', 'M64,205 C62,213 63,221 67,226 C75,220 85,214 90,206 C82,201 72,201 64,205Z'],
    ['glutes', 'lower', 'b', 'M67,223 C64,237 68,252 78,258 C88,262 96,256 99,248 L99,214 C90,214 76,216 67,223Z'],
    ['hamstrings', 'thigh', 'b', 'M65,262 C64,284 67,304 72,322 L82,322 C83,302 82,282 80,264Z'],
    ['hamstrings', 'thigh', 'b', 'M82,264 C84,284 86,304 86,322 L94,322 C97,300 97,282 95,264Z'],
    ['adductors', 'thigh', 'b', 'M95,250 C98,262 98,274 96,285 C94,274 93,262 93,252Z'],
    ['calves', 'shin', 'b', 'M71,338 C65,352 66,368 74,383 C78,376 82,364 83,342 C80,336 75,335 71,338Z'],
    ['calves', 'shin', 'b', 'M85,340 C88,356 91,370 89,385 C95,372 97,354 93,336Z'],
    ['calves', 'shin', 'b', 'M74,386 C76,393 78,398 80,400 L88,400 C90,394 91,389 90,386Z']
  ];
  const NAMES = { neck: 'Neck', traps: 'Traps', shoulders: 'Shoulders', chest: 'Chest', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abdominals: 'Abs', lats: 'Lats', 'middle back': 'Middle back', 'lower back': 'Lower back', glutes: 'Glutes', abductors: 'Outer thighs', adductors: 'Inner thighs', quadriceps: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves' };
  const FRONT_FIRST = new Set(['chest', 'shoulders', 'biceps', 'forearms', 'abdominals', 'quadriceps', 'adductors', 'abductors', 'neck']);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Part transforms for one person.
  function shape(b = {}) {
    const fem = b.sex === 'female', h = b.heightCm || (fem ? 165 : 178), w = b.weightKg || (fem ? 63 : 78);
    const bmi = w / Math.pow(h / 100, 2), fat = clamp(1 + (bmi - (fem ? 21.5 : 22.5)) * 0.03, 0.9, 1.42);
    const bulk = fem ? 0.6 : 1, mu = clamp(b.mu || 0, 0, 1) * bulk, ml = clamp(b.ml || 0, 0, 1) * bulk;
    const su = Math.pow(fat, 0.55) * (1 + 0.14 * mu) * (fem ? 0.9 : 1);
    const sl = Math.pow(fat, 1.05) * (1 + 0.03 * ml);
    const sd = Math.pow(fat, 0.4) * (1 + 0.34 * mu) * (fem ? 0.86 : 1);
    const sa = Math.pow(fat, 0.55) * (1 + 0.42 * mu) * (fem ? 0.84 : 1);
    const sf = Math.pow(fat, 0.4) * (1 + 0.18 * mu) * (fem ? 0.86 : 1);
    const st = Math.pow(fat, 0.75) * (1 + 0.26 * ml) * (fem ? 1.04 : 1);
    const sc = Math.pow(fat, 0.45) * (1 + 0.16 * ml) * (fem ? 0.95 : 1);
    // Arms move out as the torso (or waist) and the arm itself get wider, so they never sink into the body.
    const armX = -Math.max((su - 1) * 42, (sl - 1) * 34 + (fem ? 3 : 0)) - (sa - 1) * 9;
    const delX = -(su - 1) * 46;
    const legX = -(sl - 1) * 18 - (fem ? 3 : 0);
    const T = (tx, ax, sx) => `translate(${(tx + ax - ax * sx).toFixed(2)} 0) scale(${sx.toFixed(3)} 1)`;
    const tf = {
      neck: T(0, 100, Math.pow(fat, 0.5) * (1 + 0.15 * mu) * (fem ? 0.85 : 1)),
      upper: T(0, 100, su), lower: T(0, 100, sl), delt: T(delX, 50, sd), uarm: T(armX, 48, sa), farm: T(armX - (sa - 1) * 4, 40, sf), hand: T(armX - (sa - 1) * 4, 30, fem ? 0.9 : 1),
      thigh: T(legX, 81, st), knee: T(legX, 81, sc), shin: T(legX, 81, sc), foot: T(legX, 81, fem ? 0.9 : 1)
    };
    const hs = clamp(h / 178, 0.88, 1.06);
    return { fem, tf, hs };
  }
  const HAIR = 'M100,3 C85,3 76,14 76,30 C76,44 79,55 75,66 C80,70 86,70 90,66 C88,56 86,46 88,36 L100,36Z';
  function figure(side, o) {
    const dark = typeof document !== 'undefined' && (document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches));
    const base = o.base || (dark ? '#8d8d97' : '#9b9ba3'), line = o.line || (dark ? '#3d3d46' : '#26262b'), fill = o.fill || {};
    const s = shape(o.body), v = side === 'front' ? 'f' : 'b';
    const half = (inner) => `<g>${inner}</g><g transform="translate(200 0) scale(-1 1)">${inner}</g>`;
    let dk = '';
    for (const [k, p] of Object.entries(P)) dk += `<path transform="${s.tf[k]}" d="${typeof p === 'string' ? p : p[s.fem ? 'f' : 'm']}"/>`;
    if (s.fem) dk += `<path d="${HAIR}"/>`;
    const groups = {};
    for (const [k, part, views, d] of MUS) if (views.includes(v)) (groups[k] = groups[k] || []).push(`<path transform="${s.tf[part]}" d="${d}"/>`);
    let mus = '';
    for (const [k, ps] of Object.entries(groups)) mus += `<g class="bm-m" data-m="${k}" fill="${fill[k] || base}"${o.tap ? ' style="cursor:pointer"' : ''}><title>${NAMES[k]}</title>${half(ps.join(''))}</g>`;
    const head = `<ellipse cx="100" cy="27" rx="${s.fem ? 15.5 : 16.5}" ry="${s.fem ? 20 : 21}"/>`;
    const body = `<g fill="${line}" stroke="${line}" stroke-width="5" stroke-linejoin="round">${half(dk)}${head}</g><g stroke="${line}" stroke-width="1.7" stroke-linejoin="round">${mus}</g>`;
    return `<g transform="translate(100 430) scale(${s.hs.toFixed(3)}) translate(-100 -430)">${body}</g>`;
  }
  function svg(o = {}) {
    const view = o.view || 'both', cls = o.cls ? ` class="${o.cls}"` : '';
    if (view === 'both') return `<svg${cls} viewBox="4 -28 392 462" role="img" aria-label="Muscle map, front and back"><g>${figure('front', o)}</g><g transform="translate(196 0)">${figure('back', o)}</g></svg>`;
    return `<svg${cls} viewBox="8 -28 184 462" role="img" aria-label="Muscle map, ${view}">${figure(view, o)}</svg>`;
  }
  const viewFor = muscles => (muscles || []).some(m => FRONT_FIRST.has(m)) ? 'front' : (muscles || []).length ? 'back' : 'front';
  window.GGBody = { svg, viewFor, NAMES, MUSCLES: Object.keys(NAMES), shape };
})();
