// GG Gains: front/back muscle map. Drawn for GG Gains (left half, mirrored), styled like a classic muscle chart.
// GGBody.svg({ view: 'front'|'back'|'both', fill: { chest: '#E8473C', ... }, base, line, tap: true })
(function () {
  'use strict';
  // Silhouette, left half (viewer's left). Mirrored around x = 100.
  const SIL = 'M100,48 L91,48 C91,57 89,61 84,63 C72,66 58,68 50,76 C42,84 39,96 39,110 C37,128 35,146 35,160 C31,180 26,204 23,226 C21,236 19,248 21,258 C25,265 32,263 34,256 C36,246 36,236 38,228 C44,206 50,186 53,167 C56,150 60,132 62,118 C64,140 66,165 67,190 C66,204 63,214 63,228 C63,262 66,294 69,322 C66,346 66,368 73,398 C72,408 68,418 72,426 L93,426 C96,418 94,410 92,402 C96,380 98,352 95,328 C97,300 99,262 100,240 Z';
  // Muscles, left half. key → [front paths, back paths]
  const M = {
    neck: [['M91,51 L97,51 L97,64 C94,64 90,65 87,66 C90,62 91,57 91,51Z'], []],
    traps: [['M84,64 C76,67 64,69 56,74 C66,74 79,73 89,70Z'], ['M99,47 L92,47 C91,57 81,65 58,74 C71,78 85,87 99,104Z']],
    shoulders: [['M54,77 C45,81 41,94 41,110 C47,106 53,100 58,96 C61,88 60,80 54,77Z'], ['M56,77 C46,81 41,94 41,108 C48,103 56,97 61,89 C62,83 60,79 56,77Z']],
    chest: [['M61,83 C71,77 86,77 98,79 L98,108 C88,115 72,115 63,108 C58,100 58,90 61,83Z'], []],
    biceps: [['M43,116 C38,130 39,148 44,161 C51,152 56,136 58,120 C54,113 47,112 43,116Z'], []],
    triceps: [['M40,118 C37,133 37,149 41,159 C41,146 42,131 44,116Z'], ['M43,112 C38,128 38,146 42,160 C48,150 54,134 57,118 C53,112 47,110 43,112Z']],
    forearms: [['M41,166 C35,184 29,203 26,222 C32,224 37,223 40,221 C45,205 51,187 53,169 C49,164 44,163 41,166Z'], ['M42,166 C36,184 31,203 28,221 C33,222 37,221 40,220 C44,204 50,186 52,169 C48,164 45,163 42,166Z']],
    abdominals: [['M86,119 L97,119 L97,135 L86,135 C85,130 85,124 86,119Z', 'M86,139 L97,139 L97,155 L86,155Z', 'M86,159 L97,159 L97,175 L86,175Z', 'M86,179 L97,179 L97,212 C92,209 88,203 86,196Z',
      'M66,118 C72,120 80,122 83,127 L83,196 C79,202 74,207 68,210 C68,186 66,152 64,124Z'], []],
    lats: [[], ['M64,111 C68,136 72,160 78,182 C86,176 92,163 96,150 C88,132 77,119 64,111Z']],
    'middle back': [[], ['M99,108 C90,98 77,89 66,91 C64,97 66,104 72,110 C80,117 90,126 99,141Z']],
    'lower back': [[], ['M99,146 C94,160 88,176 85,192 C90,197 95,199 99,199Z']],
    glutes: [[], ['M68,206 C63,222 65,242 75,252 C85,257 95,253 99,247 L99,209 C90,202 77,202 68,206Z']],
    abductors: [['M64,213 C62,225 63,236 67,243 C68,233 68,222 66,213Z'], []],
    adductors: [['M96,236 C98,256 98,272 96,292 C92,272 89,252 91,236Z'], ['M98,258 C99,272 98,286 96,298 C94,284 93,270 94,258Z']],
    quadriceps: [['M67,221 C64,252 69,290 75,317 C81,312 86,310 92,313 C96,290 97,258 91,234 C84,226 75,219 67,221Z'], []],
    hamstrings: [[], ['M67,258 C66,282 70,304 75,323 L93,323 C96,300 97,280 94,259 C86,263 76,263 67,258Z']],
    calves: [['M71,333 C66,350 68,372 75,397 C79,381 82,357 81,335 C78,331 74,331 71,333Z', 'M85,334 C92,348 94,372 89,396 C86,377 83,355 83,336Z'], ['M72,333 C66,351 68,370 76,385 C80,376 84,366 85,340 C82,334 76,331 72,333Z', 'M87,339 C89,359 92,372 90,385 C95,372 96,353 92,335Z']]
  };
  const NAMES = { neck: 'Neck', traps: 'Traps', shoulders: 'Shoulders', chest: 'Chest', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abdominals: 'Abs', lats: 'Lats', 'middle back': 'Middle back', 'lower back': 'Lower back', glutes: 'Glutes', abductors: 'Outer thighs', adductors: 'Inner thighs', quadriceps: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves' };
  const FRONT_FIRST = new Set(['chest', 'shoulders', 'biceps', 'forearms', 'abdominals', 'quadriceps', 'adductors', 'abductors', 'neck']);
  const mirror = p => `<path d="${p}"/><path d="${p}" transform="translate(200 0) scale(-1 1)"/>`;
  function figure(side, o) {
    const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const i = side === 'front' ? 0 : 1, base = o.base || (dark ? '#8d8d97' : '#9b9ba3'), line = o.line || (dark ? '#3d3d46' : '#26262b'), fill = o.fill || {};
    let body = `<g fill="${line}" stroke="${line}" stroke-width="3" stroke-linejoin="round">${mirror(SIL)}<ellipse cx="100" cy="27" rx="16.5" ry="21"/>${side === 'back' ? '' : ''}</g>`;
    let mus = '';
    for (const [k, v] of Object.entries(M)) {
      const ps = v[i]; if (!ps.length) continue;
      mus += `<g class="bm-m" data-m="${k}" fill="${fill[k] || base}"${o.tap ? ' style="cursor:pointer"' : ''}><title>${NAMES[k]}</title>${ps.map(mirror).join('')}</g>`;
    }
    return body + `<g stroke="${line}" stroke-width="1.6" stroke-linejoin="round">${mus}</g>`;
  }
  function svg(o = {}) {
    const view = o.view || 'both', cls = o.cls ? ` class="${o.cls}"` : '';
    if (view === 'both') return `<svg${cls} viewBox="10 0 380 432" role="img" aria-label="Muscle map, front and back"><g>${figure('front', o)}</g><g transform="translate(190 0)">${figure('back', o)}</g></svg>`;
    return `<svg${cls} viewBox="14 0 172 432" role="img" aria-label="Muscle map, ${view}">${figure(view, o)}</svg>`;
  }
  // Best single view for an exercise (where its main muscle is).
  const viewFor = muscles => (muscles || []).some(m => FRONT_FIRST.has(m)) ? 'front' : (muscles || []).length ? 'back' : 'front';
  window.GGBody = { svg, viewFor, NAMES, MUSCLES: Object.keys(M) };
})();
