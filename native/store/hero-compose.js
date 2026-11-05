const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const S = '/tmp/claude-0/v2/shots/', b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const icon = b64('/home/claude/moatassim-health/native/AppIcon-1024.png');
const shot = n => b64(S + n + '.png');
const phone = (src, w, rot, extra) => `<div style="width:${w}px;aspect-ratio:1290/2796;border-radius:${w * 0.12}px;background:#0b0b0c;padding:${w * 0.022}px;box-sizing:border-box;box-shadow:0 ${w * .06}px ${w * .18}px rgba(0,0,0,.55);transform:rotate(${rot}deg);${extra || ''}"><div style="width:100%;height:100%;border-radius:${w * 0.1}px;overflow:hidden;background:#fff"><img src="${src}" style="width:100%;display:block"></div></div>`;
const bg = 'background:radial-gradient(90% 120% at 15% 10%,#8a1729 0%,#450b16 50%,#1a050a 100%)';
const font = "font-family:-apple-system,'Helvetica Neue',Inter,Arial,sans-serif";
const pages = [
  ['gg-header-3840x1646.jpg', 3840, 1646, 'jpeg', s => `
    <div style="position:absolute;left:300px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;width:1600px">
      <div style="display:flex;align-items:center;gap:56px"><img src="${icon}" style="width:260px;border-radius:58px;box-shadow:0 20px 60px rgba(0,0,0,.5)"><div style="font-size:200px;font-weight:800;letter-spacing:-4px">GG Gains</div></div>
      <div style="margin-top:70px;font-size:120px;font-weight:800;line-height:1.05;letter-spacing:-2px">Track every macro.<br>Climb the ranks.</div>
      <div style="margin-top:50px;font-size:62px;color:#ffb27a">Calories · barcodes · quests · friends</div></div>
    <div style="position:absolute;right:200px;top:150px;display:flex;gap:70px;align-items:flex-start">
      ${phone(shot('st1-diary'), 560, -4, 'margin-top:120px')}${phone(shot('st3-ranked'), 600, 0)}${phone(shot('st2-quests'), 560, 4, 'margin-top:120px')}</div>`],
  ['gg-search-3840x2560.jpg', 3840, 2560, 'jpeg', s => `
    <div style="position:absolute;left:0;right:0;top:170px;text-align:center"><div style="font-size:210px;font-weight:800;letter-spacing:-4px;line-height:1.02">Hit your macros.<br>Beat your friends.</div>
      <div style="margin-top:60px;font-size:90px;color:#ffb27a">Calorie tracker with daily quests and a weekly ladder</div></div>
    <div style="position:absolute;left:0;right:0;top:1180px;display:flex;justify-content:center;gap:120px">${phone(shot('st1-diary'), 760, -3)}${phone(shot('st3-ranked'), 760, 3)}</div>`],
  ['gg-universal-5244x2950.png', 5244, 2950, 'png', s => `
    <div style="position:absolute;left:420px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;width:2300px">
      <img src="${icon}" style="width:360px;border-radius:80px;box-shadow:0 30px 80px rgba(0,0,0,.5)">
      <div style="margin-top:90px;font-size:270px;font-weight:800;letter-spacing:-6px;line-height:1">GG Gains</div>
      <div style="margin-top:70px;font-size:150px;font-weight:800;line-height:1.08;letter-spacing:-3px">Track every macro.<br>Climb the ranks.</div>
      <div style="margin-top:70px;font-size:84px;color:#ffb27a">Calories · barcode scanner · quests · friends ladder</div></div>
    <div style="position:absolute;right:300px;top:250px;display:flex;gap:110px;align-items:flex-start">
      ${phone(shot('st1-diary'), 1080, -4, 'margin-top:220px')}${phone(shot('st3-ranked'), 1120, 3)}</div>`],
];
(async () => {
  const br = await chromium.launch();
  for (const [name, w, h, type, body] of pages) {
    const p = await br.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;position:relative;${bg};${font};color:#fff">${body()}</body></html>`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: '/mnt/user-data/outputs/' + name, type, ...(type === 'jpeg' ? { quality: 90 } : {}), omitBackground: false });
    await p.close();
  }
  await br.close();
})();
