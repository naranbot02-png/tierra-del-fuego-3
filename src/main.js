import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';
import { stepMissionCore } from './mission/core.js';
import { applyMissionEffects } from './mission/effects.js';
import {
  getKeyboardIntentAxes,
  getTouchIntentAxes,
  normalizeIntentAxes,
  applyIntentAxisInversion,
  isKeyboardSprinting,
  isTouchAutoSprinting,
} from './input/intent.js';
import { resolveCalibrationResult } from './input/calibration.js';
import { shouldAutoRunCalibration } from './input/control-lock.js';
import { intentToWorldDelta } from './movement/transform.js';
import {
  createMissionState,
  createFeedbackFlags,
  resetMissionState,
  resetFeedbackFlags,
  getThreatLevel,
} from './mission/state.js';
import { updateMissionMini, renderHudText, setHudPhaseVisuals } from './ui/hud.js';

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
const $btnInvX = document.getElementById('btnInvX');
const $btnInvY = document.getElementById('btnInvY');
const $btnCalib = document.getElementById('btnCalib');
const $btnRecalib = document.getElementById('btnRecalib');
const $btnLockCtrl = document.getElementById('btnLockCtrl');
const $tuneDensity = document.getElementById('tuneDensity');
const $tuneDelay = document.getElementById('tuneDelay');
const $tuneDamage = document.getElementById('tuneDamage');
const $tvDensity = document.getElementById('tvDensity');
const $tvDelay = document.getElementById('tvDelay');
const $tvDamage = document.getElementById('tvDamage');
const $btnTunePresetNormal = document.getElementById('btnTunePresetNormal');
const $btnTunePresetHard = document.getElementById('btnTunePresetHard');
const $btnTunePresetMobile = document.getElementById('btnTunePresetMobile');
const $btnTunePresetDesktop = document.getElementById('btnTunePresetDesktop');
const $btnTuneSuggest = document.getElementById('btnTuneSuggest');
const $tuneSuggestion = document.getElementById('tuneSuggestion');
const $calibReadout = document.getElementById('calibReadout');
const $btnRestart = document.getElementById('btnRestart');
const $btnSettings = document.getElementById('btnSettings');
const $btnCloseSettings = document.getElementById('btnCloseSettings');
const $settingsPanel = document.getElementById('settingsPanel');
const $extractIndicator = document.getElementById('extractIndicator');
const $extractArrow = document.getElementById('extractArrow');
const $extractLabel = document.getElementById('extractLabel');

const isTouch = matchMedia('(pointer: coarse)').matches;
const REDUCE_CONFIG_BUTTONS = true;
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
const texLoader = new THREE.TextureLoader();
function loadTiledTexture(path, rx, ry, anisotropy = 2) {
  const t = texLoader.load(path);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

const txAsphalt = loadTiledTexture('./assets/textures/asphalt_01_diff_2k.jpg', 26, 26, 2);
const txPaintedShutter = loadTiledTexture('./assets/textures/painted_metal_shutter_diff_2k.jpg', 7, 2.8, 3);
const txRustyMetal = loadTiledTexture('./assets/textures/rusty_metal_diff_2k.jpg', 5, 2.5, 3);
const txMetalPlate = loadTiledTexture('./assets/textures/metal_plate_diff_2k.jpg', 6, 6, 3);
const txConcrete = loadTiledTexture('./assets/textures/concrete_floor_diff_2k.jpg', 8, 8, 2);

const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: txAsphalt, roughness: 0.96, metalness: 0.04 });
const iceMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, map: txConcrete, roughness: 0.85, metalness: 0.02 });

const metalMat = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  map: txPaintedShutter,
  roughness: 0.78,
  metalness: 0.18,
});
const lightMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, map: txMetalPlate, roughness: 0.2, metalness: 0.1, emissive: 0x0b1220, emissiveIntensity: 0.35 });

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

// --- Main map blockout v1: perímetro + núcleo + corredor al faro
addWall(0, 1.2, -30, 62, 2.4, 1.0, metalMat); // perímetro sur
addWall(0, 1.2, 32, 62, 2.4, 1.0, metalMat); // perímetro norte
addWall(-31, 1.2, 1, 1.0, 2.4, 62, metalMat); // perímetro oeste
addWall(31, 1.2, 1, 1.0, 2.4, 62, metalMat); // perímetro este

const zonePerimeter = new THREE.Mesh(
  new THREE.RingGeometry(22, 30, 56),
  new THREE.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
);
zonePerimeter.rotation.x = -Math.PI / 2;
zonePerimeter.position.set(0, 0.02, 1);
scene.add(zonePerimeter);

const zoneCore = new THREE.Mesh(
  new THREE.CircleGeometry(9, 32),
  new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.10, side: THREE.DoubleSide })
);
zoneCore.rotation.x = -Math.PI / 2;
zoneCore.position.set(-2, 0.03, 4);
scene.add(zoneCore);

addWall(-6, 0.8, 16, 12, 1.6, 0.8, metalMat); // cuello ruta norte
addWall(10, 0.8, 20, 8, 1.6, 0.8, metalMat); // lateral ruta faro

const routeMat = new THREE.MeshBasicMaterial({ color: 0x8ecae6, map: txConcrete, transparent: true, opacity: 0.22 });
addBox(-10, 0.04, 8, 16, 0.08, 2.2, routeMat);   // ruta spawn -> núcleo
addBox(-2, 0.04, 14, 14, 0.08, 2.2, routeMat);   // ruta núcleo -> norte
addBox(3, 0.04, 20, 10, 0.08, 2.2, routeMat);    // ruta norte -> faro

// Mapa v2: identidad industrial + coberturas + landmarks
const hazardMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, map: txMetalPlate, roughness: 0.55, metalness: 0.26, emissive: 0x311904, emissiveIntensity: 0.18 });
const darkPanelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: txRustyMetal, roughness: 0.72, metalness: 0.22 });

// Landmark 1: torre de enfriamiento en núcleo
addBox(-2, 3.2, 4, 3.4, 6.4, 3.4, darkPanelMat, { solid: true, colliderTag: 'cover' });
addBox(-2, 6.8, 4, 4.4, 0.35, 4.4, hazardMat);

// Landmark 2: depósitos industriales cerca del corredor norte
addBox(12, 1.05, 14, 4.2, 2.1, 2.8, metalMat, { solid: true, colliderTag: 'cover' });
addBox(16, 1.05, 17, 4.2, 2.1, 2.8, metalMat, { solid: true, colliderTag: 'cover' });
addBox(14, 2.25, 15.5, 8.8, 0.2, 3.2, hazardMat);

// Choke táctico: barreras en zig-zag hacia faro
addWall(-4, 1.0, 18.2, 4.8, 2.0, 0.8, metalMat);
addWall(2.5, 1.0, 20.5, 4.8, 2.0, 0.8, metalMat);

// Coberturas de perímetro para alternar rutas
addBox(-20, 1.0, -8, 3.2, 2.0, 1.2, darkPanelMat, { solid: true, colliderTag: 'cover' });
addBox(22, 1.0, 6, 3.2, 2.0, 1.2, darkPanelMat, { solid: true, colliderTag: 'cover' });

// Ruta riesgo/recompensa: rápida (expuesta) vs segura (coberturas)
const fastRouteMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.14 });
const safeRouteMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.14 });
addBox(8, 0.035, 10, 24, 0.07, 1.5, fastRouteMat);      // rápida y expuesta hacia faro
addBox(-14, 0.035, 10, 10, 0.07, 1.5, safeRouteMat);    // segura (más larga)
addBox(-18, 0.035, 16, 8, 0.07, 1.5, safeRouteMat);
addBox(-10, 0.035, 22, 10, 0.07, 1.5, safeRouteMat);
addBox(-16, 1.0, 12, 2.6, 2.0, 1.1, darkPanelMat, { solid: true, colliderTag: 'cover' });
addBox(-12, 1.0, 18, 2.6, 2.0, 1.1, darkPanelMat, { solid: true, colliderTag: 'cover' });

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
const beaconBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.16, 1.15, 34, 20, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
);
beaconBeam.position.set(0, 17, 24);
scene.add(beaconBeam);
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

const objectiveGuideLights = [];
for (const [gx, gz] of [[-8, 10], [-4, 14], [0, 18], [4, 21], [0, 24]]) {
  const g = new THREE.PointLight(0x67e8f9, 0.2, 12, 2);
  g.position.set(gx, 1.1, gz);
  scene.add(g);
  objectiveGuideLights.push(g);
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

const mission = createMissionState({
  targetKills: 3,
  extractionRadius: EXTRACTION_RADIUS,
});

const feedbackFlags = createFeedbackFlags();

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
  if (e.code === 'KeyI') {
    e.preventDefault();
    setInputDebugEnabled(!inputDebug.enabled);
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

const inputDebug = {
  enabled: false,
  lastLogAt: 0,
};

const moveAxisSettings = {
  invertX: false,
  invertY: false,
  lockStable: true,
};

const movementTelemetry = {
  sprinting: false,
};

const tuning = {
  density: 1.0,
  delayMul: 1.0,
  damageMul: 1.0,
};

const runTelemetry = {
  phaseTime: { prep: 0, playing: 0, result: 0 },
  waveTime: [0, 0, 0],
  damageReceived: 0,
  routeFastTime: 0,
  routeSafeTime: 0,
  checkpoints: [],
  summaryShown: false,
  balanceWaveDelayBonus: 0,
};

const director = {
  pressure: 0.45,
  targetPressure: 0.45,
  mode: 'normal', // calm | normal | pressure
  recentDamage: 0,
  killRate: 0,
  lastKills: 0,
  modeChanges: 0,
  adjustLog: [],
};

function resetRunTelemetry() {
  runTelemetry.phaseTime.prep = 0;
  runTelemetry.phaseTime.playing = 0;
  runTelemetry.phaseTime.result = 0;
  runTelemetry.waveTime = [0, 0, 0];
  runTelemetry.damageReceived = 0;
  runTelemetry.routeFastTime = 0;
  runTelemetry.routeSafeTime = 0;
  runTelemetry.checkpoints = [];
  runTelemetry.summaryShown = false;
  try {
    runTelemetry.balanceWaveDelayBonus = Number(localStorage.getItem('tdf3_balance_wave_delay_bonus') || 0) || 0;
  } catch {
    runTelemetry.balanceWaveDelayBonus = 0;
  }

  director.pressure = 0.45;
  director.targetPressure = 0.45;
  director.mode = 'normal';
  director.recentDamage = 0;
  director.killRate = 0;
  director.lastKills = 0;
  director.modeChanges = 0;
  director.adjustLog = [];
}

function getDirectorDensityMul() {
  return THREE.MathUtils.clamp(0.9 + director.pressure * 0.25, 0.85, 1.15);
}

function getDirectorDelayMul() {
  return THREE.MathUtils.clamp(1.2 - director.pressure * 0.35, 0.85, 1.25);
}

function getDirectorDamageMul() {
  return THREE.MathUtils.clamp(0.9 + director.pressure * 0.25, 0.85, 1.2);
}

function updateDirector(dt) {
  if (mission.phase !== 'playing') return;

  const killsDelta = Math.max(0, mission.kills - director.lastKills);
  director.lastKills = mission.kills;
  const instKillRate = killsDelta / Math.max(0.001, dt);
  director.killRate = THREE.MathUtils.lerp(director.killRate, instKillRate, Math.min(1, dt * 2.5));

  director.recentDamage = Math.max(0, director.recentDamage - dt * 7.5);

  const struggling = THREE.MathUtils.clamp(
    Math.max(director.recentDamage / 26, (45 - state.hp) / 45),
    0,
    1
  );
  const dominating = THREE.MathUtils.clamp((director.killRate - 0.9) / 1.4, 0, 1);
  const timeSignal = THREE.MathUtils.clamp((35 - mission.timeLeft) / 35, 0, 1);
  const extractionSignal = mission.extractionReady ? 0.08 : 0;

  director.targetPressure = THREE.MathUtils.clamp(
    0.44 + timeSignal * 0.22 + dominating * 0.2 + extractionSignal - struggling * 0.32,
    0.2,
    0.82
  );

  director.pressure += (director.targetPressure - director.pressure) * Math.min(1, dt * 1.25);

  const prevMode = director.mode;
  if (director.pressure < 0.36) director.mode = 'calm';
  else if (director.pressure > 0.62) director.mode = 'pressure';
  else director.mode = 'normal';

  if (director.mode !== prevMode) {
    director.modeChanges += 1;
    director.adjustLog.push({ at: Number((mission.timeLimit - mission.timeLeft).toFixed(1)), mode: director.mode, p: Number(director.pressure.toFixed(2)) });
    director.adjustLog = director.adjustLog.slice(-10);
  }
}

function pushCheckpoint(tag) {
  runTelemetry.checkpoints.push({ tag, at: Number((mission.timeLimit - mission.timeLeft).toFixed(1)) });
}

function maybeShowRunSummary() {
  if (mission.phase !== 'result' || runTelemetry.summaryShown || !$missionFeed) return;
  runTelemetry.summaryShown = true;
  const cause = mission.result === 'win' ? 'win' : (mission.lastLoseReason || 'unknown');
  const fastPct = Math.round((runTelemetry.routeFastTime / Math.max(0.01, runTelemetry.phaseTime.playing)) * 100);
  const safePct = Math.round((runTelemetry.routeSafeTime / Math.max(0.01, runTelemetry.phaseTime.playing)) * 100);
  const dmgPerMin = Math.round((runTelemetry.damageReceived / Math.max(1, runTelemetry.phaseTime.playing)) * 60);
  const nextBonus = mission.result === 'lose' && mission.lastLoseReason === 'hp' ? 0.35 : 0;
  try { localStorage.setItem('tdf3_balance_wave_delay_bonus', String(nextBonus)); } catch {}

  try {
    const runs = readRecentRuns();
    runs.push({
      cause,
      damage: Math.round(runTelemetry.damageReceived),
      fastPct,
      safePct,
      playingTime: Number(runTelemetry.phaseTime.playing.toFixed(1)),
      directorModeChanges: director.modeChanges,
      at: Date.now(),
    });
    localStorage.setItem('tdf3_recent_runs', JSON.stringify(runs.slice(-8)));
  } catch {}

  $missionFeed.classList.remove('feed-warn', 'feed-danger', 'feed-good');
  $missionFeed.classList.add('show', mission.result === 'win' ? 'feed-good' : 'feed-warn');
  $missionFeed.textContent = `Run: ${cause} · dmg ${Math.round(runTelemetry.damageReceived)} (${dmgPerMin}/min) · director ${director.mode}/${director.modeChanges} · ruta rápida ${fastPct}% / segura ${safePct}% · tune d${tuning.density.toFixed(1)} Δ${tuning.delayMul.toFixed(1)} x${tuning.damageMul.toFixed(1)} · next delay+${nextBonus.toFixed(2)}s`;
}


const calibrationWizard = {
  active: false,
  phase: 'y',
  phaseElapsed: 0,
  sumX: 0,
  sumY: 0,
  countX: 0,
  countY: 0,
};
const CALIB_PHASE_SECONDS = 1.5;

function setInputDebugEnabled(enabled) {
  inputDebug.enabled = enabled;
  if ($btnCalib) $btnCalib.textContent = `Calib: ${enabled ? 'On' : 'Off'}`;
  if ($calibReadout) $calibReadout.style.display = enabled ? 'block' : 'none';
  if ($tip) {
    if (enabled) {
      $tip.style.display = 'block';
      $tip.textContent = 'DEBUG INPUT ON (tecla I para ocultar)';
    } else if (mission.phase === 'playing' && isTouch) {
      $tip.style.display = 'none';
    }
  }
  if (!enabled) console.info('[input-debug] off');
}

function applyConfigButtonsVisibility() {
  if (!isTouch || !REDUCE_CONFIG_BUTTONS) return;

  // Inside settings, keep advanced controls available.
  if ($btnLook) $btnLook.style.display = '';
  if ($btnInvX) $btnInvX.style.display = '';
  if ($btnInvY) $btnInvY.style.display = '';
  if ($btnCalib) $btnCalib.style.display = '';
}

function applyTuningPreset(kind, { persist = true, reason = '' } = {}) {
  if (kind === 'hard') {
    tuning.density = 1.3;
    tuning.delayMul = 0.85;
    tuning.damageMul = 1.25;
  } else if (kind === 'mobile') {
    tuning.density = 0.9;
    tuning.delayMul = 1.15;
    tuning.damageMul = 0.9;
  } else if (kind === 'desktop') {
    tuning.density = 1.1;
    tuning.delayMul = 0.95;
    tuning.damageMul = 1.05;
  } else {
    tuning.density = 1.0;
    tuning.delayMul = 1.0;
    tuning.damageMul = 1.0;
  }
  if ($tuneDensity) $tuneDensity.value = String(tuning.density);
  if ($tuneDelay) $tuneDelay.value = String(tuning.delayMul);
  if ($tuneDamage) $tuneDamage.value = String(tuning.damageMul);
  refreshTuningUiLabels();
  if (persist) saveTuningSettings();
  if ($tuneSuggestion) $tuneSuggestion.textContent = reason || `Preset aplicado: ${kind}`;
}

function refreshTuningUiLabels() {
  if ($tvDensity) $tvDensity.textContent = tuning.density.toFixed(2);
  if ($tvDelay) $tvDelay.textContent = tuning.delayMul.toFixed(2);
  if ($tvDamage) $tvDamage.textContent = tuning.damageMul.toFixed(2);
}

function saveTuningSettings() {
  try {
    localStorage.setItem('tdf3_tune_density', String(tuning.density));
    localStorage.setItem('tdf3_tune_delay', String(tuning.delayMul));
    localStorage.setItem('tdf3_tune_damage', String(tuning.damageMul));
    localStorage.setItem('tdf3_tune_initialized', '1');
  } catch {}
}

function readRecentRuns() {
  try {
    return JSON.parse(localStorage.getItem('tdf3_recent_runs') || '[]');
  } catch {
    return [];
  }
}

function computeSuggestedTuningFromRuns(runs) {
  if (!runs.length) return { preset: isTouch ? 'mobile' : 'desktop', reason: 'Sin runs previas: preset por dispositivo.' };

  const avgDmg = runs.reduce((acc, r) => acc + (r.damage || 0), 0) / runs.length;
  const hpLosses = runs.filter((r) => r.cause === 'hp').length;
  const timeLosses = runs.filter((r) => r.cause === 'time').length;

  if (hpLosses >= 2 || avgDmg > 130) {
    return { preset: 'mobile', reason: `Sugerido suave: daño promedio ${Math.round(avgDmg)} y derrotas por HP.` };
  }
  if (timeLosses >= 2 && avgDmg < 80) {
    return { preset: 'hard', reason: `Sugerido más agresivo: runs largas con baja presión (dmg ${Math.round(avgDmg)}).` };
  }
  return { preset: isTouch ? 'mobile' : 'desktop', reason: 'Sugerido equilibrado por performance/dispositivo.' };
}

function initTuningPanel() {
  let initialized = false;
  try {
    tuning.density = Number(localStorage.getItem('tdf3_tune_density') || 1) || 1;
    tuning.delayMul = Number(localStorage.getItem('tdf3_tune_delay') || 1) || 1;
    tuning.damageMul = Number(localStorage.getItem('tdf3_tune_damage') || 1) || 1;
    initialized = localStorage.getItem('tdf3_tune_initialized') === '1';
  } catch {}

  if ($tuneDensity) {
    $tuneDensity.value = String(tuning.density);
    $tuneDensity.addEventListener('input', () => {
      tuning.density = Number($tuneDensity.value);
      refreshTuningUiLabels();
      saveTuningSettings();
    });
  }
  if ($tuneDelay) {
    $tuneDelay.value = String(tuning.delayMul);
    $tuneDelay.addEventListener('input', () => {
      tuning.delayMul = Number($tuneDelay.value);
      refreshTuningUiLabels();
      saveTuningSettings();
    });
  }
  if ($tuneDamage) {
    $tuneDamage.value = String(tuning.damageMul);
    $tuneDamage.addEventListener('input', () => {
      tuning.damageMul = Number($tuneDamage.value);
      refreshTuningUiLabels();
      saveTuningSettings();
    });
  }
  if ($btnTunePresetNormal) $btnTunePresetNormal.addEventListener('click', () => applyTuningPreset('normal'));
  if ($btnTunePresetHard) $btnTunePresetHard.addEventListener('click', () => applyTuningPreset('hard'));
  if ($btnTunePresetMobile) $btnTunePresetMobile.addEventListener('click', () => applyTuningPreset('mobile'));
  if ($btnTunePresetDesktop) $btnTunePresetDesktop.addEventListener('click', () => applyTuningPreset('desktop'));
  if ($btnTuneSuggest) {
    $btnTuneSuggest.addEventListener('click', () => {
      const suggestion = computeSuggestedTuningFromRuns(readRecentRuns());
      applyTuningPreset(suggestion.preset, { persist: false, reason: suggestion.reason });
    });
  }

  if (!initialized) {
    applyTuningPreset(isTouch ? 'mobile' : 'desktop', { reason: 'Inicializado por perfil de dispositivo.' });
  } else {
    refreshTuningUiLabels();
    if ($tuneSuggestion) $tuneSuggestion.textContent = 'Tuning manual activo. Podés usar auto-balance sugerido.';
  }
}

function initSettingsMenu() {
  if (!$settingsPanel) return;

  const close = () => { $settingsPanel.style.display = 'none'; };
  const open = () => { $settingsPanel.style.display = 'block'; };

  if ($btnSettings) {
    $btnSettings.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    });
  }

  if ($btnCloseSettings) {
    $btnCloseSettings.addEventListener('click', (e) => {
      e.preventDefault();
      close();
    });
  }

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

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

function updateMoveAxisButtons() {
  if ($btnInvX) {
    $btnInvX.textContent = `Move X: ${moveAxisSettings.invertX ? 'Invertido' : 'Normal'}`;
    $btnInvX.disabled = moveAxisSettings.lockStable;
    $btnInvX.style.opacity = moveAxisSettings.lockStable ? '0.6' : '1';
  }
  if ($btnInvY) {
    $btnInvY.textContent = `Move Y: ${moveAxisSettings.invertY ? 'Invertido' : 'Normal'}`;
    $btnInvY.disabled = moveAxisSettings.lockStable;
    $btnInvY.style.opacity = moveAxisSettings.lockStable ? '0.6' : '1';
  }
  if ($btnRecalib) {
    $btnRecalib.disabled = moveAxisSettings.lockStable;
    $btnRecalib.style.opacity = moveAxisSettings.lockStable ? '0.6' : '1';
  }
  if ($btnLockCtrl) $btnLockCtrl.textContent = `Controles: ${moveAxisSettings.lockStable ? 'Bloq' : 'Libre'}`;
}

function initMoveAxisToggles() {
  let calibrated = false;
  try {
    moveAxisSettings.invertX = localStorage.getItem('tdf3_move_invert_x') === '1';
    moveAxisSettings.invertY = localStorage.getItem('tdf3_move_invert_y') === '1';
    calibrated = localStorage.getItem('tdf3_move_calibrated') === '1';
    const lockSaved = localStorage.getItem('tdf3_controls_lock');
    moveAxisSettings.lockStable = lockSaved == null ? true : lockSaved === '1';
  } catch {}
  updateMoveAxisButtons();

  if ($btnInvX) {
    $btnInvX.addEventListener('click', (e) => {
      e.preventDefault();
      if (moveAxisSettings.lockStable) return;
      moveAxisSettings.invertX = !moveAxisSettings.invertX;
      try { localStorage.setItem('tdf3_move_invert_x', moveAxisSettings.invertX ? '1' : '0'); } catch {}
      updateMoveAxisButtons();
    });
  }

  if ($btnInvY) {
    $btnInvY.addEventListener('click', (e) => {
      e.preventDefault();
      if (moveAxisSettings.lockStable) return;
      moveAxisSettings.invertY = !moveAxisSettings.invertY;
      try { localStorage.setItem('tdf3_move_invert_y', moveAxisSettings.invertY ? '1' : '0'); } catch {}
      updateMoveAxisButtons();
    });
  }

  if ($btnLockCtrl) {
    $btnLockCtrl.addEventListener('click', (e) => {
      e.preventDefault();
      moveAxisSettings.lockStable = !moveAxisSettings.lockStable;
      try { localStorage.setItem('tdf3_controls_lock', moveAxisSettings.lockStable ? '1' : '0'); } catch {}
      updateMoveAxisButtons();
    });
  }

  if (shouldAutoRunCalibration({ isTouch, calibrated, lockStable: moveAxisSettings.lockStable })) {
    startCalibrationWizard();
  }
}

function startCalibrationWizard() {
  if (moveAxisSettings.lockStable) {
    if ($tip) {
      $tip.style.display = 'block';
      $tip.textContent = 'Desbloqueá controles para recalibrar.';
    }
    return;
  }

  calibrationWizard.active = true;
  calibrationWizard.phase = 'y';
  calibrationWizard.phaseElapsed = 0;
  calibrationWizard.sumX = 0;
  calibrationWizard.sumY = 0;
  calibrationWizard.countX = 0;
  calibrationWizard.countY = 0;
  if ($calibReadout) {
    $calibReadout.style.display = 'block';
    $calibReadout.textContent = 'WIZARD: mové stick ARRIBA';
  }
}

function finishCalibrationWizard() {
  const avgX = calibrationWizard.countX > 0 ? (calibrationWizard.sumX / calibrationWizard.countX) : 0;
  const avgY = calibrationWizard.countY > 0 ? (calibrationWizard.sumY / calibrationWizard.countY) : 0;
  const resolved = resolveCalibrationResult({
    avgX,
    avgY,
    countX: calibrationWizard.countX,
    countY: calibrationWizard.countY,
    prev: moveAxisSettings,
  });

  moveAxisSettings.invertX = resolved.invertX;
  moveAxisSettings.invertY = resolved.invertY;
  try {
    localStorage.setItem('tdf3_move_invert_x', moveAxisSettings.invertX ? '1' : '0');
    localStorage.setItem('tdf3_move_invert_y', moveAxisSettings.invertY ? '1' : '0');
    localStorage.setItem('tdf3_move_calibrated', '1');
  } catch {}
  updateMoveAxisButtons();
  calibrationWizard.active = false;
  if ($calibReadout) $calibReadout.style.display = inputDebug.enabled ? 'block' : 'none';
  if ($tip) {
    $tip.style.display = 'block';
    $tip.textContent = `Calibración aplicada: X ${moveAxisSettings.invertX ? 'invertido' : 'normal'} · Y ${moveAxisSettings.invertY ? 'invertido' : 'normal'}`;
  }
}

function updateCalibrationWizard(dt) {
  if (!calibrationWizard.active) return;

  calibrationWizard.phaseElapsed += dt;
  if (calibrationWizard.phase === 'y') {
    if (Math.abs(touch.moveY) > 0.35) {
      calibrationWizard.sumY += touch.moveY;
      calibrationWizard.countY += 1;
    }
    if ($calibReadout) $calibReadout.textContent = 'WIZARD: mové stick ARRIBA';
    if (calibrationWizard.phaseElapsed >= CALIB_PHASE_SECONDS) {
      calibrationWizard.phase = 'x';
      calibrationWizard.phaseElapsed = 0;
    }
    return;
  }

  if (Math.abs(touch.moveX) > 0.35) {
    calibrationWizard.sumX += touch.moveX;
    calibrationWizard.countX += 1;
  }
  if ($calibReadout) $calibReadout.textContent = 'WIZARD: mové stick DERECHA';

  if (calibrationWizard.phaseElapsed >= CALIB_PHASE_SECONDS) {
    finishCalibrationWizard();
  }
}

function initCalibControl() {
  if ($btnCalib) {
    $btnCalib.addEventListener('click', (e) => {
      e.preventDefault();
      setInputDebugEnabled(!inputDebug.enabled);
      $btnCalib.textContent = `Calib: ${inputDebug.enabled ? 'On' : 'Off'}`;
      if ($calibReadout) $calibReadout.style.display = inputDebug.enabled ? 'block' : 'none';
    });
  }
  if ($btnRecalib) {
    $btnRecalib.addEventListener('click', (e) => {
      e.preventDefault();
      startCalibrationWizard();
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
const PLAYER_HURT_IFRAME_MS = 380;

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

const WAVE_CONFIGS = [
  {
    name: 'perímetro',
    delay: 0,
    moveMul: 1.0,
    damageMul: 1.0,
    spawns: [[-20, -4], [-6, -8], [8, -2]],
  },
  {
    name: 'núcleo',
    delay: 1.2,
    moveMul: 1.08,
    damageMul: 1.0,
    spawns: [[-2, 6], [10, 12], [-12, 10]],
  },
  {
    name: 'corredor faro',
    delay: 1.8,
    moveMul: 1.2,
    damageMul: 1.12,
    spawns: [[10, 16], [6, 20], [2, 24]],
  },
];
let currentWaveIndex = 0;
let pendingWaveIndex = null;
let pendingWaveDelay = 0;

function spawnEnemy(x,z){
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), enemyMat);
  body.position.set(x, 1.4, z);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfef3c7, emissiveIntensity: 0.35 }));
  eye.position.set(0, 0.05, 0.42);
  body.add(eye);
  scene.add(body);
  enemies.push({ mesh: body, hp: 3, dead: false, base: new THREE.Vector3(x,1.4,z), spawn: new THREE.Vector3(x,1.4,z), t: Math.random()*10, hitCd: 0, waveMoveMul: 1, waveDamageMul: 1 });
}
spawnEnemy(4, -2);
spawnEnemy(-6, -8);
spawnEnemy(6, 8);
// targetKills is recalculated by deployWave based on tuning density.

function getActiveEnemiesPerWave() {
  const effectiveDensity = tuning.density * getDirectorDensityMul();
  return THREE.MathUtils.clamp(Math.round(enemies.length * effectiveDensity), 1, enemies.length);
}

function deployWave(waveIndex) {
  const cfg = WAVE_CONFIGS[Math.min(waveIndex, WAVE_CONFIGS.length - 1)];
  const layout = cfg.spawns;
  const activeCount = getActiveEnemiesPerWave();

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (i >= activeCount) {
      e.hp = 0;
      e.dead = true;
      e.mesh.scale.setScalar(0.001);
      continue;
    }

    const [x, z] = layout[i % layout.length];
    e.hp = 3;
    e.dead = false;
    e.t = Math.random() * 10;
    e.hitCd = 0;
    e.waveMoveMul = cfg.moveMul * tuning.damageMul;
    e.waveDamageMul = cfg.damageMul * tuning.damageMul;
    e.spawn.set(x, 1.4, z);
    e.base.set(x, 1.4, z);
    e.mesh.scale.setScalar(1);
    e.mesh.position.copy(e.spawn);
  }

  mission.targetKills = activeCount * WAVE_CONFIGS.length;
}

function resetEnemies() {
  currentWaveIndex = 0;
  pendingWaveIndex = null;
  pendingWaveDelay = 0;
  deployWave(currentWaveIndex);
}

function updateEnemies(dt, now){
  const threat = getThreatLevel(mission);
  let aliveCount = 0;

  for (const e of enemies){
    if (e.hp <= 0) continue;
    aliveCount += 1;
    const liveMoveMul = (e.waveMoveMul || 1) * getDirectorDamageMul();
    e.t += dt * threat.moveMul * liveMoveMul;
    e.hitCd = Math.max(0, e.hitCd - dt);
    e.mesh.position.x = e.base.x + Math.sin(e.t*0.8)*1.3;
    e.mesh.position.z = e.base.z + Math.cos(e.t*0.7)*1.3;
    e.mesh.lookAt(state.pos.x, 1.4, state.pos.z);

    const dist = e.mesh.position.distanceTo(state.pos);
    const globalHurtReady = (now - lastDamageAt) >= PLAYER_HURT_IFRAME_MS;
    if (dist < 1.9 && e.hitCd <= 0 && globalHurtReady && mission.phase === 'playing') {
      const waveDamage = Math.round(threat.damage * (e.waveDamageMul || 1) * getDirectorDamageMul());
      runTelemetry.damageReceived += waveDamage;
      director.recentDamage += waveDamage;
      state.hp = Math.max(0, state.hp - waveDamage);
      e.hitCd = threat.hitCooldown;
      lastDamageAt = now;
      sfxDamage();
      if (isTouch && navigator.vibrate) navigator.vibrate(12);
    }
  }

  const hasNextWave = currentWaveIndex < (WAVE_CONFIGS.length - 1);
  if (mission.phase === 'playing' && aliveCount === 0 && hasNextWave && pendingWaveIndex == null && mission.kills < mission.targetKills) {
    pendingWaveIndex = currentWaveIndex + 1;
    pendingWaveDelay = (WAVE_CONFIGS[pendingWaveIndex].delay * tuning.delayMul * getDirectorDelayMul()) + runTelemetry.balanceWaveDelayBonus;
    if ($tip) {
      $tip.style.display = 'block';
      $tip.textContent = `Reagrupando drones… próxima oleada en ${pendingWaveDelay.toFixed(1)}s`;
    }
  }

  if (pendingWaveIndex != null && mission.phase === 'playing') {
    pendingWaveDelay = Math.max(0, pendingWaveDelay - dt);
    if (pendingWaveDelay <= 0) {
      currentWaveIndex = pendingWaveIndex;
      pendingWaveIndex = null;
      deployWave(currentWaveIndex);
      if ($tip) {
        $tip.style.display = 'block';
        $tip.textContent = `Nueva oleada: ${WAVE_CONFIGS[currentWaveIndex].name}.`;
        if (isTouch) setTimeout(() => { if (mission.phase === 'playing') $tip.style.display = 'none'; }, 900);
      }
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
initMoveAxisToggles();
initCalibControl();
applyConfigButtonsVisibility();
initSettingsMenu();
initTuningPanel();
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

const MOVE_SPEED = 5.6;
const SPRINT_MULTIPLIER = 1.27;

/*
Manual smoke tests (input refactor):
1) yaw=0°   -> W/touch arriba: Z-, S/touch abajo: Z+
2) yaw=180° -> W/touch arriba: Z+, S/touch abajo: Z-
3) yaw=90°  -> W/touch arriba: X+, S/touch abajo: X-
4) A/izquierda => X- local, D/derecha => X+ local
5) Tecla I: mostrar/ocultar debug (intent/world)
*/

// input/movement helpers moved to modules (src/input, src/movement)

function applyMovementFromIntent(intentX, intentY, dt) {
  const sprinting = isKeyboardSprinting(keys, mission.phase)
    || isTouchAutoSprinting({ isTouch, missionPhase: mission.phase, intentX, intentY });
  movementTelemetry.sprinting = sprinting;
  const speed = sprinting ? MOVE_SPEED * SPRINT_MULTIPLIER : MOVE_SPEED;
  const { worldX, worldZ } = intentToWorldDelta({ camera, state, intentX, intentY, dt, speed });
  movePlayerWithCollisions(worldX, worldZ);
  return { worldX, worldZ };
}

function maybeLogInputDebug(now, intentX, intentY, worldX, worldZ) {
  if (!inputDebug.enabled) return;

  const msg = `DEBUG in(${intentX.toFixed(2)}, ${intentY.toFixed(2)}) world(${worldX.toFixed(2)}, ${worldZ.toFixed(2)}) yaw=${THREE.MathUtils.radToDeg(state.yaw).toFixed(1)}°`;
  if ($tip) {
    $tip.style.display = 'block';
    $tip.textContent = msg;
  }
  if ($calibReadout) {
    $calibReadout.textContent = `intent(${intentX.toFixed(2)}, ${intentY.toFixed(2)}) · world(${worldX.toFixed(2)}, ${worldZ.toFixed(2)}) · yaw ${THREE.MathUtils.radToDeg(state.yaw).toFixed(1)}° · dir:${director.mode} p${director.pressure.toFixed(2)}`;
  }

  if (now - inputDebug.lastLogAt > 250) {
    console.info('[input-debug]', {
      intentX: Number(intentX.toFixed(3)),
      intentY: Number(intentY.toFixed(3)),
      worldX: Number(worldX.toFixed(3)),
      worldZ: Number(worldZ.toFixed(3)),
      yawDeg: Number(THREE.MathUtils.radToDeg(state.yaw).toFixed(1)),
    });
    inputDebug.lastLogAt = now;
  }
}

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

// HUD helpers moved to src/ui/hud.js

function resetMission(manual = false) {
  resetMissionState(mission);
  resetFeedbackFlags(feedbackFlags);

  state.hp = 100;
  state.velY = 0;
  state.onGround = false;
  state.pos.copy(SPAWN_POS);
  touch.jump = false;
  state.fire = false;
  lastDamageAt = 0;

  if ($missionFeed) $missionFeed.classList.remove('show', 'feed-warn', 'feed-danger', 'feed-good');

  resetRunTelemetry();
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
  const dx = state.pos.x - EXTRACTION_POINT.x;
  const dz = state.pos.z - EXTRACTION_POINT.y;
  const insideExtractionZone = Math.hypot(dx, dz) <= mission.extractionRadius;

  const { events } = stepMissionCore({
    mission,
    feedbackFlags,
    dt,
    playerHp: state.hp,
    insideExtractionZone,
  });

  applyMissionEffects({
    events,
    mission,
    isTouch,
    tipEl: $tip,
    beep,
    sfxStart,
    sfxWin,
    sfxLose,
    vibrate: navigator.vibrate?.bind(navigator),
  });

  for (const ev of events) {
    if (ev.type === 'extraction-ready') pushCheckpoint('extraction-ready');
    if (ev.type === 'extraction-grace-critical') pushCheckpoint('grace-critical');
    if (ev.type === 'extraction-grace-expired') pushCheckpoint('grace-expired');
    if (ev.type === 'mission-win') pushCheckpoint('win');
    if (ev.type === 'mission-lose') pushCheckpoint(`lose-${ev.reason || 'unknown'}`);
  }

  maybeShowRunSummary();

  const threat = getThreatLevel(mission);
  const extractionDistance = Math.round(Math.hypot(state.pos.x - EXTRACTION_POINT.x, state.pos.z - EXTRACTION_POINT.y));
  renderHudText({
    mission,
    hp: state.hp,
    isTouch,
    threat,
    extractionDistance,
    pendingWaveDelay,
    pendingWaveActive: pendingWaveIndex != null,
    currentWaveIndex,
    totalWaves: WAVE_CONFIGS.length,
    currentWaveName: WAVE_CONFIGS[Math.min(currentWaveIndex, WAVE_CONFIGS.length - 1)]?.name || 'oleada',
    directorMode: director.mode,
    sprinting: movementTelemetry.sprinting,
    refs: {
      missionStatusEl: $missionStatus,
      missionObjectiveEl: $missionObjective,
      missionTimerEl: $missionTimer,
      hpEl: $hp,
    },
  });
  updateMissionMini({
    mission,
    refs: {
      missionMiniEl: $missionMini,
      missionMiniLabelEl: $missionMiniLabel,
      missionMiniFillEl: $missionMiniFill,
    },
  });
  setHudPhaseVisuals({ mission, missionStatusEl: $missionStatus });
}

function updateBeaconState(now) {
  const pulse = 0.5 + Math.sin(now * 0.0075) * 0.5;
  const baseGlow = 1.35 + pulse * 0.2;

  const guideTargetIntensity = (mission.phase === 'playing' && mission.extractionReady)
    ? (0.65 + pulse * 0.7)
    : ((mission.phase === 'playing' && pendingWaveIndex != null) ? (0.34 + pulse * 0.25) : 0.14);
  for (const g of objectiveGuideLights) g.intensity = guideTargetIntensity;

  if (mission.phase === 'playing' && mission.extractionReady) {
    const p = THREE.MathUtils.clamp(mission.extractionProgress / mission.extractionDuration, 0, 1);
    const graceCritical = !mission.extractionInside && mission.extractionOutGraceLeft > 0 && mission.extractionOutGraceLeft <= 0.2;
    extractionZone.visible = true;
    extractionZone.material.opacity = 0.22 + pulse * 0.22 + p * 0.2;
    extractionZone.scale.setScalar(1 + (1 - p) * 0.06);
    beacon.material.emissiveIntensity = baseGlow + 0.25 + p * 0.75;
    beaconLight.intensity = graceCritical ? (3.6 + pulse * 1.3) : (2.8 + pulse * 0.9 + p * 1.1);
    beaconBeam.visible = true;
    beaconBeam.scale.set(1 + pulse * 0.05, 1, 1 + pulse * 0.05);
    beaconBeam.material.opacity = graceCritical ? (0.22 + pulse * 0.24) : (0.16 + pulse * 0.12 + p * 0.08);
    beaconBeam.material.color.setHex(graceCritical ? 0xfb7185 : 0x67e8f9);
    return;
  }

  extractionZone.visible = false;
  extractionZone.material.opacity = 0;
  extractionZone.scale.setScalar(1);
  beacon.material.emissiveIntensity = baseGlow;
  beaconLight.intensity = 2.4 + pulse * 0.35;
  beaconBeam.visible = mission.phase === 'playing';
  beaconBeam.scale.set(1, 1, 1);
  beaconBeam.material.opacity = 0.08 + pulse * 0.06;
  beaconBeam.material.color.setHex(0x67e8f9);
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
    $extractArrow.style.color = '#22d3ee';
    $extractLabel.style.color = '#e2e8f0';
    const eta = Math.max(0, mission.extractionDuration - mission.extractionProgress);
    $extractLabel.textContent = `En faro ${pct}% · ${eta.toFixed(1)}s`;
    return;
  }

  $extractIndicator.classList.remove('extract-locked');

  const targetYaw = Math.atan2(dx, dz);
  const yawDelta = wrapAngle(targetYaw - state.yaw);
  const clampedDelta = THREE.MathUtils.clamp(yawDelta, -1.2, 1.2);
  const rotationDeg = THREE.MathUtils.radToDeg(clampedDelta);

  $extractArrow.textContent = '▲';
  $extractArrow.style.transform = `translateY(-1px) rotate(${rotationDeg.toFixed(1)}deg)`;

  if (distance > 40) {
    $extractArrow.style.color = '#f59e0b';
    $extractLabel.style.color = '#fbbf24';
  } else if (distance > 15) {
    $extractArrow.style.color = '#22d3ee';
    $extractLabel.style.color = '#67e8f9';
  } else {
    $extractArrow.style.color = '#4ade80';
    $extractLabel.style.color = '#86efac';
  }

  const graceLeft = Math.max(0, mission.extractionOutGraceLeft);
  const inGrace = mission.extractionProgress > 0 && graceLeft > 0;
  const graceCritical = inGrace && !mission.extractionInside && graceLeft <= 0.2;
  const graceSuffix = inGrace ? ` · hold ${graceLeft.toFixed(1)}s` : '';

  if (graceCritical) {
    const dangerPulse = 0.55 + Math.sin(performance.now() * 0.02) * 0.45;
    $extractArrow.style.color = '#f43f5e';
    $extractLabel.style.color = `rgba(251, 113, 133, ${dangerPulse.toFixed(2)})`;
  }

  if (Math.abs(yawDelta) < 0.16) {
    $extractLabel.textContent = `${graceCritical ? '⚠ ' : ''}Faro al frente · ${distance}m${graceSuffix}`;
  } else if (yawDelta > 0) {
    $extractLabel.textContent = `${graceCritical ? '⚠ ' : ''}Faro a la derecha · ${distance}m${graceSuffix}`;
  } else {
    $extractLabel.textContent = `${graceCritical ? '⚠ ' : ''}Faro a la izquierda · ${distance}m${graceSuffix}`;
  }
}

function updatePlayer(dt, now){
  if (isTouch) {
    state.yaw -= touch.lookX * dt * mobileLookSens;
    state.pitch -= touch.lookY * dt * mobileLookSens;
    state.pitch = Math.max(-1.25, Math.min(1.0, state.pitch));
  }

  const keyboardIntent = getKeyboardIntentAxes(keys);
  const touchIntent = getTouchIntentAxes(touch);
  const rawIntent = normalizeIntentAxes(keyboardIntent, touchIntent);
  const intent = applyIntentAxisInversion(rawIntent, moveAxisSettings);
  const { worldX, worldZ } = applyMovementFromIntent(intent.x, intent.y, dt);
  maybeLogInputDebug(now, intent.x, intent.y, worldX, worldZ);

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

  updatePlayer(dt, now);
  updateCalibrationWizard(dt);

  runTelemetry.phaseTime[mission.phase] = (runTelemetry.phaseTime[mission.phase] || 0) + dt;
  if (mission.phase === 'playing') {
    runTelemetry.waveTime[currentWaveIndex] = (runTelemetry.waveTime[currentWaveIndex] || 0) + dt;
    const inFastRoute = state.pos.x > 2 && state.pos.z > 6 && state.pos.z < 24;
    const inSafeRoute = state.pos.x < -8 && state.pos.z > 6 && state.pos.z < 24;
    if (inFastRoute) runTelemetry.routeFastTime += dt;
    if (inSafeRoute) runTelemetry.routeSafeTime += dt;
  }

  updateDirector(dt);

  updateEnemies(dt, now);
  updateMission(dt);
  updateBeaconState(now);
  updateExtractionIndicator();

  const canShoot = mission.phase === 'playing';
  const wantShoot = canShoot && ((!isTouch && pointerLocked && (keys.has('KeyF'))) || state.fire || (!isTouch && pointerLocked && mouseDown));
  if (wantShoot) doShoot(now);

  recoilKick = Math.max(0, recoilKick - dt * 0.22);
  let visualPitchOffset = -recoilKick;
  let visualYawOffset = 0;

  if (now < shakeUntil) {
    const k = (shakeUntil - now) / 90;
    const amp = isTouch ? 0.010 : 0.018;
    // Shake solo visual: nunca altera state.yaw (basis de movimiento).
    visualPitchOffset += (Math.random() - 0.5) * amp * k;
    visualYawOffset += (Math.random() - 0.5) * amp * 0.35 * k;
  }

  camera.rotation.set(state.pitch + visualPitchOffset, state.yaw + visualYawOffset, 0, 'YXZ');

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
