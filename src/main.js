import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';

const $hp = document.getElementById('hp');
const $ammo = document.getElementById('ammo');
const $tip = document.getElementById('tip');

const $movePad = document.getElementById('movePad');
const $moveStick = document.getElementById('moveStick');
const $lookPad = document.getElementById('lookPad');
const $lookStick = document.getElementById('lookStick');
const $btnFire = document.getElementById('btnFire');
const $btnJump = document.getElementById('btnJump');

const isTouch = matchMedia('(pointer: coarse)').matches;

// --- Renderer / Scene / Camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
// Make colors/lights look correct across phones/browsers
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

// --- World: "Tierra del Fuego" vibe (stylized realistic)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1.0 });
const iceMat = new THREE.MeshStandardMaterial({ color: 0x25314f, roughness: 0.8, metalness: 0.05 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.55, metalness: 0.35 });
const lightMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.1, emissive: 0x0b1220, emissiveIntensity: 0.35 });

const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// simple "industrial outpost" blocks
function addBox(x,y,z,w,h,d,mat){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  m.position.set(x,y,z);
  scene.add(m);
  return m;
}

// Walls / cover (put most of the geometry "in front" of the spawn so you immediately see it)
addBox(0, 1.2, 2, 30, 2.4, 1.0, metalMat);
addBox(8, 1.2, 9, 1.0, 2.4, 14, metalMat);
addBox(-10, 1.2, 13, 18, 2.4, 1.0, metalMat);
addBox(-18, 1.2, 2, 1.0, 2.4, 28, metalMat);
addBox(10, 1.2, -6, 28, 2.4, 1.0, metalMat);

// Big landmark so you always have something to look at
addBox(0, 3.0, 24, 10, 6.0, 10, new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.55, metalness: 0.15, emissive: 0x0ea5e9, emissiveIntensity: 0.45 }));
const beacon = new THREE.Mesh(
  new THREE.SphereGeometry(0.9, 18, 12),
  new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x67e8f9, emissiveIntensity: 1.6 })
);
beacon.position.set(0, 4.5, 24);
scene.add(beacon);
const beaconLight = new THREE.PointLight(0x67e8f9, 2.5, 45, 2);
beaconLight.position.copy(beacon.position);
scene.add(beaconLight);

// "ice" patches
for (let i=0;i<12;i++){
  const x = (Math.random()*2-1) * 60;
  const z = (Math.random()*2-1) * 60;
  const s = 4 + Math.random()*10;
  const ice = new THREE.Mesh(new THREE.CircleGeometry(s, 24), iceMat);
  ice.rotation.x = -Math.PI/2;
  ice.position.set(x, 0.01, z);
  scene.add(ice);
}

// some lights
for (let i=0;i<6;i++){
  const lx = -14 + i*6;
  const pole = addBox(lx, 2.0, -14, 0.2, 4.0, 0.2, metalMat);
  const lamp = addBox(lx, 4.1, -14, 0.8, 0.35, 0.8, lightMat);
  const pt = new THREE.PointLight(0xa5f3fc, 0.8, 18, 2);
  pt.position.set(lx, 4.1, -14);
  scene.add(pt);
}

// --- Player controller (simple FPS)
const state = {
  hp: 100,
  pos: new THREE.Vector3(-6, 1.7, 12),
  velY: 0,
  // Start facing the big landmark so first frame is never “empty/black”
  yaw: 0,
  pitch: 0.18,
  onGround: false,
  fire: false,
};

// Force initial heading towards landmark at (0,3,24)
{
  const toX = 0 - state.pos.x;
  const toZ = 24 - state.pos.z;
  state.yaw = Math.atan2(toX, toZ);
}

const keys = new Set();
addEventListener('keydown', (e) => keys.add(e.code));
addEventListener('keyup', (e) => keys.delete(e.code));

// Touch controls
const touch = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  jump: false,
};

function setupPad(padEl, stickEl, onMove){
  if (!padEl) return;
  let pid = null;
  let touchActive = false;
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
    if (stickEl) stickEl.style.transform = 'translate(-50%, -50%)';
    onMove(0,0);
  };

  const refreshCenter = () => {
    const r = padEl.getBoundingClientRect();
    center = { x: r.left + r.width/2, y: r.top + r.height/2 };
  };

  // Pointer Events (Android/modern browsers)
  padEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pid = e.pointerId;
    padEl.setPointerCapture?.(pid);
    refreshCenter();
    setStick(e.clientX - center.x, e.clientY - center.y);
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

  // Touch fallback (Telegram/iOS webviews can be picky)
  padEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchActive = true;
    refreshCenter();
    const t = e.changedTouches[0];
    setStick(t.clientX - center.x, t.clientY - center.y);
  }, { passive: false });
  padEl.addEventListener('touchmove', (e) => {
    if (!touchActive) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    setStick(t.clientX - center.x, t.clientY - center.y);
  }, { passive: false });
  padEl.addEventListener('touchend', (e) => {
    if (!touchActive) return;
    e.preventDefault();
    reset();
  }, { passive: false });
  padEl.addEventListener('touchcancel', () => reset(), { passive: false });
}

setupPad($movePad, $moveStick, (x,y) => { touch.moveX = x; touch.moveY = y; });
setupPad($lookPad, $lookStick, (x,y) => { touch.lookX = x; touch.lookY = y; });

if ($btnFire) {
  const down = (e) => { e.preventDefault(); state.fire = true; };
  const up = (e) => { e.preventDefault(); state.fire = false; };
  $btnFire.addEventListener('pointerdown', down);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  // touch fallback
  $btnFire.addEventListener('touchstart', down, { passive: false });
  $btnFire.addEventListener('touchend', up, { passive: false });
  $btnFire.addEventListener('touchcancel', up, { passive: false });
}
if ($btnJump) {
  const down = (e) => { e.preventDefault(); touch.jump = true; };
  const up = (e) => { e.preventDefault(); touch.jump = false; };
  $btnJump.addEventListener('pointerdown', down);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  // touch fallback
  $btnJump.addEventListener('touchstart', down, { passive: false });
  $btnJump.addEventListener('touchend', up, { passive: false });
  $btnJump.addEventListener('touchcancel', up, { passive: false });
}

// Pointer lock on desktop
let pointerLocked = false;
if (!isTouch) {
  renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock?.());
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

// Crosshair
const crosshair = new THREE.Mesh(
  new THREE.RingGeometry(0.012, 0.02, 16),
  new THREE.MeshBasicMaterial({ color: 0xe5e7eb, transparent: true, opacity: 0.85 })
);
crosshair.position.set(0, 0, -0.6);
camera.add(crosshair);
scene.add(camera);

// Shooting (raycast)
const raycaster = new THREE.Raycaster();
let lastShot = 0;

// Enemies (3 simple drones)
const enemies = [];
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.55, metalness: 0.25, emissive: 0x220808, emissiveIntensity: 0.35 });
function spawnEnemy(x,z){
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), enemyMat);
  body.position.set(x, 1.4, z);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfef3c7, emissiveIntensity: 0.35 }));
  eye.position.set(0, 0.05, 0.42);
  body.add(eye);
  scene.add(body);
  enemies.push({ mesh: body, hp: 3, base: new THREE.Vector3(x,1.4,z), t: Math.random()*10 });
}
spawnEnemy(4, -2);
spawnEnemy(-6, -8);
spawnEnemy(6, 8);

function updateEnemies(dt){
  for (const e of enemies){
    if (e.hp <= 0) continue;
    e.t += dt;
    // simple patrol in small circle
    e.mesh.position.x = e.base.x + Math.sin(e.t*0.8)*1.3;
    e.mesh.position.z = e.base.z + Math.cos(e.t*0.7)*1.3;
    // face player
    e.mesh.lookAt(state.pos.x, 1.4, state.pos.z);
  }
}

function doShoot(now){
  if (now - lastShot < 130) return;
  lastShot = now;

  // Ray from camera forward
  raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
  const meshes = enemies.filter(e => e.hp>0).map(e => e.mesh);
  const hits = raycaster.intersectObjects(meshes, true);
  if (hits.length){
    // find root enemy mesh
    let obj = hits[0].object;
    while (obj.parent && !meshes.includes(obj)) obj = obj.parent;
    const enemy = enemies.find(e => e.mesh === obj);
    if (enemy){
      enemy.hp -= 1;
      // hit flash
      enemy.mesh.material.emissiveIntensity = 1.1;
      setTimeout(() => { try{ enemy.mesh.material.emissiveIntensity = 0.35; } catch{} }, 60);
      if (enemy.hp <= 0){
        enemy.mesh.scale.setScalar(0.001);
      }
    }
  }
}

// Simple story prompt + puzzle stub
const story = [
  'Río Grande, TDF. La tormenta cortó la comunicación con la base.',
  'Encontrá el panel de energía y restablecé el enlace.',
];
let storyIdx = 0;
function showStory(){
  if (!$tip) return;
  $tip.textContent = story[storyIdx] + ' (tap/click)';
  $tip.style.display = 'block';
}
showStory();
addEventListener('click', () => { if (isTouch) { $tip && ($tip.style.display = 'none'); } });
addEventListener('touchstart', () => { $tip && ($tip.style.display = 'none'); }, { passive: true });

// Physics
const GRAV = -18;
const JUMP = 7.2;

function updatePlayer(dt){
  // apply touch look (mobile)
  if (isTouch) {
    // right pad gives -1..1; map to yaw/pitch rates
    state.yaw -= touch.lookX * dt * 2.2;
    state.pitch -= touch.lookY * dt * 2.2;
    state.pitch = Math.max(-1.25, Math.min(1.0, state.pitch));
  }

  // movement (WASD + left pad)
  let mx = 0, mz = 0;
  if (keys.has('KeyA')) mx -= 1;
  if (keys.has('KeyD')) mx += 1;
  if (keys.has('KeyW')) mz -= 1;
  if (keys.has('KeyS')) mz += 1;

  mx += touch.moveX;
  mz += touch.moveY;

  // normalize
  const len = Math.hypot(mx, mz);
  if (len > 1e-3) { mx /= Math.max(1, len); mz /= Math.max(1, len); }

  // forward/right in XZ
  const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  const speed = 5.6;
  state.pos.addScaledVector(right, mx * speed * dt);
  state.pos.addScaledVector(forward, mz * speed * dt);

  // jump
  const wantJump = keys.has('Space') || touch.jump;
  if (wantJump && state.onGround) {
    state.velY = JUMP;
    state.onGround = false;
  }

  // gravity
  state.velY += GRAV * dt;
  state.pos.y += state.velY * dt;

  // ground collision
  if (state.pos.y <= 1.7) {
    state.pos.y = 1.7;
    state.velY = 0;
    state.onGround = true;
  }

  // simple bounds
  state.pos.x = THREE.MathUtils.clamp(state.pos.x, -80, 80);
  state.pos.z = THREE.MathUtils.clamp(state.pos.z, -80, 80);

  // camera
  camera.position.copy(state.pos);
  camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
}

// Resize
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

  const wantShoot = (!isTouch && pointerLocked && (keys.has('KeyF'))) || state.fire || (!isTouch && pointerLocked && (mouseDown));
  if (wantShoot) doShoot(now);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

let mouseDown = false;
addEventListener('mousedown', () => { mouseDown = true; });
addEventListener('mouseup', () => { mouseDown = false; });

$hp.textContent = String(state.hp);
$ammo.textContent = '∞';

tick();
