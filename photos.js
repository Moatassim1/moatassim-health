// GG Gains progress photos. Photos are stored ONLY on this device (IndexedDB), never uploaded.
// MHPhotos: days(), get(k), put(k, blob), del(k), list(from, to), capture({ ghost }), makeVideo(opts, onProgress)
(function () {
  'use strict';
  const DB = 'gg-photos', STORE = 'photos';
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    // Ask the browser not to clear these when space runs low.
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (_) {}
    return dbp;
  }
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode), st = t.objectStore(STORE); const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };
  const get = k => tx('readonly', st => st.get(k)).then(r => r || null);
  const put = (k, blob) => tx('readwrite', st => st.put({ blob, at: Date.now() }, k));
  const del = k => tx('readwrite', st => st.delete(k));
  const keys = () => tx('readonly', st => st.getAllKeys()).then(r => (r || []).sort());
  async function list(from, to) { const ks = (await keys()).filter(k => (!from || k >= from) && (!to || k <= to)); const out = []; for (const k of ks) { const r = await get(k); if (r) out.push({ k, blob: r.blob }); } return out; }

  // Shrink to max 1440 px on the long side, JPEG ~80%, so a year of photos stays small.
  async function shrink(src) {
    const img = await loadImg(src instanceof Blob ? URL.createObjectURL(src) : src);
    const s = Math.min(1, 1440 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
  }
  const loadImg = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });

  // Camera with a see-through "ghost" of the last photo, so every photo lines up.
  function capture({ ghost } = {}) {
    return new Promise(resolve => {
      let stream = null, facing = 'user', timer = 0, done = false;
      const box = document.createElement('div'); box.className = 'pcam';
      box.innerHTML = `<video playsinline muted autoplay></video>${ghost ? `<img class="pcam-ghost" src="${ghost}" alt="">` : ''}
        <div class="pcam-top"><button data-p="close">Cancel</button><span>Progress photo</span><button data-p="flip">Flip</button></div>
        <div class="pcam-count" hidden></div>
        <div class="pcam-bottom">${ghost ? '<label class="pcam-gh"><input type="checkbox" checked data-p="ghost"> Line up with last photo</label>' : ''}
          <div class="pcam-row"><button data-p="timer" class="pcam-t">⏱ Off</button><button data-p="shoot" class="pcam-shoot" aria-label="Take photo"></button><label class="pcam-t">Upload<input type="file" accept="image/*" hidden data-p="file"></label></div></div>`;
      document.body.appendChild(box);
      const video = box.querySelector('video');
      const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
      const finish = b => { if (done) return; done = true; stop(); box.remove(); resolve(b); };
      const start = async () => {
        stop();
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } } }); video.srcObject = stream; video.classList.toggle('mirror', facing === 'user'); await video.play().catch(() => {}); }
        catch (_) { box.querySelector('.pcam-top span').textContent = 'Camera unavailable: use Upload'; }
      };
      const shoot = () => {
        if (!video.videoWidth) return;
        const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
        const x = c.getContext('2d'); if (facing === 'user') { x.translate(c.width, 0); x.scale(-1, 1); }
        x.drawImage(video, 0, 0); c.toBlob(async b => finish(await shrink(b)), 'image/jpeg', 0.9);
      };
      box.addEventListener('click', e => {
        const b = e.target.closest('[data-p]'); if (!b) return;
        const a = b.dataset.p;
        if (a === 'close') finish(null);
        if (a === 'flip') { facing = facing === 'user' ? 'environment' : 'user'; start(); }
        if (a === 'timer') { timer = timer === 0 ? 3 : timer === 3 ? 10 : 0; b.textContent = '⏱ ' + (timer ? timer + 's' : 'Off'); }
        if (a === 'shoot') {
          if (!timer) return shoot();
          let n = timer; const cd = box.querySelector('.pcam-count'); cd.hidden = false; cd.textContent = n;
          const iv = setInterval(() => { n--; if (n <= 0) { clearInterval(iv); cd.hidden = true; shoot(); } else cd.textContent = n; }, 1000);
        }
      });
      box.addEventListener('change', async e => {
        if (e.target.dataset.p === 'ghost') { const g = box.querySelector('.pcam-ghost'); if (g) g.hidden = !e.target.checked; }
        if (e.target.dataset.p === 'file' && e.target.files[0]) finish(await shrink(e.target.files[0]));
      });
      start();
    });
  }

  // ---------------------------------------------------------------- transformation video
  // A built-in beat, made in code (so no music licences are needed).
  function beat(ac, dest, seconds, bpm = 120) {
    const t0 = ac.currentTime + 0.05, spb = 60 / bpm, master = ac.createGain(); master.gain.value = 0.55; master.connect(dest);
    const noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const bass = [55, 55, 65.4, 49];
    for (let i = 0, t = t0; t < t0 + seconds; i++, t += spb / 2) {
      if (i % 2 === 0) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g).connect(master); o.start(t); o.stop(t + 0.3); }
      const n = ac.createBufferSource(), hg = ac.createGain(), hp = ac.createBiquadFilter(); n.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 7000; hg.gain.setValueAtTime(i % 4 === 2 ? 0.5 : 0.18, t); hg.gain.exponentialRampToValueAtTime(0.001, t + 0.06); n.connect(hp).connect(hg).connect(master); n.start(t); n.stop(t + 0.08);
      if (i % 8 === 0) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = bass[(i / 8) % 4]; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; g.gain.setValueAtTime(0.25, t); g.gain.linearRampToValueAtTime(0.001, t + spb * 3.8); o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + spb * 4); }
    }
  }
  function pickMime() {
    const c = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return c.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  }
  const supported = () => !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
  // opts: { photos:[{k, blob}], title, perPhoto (s), music: 'beat' | File | null, labels: k => text, endText, size: [w,h] }
  async function makeVideo(opts, onProgress = () => {}) {
    if (!supported()) throw new Error('This browser cannot make videos. Update your phone, or use the PC app.');
    const [W, H] = opts.size || [1080, 1350], per = opts.perPhoto || 0.35, fps = 30;
    const imgs = []; for (let i = 0; i < opts.photos.length; i++) { imgs.push(await loadImg(URL.createObjectURL(opts.photos[i].blob))); onProgress(i / opts.photos.length * 0.2); }
    const intro = 1.6, outro = 2.4, total = intro + imgs.length * per + outro;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const vstream = c.captureStream(fps);
    const ac = new (window.AudioContext || window.webkitAudioContext)(); const dest = ac.createMediaStreamDestination();
    if (opts.music === 'beat') beat(ac, dest, total + 0.5);
    else if (opts.music && opts.music.arrayBuffer) {
      const buf = await ac.decodeAudioData(await opts.music.arrayBuffer());
      const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; src.connect(g).connect(dest);
      const t0 = ac.currentTime; g.gain.setValueAtTime(1, t0); g.gain.setValueAtTime(1, t0 + total - 1.2); g.gain.linearRampToValueAtTime(0, t0 + total);
      src.start(t0, Math.min(opts.musicStart || 0, Math.max(0, buf.duration - total)));
    }
    const tracks = [...vstream.getVideoTracks(), ...(opts.music ? dest.stream.getAudioTracks() : [])];
    const mime = pickMime(); const rec = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined);
    const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(r => { rec.onstop = r; });
    const cover = (img, a) => { const s = Math.max(W / img.width, H / img.height); const w = img.width * s, h = img.height * s; x.globalAlpha = a; x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); x.globalAlpha = 1; };
    const text = (t, y, size, color = '#fff', weight = 800) => { x.font = `${weight} ${size}px Inter, system-ui, sans-serif`; x.textAlign = 'center'; x.fillStyle = color; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 18; x.fillText(t, W / 2, y); x.shadowBlur = 0; };
    const frame = t => {
      x.fillStyle = '#0b0b0d'; x.fillRect(0, 0, W, H);
      if (t < intro) {
        const a = Math.min(1, t / 0.4);
        x.globalAlpha = a; text('GG GAINS', H * 0.40, 64, '#E0263A', 900); text(opts.title || 'My transformation', H * 0.5, 72); text(opts.subtitle || '', H * 0.57, 40, '#bbb', 600); x.globalAlpha = 1;
        return;
      }
      const tt = t - intro, i = Math.min(imgs.length - 1, Math.floor(tt / per)), f = (tt - i * per) / per;
      if (i < imgs.length && tt < imgs.length * per) {
        cover(imgs[i], 1);
        if (i + 1 < imgs.length && f > 0.7) cover(imgs[i + 1], (f - 0.7) / 0.3);
        const lab = opts.labels ? opts.labels(opts.photos[i].k) : opts.photos[i].k;
        x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, H - 150, W, 150); text(lab, H - 60, 46, '#fff', 700);
        x.fillStyle = '#E0263A'; x.fillRect(0, H - 8, W * (i + 1) / imgs.length, 8);
        return;
      }
      // outro: first and last side by side
      const a = imgs[0], b = imgs[imgs.length - 1], half = W / 2;
      const draw = (img, ox) => { const s = Math.max(half / img.width, H / img.height); const w = img.width * s, h = img.height * s; x.save(); x.beginPath(); x.rect(ox, 0, half, H); x.clip(); x.drawImage(img, ox + (half - w) / 2, (H - h) / 2, w, h); x.restore(); };
      draw(a, 0); draw(b, half); x.fillStyle = '#E0263A'; x.fillRect(half - 3, 0, 6, H);
      x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, H - 230, W, 230);
      text(opts.endText || 'GG', H - 130, 60); text('Made with GG Gains', H - 60, 34, '#E0263A', 800);
    };
    rec.start(250);
    const t0 = performance.now();
    await new Promise(resolve => {
      const tick = () => { const t = (performance.now() - t0) / 1000; frame(Math.min(t, total)); onProgress(0.2 + 0.8 * Math.min(1, t / total)); if (t >= total) return resolve(); requestAnimationFrame(tick); };
      tick();
    });
    rec.stop(); await done; ac.close().catch(() => {});
    const type = (mime || 'video/webm').split(';')[0];
    return { blob: new Blob(chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm' };
  }

  window.MHPhotos = { get, put, del, keys, list, capture, shrink, makeVideo, supported, async days() { return new Set(await keys()); } };
})();
