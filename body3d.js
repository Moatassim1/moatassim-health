// GG Gains 3D muscle figure. Model: Z-Anatomy (CC BY-SA 4.0), based on BodyParts3D (CC BY-SA 2.1 JP), reduced for phones.
// Viewer: three.js (MIT). Loaded only when a 3D figure is shown.
//   const v = await GGBody3D.mount(el, { fill: { chest: '#E8473C' }, body: { sex, heightCm, weightKg, mu, ml }, onTap: key => {} })
//   v.setFill({...}); v.view('front'|'back'); v.dispose();
import * as THREE from './vendor/three/three.module.min.js';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';

const V = (document.querySelector('script[src*="app.js"]') || {}).src || '';
let modelP = null;
const loadModel = () => modelP || (modelP = new GLTFLoader().loadAsync('models/body3d.glb?v=1').catch(e => { modelP = null; throw e; }));
const keyOf = n => n.replace(/_/g, ' ');
const dark = () => document.documentElement.dataset.theme === 'dark';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// How each muscle group grows with strength (mu = upper body 0–1, ml = lower body 0–1) and with body fat.
const GROW = { chest: ['u', 0.22], shoulders: ['u', 0.3], traps: ['u', 0.25], biceps: ['u', 0.38], triceps: ['u', 0.34], forearms: ['u', 0.2], lats: ['u', 0.22],
  'middle back': ['u', 0.16], 'lower back': ['l', 0.1], abdominals: ['u', 0.06], glutes: ['l', 0.2], abductors: ['l', 0.14], adductors: ['l', 0.16], quadriceps: ['l', 0.24],
  hamstrings: ['l', 0.2], calves: ['l', 0.18], neck: ['u', 0.18] };
const LIMB = new Set(['shoulders', 'biceps', 'triceps', 'forearms', 'glutes', 'abductors', 'adductors', 'quadriceps', 'hamstrings', 'calves']);

function shapeMesh(mesh, key, b, H) {
  const g = mesh.geometry, pos = g.attributes.position, orig = mesh.userData.orig || (mesh.userData.orig = pos.array.slice());
  const fem = b.sex === 'female', h = b.heightCm || (fem ? 165 : 178), w = b.weightKg || (fem ? 63 : 78);
  const bmi = w / Math.pow(h / 100, 2), fat = clamp(1 + (bmi - (fem ? 21.5 : 22.5)) * 0.03, 0.9, 1.42);
  const gr = GROW[key], bulk = fem ? 0.6 : 1;
  const m = gr ? 1 + gr[1] * clamp(gr[0] === 'u' ? b.mu || 0 : b.ml || 0, 0, 1) * bulk : 1;
  // Centre of each side (left/right) so arms and legs grow around themselves, not around the spine.
  const cx = [0, 0], cz = [0, 0], cy = [0, 0], n = [0, 0];
  for (let i = 0; i < orig.length; i += 3) { const s = orig[i] < 0 ? 0 : 1; cx[s] += orig[i]; cy[s] += orig[i + 1]; cz[s] += orig[i + 2]; n[s]++; }
  for (let s = 0; s < 2; s++) if (n[s]) { cx[s] /= n[s]; cy[s] /= n[s]; cz[s] /= n[s]; }
  const a = pos.array, limb = LIMB.has(key), y0 = H.minY, Ht = H.maxY - H.minY;
  for (let i = 0; i < orig.length; i += 3) {
    let x = orig[i], y = orig[i + 1], z = orig[i + 2];
    const t = (y - y0) / Ht; // 0 = feet, 1 = top of head
    // Body fat: wider around the waist and hips, a little everywhere else.
    const waist = Math.exp(-Math.pow((t - 0.56) / 0.12, 2)), fatK = 1 + (fat - 1) * (0.45 + 0.9 * waist);
    // Women: narrower shoulders and chest, wider hips.
    const femK = fem ? 1 - 0.08 * Math.exp(-Math.pow((t - 0.8) / 0.07, 2)) + 0.09 * Math.exp(-Math.pow((t - 0.5) / 0.07, 2)) : 1;
    x *= fatK * femK; z = z * (1 + (fatK - 1) * 0.8);
    if (key !== 'body' && m !== 1) {
      const s = orig[i] < 0 ? 0 : 1, ccx = limb ? cx[s] * fatK * femK : 0, ccz = limb ? cz[s] : cz[s];
      x = ccx + (x - ccx) * m; z = ccz + (z - ccz) * (limb ? m : 1 + (m - 1) * 1.3);
    }
    a[i] = x; a[i + 1] = y; a[i + 2] = z;
  }
  pos.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
}

export async function mount(el, o = {}) {
  const gltf = await loadModel();
  const W = () => el.clientWidth || 300, Hh = () => el.clientHeight || 420;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!o.snapshot });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W(), Hh());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.innerHTML = ''; el.appendChild(renderer.domElement); renderer.domElement.style.touchAction = 'pan-y';
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(24, W() / Hh(), 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404048, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1.5, 3, 4); scene.add(key);
  const back = new THREE.DirectionalLight(0xffffff, 1.4); back.position.set(-2, 2, -4); scene.add(back);
  const rim = new THREE.DirectionalLight(0xffe6dc, 0.8); rim.position.set(-4, 1, 1); scene.add(rim);
  const root = gltf.scene.clone(true), pivot = new THREE.Group(); pivot.add(root); scene.add(pivot);
  const box = new THREE.Box3().setFromObject(root), H = { minY: box.min.y, maxY: box.max.y };
  const meshes = {};
  root.traverse(m => { if (!m.isMesh) return; m.geometry = m.geometry.clone(); const k = keyOf(m.name.replace(/\.\d+$/, '')); meshes[k] = m; m.userData.key = k; });
  const base = () => dark() ? 0x8d8d97 : 0xa3a3ab, line = () => dark() ? 0x3d3d46 : 0x2a2a30;
  const mats = {};
  for (const [k, m] of Object.entries(meshes)) { mats[k] = m.material = new THREE.MeshStandardMaterial({ color: k === 'body' ? line() : base(), roughness: k === 'body' ? 0.8 : 0.55, metalness: 0.02 }); shapeMesh(m, k, o.body || {}, H); }
  const box2 = new THREE.Box3().setFromObject(root), c = box2.getCenter(new THREE.Vector3()), size = box2.getSize(new THREE.Vector3());
  root.position.sub(c);
  const fit = () => { cam.aspect = W() / Hh(); const d = (size.y / 2) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 1.08; cam.position.set(0, 0, Math.max(d, (size.x / 2) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) / cam.aspect * 1.1)); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); };
  fit();
  // Model faces -Y in Blender → after glTF export it faces +Z? Detect: chest should be in front.
  let rotY = 0, target = 0, velo = 0, tilt = 0;
  if (meshes.chest && meshes.lats) { const cz = new THREE.Box3().setFromObject(meshes.chest).getCenter(new THREE.Vector3()).z, lz = new THREE.Box3().setFromObject(meshes.lats).getCenter(new THREE.Vector3()).z; if (cz < lz) rotY = target = Math.PI; }
  const front = rotY;
  const setFill = f => { for (const [k, mat] of Object.entries(mats)) if (k !== 'body') mat.color.set(f && f[k] ? f[k] : base()); };
  setFill(o.fill);
  let raf = 0, alive = true, dragging = false, lx = 0, ly = 0, moved = 0, auto = o.autoRotate ? 0.004 : 0;
  let api = null;
  const loop = () => {
    if (!alive) return;
    if (!el.isConnected) { api && api.dispose(); return; }
    if (!dragging) { if (Math.abs(velo) > 0.0001) { rotY += velo; velo *= 0.94; target = rotY; } else if (auto) { rotY += auto; target = rotY; } else rotY += (target - rotY) * 0.15; }
    pivot.rotation.y = rotY; pivot.rotation.x = tilt;
    renderer.render(scene, cam); raf = requestAnimationFrame(loop);
  };
  loop();
  const cv = renderer.domElement, ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  cv.addEventListener('pointerdown', e => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; velo = 0; auto = 0; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  cv.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy); rotY += dx * 0.012; velo = dx * 0.012; tilt = clamp(tilt + dy * 0.004, -0.35, 0.35); target = rotY; });
  const up = e => {
    if (!dragging) return; dragging = false;
    if (moved < 8 && o.onTap) {
      const r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, cam); const hit = ray.intersectObjects(Object.values(meshes), false).find(h => h.object.userData.key !== 'body');
      if (hit) o.onTap(hit.object.userData.key);
    }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { dragging = false; });
  const ro = window.ResizeObserver ? new ResizeObserver(() => { renderer.setSize(W(), Hh()); fit(); }) : null; if (ro) ro.observe(el);
  return api = {
    getRot: () => rotY - front, setRot(r) { rotY = target = front + (r || 0); },
    setFill, setBody(b) { for (const [k, m] of Object.entries(meshes)) shapeMesh(m, k, b || {}, H); },
    view(v, now) { const turn = v === 'back' ? Math.PI : 0; const base = front + turn; const k = Math.round((rotY - base) / (2 * Math.PI)); target = base + k * 2 * Math.PI; velo = 0; auto = 0; tilt = 0; if (now) rotY = target; },
    spin() { auto = 0.012; },
    snapshot() { renderer.render(scene, cam); return cv.toDataURL('image/png'); },
    dispose() { alive = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); renderer.dispose(); for (const m of Object.values(mats)) m.dispose(); for (const m of Object.values(meshes)) m.geometry.dispose(); el.innerHTML = ''; }
  };
}
window.GGBody3D = { mount };
