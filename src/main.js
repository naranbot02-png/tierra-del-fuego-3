import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';

const $hp = document.getElementById('hp');
const $ammo = document.getElementById('ammo');
const $tip = document.getElementById('tip');
const $missionStatus = document.getElementById('missionStatus');
const $missionObjective = document.getElementById('missionObjective');
const $missionTimer = document.getElementById('missionTimer');
const $missionFeed = document.getElementById('missionFeed');
const $missionMini = document.getElementById('missionMini');
const $missionMiniLabel = document.getElementById('missionMiniLabel');
const $missionMiniFill = document.getElementById('missionMiniFill');

const $movePad = document.getElementById('movePad');
const $moveStick = document.getElementById('moveStick');
const $lookPad = document.getElementById('lookPad');
const $lookStick = document.getElementById('lookStick');
const $btnFire = document.getElementById('btnFire');
const $btnJump = document.getElementById('btnJump');
const $btnLayout = document.getElementById('btnLayout');
const $btnHand = document.getElementById('btnHand');
const $btnLook = document.getElementById('btnLook');
const $btnRestart = document.getElementById('btnRestart');
const $extractIndicator = document.getElementById('extractIndicator');
const $extractArrow = document.getElementById('extractArrow');
const $extractLabel = document.getElementById('extractLabel');

const isTouch = matchMedia('(pointer: coarse)').matches;
const MOBILE_MAX_DPR = 1.25; // perf guard for webviews/phones
const DESKTOP_MAX_DPR = 2;

// --- Renderer / Scene / Camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? MOBILE_MAX_DPR : DESKTOP_MAX_DPR));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1220);
scene.fog = new THREE.Fog(0x0b1220, 18, 120);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 250);

// --- Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xdbeafe, 1.35);
sun.position.set(10, 18, 6);
scene.add(sun);

// --- World
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1.0 });
const iceMat = new THREE.MeshStandardMaterial({ color: 0x25314f, roughness: 0.8, metalness: 0.05 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.55, metalness: 0.35 });
const lightMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.1, emissive: 0x0b1220, emissiveIntensity: 0.35 });

const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const staticColliders = [];

function registerBoxCollider(x, y, z, w, h, d, tag = 'solid') {
  staticColliders.push({
    tag,
    minX: x - w / 2,
    maxX: x + w / 2,
    minY: y - h / 2,
    maxY: y + h / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
  });
}

function addBox(x, y, z, w, h, d, mat, opts = {}) {
  const { solid = false, colliderTag = 'solid' } = opts;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  scene.add(m);

  if (solid) {
    registerBoxCollider(x, y, z, w, h, d, colliderTag);
  }

  return m;
}

function addWall(x, y, z, w, h, d, mat) {
  return addBox(x, y, z, w, h, d, mat, { solid: true, colliderTag: 'wall' });
}

addWall(0, 1.2, 2, 30, 2.4, 1.0, metalMat);
addWall(8, 1.2, 9, 1.0, 2.4, 14, metalMat);
addWall(-10, 1.2, 13, 18, 2.4, 1.0, metalMat);
addWall(-18, 1.2, 2, 1.0, 2.4, 28, metalMat);
addWall(10, 1.2, -6, 28, 2.4, 1.0, metalMat);

addBox(
  0,
  3.0,
  24,
  10,
  6.0,
  10,
  new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.55, metalness: 0.15, emissive: 0x0ea5e9, emissiveIntensity: 0.45 }),
  { solid: true, colliderTag: 'beacon-base' }
);
const beacon = new THREE.Mesh(
  new THREE.SphereGeometry(0.9, 18, 12),
  new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x67e8f9, emissiveIntensity: 1.6 })
);
beacon.position.set(0, 4.5, 24);
scene.add(beacon);
const beaconLight = new THREE.PointLight(0x67e8f9, 2.5, 45, 2);
beaconLight.position.copy(beacon.position);
scene.add(beaconLight);

const EXTRACTION_POINT = new THREE.Vector2(beacon.position.x, beacon.position.z);
const EXTRACTION_RADIUS = 6.5;
const EXTRACTION_RING_INNER_RADIUS = 5.4;
const EXTRACTION_RING_OUTER_RADIUS = 6.3;
const extractionZone = new THREE.Mesh(
  new THREE.RingGeometry(EXTRACTION_RING_INNER_RADIUS, EXTRACTION_RING_OUTER_RADIUS, 56),
  new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  })
);
extractionZone.rotation.x = -Math.PI / 2;
extractionZone.position.set(beacon.position.x, 0.05, beacon.position.z);
extractionZone.visible = false;
scene.add(extractionZone);

for (let i=0;i<12;i++){
  const x = (Math.random()*2-1) * 60;
  const z = (Math.random()*2-1) * 60;
  const s = 4 + Math.random()*10;
  const ice = new THREE.Mesh(new THREE.CircleGeometry(s, 24), iceMat);
  ice.rotation.x = -Math.PI/2;
  ice.position.set(x, 0.01, z);
  scene.add(ice);
}

for (let i=0;i<6;i++){
  const lx = -14 + i*6;
  addBox(lx, 2.0, -14, 0.2, 4.0, 0.2, metalMat);
  addBox(lx, 4.1, -14, 0.8, 0.35, 0.8, lightMat);
  const pt = new THREE.PointLight(0xa5f3fc, 0.8, 18, 2);
  pt.position.set(lx, 4.1, -14);
  scene.add(pt);
}

// --- Player controller
const SPAWN_POS = new THREE.Vector3(-6, 1.7, 12);
const state = {
  hp: 100,
  pos: SPAWN_POS.clone(),
  velY: 0,
  yaw: 0,
  pitch: 0.18,
  onGround: false,
  fire: false,
};

const mission = {
  targetKills: 3,
  kills: 0,
  timeLimit: 75,
  timeLeft: 75,
  phase: 'prep', // prep | playing | result
  result: null, // win | lose | null
  prepDuration: 2.8,
  prepLeft: 2.8,
  extractionRadius: EXTRACTION_RADIUS,
  extractionDuration: 2.6,
  extractionProgress: 0,
  extractionReady: false,
  extractionInside: false,
};

const feedbackFlags = {
  warned30: false,
  warned15: false,
  warnedLowHp: false,
  warnedThreat2: false,
  warnedThreat3: false,
};

const THREAT_LEVELS = [
  { id: 1, label: 'I', minTimeRatio: 0.66, moveMul: 1.0, damage: 8, hitCooldown: 0.8 },
  { id: 2, label: 'II', minTimeRatio: 0.33, moveMul: 1.22, damage: 10, hitCooldown: 0.68 },
  { id: 3, label: 'III', minTimeRatio: 0.0, moveMul: 1.4, damage: 12, hitCooldown: 0.56 },
];

function getThreatLevel() {
  if (mission.phase !== 'playing') return THREAT_LEVELS[0];
  const ratio = mission.timeLeft / mission.timeLimit;
  if (ratio > THREAT_LEVELS[0].minTimeRatio) return THREAT_LEVELS[0];
  if (ratio > THREAT_LEVELS[1].minTimeRatio) return THREAT_LEVELS[1];
  return THREAT_LEVELS[2];
}

function wrapAngle(rad) {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

{
  const toX = 0 - state.pos.x;
  const toZ = 24 - state.pos.z;
  state.yaw = Math.atan2(toX, toZ);
}

const keys = new Set();

// --- Minimal WebAudio SFX (no external assets)
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}
function beep({ freq = 440, duration = 0.08, type = 'sine', gain = 0.03, freqTo = null }) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function sfxShot() { beep({ freq: 220, freqTo: 120, duration: 0.045, type: 'square', gain: 0.025 }); }
function sfxHit() { beep({ freq: 880, duration: 0.04, type: 'triangle', gain: 0.03 }); }
function sfxKill() {
  beep({ freq: 540, duration: 0.05, type: 'sawtooth', gain: 0.03 });
  setTimeout(() => beep({ freq: 740, duration: 0.06, type: 'triangle', gain: 0.028 }), 30);
}
function sfxDamage() { beep({ freq: 160, duration: 0.08, type: 'square', gain: 0.03 }); }
function sfxStart() {
  beep({ freq: 620, duration: 0.05, type: 'triangle', gain: 0.028 });
  setTimeout(() => beep({ freq: 820, duration: 0.06, type: 'triangle', gain: 0.028 }), 45);
}
function sfxWin() {
  beep({ freq: 660, duration: 0.08, type: 'triangle', gain: 0.03 });
  setTimeout(() => beep({ freq: 880, duration: 0.09, type: 'triangle', gain: 0.03 }), 70);
  setTimeout(() => beep({ freq: 1180, duration: 0.12, type: 'triangle', gain: 0.03 }), 160);
}
function sfxLose() {
  beep({ freq: 320, duration: 0.08, type: 'sawtooth', gain: 0.03 });
  setTimeout(() => beep({ freq: 220, duration: 0.11, type: 'sawtooth', gain: 0.03 }), 75);
}

addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyR') {
    e.preventDefault();
    resetMission(true);
  }
  ensureAudio();
});
addEventListener('keyup', (e) => keys.delete(e.code));

// Touch controls
const touch = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  jump: false,
};

const LOOK_PRESETS = [
  { id: 'precise', label: 'Precisa', sens: 1.2 },
  { id: 'normal', label: 'Normal', sens: 1.65 },
  { id: 'fast', label: 'Rápida', sens: 2.05 },
];
let mobileLookPreset = 'normal';
let mobileLookSens = 1.65;
const MOBILE_LOOK_DEADZONE = 0.18;

function applyDeadzone(v, dz) {
  const a = Math.abs(v);
  if (a <= dz) return 0;
  return Math.sign(v) * ((a - dz) / (1 - dz));
}

function applyLayout(mode) {
  const compact = mode === 'compact';
  document.body.classList.toggle('layout-compact', compact);
  if ($btnLayout) $btnLayout.textContent = `Layout: ${compact ? 'Compacto' : 'Cómodo'}`;
  try { localStorage.setItem('tdf3_layout', compact ? 'compact' : 'comfortable'); } catch {}
}

function initLayoutControl() {
  let mode = 'comfortable';
  try { mode = localStorage.getItem('tdf3_layout') || 'comfortable'; } catch {}
  applyLayout(mode);
  if ($btnLayout) {
    $btnLayout.addEventListener('click', (e) => {
      e.preventDefault();
      const next = document.body.classList.contains('layout-compact') ? 'comfortable' : 'compact';
      applyLayout(next);
    });
  }
}

function applyHandMode(mode) {
  const lefty = mode === 'left';
  document.body.classList.toggle('layout-lefty', lefty);
  if ($btnHand) $btnHand.textContent = `Mano: ${lefty ? 'Izquierda' : 'Derecha'}`;
  try { localStorage.setItem('tdf3_hand', lefty ? 'left' : 'right'); } catch {}
}

function initHandControl() {
  let mode = 'right';
  try { mode = localStorage.getItem('tdf3_hand') || 'right'; } catch {}
  applyHandMode(mode);
  if ($btnHand) {
    $btnHand.addEventListener('click', (e) => {
      e.preventDefault();
      const next = document.body.classList.contains('layout-lefty') ? 'right' : 'left';
      applyHandMode(next);
    });
  }
}

function applyLookPreset(presetId) {
  const preset = LOOK_PRESETS.find((p) => p.id === presetId) || LOOK_PRESETS[1];
  mobileLookPreset = preset.id;
  mobileLookSens = preset.sens;
  if ($btnLook) $btnLook.textContent = `Mira: ${preset.label}`;
  try { localStorage.setItem('tdf3_look', preset.id); } catch {}
}

function initLookControl() {
  let preset = 'normal';
  try { preset = localStorage.getItem('tdf3_look') || 'normal'; } catch {}
  applyLookPreset(preset);
  if ($btnLook) {
    $btnLook.addEventListener('click', (e) => {
      e.preventDefault();
      const currentIdx = LOOK_PRESETS.findIndex((p) => p.id === mobileLookPreset);
      const nextIdx = (currentIdx + 1) % LOOK_PRESETS.length;
      applyLookPreset(LOOK_PRESETS[nextIdx].id);
    });
  }
}

function setupPad(padEl, stickEl, onMove){
  if (!padEl) return;
  const hasPointer = ('PointerEvent' in window) && !isTouch;
  let pid = null;
  let touchActive = false;
  let touchId = null;
  let center = {x:0,y:0};
  const max = 52;

  const setStick = (dx, dy) => {
    const len = Math.hypot(dx, dy);
    const k = len > max ? (max / len) : 1;
    const sx = dx * k;
    const sy = dy * k;
    if (stickEl) stickEl.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
    onMove(sx / max, sy / max);
  };

  const reset = () => {
    pid = null;
    touchActive = false;
    touchId = null;
    if (stickEl) stickEl.style.transform = 'translate(-50%, -50%)';
    onMove(0,0);
  };

  const refreshCenter = () => {
    const r = padEl.getBoundingClientRect();
    center = { x: r.left + r.width/2, y: r.top + r.height/2 };
  };

  if (hasPointer) {
    padEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pid = e.pointerId;
      padEl.setPointerCapture?.(pid);
      refreshCenter();
      setStick(e.clientX - center.x, e.clientY - center.y);
      ensureAudio();
    });
    padEl.addEventListener('pointermove', (e) => {
      if (pid !== e.pointerId) return;
      e.preventDefault();
      setStick(e.clientX - center.x, e.clientY - center.y);
    });
    padEl.addEventListener('pointerup', (e) => {
      if (pid !== e.pointerId) return;
      e.preventDefault();
      reset();
    });
    padEl.addEventListener('pointercancel', () => reset());
    return;
  }

  const findTouchById = (list, id) => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  };

  padEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!touchActive) {
      const t = e.changedTouches[0];
      if (!t) return;
      touchActive = true;
      touchId = t.identifier;
      refreshCenter();
      setStick(t.clientX - center.x, t.clientY - center.y);
      ensureAudio();
    }
  }, { passive: false });

  padEl.addEventListener('touchmove', (e) => {
    if (!touchActive || touchId == null) return;
    e.preventDefault();
    const t = findTouchById(e.touches, touchId) || findTouchById(e.changedTouches, touchId);
    if (!t) return;
    setStick(t.clientX - center.x, t.clientY - center.y);
  }, { passive: false });

  padEl.addEventListener('touchend', (e) => {
    if (!touchActive || touchId == null) return;
    const ended = findTouchById(e.changedTouches, touchId);
    if (!ended) return;
    e.preventDefault();
    reset();
  }, { passive: false });

  padEl.addEventListener('touchcancel', (e) => {
    if (!touchActive || touchId == null) return;
    const cancelled = findTouchById(e.changedTouches, touchId);
    if (!cancelled) return;
    e.preventDefault();
    reset();
  }, { passive: false });
}

setupPad($movePad, $moveStick, (x,y) => {
  touch.moveX = x;
  touch.moveY = y;
});
setupPad($lookPad, $lookStick, (x,y) => {
  touch.lookX = applyDeadzone(x, MOBILE_LOOK_DEADZONE);
  touch.lookY = applyDeadzone(y, MOBILE_LOOK_DEADZONE);
});

if ($btnFire) {
  const hasPointer = ('PointerEvent' in window) && !isTouch;
  const down = (e) => { e.preventDefault(); state.fire = true; ensureAudio(); };
  const up = (e) => { e.preventDefault(); state.fire = false; };
  if (hasPointer) {
    $btnFire.addEventListener('pointerdown', down);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  } else {
    $btnFire.addEventListener('touchstart', down, { passive: false });
    $btnFire.addEventListener('touchend', up, { passive: false });
    $btnFire.addEventListener('touchcancel', up, { passive: false });
  }
}
if ($btnJump) {
  const hasPointer = ('PointerEvent' in window) && !isTouch;
  const down = (e) => { e.preventDefault(); touch.jump = true; ensureAudio(); };
  const up = (e) => { e.preventDefault(); touch.jump = false; };
  if (hasPointer) {
    $btnJump.addEventListener('pointerdown', down);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  } else {
    $btnJump.addEventListener('touchstart', down, { passive: false });
    $btnJump.addEventListener('touchend', up, { passive: false });
    $btnJump.addEventListener('touchcancel', up, { passive: false });
  }
}
if ($btnRestart) {
  const hasPointer = ('PointerEvent' in window) && !isTouch;
  const restartDown = (e) => { e.preventDefault(); resetMission(true); ensureAudio(); };
  if (hasPointer) {
    $btnRestart.addEventListener('pointerdown', restartDown);
  } else {
    $btnRestart.addEventListener('touchstart', restartDown, { passive: false });
  }
}

// Pointer lock on desktop
let pointerLocked = false;
if (!isTouch) {
  renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock?.();
    ensureAudio();
  });
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === renderer.domElement;
    if ($tip) $tip.style.display = pointerLocked ? 'none' : 'block';
  });
  addEventListener('mousemove', (e) => {
    if (!pointerLocked) return;
    state.yaw -= e.movementX * 0.002;
    state.pitch -= e.movementY * 0.002;
    state.pitch = Math.max(-1.25, Math.min(1.0, state.pitch));
  });
}

const crosshair = new THREE.Mesh(
  new THREE.RingGeometry(0.012, 0.02, 16),
  new THREE.MeshBasicMaterial({ color: 0xe5e7eb, transparent: true, opacity: 0.85 })
);
crosshair.position.set(0, 0, -0.6);
camera.add(crosshair);
scene.add(camera);

const raycaster = new THREE.Raycaster();
let lastShot = 0;
let recoilKick = 0;
let hitMarkerUntil = 0;
let shotPulseUntil = 0;
let muzzleFlashUntil = 0;
let shakeUntil = 0;
let lastDamageAt = 0;

const hitMarker = document.createElement('div');
hitMarker.style.position = 'fixed';
hitMarker.style.left = '50%';
hitMarker.style.top = '50%';
hitMarker.style.width = '26px';
hitMarker.style.height = '26px';
hitMarker.style.transform = 'translate(-50%, -50%)';
hitMarker.style.pointerEvents = 'none';
hitMarker.style.zIndex = '25';
hitMarker.style.opacity = '0';
hitMarker.style.transition = 'opacity 50ms linear';
hitMarker.innerHTML = '<svg viewBox="0 0 100 100" width="26" height="26"><path d="M8 8 L32 32 M92 8 L68 32 M8 92 L32 68 M92 92 L68 68" stroke="#f8fafc" stroke-width="8" stroke-linecap="round"/></svg>';
document.body.appendChild(hitMarker);

const muzzleFlash = document.createElement('div');
muzzleFlash.style.position = 'fixed';
muzzleFlash.style.inset = '0';
muzzleFlash.style.pointerEvents = 'none';
muzzleFlash.style.zIndex = '24';
muzzleFlash.style.opacity = '0';
muzzleFlash.style.background = 'radial-gradient(circle at 50% 52%, rgba(251,191,36,0.28) 0%, rgba(251,191,36,0.14) 12%, rgba(0,0,0,0) 38%)';
document.body.appendChild(muzzleFlash);

const damageOverlay = document.createElement('div');
damageOverlay.style.position = 'fixed';
damageOverlay.style.inset = '0';
damageOverlay.style.pointerEvents = 'none';
damageOverlay.style.zIndex = '23';
damageOverlay.style.opacity = '0';
damageOverlay.style.background = 'radial-gradient(circle at 50% 50%, rgba(220,38,38,0) 45%, rgba(220,38,38,0.35) 100%)';
document.body.appendChild(damageOverlay);

const enemies = [];
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.55, metalness: 0.25, emissive: 0x220808, emissiveIntensity: 0.35 });
function spawnEnemy(x,z){
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), enemyMat);
  body.position.set(x, 1.4, z);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfef3c7, emissiveIntensity: 0.35 }));
  eye.position.set(0, 0.05, 0.42);
  body.add(eye);
  scene.add(body);
  enemies.push({ mesh: body, hp: 3, dead: false, base: new THREE.Vector3(x,1.4,z), spawn: new THREE.Vector3(x,1.4,z), t: Math.random()*10, hitCd: 0 });
}
spawnEnemy(4, -2);
spawnEnemy(-6, -8);
spawnEnemy(6, 8);
mission.targetKills = enemies.length;

function resetEnemies() {
  for (const e of enemies) {
    e.hp = 3;
    e.dead = false;
    e.t = Math.random() * 10;
    e.hitCd = 0;
    e.mesh.scale.setScalar(1);
    e.mesh.position.copy(e.spawn);
  }
}

function updateEnemies(dt){
  const threat = getThreatLevel();
  for (const e of enemies){
    if (e.hp <= 0) continue;
    e.t += dt * threat.moveMul;
    e.hitCd = Math.max(0, e.hitCd - dt);
    e.mesh.position.x = e.base.x + Math.sin(e.t*0.8)*1.3;
    e.mesh.position.z = e.base.z + Math.cos(e.t*0.7)*1.3;
    e.mesh.lookAt(state.pos.x, 1.4, state.pos.z);

    const dist = e.mesh.position.distanceTo(state.pos);
    if (dist < 1.9 && e.hitCd <= 0 && mission.phase === 'playing') {
      state.hp = Math.max(0, state.hp - threat.damage);
      e.hitCd = threat.hitCooldown;
      lastDamageAt = performance.now();
      sfxDamage();
      if (isTouch && navigator.vibrate) navigator.vibrate(12);
    }
  }
}

function doShoot(now){
  if (now - lastShot < 130) return;
  lastShot = now;
  recoilKick = Math.min(recoilKick + 0.035, 0.09);
  shotPulseUntil = now + 80;
  muzzleFlashUntil = now + 45;
  sfxShot();

  raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
  const meshes = enemies.filter(e => e.hp>0).map(e => e.mesh);
  const hits = raycaster.intersectObjects(meshes, true);
  if (hits.length){
    let obj = hits[0].object;
    while (obj.parent && !meshes.includes(obj)) obj = obj.parent;
    const enemy = enemies.find(e => e.mesh === obj);
    if (enemy){
      enemy.hp -= 1;
      hitMarkerUntil = now + 110;
      shakeUntil = now + 90;
      sfxHit();
      enemy.mesh.material.emissiveIntensity = 1.1;
      setTimeout(() => { try{ enemy.mesh.material.emissiveIntensity = 0.35; } catch{} }, 60);
      if (enemy.hp <= 0 && !enemy.dead){
        enemy.dead = true;
        mission.kills += 1;
        enemy.mesh.scale.setScalar(0.001);
        sfxKill();
      }
    }
  }
}

const story = [
  'Río Grande, TDF. La tormenta cortó la comunicación con la base.',
  'Eliminá drones hostiles y extraé en el faro. La amenaza sube con el tiempo.',
];
let storyIdx = 0;
function showStory(){
  if (!$tip) return;
  $tip.textContent = story[storyIdx] + ' (tap/click)';
  $tip.style.display = 'block';
}
showStory();
initLayoutControl();
initHandControl();
initLookControl();
addEventListener('click', () => { if (isTouch) { $tip && ($tip.style.display = 'none'); } });
addEventListener('touchstart', () => { $tip && ($tip.style.display = 'none'); ensureAudio(); }, { passive: true });

const GRAV = -18;
const JUMP = 7.2;
const PLAYER_RADIUS = 0.38;
const PLAYER_EYE_HEIGHT = 1.7;
const PLAYER_BODY_HEIGHT = 1.72;
const WORLD_LIMIT = 80;
const COLLISION_SKIN = 0.002;
const COLLISION_SWEEP_EPS = 0.0001;
const COLLISION_AXIS_EPS = 1e-8;
const COLLISION_MAX_SLIDES = 4;

const tempForward = new THREE.Vector3();
const tempRight = new THREE.Vector3();

function colliderOverlapsPlayerHeight(collider) {
  const feetY = state.pos.y - PLAYER_EYE_HEIGHT;
  const headY = feetY + PLAYER_BODY_HEIGHT;
  return headY > collider.minY && feetY < collider.maxY;
}

function resolveCollidersOverlap() {
  for (let pass = 0; pass < COLLISION_MAX_SLIDES; pass++) {
    let separated = true;

    for (const collider of staticColliders) {
      if (!colliderOverlapsPlayerHeight(collider)) continue;

      const minX = collider.minX - PLAYER_RADIUS;
      const maxX = collider.maxX + PLAYER_RADIUS;
      const minZ = collider.minZ - PLAYER_RADIUS;
      const maxZ = collider.maxZ + PLAYER_RADIUS;

      if (state.pos.x <= minX || state.pos.x >= maxX || state.pos.z <= minZ || state.pos.z >= maxZ) continue;

      separated = false;

      const pushLeft = Math.abs(state.pos.x - minX);
      const pushRight = Math.abs(maxX - state.pos.x);
      const pushBack = Math.abs(state.pos.z - minZ);
      const pushFront = Math.abs(maxZ - state.pos.z);

      if (pushLeft <= pushRight && pushLeft <= pushBack && pushLeft <= pushFront) {
        state.pos.x = minX - COLLISION_SKIN;
      } else if (pushRight <= pushBack && pushRight <= pushFront) {
        state.pos.x = maxX + COLLISION_SKIN;
      } else if (pushBack <= pushFront) {
        state.pos.z = minZ - COLLISION_SKIN;
      } else {
        state.pos.z = maxZ + COLLISION_SKIN;
      }
    }

    if (separated) break;
  }
}

function sweepPointAgainstExpandedAabb(startX, startZ, moveX, moveZ, minX, maxX, minZ, maxZ) {
  let tEnter = 0;
  let tExit = 1;
  let normalX = 0;
  let normalZ = 0;

  if (Math.abs(moveX) < COLLISION_AXIS_EPS) {
    if (startX <= minX || startX >= maxX) return null;
  } else {
    let t1 = (minX - startX) / moveX;
    let t2 = (maxX - startX) / moveX;
    let enterNormalX = -1;

    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      enterNormalX = 1;
    }

    if (t1 > tEnter) {
      tEnter = t1;
      normalX = enterNormalX;
      normalZ = 0;
    }

    tExit = Math.min(tExit, t2);
    if (tEnter > tExit) return null;
  }

  if (Math.abs(moveZ) < COLLISION_AXIS_EPS) {
    if (startZ <= minZ || startZ >= maxZ) return null;
  } else {
    let t1 = (minZ - startZ) / moveZ;
    let t2 = (maxZ - startZ) / moveZ;
    let enterNormalZ = -1;

    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      enterNormalZ = 1;
    }

    if (t1 > tEnter) {
      tEnter = t1;
      normalX = 0;
      normalZ = enterNormalZ;
    }

    tExit = Math.min(tExit, t2);
    if (tEnter > tExit) return null;
  }

  if (tEnter < 0 || tEnter > 1) return null;

  return { t: tEnter, normalX, normalZ };
}

function findEarliestCollision(startX, startZ, moveX, moveZ) {
  let earliest = null;

  for (const collider of staticColliders) {
    if (!colliderOverlapsPlayerHeight(collider)) continue;

    const minX = collider.minX - PLAYER_RADIUS;
    const maxX = collider.maxX + PLAYER_RADIUS;
    const minZ = collider.minZ - PLAYER_RADIUS;
    const maxZ = collider.maxZ + PLAYER_RADIUS;

    const hit = sweepPointAgainstExpandedAabb(startX, startZ, moveX, moveZ, minX, maxX, minZ, maxZ);
    if (!hit) continue;

    if (!earliest || hit.t < earliest.t) {
      earliest = hit;
    }
  }

  return earliest;
}

function movePlayerWithCollisions(dx, dz) {
  resolveCollidersOverlap();

  let remainingX = dx;
  let remainingZ = dz;

  for (let i = 0; i < COLLISION_MAX_SLIDES; i++) {
    const travel = Math.hypot(remainingX, remainingZ);
    if (travel <= COLLISION_AXIS_EPS) break;

    const hit = findEarliestCollision(state.pos.x, state.pos.z, remainingX, remainingZ);

    if (!hit) {
      state.pos.x += remainingX;
      state.pos.z += remainingZ;
      break;
    }

    const moveT = Math.max(0, hit.t - COLLISION_SWEEP_EPS);
    state.pos.x += remainingX * moveT;
    state.pos.z += remainingZ * moveT;

    const remainderScale = Math.max(0, 1 - moveT);
    let slideX = remainingX * remainderScale;
    let slideZ = remainingZ * remainderScale;

    const intoWall = slideX * hit.normalX + slideZ * hit.normalZ;
    if (intoWall < 0) {
      slideX -= hit.normalX * intoWall;
      slideZ -= hit.normalZ * intoWall;
    }

    state.pos.x += hit.normalX * COLLISION_SKIN;
    state.pos.z += hit.normalZ * COLLISION_SKIN;

    remainingX = slideX;
    remainingZ = slideZ;
  }

  state.pos.x = THREE.MathUtils.clamp(state.pos.x, -WORLD_LIMIT + PLAYER_RADIUS, WORLD_LIMIT - PLAYER_RADIUS);
  state.pos.z = THREE.MathUtils.clamp(state.pos.z, -WORLD_LIMIT + PLAYER_RADIUS, WORLD_LIMIT - PLAYER_RADIUS);

  resolveCollidersOverlap();
}

function setHudPhaseVisuals() {
  if (!$missionStatus) return;
  const phase = mission.phase;
  $missionStatus.classList.remove('mission-prep', 'mission-live', 'mission-win', 'mission-lose');
  if (phase === 'prep') $missionStatus.classList.add('mission-prep');
  if (phase === 'playing') $missionStatus.classList.add('mission-live');
  if (phase === 'result' && mission.result === 'win') $missionStatus.classList.add('mission-win');
  if (phase === 'result' && mission.result === 'lose') $missionStatus.classList.add('mission-lose');
}

function updateMissionMini() {
  if (!$missionMini || !$missionMiniLabel || !$missionMiniFill) return;

  let label = 'Objetivo';
  let progress = 0;
  let tone = 'neutral';

  if (mission.phase === 'prep') {
    label = `Inicio en ${Math.ceil(mission.prepLeft)}s`;
    progress = 1 - (mission.prepLeft / mission.prepDuration);
    tone = 'neutral';
  } else if (mission.phase === 'playing' && !mission.extractionReady) {
    label = `Drones ${mission.kills}/${mission.targetKills}`;
    progress = mission.targetKills > 0 ? (mission.kills / mission.targetKills) : 0;
    tone = 'combat';
  } else if (mission.phase === 'playing' && mission.extractionReady) {
    const extractionPct = Math.round((mission.extractionProgress / mission.extractionDuration) * 100);
    label = mission.extractionInside ? `Extracción ${extractionPct}%` : `Faro ${extractionPct}%`;
    progress = mission.extractionProgress / mission.extractionDuration;
    tone = 'extract';
  } else if (mission.result === 'win') {
    label = 'Misión completada';
    progress = 1;
    tone = 'win';
  } else {
    label = 'Misión fallida';
    progress = 0.04;
    tone = 'danger';
  }

  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
  $missionMini.dataset.tone = tone;
  $missionMiniLabel.textContent = label;
  $missionMiniFill.style.width = `${Math.round(clampedProgress * 100)}%`;
}

function resetMission(manual = false) {
  mission.kills = 0;
  mission.timeLeft = mission.timeLimit;
  mission.phase = 'prep';
  mission.result = null;
  mission.prepLeft = mission.prepDuration;
  mission.extractionProgress = 0;
  mission.extractionReady = false;
  mission.extractionInside = false;
  feedbackFlags.warned30 = false;
  feedbackFlags.warned15 = false;
  feedbackFlags.warnedLowHp = false;
  feedbackFlags.warnedThreat2 = false;
  feedbackFlags.warnedThreat3 = false;

  state.hp = 100;
  state.velY = 0;
  state.onGround = false;
  state.pos.copy(SPAWN_POS);
  touch.jump = false;
  state.fire = false;
  lastDamageAt = 0;

  if ($missionFeed) $missionFeed.classList.remove('show', 'feed-warn', 'feed-danger', 'feed-good');

  resetEnemies();
  extractionZone.visible = false;
  extractionZone.material.opacity = 0;
  if ($extractIndicator) $extractIndicator.classList.remove('show', 'extract-locked');
  if ($extractArrow) {
    $extractArrow.textContent = '▲';
    $extractArrow.style.transform = 'translateY(-1px) rotate(0deg)';
  }
  if ($extractLabel) $extractLabel.textContent = 'Faro';
  if (manual) sfxStart();

  if ($tip) {
    $tip.textContent = 'Reinicio táctico: preparate…';
    $tip.style.display = 'block';
    setTimeout(() => {
      if (mission.phase === 'prep') $tip.style.display = isTouch ? 'none' : $tip.style.display;
    }, 850);
  }
}

function updateMission(dt){
  if (mission.phase === 'prep') {
    mission.prepLeft = Math.max(0, mission.prepLeft - dt);
    if (mission.prepLeft <= 0) {
      mission.phase = 'playing';
      sfxStart();
      if ($tip) {
        $tip.textContent = '¡Ventana táctica abierta! Neutralizá todos los drones.';
        $tip.style.display = 'block';
        if (isTouch) setTimeout(() => { if (mission.phase === 'playing') $tip.style.display = 'none'; }, 1000);
      }
    }
  } else if (mission.phase === 'playing') {
    mission.timeLeft = Math.max(0, mission.timeLeft - dt);
    const threat = getThreatLevel();

    if (!feedbackFlags.warnedThreat2 && threat.id >= 2) {
      feedbackFlags.warnedThreat2 = true;
      beep({ freq: 560, duration: 0.06, type: 'triangle', gain: 0.024 });
      if ($tip) {
        $tip.textContent = 'Amenaza II: drones más agresivos.';
        $tip.style.display = 'block';
        if (isTouch) setTimeout(() => { if (mission.phase === 'playing') $tip.style.display = 'none'; }, 850);
      }
    }
    if (!feedbackFlags.warnedThreat3 && threat.id >= 3) {
      feedbackFlags.warnedThreat3 = true;
      beep({ freq: 300, duration: 0.08, type: 'sawtooth', gain: 0.03 });
      setTimeout(() => beep({ freq: 250, duration: 0.1, type: 'sawtooth', gain: 0.028 }), 80);
      if (isTouch && navigator.vibrate) navigator.vibrate([16, 44, 16]);
      if ($tip) {
        $tip.textContent = 'Amenaza III: máxima presión.';
        $tip.style.display = 'block';
        if (isTouch) setTimeout(() => { if (mission.phase === 'playing') $tip.style.display = 'none'; }, 1000);
      }
    }

    if (!feedbackFlags.warned30 && mission.timeLeft <= 30) {
      feedbackFlags.warned30 = true;
      beep({ freq: 520, duration: 0.06, type: 'triangle', gain: 0.026 });
    }
    if (!feedbackFlags.warned15 && mission.timeLeft <= 15) {
      feedbackFlags.warned15 = true;
      beep({ freq: 360, duration: 0.08, type: 'sawtooth', gain: 0.03 });
      setTimeout(() => beep({ freq: 280, duration: 0.1, type: 'sawtooth', gain: 0.028 }), 90);
    }
    if (!feedbackFlags.warnedLowHp && state.hp <= 25) {
      feedbackFlags.warnedLowHp = true;
      beep({ freq: 200, duration: 0.08, type: 'square', gain: 0.03 });
      if (isTouch && navigator.vibrate) navigator.vibrate([20, 60, 20]);
    }

    if (!mission.extractionReady && mission.kills >= mission.targetKills) {
      mission.extractionReady = true;
      mission.extractionProgress = 0;
      mission.extractionInside = false;
      beep({ freq: 660, duration: 0.06, type: 'triangle', gain: 0.028 });
      setTimeout(() => beep({ freq: 920, duration: 0.07, type: 'triangle', gain: 0.028 }), 65);
      if (isTouch && navigator.vibrate) navigator.vibrate(18);
      if ($tip) {
        $tip.textContent = 'Objetivo actualizado: volvé al faro para extraer.';
        $tip.style.display = 'block';
        if (isTouch) setTimeout(() => { if (mission.phase === 'playing' && mission.extractionReady) $tip.style.display = 'none'; }, 1100);
      }
    }

    if (mission.extractionReady) {
      const dx = state.pos.x - EXTRACTION_POINT.x;
      const dz = state.pos.z - EXTRACTION_POINT.y;
      const inside = Math.hypot(dx, dz) <= mission.extractionRadius;

      if (inside) {
        mission.extractionProgress = Math.min(mission.extractionDuration, mission.extractionProgress + dt);
        if (!mission.extractionInside) {
          mission.extractionInside = true;
          beep({ freq: 740, duration: 0.05, type: 'triangle', gain: 0.024 });
          if (isTouch && navigator.vibrate) navigator.vibrate(12);
        }
      } else {
        mission.extractionInside = false;
        mission.extractionProgress = Math.max(0, mission.extractionProgress - dt * 0.72);
      }

      if (mission.extractionProgress >= mission.extractionDuration) {
        mission.phase = 'result';
        mission.result = 'win';
        sfxWin();
        if ($tip) {
          $tip.textContent = 'Extracción confirmada. R para reiniciar.';
          $tip.style.display = 'block';
        }
      }
    }

    if ((mission.timeLeft <= 0 || state.hp <= 0) && mission.phase === 'playing') {
      mission.phase = 'result';
      mission.result = 'lose';
      sfxLose();
      if ($tip) {
        $tip.textContent = 'Misión fallida. R para reintentar.';
        $tip.style.display = 'block';
      }
    }
  }

  const extractionPct = Math.round((mission.extractionProgress / mission.extractionDuration) * 100);
  const mobileCopy = isTouch;
  const threatLabel = getThreatLevel().label;
  const threatShort = `A-${threatLabel}`;

  if ($missionStatus) {
    if (mission.phase === 'prep') {
      $missionStatus.textContent = `Preparación ${Math.ceil(mission.prepLeft)}s`;
    } else if (mission.phase === 'playing') {
      $missionStatus.textContent = mission.extractionReady
        ? (mission.extractionInside ? 'Extrayendo' : 'Evacuación')
        : 'En curso';
    } else {
      $missionStatus.textContent = mission.result === 'win' ? 'Completada' : 'Fallida';
    }
  }

  if ($missionObjective) {
    if (mission.phase === 'prep') {
      $missionObjective.textContent = mobileCopy
        ? `Drones ${mission.targetKills} + faro`
        : `Objetivo: derribar ${mission.targetKills} drones y extraer en el faro`;
    } else if (mission.phase === 'playing' && mission.extractionReady) {
      $missionObjective.textContent = mission.extractionInside
        ? (mobileCopy ? `Extracción ${extractionPct}%` : `Sostené posición en el faro: ${extractionPct}%`)
        : (mobileCopy ? `Volvé al faro ${extractionPct}%` : `Volvé al faro para extraer: ${extractionPct}%`);
    } else if (mission.phase === 'playing') {
      $missionObjective.textContent = mobileCopy
        ? `Drones ${mission.kills}/${mission.targetKills} · ${threatShort}`
        : `Drones derribados: ${mission.kills}/${mission.targetKills} · Amenaza ${threatLabel}`;
    } else {
      $missionObjective.textContent = mission.result === 'win'
        ? (mobileCopy ? 'Zona asegurada' : 'Resultado: zona asegurada')
        : (mobileCopy ? 'Sin tiempo/energía' : 'Resultado: sin tiempo o sin energía');
    }
  }

  if ($missionTimer) {
    if (mission.phase === 'prep') {
      $missionTimer.textContent = mobileCopy
        ? `T-${Math.ceil(mission.prepLeft)}s`
        : `Inicio en: ${Math.ceil(mission.prepLeft)}s`;
    } else if (mission.phase === 'playing') {
      const timeCompact = `${Math.ceil(mission.timeLeft)}s`;
      $missionTimer.textContent = mission.extractionReady
        ? (mobileCopy ? `${timeCompact} · ${threatShort}` : `Tiempo: ${timeCompact} · Amenaza ${threatLabel}`)
        : (mobileCopy ? timeCompact : `Tiempo: ${timeCompact}`);
    } else {
      $missionTimer.textContent = mobileCopy ? '↻ Reiniciar' : 'Reiniciar: tecla R / botón ↻';
    }

    const criticalTime = mission.phase === 'playing' && mission.timeLeft <= 15;
    $missionTimer.classList.toggle('timer-critical', criticalTime);
  }

  if ($hp) {
    $hp.textContent = String(state.hp);
    $hp.classList.toggle('hp-critical', state.hp <= 25);
  }
  updateMissionMini();
  setHudPhaseVisuals();
}

function updateBeaconState(now) {
  const pulse = 0.5 + Math.sin(now * 0.0075) * 0.5;
  const baseGlow = 1.35 + pulse * 0.2;

  if (mission.phase === 'playing' && mission.extractionReady) {
    const p = THREE.MathUtils.clamp(mission.extractionProgress / mission.extractionDuration, 0, 1);
    extractionZone.visible = true;
    extractionZone.material.opacity = 0.22 + pulse * 0.22 + p * 0.2;
    extractionZone.scale.setScalar(1 + (1 - p) * 0.06);
    beacon.material.emissiveIntensity = baseGlow + 0.25 + p * 0.75;
    beaconLight.intensity = 2.8 + pulse * 0.9 + p * 1.1;
    return;
  }

  extractionZone.visible = false;
  extractionZone.material.opacity = 0;
  extractionZone.scale.setScalar(1);
  beacon.material.emissiveIntensity = baseGlow;
  beaconLight.intensity = 2.4 + pulse * 0.35;
}

function updateExtractionIndicator() {
  if (!$extractIndicator || !$extractArrow || !$extractLabel) return;

  const active = mission.phase === 'playing' && mission.extractionReady;
  $extractIndicator.classList.toggle('show', active);
  if (!active) return;

  const dx = EXTRACTION_POINT.x - state.pos.x;
  const dz = EXTRACTION_POINT.y - state.pos.z;
  const distance = Math.max(0, Math.round(Math.hypot(dx, dz)));

  if (mission.extractionInside) {
    const pct = Math.round((mission.extractionProgress / mission.extractionDuration) * 100);
    $extractIndicator.classList.add('extract-locked');
    $extractArrow.textContent = '✓';
    $extractArrow.style.transform = 'translateY(-1px) rotate(0deg)';
    $extractLabel.textContent = `En faro ${pct}%`;
    return;
  }

  $extractIndicator.classList.remove('extract-locked');

  const targetYaw = Math.atan2(dx, dz);
  const yawDelta = wrapAngle(targetYaw - state.yaw);
  const clampedDelta = THREE.MathUtils.clamp(yawDelta, -1.2, 1.2);
  const rotationDeg = THREE.MathUtils.radToDeg(clampedDelta);

  $extractArrow.textContent = '▲';
  $extractArrow.style.transform = `translateY(-1px) rotate(${rotationDeg.toFixed(1)}deg)`;

  if (Math.abs(yawDelta) < 0.16) {
    $extractLabel.textContent = `Faro al frente · ${distance}m`;
  } else if (yawDelta > 0) {
    $extractLabel.textContent = `Faro a la derecha · ${distance}m`;
  } else {
    $extractLabel.textContent = `Faro a la izquierda · ${distance}m`;
  }
}

function updatePlayer(dt){
  if (isTouch) {
    state.yaw -= touch.lookX * dt * mobileLookSens;
    state.pitch -= touch.lookY * dt * mobileLookSens;
    state.pitch = Math.max(-1.25, Math.min(1.0, state.pitch));
  }

  let mx = 0, mz = 0;
  if (keys.has('KeyA')) mx -= 1;
  if (keys.has('KeyD')) mx += 1;
  if (keys.has('KeyW')) mz += 1;
  if (keys.has('KeyS')) mz -= 1;

  mx += touch.moveX;
  mz -= touch.moveY;

  const len = Math.hypot(mx, mz);
  if (len > 1e-3) { mx /= Math.max(1, len); mz /= Math.max(1, len); }

  tempForward.set(Math.sin(state.yaw), 0, Math.cos(state.yaw));
  tempRight.set(tempForward.z, 0, -tempForward.x);

  const speed = 5.6;
  const moveX = (tempRight.x * mx + tempForward.x * mz) * speed * dt;
  const moveZ = (tempRight.z * mx + tempForward.z * mz) * speed * dt;
  movePlayerWithCollisions(moveX, moveZ);

  const wantJump = keys.has('Space') || touch.jump;
  if (wantJump && state.onGround) {
    state.velY = JUMP;
    state.onGround = false;
  }

  state.velY += GRAV * dt;
  state.pos.y += state.velY * dt;

  if (state.pos.y <= PLAYER_EYE_HEIGHT) {
    state.pos.y = PLAYER_EYE_HEIGHT;
    state.velY = 0;
    state.onGround = true;
  }

  camera.position.copy(state.pos);
  camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
}

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

const clock = new THREE.Clock();

function tick(){
  const dt = Math.min(clock.getDelta(), 0.033);
  const now = performance.now();

  updatePlayer(dt);
  updateEnemies(dt);
  updateMission(dt);
  updateBeaconState(now);
  updateExtractionIndicator();

  const canShoot = mission.phase === 'playing';
  const wantShoot = canShoot && ((!isTouch && pointerLocked && (keys.has('KeyF'))) || state.fire || (!isTouch && pointerLocked && mouseDown));
  if (wantShoot) doShoot(now);

  recoilKick = Math.max(0, recoilKick - dt * 0.22);
  camera.rotation.x -= recoilKick;

  if (now < shakeUntil) {
    const k = (shakeUntil - now) / 90;
    const amp = isTouch ? 0.010 : 0.018;
    camera.rotation.x += (Math.random() - 0.5) * amp * k;
    camera.rotation.y += (Math.random() - 0.5) * amp * k;
  }

  const shotPulse = now < shotPulseUntil;
  crosshair.material.color.set(shotPulse ? 0xf59e0b : 0xe5e7eb);
  crosshair.scale.setScalar(shotPulse ? 0.84 : 1);

  hitMarker.style.opacity = now < hitMarkerUntil ? '1' : '0';
  muzzleFlash.style.opacity = now < muzzleFlashUntil ? '1' : '0';

  const lowHpIntensity = THREE.MathUtils.clamp((45 - state.hp) / 45, 0, 1) * 0.55;
  const damagePulse = THREE.MathUtils.clamp((280 - (now - lastDamageAt)) / 280, 0, 1) * 0.6;
  damageOverlay.style.opacity = Math.max(lowHpIntensity, damagePulse).toFixed(2);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

let mouseDown = false;
addEventListener('mousedown', () => { mouseDown = true; ensureAudio(); });
addEventListener('mouseup', () => { mouseDown = false; });

$hp.textContent = String(state.hp);
$ammo.textContent = '∞';
resetMission(false);

tick();
