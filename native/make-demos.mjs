// Draws GG Gains' own two-frame demos for exercises the free library doesn't film.
import fs from 'node:fs';
const dir = new URL('../demo/', import.meta.url);
const C = { bg: '#eef1f4', floor: '#d6dbe1', tower: '#9aa3ad', towerD: '#7d8691', stack: '#4a525c', cable: '#1f2328', skin: '#d9a77f', shirt: '#2f3842', pants: '#6a7381', shoe: '#2a2f36', lat: '#e8473c' };
const limb = (pts, w, col) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
function kneelDual(up) {
  const P = [[104, 78], [496, 78]];
  const sh = [[262, 292], [338, 292]];
  const el = up ? [[214, 205], [386, 205]] : [[218, 352], [382, 352]];
  const ha = up ? [[176, 128], [424, 128]] : [[214, 268], [386, 268]];
  const tower = x => `<rect x="${x - 14}" y="36" width="28" height="528" rx="6" fill="${C.tower}"/><rect x="${x - 6}" y="300" width="12" height="${up ? 200 : 150}" y2="0" fill="${C.stack}" transform="translate(0,${up ? 60 : 110})"/>`;
  const handle = ([x, y], left) => `<line x1="${x - 13}" y1="${y + (left ? 4 : -4)}" x2="${x + 13}" y2="${y + (left ? -4 : 4)}" stroke="#c8ced6" stroke-width="9" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <rect width="600" height="600" fill="${C.bg}"/><rect y="560" width="600" height="40" fill="${C.floor}"/>
  ${tower(70)}${tower(530)}
  <rect x="56" y="30" width="488" height="22" rx="8" fill="${C.towerD}"/>
  <circle cx="${P[0][0]}" cy="${P[0][1]}" r="17" fill="${C.towerD}"/><circle cx="${P[0][0]}" cy="${P[0][1]}" r="6" fill="${C.bg}"/>
  <circle cx="${P[1][0]}" cy="${P[1][1]}" r="17" fill="${C.towerD}"/><circle cx="${P[1][0]}" cy="${P[1][1]}" r="6" fill="${C.bg}"/>
  <line x1="${P[0][0]}" y1="${P[0][1]}" x2="${ha[0][0]}" y2="${ha[0][1]}" stroke="${C.cable}" stroke-width="3"/>
  <line x1="${P[1][0]}" y1="${P[1][1]}" x2="${ha[1][0]}" y2="${ha[1][1]}" stroke="${C.cable}" stroke-width="3"/>
  <ellipse cx="300" cy="566" rx="120" ry="10" fill="#c5ccd4"/>
  ${limb([[274, 436], [266, 470], [266, 536]], 28, '#7b8492')}
  <ellipse cx="264" cy="540" rx="18" ry="7" fill="#3a4049"/>
  ${limb([[328, 436], [334, 548]], 31, C.pants)}
  <ellipse cx="334" cy="556" rx="17" ry="9" fill="#59616e"/>
  <path d="M320 556 L350 556 L356 584 L316 584 Z" fill="${C.pants}"/>
  <rect x="312" y="576" width="48" height="20" rx="9" fill="${C.shoe}"/>
  <line x1="318" y1="586" x2="354" y2="586" stroke="#4a515b" stroke-width="2"/>
  <path d="M248 300 Q238 360 256 436 L344 436 Q362 360 352 300 Q300 278 248 300 Z" fill="${C.shirt}"/>
  ${up ? '' : `<path d="M258 318 Q250 360 272 410 L300 392 L328 410 Q350 360 342 318 Q320 344 300 346 Q280 344 258 318 Z" fill="${C.lat}" opacity=".55"/>`}
  ${limb([sh[0], el[0], ha[0]], 22, C.shirt)}${limb([sh[1], el[1], ha[1]], 22, C.shirt)}
  ${limb([el[0], ha[0]], 18, C.skin)}${limb([el[1], ha[1]], 18, C.skin)}
  <circle cx="${ha[0][0]}" cy="${ha[0][1]}" r="11" fill="${C.skin}"/><circle cx="${ha[1][0]}" cy="${ha[1][1]}" r="11" fill="${C.skin}"/>
  ${handle(ha[0], true)}${handle(ha[1], false)}
  <rect x="288" y="262" width="24" height="26" rx="8" fill="${C.skin}"/>
  <circle cx="300" cy="240" r="28" fill="#3a2a22"/>
  <text x="300" y="590" font-family="Helvetica,Arial,sans-serif" font-size="0">.</text>
</svg>`;
}
fs.writeFileSync(new URL('kneel-dual-pulldown-0.svg', dir), kneelDual(true));
fs.writeFileSync(new URL('kneel-dual-pulldown-1.svg', dir), kneelDual(false));
console.log('demos written');
