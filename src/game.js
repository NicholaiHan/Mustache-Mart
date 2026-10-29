import * as THREE from 'three';

/* ================= TUNING (change these to make the game shorter/longer) ================= */
const AISLES = 24, UNITS = 100;          // aisles, shelf units per side of each aisle
const SPACING = 5.4, ULEN = 1.6, Z0 = 6; // aisle spacing, shelf unit length, first shelf z
const TIERS = 3, COLS = 4, PER = TIERS * COLS; // 12 items per shelf unit
const UNIT_COUNT = AISLES * 2 * UNITS;
const TOTAL = UNIT_COUNT * PER;          // 57,600 items to stock
const X_MIN = -16, X_MAX = 145, Z_MIN = -8, Z_MAX = 180, DOOR_X = 28, DOOR_W = 10, DOOR_H = 5.4, WALL_H = 7;
const DAYS = 20, FIRST_DAY_SECONDS = 10, DAY_SPEEDUP = 0.85; // ending sequence
const SAVE_KEY = 'mustacheMartSave';

const cx = a => 4 + a * SPACING;
const ZEND = Z0 + (UNITS - 1) * ULEN;
const TIER_Y = [0.4, 1.3, 2.2];
const TYPE_NAMES = ['Soup Cans', 'Water Bottles', 'Fancy Wine'];

/* ================= STATE ================= */
const S = { coins: 0, lv: { speed: 0, bag: 0, hands: 0, price: 0, belt: 0, robot: 0, caf: 0 }, fill: new Uint8Array(UNIT_COUNT), stocked: 0 };
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) { const d = JSON.parse(raw); S.coins = d.coins || 0; Object.assign(S.lv, d.lv || {}); (d.fill || []).forEach((v, i) => { if (i < UNIT_COUNT) S.fill[i] = Math.max(0, Math.min(PER, Number(v) || 0)); }); }
} catch (e) {}
S.stocked = S.fill.reduce((a, b) => a + b, 0);
if (location.hash === '#rich') S.coins = 10_000_000;

const stat = {};
function recompute() {
  stat.speed = 4.2 + 0.55 * S.lv.speed;
  stat.cap = 8 + 4 * S.lv.bag;
  stat.rate = 2 + 0.9 * S.lv.hands;
  stat.value = 1 + 0.25 * S.lv.price;
  stat.botRate = 0.4 * (1 + 0.25 * S.lv.caf);
}
recompute();

const UPGRADES = [
  { id: 'speed', name: '👟 Zoomy Sneakers', desc: '+0.55 walk speed', max: 25, cost: l => Math.round(25 * 1.55 ** l) },
  { id: 'bag', name: '🎒 Bigger Bag', desc: '+4 carrying capacity', max: 40, cost: l => Math.round(20 * 1.45 ** l) },
  { id: 'hands', name: '🖐️ Fast Hands', desc: '+0.9 items stocked per second', max: 30, cost: l => Math.round(40 * 1.5 ** l) },
  { id: 'price', name: '🏷️ Golden Price Tags', desc: '+25% coins per item', max: 30, cost: l => Math.round(60 * 1.6 ** l) },
  { id: 'belt', name: '🛞 Conveyor Belt', desc: 'Adds a supply belt inside the aisles (grab stock closer to the shelves)', max: 72, cost: l => Math.round(150 * 1.3 ** l) },
  { id: 'robot', name: '🤖 Mustache Bot', desc: 'A robot that stocks shelves on its own', max: 200, cost: l => Math.round(300 * 1.22 ** l) },
  { id: 'caf', name: '☕ Bot Espresso', desc: '+25% robot stocking speed', max: 20, cost: l => Math.round(500 * 1.7 ** l) }
];

/* ================= THREE SETUP ================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const SKY_DAY = new THREE.Color(0x87d7ff), SKY_NIGHT = new THREE.Color(0x0b1030), SKY_DAWN = new THREE.Color(0xff9a5a);
scene.background = SKY_DAY.clone();
scene.fog = new THREE.Fog(0x87d7ff, 60, 320);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1700);
camera.rotation.order = 'YXZ';
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xffffff, 0xffd9b0, 1.0); scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xfff2cc, 0.9); sunLight.position.set(30, 60, 20); scene.add(sunLight);

const toon = (c, extra = {}) => new THREE.MeshToonMaterial({ color: c, ...extra });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(c));

function labelPlane(text, w, h, bg, fg, px = 64) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#2b1b3d'; g.lineWidth = 14; g.strokeRect(0, 0, c.width, c.height);
  g.fillStyle = fg; g.font = `900 ${px}px "Comic Sans MS", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
}

/* ---------- Store shell ---------- */
{
  const ct = document.createElement('canvas'); ct.width = ct.height = 128;
  const g = ct.getContext('2d'); g.fillStyle = '#fff6dc'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffd6e4'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
  const tex = new THREE.CanvasTexture(ct); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set((X_MAX - X_MIN) / 4, (Z_MAX - Z_MIN) / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X_MAX - X_MIN, Z_MAX - Z_MIN), new THREE.MeshBasicMaterial({ map: tex }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((X_MIN + X_MAX) / 2, 0, (Z_MIN + Z_MAX) / 2); scene.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X_MAX - X_MIN, Z_MAX - Z_MIN), new THREE.MeshBasicMaterial({ color: 0xfff1cf, side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set((X_MIN + X_MAX) / 2, WALL_H, (Z_MIN + Z_MAX) / 2); scene.add(ceil);

  const wall = (x, y, z, w, h, d, c = 0xffb3c8) => { const m = box(w, h, d, c); m.position.set(x, y, z); scene.add(m); };
  const dl = DOOR_X - DOOR_W / 2, dr = DOOR_X + DOOR_W / 2;
  wall((X_MIN + dl) / 2, WALL_H / 2, Z_MIN, dl - X_MIN, WALL_H, 0.6);
  wall((dr + X_MAX) / 2, WALL_H / 2, Z_MIN, X_MAX - dr, WALL_H, 0.6);
  wall(DOOR_X, (DOOR_H + WALL_H) / 2, Z_MIN, DOOR_W, WALL_H - DOOR_H, 0.6, 0xffd23f);
  wall((X_MIN + X_MAX) / 2, WALL_H / 2, Z_MAX, X_MAX - X_MIN, WALL_H, 0.6);
  wall(X_MIN, WALL_H / 2, (Z_MIN + Z_MAX) / 2, 0.6, WALL_H, Z_MAX - Z_MIN, 0xb8e6ff);
  wall(X_MAX, WALL_H / 2, (Z_MIN + Z_MAX) / 2, 0.6, WALL_H, Z_MAX - Z_MIN, 0xb8e6ff);

  const gopen = labelPlane('★ GRAND OPENING ★', 9, 1.1, '#ff3b5c', '#ffffff', 70);
  gopen.position.set(DOOR_X, 6.35, Z_MIN + 0.4); scene.add(gopen);
  [-1, 1].forEach(s => [0, 1, 2].forEach(i => {
    const col = [0xff6b9a, 0xffd23f, 0x3ec9c0][i];
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), toon(col)); b.position.set(DOOR_X + s * (DOOR_W / 2 + 0.2 + i * 0.1), 3.4 + i * 0.7, Z_MIN + 1);
    const st = box(0.03, 3.4 + i * 0.7, 0.03, 0xffffff); st.position.set(b.position.x, (3.4 + i * 0.7) / 2, b.position.z); scene.add(b, st);
  }));

  // Outside world
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshBasicMaterial({ color: 0x7ed957 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(28, -0.05, -200); scene.add(grass);
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(70, 60), new THREE.MeshBasicMaterial({ color: 0x555b66 }));
  lot.rotation.x = -Math.PI / 2; lot.position.set(DOOR_X, 0.01, -40); scene.add(lot);
  for (let i = -6; i <= 6; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 7), new THREE.MeshBasicMaterial({ color: 0xffffff })); l.rotation.x = -Math.PI / 2; l.position.set(DOOR_X + i * 5, 0.02, -28); scene.add(l); }
  const road = new THREE.Mesh(new THREE.PlaneGeometry(1200, 16), new THREE.MeshBasicMaterial({ color: 0x3a3f4a }));
  road.rotation.x = -Math.PI / 2; road.position.set(28, 0.01, -90); scene.add(road);
  for (let i = 0; i < 26; i++) {
    const x = (i % 2 ? 1 : -1) * (50 + (i * 37) % 160) + 28, z = -30 - (i * 53) % 160;
    const tr = box(0.8, 3, 0.8, 0x8a5a2b); tr.position.set(x, 1.5, z);
    const top = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10), toon(0x3fbf5a)); top.position.set(x, 4.6, z); scene.add(tr, top);
  }
}

/* ---------- Shelves (instanced = fast even with thousands) ---------- */
{
  const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, ULEN - 0.05), toon(0xffffff), UNIT_COUNT * TIERS);
  const backs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 2.8, ULEN - 0.05), toon(0xffffff), UNIT_COUNT);
  const m = new THREE.Matrix4(), col = new THREE.Color(); let bi = 0, ki = 0;
  for (let u = 0; u < UNIT_COUNT; u++) {
    const { a, side, z, x } = unitInfo(u);
    col.setHSL((a * 0.083) % 1, 0.75, 0.68);
    for (let t = 0; t < TIERS; t++) { m.makeTranslation(x + side * 2.2, TIER_Y[t], z); boards.setMatrixAt(bi, m); boards.setColorAt(bi++, col); }
    m.makeTranslation(x + side * 2.65, 1.4, z); backs.setMatrixAt(ki, m); backs.setColorAt(ki++, col);
  }
  boards.frustumCulled = backs.frustumCulled = false; scene.add(boards, backs);
  for (let a = 0; a < AISLES; a++) {
    const s = labelPlane(`Aisle ${a + 1}: ${TYPE_NAMES[a % 3]}`, 3.4, 0.7, '#ffffff', '#2b1b3d', 46);
    s.position.set(cx(a), 4.2, Z0 - 2); scene.add(s);
  }
}

function unitInfo(u) {
  const a = Math.floor(u / (2 * UNITS)), r = u % (2 * UNITS), si = Math.floor(r / UNITS), k = r % UNITS;
  return { a, side: si ? 1 : -1, k, x: cx(a), z: Z0 + k * ULEN };
}

/* ---------- Items ---------- */
const lathe = pts => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 10);
const ITEM_GEO = [
  lathe([[0, 0], [0.13, 0], [0.14, 0.02], [0.14, 0.28], [0.12, 0.3], [0, 0.3]]),
  lathe([[0, 0], [0.11, 0], [0.12, 0.02], [0.12, 0.28], [0.06, 0.36], [0.06, 0.4], [0.07, 0.42], [0, 0.42]]),
  lathe([[0, 0], [0.1, 0], [0.11, 0.02], [0.11, 0.28], [0.04, 0.38], [0.04, 0.5], [0.05, 0.52], [0, 0.52]])
];
const ITEM_COLORS = [[0xff4d4d, 0x4d8bff, 0xffd23f, 0x3fd07a, 0xff9a3f], [0x7fd8ff, 0xaee9ff, 0x5fc2f0], [0x7a1f3d, 0x2f6b3a, 0x4a1d6b]];
const CAP_PER_TYPE = (AISLES / 3) * 2 * UNITS * PER;
const itemMeshes = ITEM_GEO.map(g => {
  const im = new THREE.InstancedMesh(g, toon(0xffffff), CAP_PER_TYPE); im.count = 0; im.frustumCulled = false; scene.add(im); return im;
});
const dummy = new THREE.Object3D(), tmpCol = new THREE.Color();
function placeItem(u, f) {
  const { a, side, z, x } = unitInfo(u), type = a % 3, im = itemMeshes[type];
  const tier = Math.floor(f / COLS), col = f % COLS;
  dummy.position.set(x + side * 2.1, TIER_Y[tier] + 0.04, z + (col - 1.5) * 0.38);
  dummy.rotation.y = Math.random() * 6.28; dummy.updateMatrix();
  const i = im.count++; im.setMatrixAt(i, dummy.matrix);
  const pal = ITEM_COLORS[type]; im.setColorAt(i, tmpCol.set(pal[(Math.random() * pal.length) | 0]));
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
}
for (let u = 0; u < UNIT_COUNT; u++) for (let f = 0; f < S.fill[u]; f++) placeItem(u, f);

function stockUnit(u) {
  const f = S.fill[u]; if (f >= PER) return false;
  placeItem(u, f); S.fill[u]++; S.stocked++; S.coins += stat.value;
  if (S.stocked % 100 === 0) save();
  if (S.stocked >= TOTAL) startEnding();
  return true;
}

/* ---------- Supply belts / dock ---------- */
const stations = [];
function makeStation(x, z, dock) {
  const g = new THREE.Group(); const sc = dock ? 1.8 : 1;
  const body = box(1.1, 0.5, 3.2, 0x4a505c); body.position.y = 0.25; g.add(body);
  for (let i = -7; i <= 7; i++) { const s = box(1.12, 0.52, 0.08, 0x2b2f38); s.position.set(0, 0.255, i * 0.2); g.add(s); }
  const crates = [];
  for (let i = 0; i < 3; i++) { const c = box(0.6, 0.5, 0.6, [0xc98a4b, 0xe0a85f, 0xb87333][i]); g.add(c); crates.push(c); }
  g.userData.crates = crates; g.scale.setScalar(sc); g.position.set(x, 0, z); scene.add(g);
  if (dock) {
    const s = labelPlane('DELIVERY DOCK', 3.4, 0.8, '#ffd23f', '#2b1b3d', 52); s.position.set(x, 3.2, z); scene.add(s);
  }
  stations.push({ x, z, g });
}
makeStation(-6, 3, true);
function beltPos(n) { return { x: cx(Math.floor(n / 6)), z: Z0 - 1 + (n % 6) * 26 }; }
function syncBelts() { while (stations.length - 1 < S.lv.belt) { const p = beltPos(stations.length - 1); makeStation(p.x, p.z, false); } }
syncBelts();

/* ---------- Mustache robots ---------- */
const robots = [];
function makeBotMesh() {
  const g = new THREE.Group();
  const body = box(0.7, 0.8, 0.5, 0x3ec9c0); body.position.y = 0.7; g.add(body);
  const head = box(0.6, 0.45, 0.5, 0x7be3dc); head.position.y = 1.35; g.add(head);
  [-0.14, 0.14].forEach(x => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toon(0xffffff)); e.position.set(x, 1.42, 0.24);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toon(0x111111)); p.position.set(x, 1.42, 0.32); g.add(e, p);
  });
  [-1, 1].forEach(s => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 4, 8), toon(0x4a2a12));
    m.rotation.z = Math.PI / 2 + s * 0.25; m.position.set(s * 0.14, 1.26, 0.27); g.add(m);
  });
  const ant = box(0.04, 0.3, 0.04, 0x888888); ant.position.y = 1.7; const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toon(0xff3b5c)); tip.position.y = 1.88; g.add(ant, tip);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 14), toon(0x333333)); wheel.rotation.z = Math.PI / 2; wheel.position.y = 0.22; g.add(wheel);
  return g;
}
function syncRobots() {
  while (robots.length < Math.min(S.lv.robot, 200)) {
    const mesh = makeBotMesh(); mesh.position.set(-6 + Math.random() * 2, 0, 5 + Math.random() * 2); scene.add(mesh);
    robots.push({ mesh, id: robots.length, target: -1, acc: Math.random() });
  }
}
syncRobots();
let frontier = 0;
function findIncomplete(start) { for (let i = 0; i < UNIT_COUNT; i++) { const u = (start + i) % UNIT_COUNT; if (S.fill[u] < PER) return u; } return -1; }
function updateRobot(r, dt) {
  const p = r.mesh.position;
  if (r.target < 0 || S.fill[r.target] >= PER) r.target = findIncomplete((frontier + r.id * 13) % UNIT_COUNT);
  if (r.target < 0) return;
  const { x: tx, z: tz } = unitInfo(r.target);
  let gx, gz;
  if (Math.abs(p.x - tx) > 0.3) { if (p.z > Z0 - 2.5) { gx = p.x; gz = Z0 - 3; } else { gx = tx; gz = p.z; } } else { gx = tx; gz = tz; }
  const dx = gx - p.x, dz = gz - p.z, d = Math.hypot(dx, dz), step = Math.min(d, 6 * dt * (1 + 0.04 * S.lv.caf));
  if (d > 0.001) { p.x += dx / d * step; p.z += dz / d * step; r.mesh.rotation.y = Math.atan2(dx, dz); p.y = Math.abs(Math.sin(performance.now() / 120 + r.id)) * 0.06; }
  r.acc = Math.min(2, r.acc + dt * stat.botRate);
  if (Math.abs(p.x - tx) < 0.35 && Math.abs(p.z - tz) < 0.7 && r.acc >= 1) { r.acc -= 1; stockUnit(r.target); }
}

/* ---------- Carried box (in-hand) ---------- */
const hand = box(0.5, 0.5, 0.5, 0xe0a85f); hand.position.set(0.45, -0.4, -0.8); camera.add(hand);

/* ================= PLAYER ================= */
const P = { x: -2, z: 0, yaw: 0, pitch: 0, carry: 0, act: 0 };
const keys = {}; let mouseDown = false, locked = false, shopOpen = false, ending = false;

function blocked(x, z) {
  if (x < X_MIN + 0.6 || x > X_MAX - 0.6 || z < Z_MIN + 0.6 || z > Z_MAX - 0.6) return true;
  if (z > Z0 - 1 && z < ZEND + 1 && x > cx(0) - 2.7 && x < cx(AISLES - 1) + 2.7) {
    const a = Math.round((x - 4) / SPACING);
    return !(a >= 0 && a < AISLES && Math.abs(x - cx(a)) < 1.45);
  }
  return false;
}
function nearStation() { for (const s of stations) if (Math.hypot(P.x - s.x, P.z - s.z) < (s === stations[0] ? 4.2 : 3.2)) return true; return false; }
function nearestUnit() {
  if (P.z < Z0 - 2 || P.z > ZEND + 2) return -1;
  const a = Math.round((P.x - 4) / SPACING); if (a < 0 || a >= AISLES || Math.abs(P.x - cx(a)) > 1.6) return -1;
  const fx = -Math.sin(P.yaw), k0 = Math.round((P.z - Z0) / ULEN); let best = -1, bs = 1e9;
  for (let k = k0 - 2; k <= k0 + 2; k++) {
    if (k < 0 || k >= UNITS) continue;
    for (let si = 0; si < 2; si++) {
      const side = si ? 1 : -1, u = (a * 2 + si) * UNITS + k; if (S.fill[u] >= PER) continue;
      const sc = Math.abs(Z0 + k * ULEN - P.z) + (fx * side > 0 ? 0 : 3);
      if (sc < bs) { bs = sc; best = u; }
    }
  }
  return best;
}
function doAction() {
  if (P.carry < stat.cap && nearStation()) { P.carry = Math.min(stat.cap, P.carry + 3); return true; }
  if (P.carry > 0) { const u = nearestUnit(); if (u >= 0 && stockUnit(u)) { P.carry--; return true; } }
  return false;
}

/* ================= INPUT ================= */
const $ = id => document.getElementById(id);
$('resetSave').addEventListener('click', event => {
  event.stopPropagation();
  if (confirm('Erase all saved Mustache Mart progress and restart?')) {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
});
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyE' && !e.repeat) P.act = 1;
  if (e.code === 'KeyQ' && !ending && $('start').style.display === 'none') toggleShop();
  if (e.code === 'KeyF') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('mousedown', () => { if (locked) { mouseDown = true; P.act = 1; } });
addEventListener('mouseup', () => { mouseDown = false; });
addEventListener('mousemove', e => {
  if (!locked) return;
  P.yaw -= e.movementX * 0.0022; P.pitch = Math.max(-1.4, Math.min(1.4, P.pitch - e.movementY * 0.0022));
});
$('start').addEventListener('click', () => { $('start').style.display = 'none'; renderer.domElement.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  if (!locked && !shopOpen && !ending) { $('start').style.display = 'flex'; $('start').querySelector('b').textContent = 'Click to resume'; }
});
function toggleShop() {
  shopOpen = !shopOpen; $('shop').style.display = shopOpen ? 'flex' : 'none';
  if (shopOpen) { document.exitPointerLock(); renderShop(); } else { renderer.domElement.requestPointerLock(); $('start').style.display = 'none'; }
}
$('shopClose').addEventListener('click', toggleShop);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

/* ================= SHOP ================= */
function renderShop() {
  $('shopCoins').textContent = Math.floor(S.coins).toLocaleString();
  const list = $('shopList'); list.innerHTML = '';
  UPGRADES.forEach(up => {
    const lvl = S.lv[up.id], maxed = lvl >= up.max, cost = up.cost(lvl);
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<div class="info"><b>${up.name}</b> <small>Lv ${lvl}/${up.max} — ${up.desc}</small></div>`;
    const btn = document.createElement('button'); btn.textContent = maxed ? 'MAX' : `🪙 ${cost.toLocaleString()}`;
    btn.disabled = maxed || S.coins < cost;
    btn.onclick = () => { if (S.coins >= cost && !maxed) { S.coins -= cost; S.lv[up.id]++; recompute(); syncBelts(); syncRobots(); renderShop(); save(); } };
    row.appendChild(btn); list.appendChild(row);
  });
}
setInterval(() => { if (shopOpen) renderShop(); }, 400);

/* ================= SAVE ================= */
function save() { if (ending) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ coins: S.coins, lv: S.lv, fill: Array.from(S.fill) })); } catch (e) {} }
setInterval(save, 5000); addEventListener('beforeunload', save);

/* ================= ENDING ================= */
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe066, fog: false }));
const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(11, 24, 16), new THREE.MeshBasicMaterial({ color: 0xeef2ff, fog: false }));
sunMesh.visible = moonMesh.visible = false; scene.add(sunMesh, moonMesh);
const starGeo = new THREE.BufferGeometry(), sp = [];
for (let i = 0; i < 400; i++) { const th = Math.random() * 6.28, ph = Math.random() * 1.3; sp.push(28 + Math.cos(th) * 900 * Math.cos(ph), 900 * Math.sin(ph) + 20, -Math.abs(Math.sin(th)) * 900 * Math.cos(ph) - 50); }
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, fog: false })); scene.add(stars);

let endT = 0, endRunning = false, endDone = false;
const dayLen = i => FIRST_DAY_SECONDS * DAY_SPEEDUP ** i;
function startEnding() {
  if (ending) return; ending = true; shopOpen = false; $('shop').style.display = 'none'; document.exitPointerLock(); $('start').style.display = 'none';
  $('fade').style.opacity = 1;
  setTimeout(() => {
    $('hud').style.display = 'none'; hand.visible = false; robots.forEach(r => (r.mesh.visible = false));
    camera.position.set(DOOR_X, 1.7, Z_MIN + 7); camera.rotation.set(0.05, 0, 0);
    $('endHud').style.display = 'block'; endRunning = true; $('fade').style.opacity = 0;
  }, 1100);
}
if (location.hash === '#ending') startEnding();

function updateEnding(dt) {
  if (!endRunning || endDone) return;
  endT += dt; let i = 0, t = endT;
  while (i < DAYS && t >= dayLen(i)) { t -= dayLen(i); i++; }
  if (i >= DAYS) {
    endDone = true; sunMesh.visible = moonMesh.visible = false; scene.background.copy(SKY_NIGHT); scene.fog.color.copy(SKY_NIGHT); stars.material.opacity = 1;
    $('endHud').style.display = 'none'; $('bank').style.display = 'flex'; requestAnimationFrame(() => requestAnimationFrame(() => $('bank').classList.add('show'))); return;
  }
  $('dayTxt').textContent = `Day ${i + 1}`;
  const u = t / dayLen(i); let h = 0;
  sunMesh.visible = moonMesh.visible = false;
  const arc = (v, m) => { const th = Math.PI - v * Math.PI; m.position.set(DOOR_X + Math.cos(th) * 190, Math.sin(th) * 130 - 6, -300); m.visible = true; return Math.sin(th); };
  if (u < 0.65) h = arc(u / 0.65, sunMesh); else arc((u - 0.65) / 0.35, moonMesh);
  const day = Math.min(1, Math.max(0, h * 2.5));
  const sky = SKY_NIGHT.clone().lerp(SKY_DAY, day);
  if (h > 0 && h < 0.35) sky.lerp(SKY_DAWN, (0.35 - h) / 0.35 * 0.7);
  scene.background.copy(sky); scene.fog.color.copy(sky);
  stars.material.opacity = 1 - day; hemi.intensity = 0.45 + 0.55 * day; sunLight.intensity = 0.15 + 0.75 * day;
}

/* ================= MAIN LOOP ================= */
const fwd = new THREE.Vector3(); let last = performance.now(), tBelt = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; tBelt += dt;

  while (frontier < UNIT_COUNT && S.fill[frontier] >= PER) frontier++;
  if (!ending) robots.forEach(r => updateRobot(r, dt));
  if (S.lv.robot > robots.length) { /* extra bots beyond 200 still work, invisibly */
    const extra = S.lv.robot - robots.length; hiddenAcc = (typeof hiddenAcc === 'number' ? hiddenAcc : 0) + dt * stat.botRate * extra;
    while (hiddenAcc >= 1) { hiddenAcc -= 1; const u = findIncomplete(frontier); if (u >= 0) stockUnit(u); else break; }
  }
  stations.forEach(s => s.g.userData.crates.forEach((c, i) => { c.position.set(0, 0.75, ((tBelt * 0.8 + i * 1.07) % 3) - 1.5); }));

  if (!ending && locked) {
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    if (f || s) {
      const sp = stat.speed * (keys.ShiftLeft ? 1.5 : 1) * dt / Math.hypot(f, s);
      const dx = (-Math.sin(P.yaw) * f + Math.cos(P.yaw) * s) * sp, dz = (-Math.cos(P.yaw) * f - Math.sin(P.yaw) * s) * sp;
      if (!blocked(P.x + dx, P.z)) P.x += dx; if (!blocked(P.x, P.z + dz)) P.z += dz;
    }
    if (keys.KeyE || mouseDown) {
      P.act += dt * stat.rate * (nearStation() && P.carry < stat.cap ? 3 : 1);
      while (P.act >= 1) { if (doAction()) P.act -= 1; else { P.act = 0; break; } }
    } else P.act = 0;
  }
  if (!ending) {
    camera.position.set(P.x, 1.7, P.z); camera.rotation.set(P.pitch, P.yaw, 0);
    hand.scale.setScalar(0.3 + 0.7 * (P.carry / stat.cap)); hand.visible = P.carry > 0;
    $('coins').textContent = Math.floor(S.coins).toLocaleString(); $('carry').textContent = P.carry; $('cap').textContent = stat.cap; $('bots').textContent = S.lv.robot;
    $('objective').textContent = S.stocked === 0
      ? 'FIRST SHIFT · Find the yellow DELIVERY DOCK, hold E to fill your box.'
      : S.stocked < 12
        ? 'FIRST SHIFT · Carry boxes to the colorful aisles and hold E to stock.'
        : S.stocked < 100
          ? 'FIRST SHIFT · Press Q to invest your coins in faster stocking.'
          : 'OPENING PREP · No empty shelves allowed. Every single item counts.';
    const pc = S.stocked / TOTAL * 100; $('barFill').style.width = pc + '%'; $('barTxt').textContent = `Stocked ${S.stocked.toLocaleString()} / ${TOTAL.toLocaleString()} (${pc.toFixed(1)}%)`;
    const pr = $('prompt'); let msg = '';
    if (P.carry < stat.cap && nearStation()) msg = 'Hold E: grab stock 📦';
    else if (P.carry > 0 && nearestUnit() >= 0) msg = 'Hold E: stock the shelf 🪙';
    else if (P.carry === 0) msg = 'Out of stock! Find a delivery belt 🛞';
    pr.style.display = msg ? 'block' : 'none'; pr.textContent = msg;
  }
  updateEnding(dt);
  renderer.render(scene, camera);
}
let hiddenAcc = 0;
requestAnimationFrame(frame);
